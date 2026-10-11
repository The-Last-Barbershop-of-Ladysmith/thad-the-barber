"""The same anonymous session JWT the API's SessionTokenIssuer builds (Features/Session/Services)."""

import base64
import json
import uuid
from collections.abc import Callable

ISSUER: str = "ttb-api"
AUDIENCE: str = "ttb-api"
HEADER: dict[str, str] = {"alg": "ES256", "typ": "JWT"}


def encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def build_token(issued_at: int, lifetime_seconds: int, sign: Callable[[bytes], bytes]) -> str:
    claims: dict[str, object] = {
        "sub": uuid.uuid4().hex,
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": issued_at,
        "exp": issued_at + lifetime_seconds,
    }
    signing_input: str = f"{encode(json.dumps(HEADER).encode())}.{encode(json.dumps(claims).encode())}"
    return f"{signing_input}.{encode(sign(signing_input.encode('ascii')))}"
