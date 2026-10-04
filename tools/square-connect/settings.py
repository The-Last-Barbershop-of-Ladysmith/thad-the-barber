import json
from dataclasses import dataclass
from pathlib import Path

API_FOLDER: Path = Path(__file__).resolve().parents[2] / "thad-the-barber-api"
ASPNETCORE_ENVIRONMENTS: dict[str, str] = {"dev": "Development", "test": "Test", "prod": "Production"}


@dataclass(frozen=True)
class ConnectSettings:
    base_url: str
    application_id: str
    vault_name: str


def read_settings(environment: str) -> ConnectSettings:
    """The API's own settings for the environment: appsettings.json overlaid with appsettings.{Environment}.json."""
    merged: dict = {}
    for name in ("appsettings.json", f"appsettings.{ASPNETCORE_ENVIRONMENTS[environment]}.json"):
        path: Path = API_FOLDER / name
        if path.exists():
            for section, values in json.loads(path.read_text(encoding="utf-8-sig")).items():
                merged[section] = {**merged.get(section, {}), **values} if isinstance(values, dict) else values

    square: dict = merged.get("Square", {})
    settings: ConnectSettings = ConnectSettings(
        base_url=square.get("BaseUrl", "").rstrip("/"),
        application_id=square.get("ApplicationId", ""),
        vault_name=merged.get("KeyVault", {}).get("Name", ""),
    )
    missing: list[str] = [field for field, value in vars(settings).items() if not value]
    if missing:
        raise SystemExit(f"appsettings for {environment} is missing: {', '.join(missing)}")
    return settings
