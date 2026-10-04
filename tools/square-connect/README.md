# Square connect

`connect_square.py` connects a Square seller account to one environment, once ([#23](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/23)). It saves the OAuth **refresh token** to that environment's Key Vault as `Square--RefreshToken`, under your own `az login`. The API only ever reads it: Square's code flow returns the same refresh token on every refresh, so nothing needs writing back, and the API keeps its 30-day access token in memory. Standard library only; nothing to install.

Run it again only if the seller disconnects the app in Square, the scopes change, or after the breach checklist in [docs/architecture-decisions.md §M](../../docs/architecture-decisions.md#m-security).

## Before the first run

1. `Square--ApplicationSecret` is in the environment's vault (`infra/scripts/Set-TtbSecrets.ps1 -Environment dev -Name Square--ApplicationSecret`).
2. The API's `appsettings.{Environment}.json` has `Square:ApplicationId` (and, outside prod, the sandbox `Square:BaseUrl`). The script reads the same files, so they can't disagree.
3. The Square app's **Redirect URL** (Developer Console → the app → OAuth, sandbox or production tab) is a page on that environment's site, for example `https://as-ttb-ui-dev-centralus.azurewebsites.net/square/connected`. Square requires HTTPS, even in the sandbox. The page itself doesn't matter (it's the site's 404); you only copy its URL.

## Run it

```bash
az login
python tools/square-connect/connect_square.py --env dev     # or test, prod
```

1. Open the printed link and approve. In the sandbox, open it in the browser where the sandbox seller's Dashboard is open (Developer Console → Sandbox test accounts → Open in Square Dashboard). In prod, Thad signs in with his own Square login.
2. Square redirects to the site with `?code=…&state=…`. Copy the whole URL from the address bar and paste it at the hidden prompt.
3. The script rejects the URL if its `state` isn't the one this run created, exchanges the code, checks the new token with Square, saves the refresh token and prints only the merchant ID.

The code in the URL is single-use, expires within minutes and is useless without the app secret, so it showing up in the site's request logs is harmless.

## Tests

```bash
cd tools/square-connect && python -m unittest
```
