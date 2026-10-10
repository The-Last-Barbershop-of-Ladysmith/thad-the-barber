import secrets
from urllib.parse import parse_qs, urlencode, urlsplit

# Buyer-level only (docs/architecture-decisions.md §C). Never APPOINTMENTS_ALL_WRITE.
SCOPES: tuple[str, ...] = (
    "APPOINTMENTS_READ",
    "APPOINTMENTS_WRITE",
    "APPOINTMENTS_ALL_READ",
    "APPOINTMENTS_BUSINESS_SETTINGS_READ",
    "CUSTOMERS_READ",
    "CUSTOMERS_WRITE",
    "ITEMS_READ",
    "MERCHANT_PROFILE_READ",
)


def new_state() -> str:
    return secrets.token_urlsafe(32)


def authorize_url(base_url: str, application_id: str, state: str) -> str:
    """Square's consent page. session=false makes the seller sign in (Square ignores it in the sandbox)."""
    query: str = urlencode({
        "client_id": application_id,
        "scope": " ".join(SCOPES),
        "session": "false",
        "state": state,
    })
    return f"{base_url}/oauth2/authorize?{query}"


def code_from_redirect(redirect_url: str, expected_state: str) -> str:
    """The authorization code from the URL Square redirected to, after checking it carries our state."""
    query: dict[str, list[str]] = parse_qs(urlsplit(redirect_url.strip()).query)
    if "error" in query:
        raise SystemExit(f"Square returned an error: {query['error'][0]} {query.get('error_description', [''])[0]}".strip())
    state: list[str] = query.get("state", [])
    if len(state) != 1 or not secrets.compare_digest(state[0], expected_state):
        raise SystemExit("The redirect URL's state doesn't match this run. Start again.")
    code: list[str] = query.get("code", [])
    if len(code) != 1 or not code[0]:
        raise SystemExit("The redirect URL has no authorization code.")
    return code[0]
