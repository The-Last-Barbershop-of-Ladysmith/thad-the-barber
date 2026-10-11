import base64
import hashlib
import json
import shutil
import subprocess


def sign_es256(vault: str, key_name: str, data: bytes) -> bytes:
    """Key Vault signs the SHA-256 digest and returns ES256's raw 64-byte r||s, which is what a JWT carries."""
    executable: str | None = shutil.which("az")
    if executable is None:
        raise SystemExit("The Azure CLI (az) isn't on PATH.")
    digest: str = base64.b64encode(hashlib.sha256(data).digest()).decode("ascii")
    result: subprocess.CompletedProcess[str] = subprocess.run(
        [executable, "keyvault", "key", "sign", "--vault-name", vault, "--name", key_name, "--algorithm", "ES256",
         "--digest", digest, "--only-show-errors", "--output", "json"],
        capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise SystemExit("Key Vault refused to sign (are you signed in with az login, with Crypto User on the key?):\n"
                         + result.stderr.strip())

    encoded: str = json.loads(result.stdout)["signature"].replace("-", "+").replace("_", "/")
    signature: bytes = base64.b64decode(encoded + "=" * (-len(encoded) % 4))
    if len(signature) != 64:
        raise SystemExit(f"Key Vault returned a {len(signature)}-byte signature; ES256 needs 64.")
    return signature
