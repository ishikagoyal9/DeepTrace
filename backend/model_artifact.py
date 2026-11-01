"""Fetch and verify the trained classifier checkpoint for production startup."""
import hashlib
import os
import tempfile
from urllib.parse import unquote, urlparse


EXPECTED_SHA256 = "12A3A8412529CB12EEAE0F2A297A330BB04EEFB02B088CE1DB1D6AABA77BF583".lower()
EXPECTED_SIZE = 160_484_933
MAX_DOWNLOAD_BYTES = 200 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024


class _CheckpointIntegrityError(RuntimeError):
    """A fetched checkpoint did not match the pinned artifact."""


def _sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as checkpoint:
        for chunk in iter(lambda: checkpoint.read(CHUNK_SIZE), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _parse_huggingface_file_url(url):
    """Return (repo_id, revision, filename) from a Hub resolve/blob URL."""
    parsed = urlparse(url)
    if parsed.scheme.lower() != "https" or parsed.hostname != "huggingface.co":
        raise RuntimeError(
            "DEEPTRACE_CHECKPOINT_URL must be an HTTPS Hugging Face file URL, "
            "for example https://huggingface.co/owner/repo/resolve/main/model.pth."
        )
    try:
        custom_port = parsed.port
    except ValueError as exc:
        raise RuntimeError("DEEPTRACE_CHECKPOINT_URL has an invalid port.") from exc
    if parsed.username or parsed.password or custom_port:
        raise RuntimeError("DEEPTRACE_CHECKPOINT_URL must not contain credentials or a custom port.")

    parts = [unquote(part) for part in parsed.path.strip("/").split("/")]
    if len(parts) < 5 or parts[2] not in {"resolve", "blob"}:
        raise RuntimeError(
            "DEEPTRACE_CHECKPOINT_URL must identify a file using the Hugging Face "
            "/owner/repo/resolve/revision/path format."
        )

    repo_id = "/".join(parts[:2])
    revision = parts[3]
    filename = "/".join(parts[4:])
    if not all((repo_id, revision, filename)) or ".." in filename.split("/"):
        raise RuntimeError("DEEPTRACE_CHECKPOINT_URL contains an invalid repository file path.")
    return repo_id, revision, filename


def ensure_production_checkpoint(path):
    """Require the pinned model in production; leave local startup unchanged."""
    if os.environ.get("DEEPTRACE_ENV", "").strip().lower() not in {"prod", "production"}:
        return

    if os.path.exists(path):
        size = os.path.getsize(path)
        actual = _sha256_file(path)
        if size != EXPECTED_SIZE or actual != EXPECTED_SHA256:
            raise RuntimeError(
                "Production checkpoint failed integrity verification: "
                f"size={size} (expected {EXPECTED_SIZE}), sha256={actual}."
            )
        return

    url = os.environ.get("DEEPTRACE_CHECKPOINT_URL", "").strip()
    if not url:
        raise RuntimeError(
            "Production checkpoint is missing. Set DEEPTRACE_CHECKPOINT_URL to an "
            "HTTPS Hugging Face file URL."
        )
    repo_id, revision, filename = _parse_huggingface_file_url(url)

    token = os.environ.get("HF_TOKEN", "").strip()
    if not token:
        raise RuntimeError(
            "HF_TOKEN is required to download a private Hugging Face checkpoint. "
            "Configure it as a Render secret with read access to the model repository."
        )

    checkpoint_dir = os.path.abspath(os.path.dirname(path) or ".")
    os.makedirs(checkpoint_dir, exist_ok=True)

    try:
        from huggingface_hub import hf_hub_download

        # Keep the Hub client cache and its temporary/metadata files under a
        # temporary directory beside the final checkpoint. This makes the final
        # os.replace atomic on the same filesystem.
        with tempfile.TemporaryDirectory(prefix=".hf-checkpoint-", dir=checkpoint_dir) as download_dir:
            downloaded_path = hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                revision=revision,
                token=token,
                local_dir=download_dir,
                force_download=True,
            )

            size = os.path.getsize(downloaded_path)
            if size > MAX_DOWNLOAD_BYTES:
                raise _CheckpointIntegrityError("Downloaded checkpoint exceeded the size limit.")
            actual = _sha256_file(downloaded_path)
            if size != EXPECTED_SIZE or actual != EXPECTED_SHA256:
                raise _CheckpointIntegrityError(
                    "Downloaded checkpoint failed integrity verification: "
                    f"size={size} (expected {EXPECTED_SIZE}), sha256={actual}."
                )

            os.replace(downloaded_path, path)
    except _CheckpointIntegrityError:
        raise
    except Exception as exc:
        response = getattr(exc, "response", None)
        status_code = getattr(response, "status_code", None)
        if status_code in {401, 403}:
            message = (
                f"Hugging Face authentication/authorization failed (HTTP {status_code}). "
                "Check that HF_TOKEN is valid and has read access to the repository."
            )
        else:
            message = (
                "Hugging Face checkpoint download failed "
                f"({type(exc).__name__}). Check DEEPTRACE_CHECKPOINT_URL, repository/file "
                "access, revision, and network connectivity."
            )
        # Do not include the underlying exception text: it is unnecessary for
        # diagnosis and avoids accidentally exposing request details in logs.
        raise RuntimeError(message) from None
