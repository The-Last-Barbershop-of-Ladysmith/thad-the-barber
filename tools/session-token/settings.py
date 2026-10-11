import json
from dataclasses import dataclass
from pathlib import Path

API_FOLDER: Path = Path(__file__).resolve().parents[2] / "thad-the-barber-api"


@dataclass(frozen=True)
class SigningSettings:
    vault_name: str
    signing_key_name: str


def read_settings() -> SigningSettings:
    """Dev's names, as the API reads them: appsettings.json overlaid with appsettings.Development.json."""
    merged: dict = {}
    for name in ("appsettings.json", "appsettings.Development.json"):
        for section, values in json.loads((API_FOLDER / name).read_text(encoding="utf-8-sig")).items():
            merged[section] = {**merged.get(section, {}), **values} if isinstance(values, dict) else values

    settings: SigningSettings = SigningSettings(
        vault_name=merged.get("KeyVault", {}).get("Name", ""),
        signing_key_name=merged.get("Session", {}).get("SigningKeyName", ""),
    )
    missing: list[str] = [field for field, value in vars(settings).items() if not value]
    if missing:
        raise SystemExit(f"The API's dev appsettings are missing: {', '.join(missing)}")
    return settings
