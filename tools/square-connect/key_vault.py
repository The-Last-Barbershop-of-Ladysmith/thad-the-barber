import os
import shutil
import subprocess
import tempfile

APPLICATION_SECRET: str = "Square--ApplicationSecret"
REFRESH_TOKEN: str = "Square--RefreshToken"


def invoke_az_cli(*args: str) -> str:
    executable: str | None = shutil.which("az")
    if executable is None:
        raise SystemExit("The Azure CLI (az) isn't on PATH.")
    result: subprocess.CompletedProcess[str] = subprocess.run(
        [executable, *args], capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip())
    return result.stdout.strip()


def read_secret(vault: str, name: str) -> str:
    return invoke_az_cli("keyvault", "secret", "show", "--vault-name", vault, "--name", name,
                         "--query", "value", "--output", "tsv")


def write_secret(vault: str, name: str, value: str) -> None:
    """Passes the value through a temp file, never the command line, and deletes the file straight away."""
    handle, path = tempfile.mkstemp()
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as file:
            file.write(value)
        invoke_az_cli("keyvault", "secret", "set", "--vault-name", vault, "--name", name,
                      "--file", path, "--encoding", "utf-8", "--output", "none")
    finally:
        os.remove(path)
