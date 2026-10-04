import getpass
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from square_api import Json, square_client

TOKEN_SECRET: str = "Square--SandboxAccessToken"
DEV_SETTINGS: Path = Path(__file__).resolve().parents[2] / "thad-the-barber-api" / "appsettings.Development.json"


def invoke_az_cli(*args: str) -> str:
    executable: str | None = shutil.which("az")
    if executable is None:
        raise SystemExit("The Azure CLI (az) isn't on PATH.")
    result: subprocess.CompletedProcess[str] = subprocess.run(
        [executable, *args], capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip())
    return result.stdout.strip()


def vault_name() -> str:
    return json.loads(DEV_SETTINGS.read_text(encoding="utf-8-sig"))["KeyVault"]["Name"]


def read_token() -> str:
    return invoke_az_cli("keyvault", "secret", "show", "--vault-name", vault_name(), "--name", TOKEN_SECRET,
              "--query", "value", "--output", "tsv")


def store_token() -> None:
    token: str = getpass.getpass("Sandbox seller access token (hidden): ").strip()
    location: Json = square_client(token)("GET", "/v2/locations/main", None)["location"]
    vault: str = vault_name()
    handle, path = tempfile.mkstemp()
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as file:
            file.write(token)
        invoke_az_cli("keyvault", "secret", "set", "--vault-name", vault, "--name", TOKEN_SECRET,
           "--file", path, "--encoding", "utf-8", "--output", "none")
    finally:
        os.remove(path)
    print(f"Token works for sandbox location {location['id']}; saved as {TOKEN_SECRET} in {vault}.")
