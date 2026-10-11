"""Prints a session token for calling the API from Swagger or a REST client (issue #162).

Builds the same JWT POST /api/session issues and has the environment's Key Vault sign it under your own az login, so
the signing key never leaves the vault. Only dev works: your Crypto User role is on dev's key alone.
"""

import argparse
import sys
import time

from key_vault import sign_es256
from session_jwt import build_token
from settings import ASPNETCORE_ENVIRONMENTS, SigningSettings, read_settings


def main() -> None:
    parser: argparse.ArgumentParser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env", default="dev", choices=ASPNETCORE_ENVIRONMENTS, help="whose key signs (default dev)")
    parser.add_argument("--minutes", type=int, default=60, help="how long the token lasts (default 60)")
    args: argparse.Namespace = parser.parse_args()
    if args.minutes < 1:
        parser.error("--minutes must be at least 1")

    settings: SigningSettings = read_settings(args.env)
    token: str = build_token(
        int(time.time()),
        args.minutes * 60,
        lambda data: sign_es256(settings.vault_name, settings.signing_key_name, data),
    )
    print(token)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
