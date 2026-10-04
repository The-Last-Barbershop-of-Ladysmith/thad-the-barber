import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

SQUARE_VERSION: str = "2026-09-16"


@dataclass(frozen=True)
class Connection:
    refresh_token: str
    merchant_id: str
    expires_at: str


def _post(url: str, body: dict[str, Any] | None, access_token: str | None = None) -> dict[str, Any]:
    headers: dict[str, str] = {"Square-Version": SQUARE_VERSION, "Content-Type": "application/json"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    request: Request = Request(url, method="POST", data=json.dumps(body or {}).encode(), headers=headers)
    try:
        with urlopen(request, timeout=30) as response:
            return json.load(response)
    except HTTPError as error:
        errors: list[dict[str, Any]] = json.loads(error.read() or b"{}").get("errors", [])
        codes: str = ", ".join(e.get("code", "?") for e in errors) or "no details"
        raise SystemExit(f"Square {urlsplit(url).path} returned {error.code} ({codes}).") from None


def exchange_code(base_url: str, application_id: str, application_secret: str, code: str) -> Connection:
    """Trades the authorization code for tokens, then checks the new access token works."""
    tokens: dict[str, Any] = _post(f"{base_url}/oauth2/token", {
        "client_id": application_id,
        "client_secret": application_secret,
        "grant_type": "authorization_code",
        "code": code,
    })
    status: dict[str, Any] = _post(f"{base_url}/oauth2/token/status", None, tokens["access_token"])
    return Connection(tokens["refresh_token"], status["merchant_id"], status["expires_at"])
