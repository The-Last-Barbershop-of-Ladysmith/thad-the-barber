"""Connects Thad's Square account to the site once (issue #23).

Prints Square's consent link; after the seller approves, paste the URL Square redirected to. The script checks its
state, exchanges the code and saves the refresh token to the environment's Key Vault as Square--RefreshToken under
your own az login. The API only ever reads it. Rerun only if the seller disconnects the app or the scopes change.
"""

import argparse
import getpass
import sys

from authorize import authorize_url, code_from_redirect, new_state
from key_vault import APPLICATION_SECRET, REFRESH_TOKEN, read_secret, write_secret
from oauth import Connection, exchange_code
from settings import ASPNETCORE_ENVIRONMENTS, ConnectSettings, read_settings


def main() -> None:
    parser: argparse.ArgumentParser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env", required=True, choices=ASPNETCORE_ENVIRONMENTS, help="which environment to connect")
    args: argparse.Namespace = parser.parse_args()

    settings: ConnectSettings = read_settings(args.env)
    application_secret: str = read_secret(settings.vault_name, APPLICATION_SECRET)
    state: str = new_state()
    print(f"1. Open this link and approve (sign in as the seller):\n\n   "
          f"{authorize_url(settings.base_url, settings.application_id, state)}\n")
    redirect_url: str = getpass.getpass("2. Paste the full URL Square redirected to (hidden): ")
    code: str = code_from_redirect(redirect_url, state)

    connection: Connection = exchange_code(settings.base_url, settings.application_id, application_secret, code)
    write_secret(settings.vault_name, REFRESH_TOKEN, connection.refresh_token)
    print(f"Connected merchant {connection.merchant_id}; saved {REFRESH_TOKEN} in {settings.vault_name}. "
          f"The API renews its access token on its own (this one expires {connection.expires_at}).")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
