export const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "deeptrace_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", json, body, raw = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;
  if (json) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body });
  } catch {
    throw new ApiError(
      "Can't reach the backend. Start it with python main.py in the backend folder.",
      0
    );
  }

  const isAuthCall = path.startsWith("/auth/login") || path.startsWith("/auth/signup");
  if (res.status === 401 && !isAuthCall) {
    setToken(null);
    onUnauthorized();
  }

  if (!res.ok) {
    let msg = "Something went wrong (" + res.status + ").";
    try {
      const j = await res.json();
      if (typeof j.detail === "string") msg = j.detail;
      else if (Array.isArray(j.detail)) msg = j.detail.map((d) => d.msg).join(". ");
    } catch {
      /* body was not JSON */
    }
    throw new ApiError(msg, res.status);
  }
  return raw ? res : res.json();
}

export const api = {
  signup: (name, email, password) =>
    request("/auth/signup", { method: "POST", json: { name, email, password } }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", json: { email, password } }),
  me: () => request("/auth/me"),

  modelInfo: () => request("/model-info"),

  analyses: () => request("/analyses"),
  analysis: (id) => request("/analyses/" + id),
  remove: (id) => request("/analyses/" + id, { method: "DELETE" }),
  submitFeedback: (id, expectedVerdict, reason) =>
    request("/analyses/" + encodeURIComponent(id) + "/feedback", {
      method: "POST",
      json: { expected_verdict: expectedVerdict, reason },
    }),

  async analyze(file) {
    const fd = new FormData();
    fd.append("file", file);
    const data = await request("/analyze", { method: "POST", body: fd });
    if (data.error) {
      const noFace = /face/i.test(data.error);
      throw new ApiError(
        noFace
          ? "No face found. Try a clip where one face is clearly visible for a few seconds."
          : data.error,
        422
      );
    }
    return data;
  },

  async downloadReport(id, language = "en") {
    const params = new URLSearchParams({ lang: language === "hi" ? "hi" : "en" });
    const res = await request("/report/" + encodeURIComponent(id) + "?" + params.toString(), { raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DeepTrace_Report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};
