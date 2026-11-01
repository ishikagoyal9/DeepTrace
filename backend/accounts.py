"""
Login + history ke liye chhota module. Koi extra package nahi chahiye (sirf Python + FastAPI).

- Users aur saved analyses SQLite file mein: backend/data/deeptrace.db
- Password PBKDF2 se hash hota hai (asli password kahin save nahi hota)
- Login token: HMAC se signed, 7 din chalta hai. Secret key pehli baar run par backend/data/secret.key mein ban jaati hai.

main.py mein bas ye do lines chahiye:
    from accounts import router as accounts_router, current_user, save_analysis, init_db
    init_db(); app.include_router(accounts_router)
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "deeptrace.db")
KEY_PATH = os.path.join(DATA_DIR, "secret.key")
TOKEN_DAYS = 7
PBKDF2_ROUNDS = 200_000

router = APIRouter()
_init_lock = threading.Lock()
_secret = None


# ---------------------------------------------------------------- database
@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    global _secret
    with _init_lock:
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(KEY_PATH):
            with open(KEY_PATH, "wb") as f:
                f.write(secrets.token_bytes(32))
        with open(KEY_PATH, "rb") as f:
            _secret = f.read()
        with db() as c:
            c.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    pw_salt TEXT NOT NULL,
                    pw_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS analyses (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    filename TEXT NOT NULL,
                    verdict TEXT NOT NULL,
                    fake_probability REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    result_json TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
                CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_id, created_at DESC);
                CREATE TABLE IF NOT EXISTS analysis_feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    analysis_id TEXT NOT NULL,
                    user_id INTEGER NOT NULL,
                    expected_verdict TEXT NOT NULL CHECK (expected_verdict IN ('REAL', 'FAKE')),
                    reason TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE (analysis_id, user_id)
                );
                CREATE INDEX IF NOT EXISTS idx_analysis_feedback_analysis ON analysis_feedback(analysis_id);
                """
            )


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------- passwords + tokens
def _hash_pw(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ROUNDS).hex()


