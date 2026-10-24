# Session token

`session_token.py` prints a session token for calling the API from Swagger or a REST client ([#162](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/162)). Since [#34](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/34), every `/api` call except `/api/session`, `/api/health` and `/api/shop` needs one, and the site gets it through reCAPTCHA, which Swagger can't do.

It builds the same JWT `POST /api/session` issues and has dev's Key Vault sign it with `session-jwt-signing` under your own `az login`, so the key never leaves the vault. The vault and key names come from the API's appsettings. Standard library only; nothing to install.

**Dev only.** Your Key Vault Crypto User role is on dev's key alone (Bicep's `canAdminSignSessions`), so the script reads dev's vault from the API's `appsettings.Development.json`. Test and prod only issue tokens through reCAPTCHA.

## Run it

```bash
az login
python tools/session-token/session_token.py              # 60 minutes
python tools/session-token/session_token.py --minutes 15
```

The token works for the local API (`dotnet run --project thad-the-barber-api`, which runs as Development and uses dev's key) and the deployed dev API. In Swagger, click **Authorize** and paste the token (without `Bearer `). Swagger then sends it with every request until you close the page.

It's a bearer credential for dev until it expires, so keep it out of chat, issues and commits.

## Tests

```bash
cd tools/session-token && python -m unittest
```