def _b64(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def make_token(user_id):
    payload = _b64(json.dumps({"uid": user_id, "exp": int(time.time()) + TOKEN_DAYS * 86400}).encode())
    sig = _b64(hmac.new(_secret, payload.encode(), hashlib.sha256).digest())
    return payload + "." + sig


def read_token(token):
    try:
        payload, sig = token.split(".")
        good = _b64(hmac.new(_secret, payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, good):
            return None
        data = json.loads(_unb64(payload))
        if data["exp"] < time.time():
            return None
        return int(data["uid"])
    except Exception:
        return None


def current_user(authorization: str = Header(default="")):
    """FastAPI dependency: Authorization: Bearer <token> se user nikalta hai, warna 401."""
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Please sign in.")
    uid = read_token(authorization[7:].strip())
    if uid is None:
        raise HTTPException(status_code=401, detail="Your session expired. Please sign in again.")
    with db() as c:
        row = c.execute("SELECT id, name, email FROM users WHERE id = ?", (uid,)).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Please sign in.")
    return dict(row)


# ---------------------------------------------------------------- auth endpoints
class SignupIn(BaseModel):
    name: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


class AnalysisFeedbackIn(BaseModel):
    expected_verdict: str
    reason: str = ""


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _session(user):
    return {"token": make_token(user["id"]), "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}


@router.post("/auth/signup")
def signup(body: SignupIn):
    name, email = body.name.strip(), body.email.strip().lower()
    if not name:
        raise HTTPException(400, "Please enter your name.")
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Please enter a valid email address.")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters.")
    salt = secrets.token_hex(16)
    try:
        with db() as c:
            cur = c.execute(
                "INSERT INTO users (name, email, pw_salt, pw_hash, created_at) VALUES (?,?,?,?,?)",
                (name, email, salt, _hash_pw(body.password, salt), now_iso()),
            )
            uid = cur.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(409, "An account with this email already exists.")
    return _session({"id": uid, "name": name, "email": email})


@router.post("/auth/login")
def login(body: LoginIn):
    email = body.email.strip().lower()
    with db() as c:
        row = c.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    ok = row is not None and hmac.compare_digest(_hash_pw(body.password, row["pw_salt"]), row["pw_hash"])
    if not ok:
        raise HTTPException(401, "Wrong email or password.")
    return _session(dict(row))


@router.get("/auth/me")
def me(user=Depends(current_user)):
    return user


# ---------------------------------------------------------------- saved analyses
def _np_safe(o):
    if hasattr(o, "item"):
        return o.item()
    if hasattr(o, "tolist"):
        return o.tolist()
    return str(o)


def save_analysis(user_id, result):
    """result = /analyze ka poora response dict. Return: (analysis_id, saved_result_dict)."""
    analysis_id = uuid.uuid4().hex
    created = now_iso()
    text = json.dumps(dict(result, analysis_id=analysis_id, created_at=created), default=_np_safe)
    clean = json.loads(text)
    with db() as c:
        c.execute(
            "INSERT INTO analyses (id, user_id, filename, verdict, fake_probability, created_at, result_json) "
            "VALUES (?,?,?,?,?,?,?)",
            (analysis_id, user_id, clean.get("filename") or "video",
             clean["model_prediction"]["verdict"], float(clean["model_prediction"]["fake_probability"]),
             created, text),
        )
    return analysis_id, clean


def get_saved(analysis_id, user_id):
    with db() as c:
        row = c.execute("SELECT result_json FROM analyses WHERE id = ? AND user_id = ?",
                        (analysis_id, user_id)).fetchone()
    if row is None:
        raise HTTPException(404, "This analysis was not found. It may have been deleted.")
    return json.loads(row["result_json"])


@router.get("/analyses")
def list_analyses(user=Depends(current_user)):
    with db() as c:
        rows = c.execute(
            "SELECT id, filename, verdict, fake_probability, created_at FROM analyses "
            "WHERE user_id = ? ORDER BY created_at DESC, rowid DESC", (user["id"],)).fetchall()
    return [dict(r) for r in rows]


@router.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: str, user=Depends(current_user)):
    return get_saved(analysis_id, user["id"])


@router.post("/analyses/{analysis_id}/feedback")
def submit_analysis_feedback(analysis_id: str, body: AnalysisFeedbackIn, user=Depends(current_user)):
    expected_verdict = body.expected_verdict.strip().upper()
    if expected_verdict not in {"REAL", "FAKE"}:
        raise HTTPException(422, "Choose REAL or FAKE as the expected verdict.")

    reason = body.reason.strip()
    if len(reason) > 1000:
        raise HTTPException(422, "Feedback notes must be 1000 characters or fewer.")

    submitted_at = now_iso()
    with db() as c:
        analysis = c.execute(
            "SELECT 1 FROM analyses WHERE id = ? AND user_id = ?",
            (analysis_id, user["id"]),
        ).fetchone()
        if analysis is None:
            raise HTTPException(404, "This analysis was not found. It may have been deleted.")

        c.execute(
            "INSERT INTO analysis_feedback "
            "(analysis_id, user_id, expected_verdict, reason, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(analysis_id, user_id) DO UPDATE SET "
            "expected_verdict = excluded.expected_verdict, "
            "reason = excluded.reason, updated_at = excluded.updated_at",
            (analysis_id, user["id"], expected_verdict, reason, submitted_at, submitted_at),
        )
        saved = c.execute(
            "SELECT expected_verdict, reason, created_at, updated_at "
            "FROM analysis_feedback WHERE analysis_id = ? AND user_id = ?",
            (analysis_id, user["id"]),
        ).fetchone()

    return {
        "analysis_id": analysis_id,
        "expected_verdict": saved["expected_verdict"],
        "reason": saved["reason"],
        "created_at": saved["created_at"],
        "updated_at": saved["updated_at"],
    }


@router.delete("/analyses/{analysis_id}")
def delete_analysis(analysis_id: str, user=Depends(current_user)):
    with db() as c:
        c.execute(
            "DELETE FROM analysis_feedback WHERE analysis_id = ? AND user_id = ?",
            (analysis_id, user["id"]),
        )
        cur = c.execute("DELETE FROM analyses WHERE id = ? AND user_id = ?", (analysis_id, user["id"]))
    if cur.rowcount == 0:
        raise HTTPException(404, "This analysis was not found.")
    return {"deleted": analysis_id}
