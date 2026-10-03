# Environments, CI/CD and Branching

How code moves from a topic branch to production. The decisions behind this are in [architecture-decisions.md](architecture-decisions.md).

## Environments

| | dev | test | prod (later) |
| --- | --- | --- | --- |
| Resource group | `rg-ttb-nonprod-centralus` | `rg-ttb-nonprod-centralus` | `rg-ttb-prod-eastus` |
| App Service plan | `asp-ttb-nonprod-centralus` (**F1 Free Linux**, shared) | `asp-ttb-nonprod-centralus` | `asp-ttb-prod-eastus` (**B1 Linux, Always On**) |
| Web app (Express) | `as-ttb-ui-dev-centralus` | `as-ttb-ui-test-centralus` | `as-ttb-ui-prod-eastus` |
| API app (.NET) | `as-ttb-api-dev-centralus` | `as-ttb-api-test-centralus` | `as-ttb-api-prod-eastus` |
| Deploys when | a PR merges into `dev/*` | a PR merges into `release/*` or `hotfix/*` | a person approves the tested `release/*` artifact |
| Square | Sandbox | Sandbox (seeded test data) | Production |
| Frontend config | `environment.dev-cloud.ts` (`-c devCloud`) | `environment.test.ts` (`-c test`) | `environment.ts` (`-c production`) |
| URL | `*.azurewebsites.net` | `*.azurewebsites.net` | Site on the custom domain, API on `api.<domain>`, managed certificates |
| Cost | $0 | $0 | ~$13/mo |

- **Infrastructure as code:** Bicep in `infra/` (`main.bicep`, `nonprod.bicepparam`, and `prod.bicepparam` at M5). See [Infrastructure](#infrastructure) below.
- **Secrets:** every secret lives in **Key Vault** in every environment, and app settings hold only Key Vault references. See [architecture-decisions.md §M](architecture-decisions.md#m-security). GitHub signs in to Azure with **OIDC federated credentials**, so no Azure secrets are stored in GitHub. See [GitHub → Azure sign-in](#github--azure-sign-in-oidc).
- **Monitoring:** Application Insights, fed by the **Azure Monitor OpenTelemetry Distro** in the .NET API and the Express server (requests, 404s and errors; query strings dropped before export), plus the App Insights JavaScript SDK in the browser. W3C `traceparent` headers link browser → API → Square into one transaction (CORS allows `traceparent`/`tracestate`). PII is redacted before export, with sampling and a daily cap to stay within the 5 GB/month free allowance. There's also a $5 budget alert on the subscription.
- **F1 limits:** no Always On (cold starts), 60 CPU-minutes per day, 165 MB outbound data per day, 1 GB RAM, and no deployment slots. All four nonprod apps share one plan's quota. The smoke tests warm the app up before they run. Because of the outbound cap, large media (backdrop frames, gallery) is served from Blob Storage, not the apps (M3-09, #47).

## Infrastructure

`infra/main.bicep` deploys at subscription scope. Names follow **`<type>-ttb-<env>-<region>`** (`rg`, `asp`, `as`, `kv`, `ai`, `log`; storage can't have hyphens, so it's `storttb<env><region>`). `<env>` is `nonprod`/`prod` for shared resources and `dev`/`test`/`prod` for per-environment ones. `nonprod.bicepparam` creates:

| Resource | Name | Notes |
| --- | --- | --- |
| Resource group | `rg-ttb-nonprod-centralus` | Central US (East US had no F1 quota; prod stays in East US) |
| App Service plan | `asp-ttb-nonprod-centralus` | F1 Free Linux, shared by all four apps |
| Web apps (Express) | `as-ttb-ui-dev-centralus`, `as-ttb-ui-test-centralus` | Node 24 LTS |
| API apps (.NET) | `as-ttb-api-dev-centralus`, `as-ttb-api-test-centralus` | .NET 10 LTS |
| Key Vaults | `kv-ttb-dev-centralus`, `kv-ttb-test-centralus` | One per environment, because the secret names are the same in each. Standard, RBAC, soft delete + purge protection |
| Application Insights | `ai-ttb-dev-centralus`, `ai-ttb-test-centralus` | Workspace-based, on `log-ttb-nonprod-centralus` (30-day retention, 0.15 GB/day cap ≈ 4.5 GB/month, under the 5 GB free allowance) |
| Storage | `storttbnonprodcentralus` | Standard LRS, hot. Public-read containers `media-dev` and `media-test`. HTTPS only, TLS 1.2, **shared-key access off** (uploads use Entra ID). Blob CORS allows GET from the web origins |
| Budget | `budget-ttb-monthly` | $5/month on the subscription; emails at 80% and 100% actual and 100% forecast |

Every app: system-assigned identity, HTTPS only, minimum TLS 1.2, FTP and basic-auth publishing disabled, platform CORS **unset** (the API does CORS itself). App, Key Vault and storage names are globally unique in Azure, so a deploy fails if someone else already has one. Because of purge protection, a deleted vault keeps its name for 90 days; recover it instead of redeploying.

**App settings** (none sensitive):

| App | Settings |
| --- | --- |
| web | `APPLICATIONINSIGHTS_CONNECTION_STRING`, `API_ORIGIN`, `MEDIA_BASE_URL`, `NOINDEX` (`true` outside prod) |
| api | `APPLICATIONINSIGHTS_CONNECTION_STRING`, `ASPNETCORE_ENVIRONMENT` (`Development`/`Test`), `ASPNETCORE_FORWARDEDHEADERS_ENABLED` |

The API reads all its secrets through the Key Vault configuration provider, so the vault name is its only Key Vault setting (M1-03, #11). The name lives only in `appsettings.Development.json` and `appsettings.Test.json`, picked by `ASPNETCORE_ENVIRONMENT`. Dev runs as `Development` (debug behavior included, same as local runs, which also use the dev vault). If an app ever needs a secret as a setting, use a `@Microsoft.KeyVault(SecretUri=…)` reference; `keyVaultReferenceIdentity` is already the app's own identity.

**Key Vault contents:**

| Name | Kind | Set by |
| --- | --- | --- |
| `Cors--AllowedOrigins--0…N` | secret | Bicep: the environment's web origin, then `extraCorsOrigins` (dev adds `http://localhost:4200` for local runs). If you remove an origin, delete its leftover secret by hand |
| `session-jwt-signing` | EC P-256 key (ES256) | Bicep. Generated in the vault and never exported; re-runs don't rotate it |
| `Square--ApplicationSecret`, `Square--RefreshToken`, `Square--WebhookSignatureKey`, `ManageLink--HmacKey`, `Recaptcha--ApiKey`, `Google--ClientSecret`, `Google--RefreshToken` | secrets | You, with `infra/scripts/Set-TtbSecrets.ps1`. Bicep never writes them, so a re-run can't overwrite a real value |

**Role assignments:**

| Who | Role | Scope |
| --- | --- | --- |
| web + api identities | Key Vault Secrets User | their environment's vault |
| api identity | Key Vault Secrets Officer, with an ABAC condition allowing writes to `Square--RefreshToken` only (it rotates) | vault |
| api identity | Key Vault Crypto User | the `session-jwt-signing` key only |
| you (`TTB_ADMIN_OBJECT_ID`) | Key Vault Secrets Officer | each vault |
| `id-ttb-deploy-<env>-<region>` (GitHub, #10) | Website Contributor | its environment's web and API apps only |
| `id-ttb-deploy-<env>-<region>` (GitHub, #10) | Storage Blob Data Contributor | its environment's media container only |
| `id-ttb-preview-nonprod-<region>` (GitHub PRs, #10) | Reader + `TTB What-If Previewer` (custom: what-if and validate only) | the subscription |

Key Vault ABAC conditions are in **preview**. If Azure rejects the condition, fall back to Secrets Officer on the vault without the condition and note it here.

**Lockdown:**

| Control | Nonprod | Prod (M5) |
| --- | --- | --- |
| `CanNotDelete` lock on the resource group (`lock-ttb-<stage>-<region>`) | On | On |
| App access restrictions: deny by default, allow `TTB_ALLOWED_IPS` + the `AzureCloud` service tag (GitHub runners, for smoke tests) | On (`restrictAppAccess = true`) | Off: the site is public. Geo-filtering to DC/MD/VA is a separate M5 decision |
| Key Vault firewall: deny by default, allow the apps' outbound IPs + `TTB_ALLOWED_IPS` | On | On |

- The **lock** blocks deletes, not changes. To tear nonprod down, delete the lock first (`az lock delete --name lock-ttb-nonprod-centralus --resource-group rg-ttb-nonprod-centralus`).
- The **Kudu deploy endpoint** (`*.scm.azurewebsites.net`) keeps its own open rules so CI can deploy; basic auth is off there, so it needs an Entra sign-in.
- `AzureCloud` covers every Azure IP, so anyone running a VM in Azure can reach dev/test too. That's the price of letting GitHub-hosted runners in; the apps still need a session token for anything useful.
- **Your IP changes** (home internet, phone hotspot): when dev/test or the vault start returning 403, set `TTB_ALLOWED_IPS` to the new IP and re-run `create`.
- **Square sandbox webhooks** (M2) come from Square's servers and will be blocked by the dev/test restrictions. When webhooks land, add Square's published IP ranges to `allowedIpRanges`, or send sandbox webhooks to a test tool instead.
- On F1 the apps' **outbound IPs** are shared and can change if Azure moves the app. If the API suddenly can't read Key Vault, re-run `create` to refresh the firewall.

### Deploying

You need the Azure CLI and **Owner** (or Contributor + User Access Administrator) on the subscription.

```powershell
az login
$env:TTB_BUDGET_EMAIL    = '<your email>'
$env:TTB_ADMIN_OBJECT_ID = az ad signed-in-user show --query id -o tsv
$env:TTB_ALLOWED_IPS     = (Invoke-RestMethod https://api.ipify.org)   # comma-separate more than one
az deployment sub what-if --location centralus --parameters infra/nonprod.bicepparam
az deployment sub create  --location centralus --parameters infra/nonprod.bicepparam
./infra/scripts/Set-TtbSecrets.ps1 -Environment dev    # then -Environment test
```

Personal values come from environment variables, so they never land in this public repo. A second `create` should report no changes in `what-if`. `budgetStartDate` is fixed in the param file; Azure rejects a monthly budget whose start date is before the current month, so if the first deploy happens after October 2026, move it to the first of that month.

CI (`.github/workflows/infra.yml`) builds and lints the Bicep on every PR that touches `infra/`, then runs what-if as the read-only preview identity (below). It never deploys: `create` is still run by hand.

### GitHub → Azure sign-in (OIDC)

GitHub Actions signs in with **user-assigned managed identities** that trust GitHub's OIDC tokens (federated credentials), so there's no client secret or publish profile anywhere. Bicep creates them with the rest of the stage; they're free.

| Identity | Trusts (OIDC subject) | Can do |
| --- | --- | --- |
| `id-ttb-deploy-dev-centralus` | jobs in GitHub environment `dev` | deploy `as-ttb-ui-dev-centralus` + `as-ttb-api-dev-centralus`, upload to `media-dev` |
| `id-ttb-deploy-test-centralus` | jobs in GitHub environment `test` | the same for the test apps and `media-test` |
| `id-ttb-preview-nonprod-centralus` | `pull_request` jobs | read the subscription and run what-if (no writes) |
| prod (M5) | jobs in GitHub environment `production` | created by `prod.bicepparam` |

- One identity per environment, rather than one app registration for all of them, so the `dev` sign-in can't touch test (they share a resource group).
- The subjects use the repo's **immutable** form, `repo:The-Last-Barbershop-of-Ladysmith@118852654/thad-the-barber@1391006695:environment:dev` (owner and repo IDs, GitHub's default for this repo). A renamed or re-created repo won't match. If GitHub's subject format ever changes, update `githubSubjectPrefix` in `main.bicep`.
- Fork pull requests get no OIDC token, so they can't use any identity.

**GitHub environments** (created by `infra/scripts/Set-TtbGitHub.ps1`):

| Environment | Deploys from | Approval | `AZURE_CLIENT_ID` variable |
| --- | --- | --- | --- |
| `dev` | `dev/*` | none | `id-ttb-deploy-dev-centralus` |
| `test` | `release/*`, `hotfix/*` | none | `id-ttb-deploy-test-centralus` |
| `production` | `release/*`, `hotfix/*` | required reviewer (you) | added at M5 |

Repo variables `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` and `AZURE_PREVIEW_CLIENT_ID` (IDs, not secrets). The what-if job also needs the `TTB_BUDGET_EMAIL`, `TTB_ADMIN_OBJECT_ID` and `TTB_ALLOWED_IPS` values; they're repo **secrets** so the public workflow logs mask them. After deploying, set up GitHub with the same `TTB_*` variables still set in your shell:

```powershell
./infra/scripts/Set-TtbGitHub.ps1    # safe to re-run, e.g. after your IP changes
```

`.github/workflows/azure-login.yml` checks the sign-in: on a push to `dev/*` it signs in as dev (on `release/*` or `hotfix/*`, as test), confirms it can see its own two apps, and fails if it can see the other environment's.

## CI (every pull request)

| Check | What runs |
| --- | --- |
| `ui` | `npm ci` → `npm audit` → `ng lint` → `ng test` (Vitest) → `build:express:test`, uploaded for `e2e` and `lighthouse` |
| `express` | Express `npm ci` → `npm audit` → `npm test` (Vitest + supertest) |
| `api` | `dotnet build` → `dotnet test` (xUnit) |
| `e2e` | Playwright with a mocked API and `@axe-core/playwright`, on Chromium + WebKit, desktop + mobile, against the `ui` job's `test` build served by Express (real CSP header and 404s) |
| `lighthouse` | Lighthouse on `/` and `/book` of the `ui` job's build, served by Express with prod's headers (`NOINDEX=false`): accessibility ≥ 95, best practices and SEO ≥ 90, performance reported only |

All five checks must pass before a merge. On failure, traces, screenshots and video are uploaded as artifacts.

## CD (deploy pipeline)

```
merge → dev/X.Y      build web (-c devCloud, prerender vs dev API) + api → deploy dev apps → smoke (dev)
merge → release/X.Y  build API ARTIFACT once + web (-c test) + web (-c production), same commit
                     → deploy api + web-test to test → smoke + sandbox booking round trip (test)
approve production   deploy SAME API ARTIFACT + the prod web build → prod → smoke (read-only)
                     → merge release/X.Y → main → tag vX.Y.0 → GitHub Release → delete dev/X.Y
nightly              smoke (test)
```

- **API: build once.** The API artifact that passed test is the one that reaches prod; its environment differences come only from app settings and Key Vault (the CORS origins array, secrets).
- **Web: built per environment** from `environment.*.ts` (✅ chosen over runtime config). The test and prod web builds come from the same commit in the same run, so they only differ in environment values and prerendered data.
- **CORS** is set only in the .NET app, from the `Cors--AllowedOrigins--N` array in Key Vault. App Service's platform CORS stays empty.
- **Rollback:** re-run the deploy with the previous release artifact.

Workflows: [`cd-dev.yml`](../.github/workflows/cd-dev.yml) (push to `dev/**`) calls the reusable [`build.yml`](../.github/workflows/build.yml), then [`deploy.yml`](../.github/workflows/deploy.yml).

- `build.yml` names artifacts `ttb-ui-<env>-<version>-<sha7>` and `ttb-api-<version>-<sha7>`, where `<version>` is the branch name after its first slash.
- `deploy.yml` signs in as the environment's identity, zip-deploys each given artifact, waits until the site's `/healthz` and the API's `/api/health` report the deployed commit, then runs the smoke suite against that environment's URLs.
- On dev, only the app(s) a push changed are rebuilt and redeployed. A docs-only push deploys nothing, and a manual run deploys both. Dev has no rollback: a red run emails the owner and the fix rolls forward.
- The UI zip is the whole Express app (`thad-the-barber-express/`, production packages only) with the Angular build in `public/app` and a `build-info.json` (version and commit) for `/healthz`. App Service runs its `npm start`. `build.yml`'s `ui-builds` entries name the UI script to run, `build:express:<build>`, whose post-build hook writes `csp-sources.json`.
- [`cd-test.yml`](../.github/workflows/cd-test.yml) runs on pushes to `release/**` and `hotfix/**`. It builds the API and two UI builds (`-c test`, `-c production`) once, keeps them for 90 days, deploys the API and the test UI to test, then runs smoke. The prod UI build and the same API artifact wait for the production job (#92). The sandbox booking round trip joins the smoke suite with #28/#29.
- **Rollback (test):** run `cd-test` by hand on the release branch with the run ID of the last good build. It redeploys that run's artifacts without rebuilding. The `test` environment only admits `release/*` and `hotfix/*`, so pick the release branch in the run dialog.
- **Nightly:** `cd-test` smoke-tests test every day at 09:17 UTC. Scheduled runs only fire from the default branch, so this starts once the workflow reaches `main` with the first release.

## Branching and release flow

```
main ──────────────●────────────────────────●──── (tag v1.2.0)
                    \                      ↑ auto-merge after prod approval
release/1.2          ●──────●─────────●────┘   (kept; hotfixes land here)
                      \      ↑ merge   ↑ merge          → deploys TEST
dev/1.2                ●──●──●────●────●  (deleted after release)   → deploys DEV
                         ↑ squash  ↑ squash
Topic/123-ticker-bar ────┘         Topic/130-…   (one per issue, deleted on merge)
```

| Step | Branch | Merge style | Result |
| --- | --- | --- | --- |
| Start a release | Cut `release/X.Y` from `main`, then `dev/X.Y` from it | n/a | n/a |
| Work an issue | `Topic/<issue#>-<slug>` off `dev/X.Y` | **Squash** into `dev/X.Y`, with `Closes #<issue>` | Dev deploy + smoke |
| Feature or epic done | PR `dev/X.Y` → `release/X.Y` | **Merge commit** | Test deploy + smoke + sandbox round trip |
| Ship | Approve the `production` environment | Automated | Prod deploy, then merge to `main`, tag `vX.Y.0`, publish release notes, delete `dev/X.Y` |
| Hotfix | `hotfix/X.Y.Z-<slug>` off `release/X.Y` | PR into `release/X.Y` | Test → approval → prod → `main` + tag, then an automatic PR into the active `dev/*` |

**Rules:**
- **Names in use:** `X.Y` stands for the release name. The active dev branch is **`dev/angry-apple-1.0.0.0`**, and its release branch will be `release/angry-apple-1.0.0.0`. Topic branches use a **capital `Topic/`**, because a lowercase `topic/` collides with the existing `Topic/` ref folder on Windows and the push fails.
- Closing keywords (`Closes #N`) only close issues when the change reaches `main`. Until then, close finished issues by hand with a link to the PR.
- Only one `dev/*` branch is active at a time, because there's one dev environment.
- Never squash between long-lived branches. It rewrites history and causes false conflicts later.
- Cut the next `dev/*` from `main` after a release. If it was cut earlier, the release workflow opens a `main` → `dev/*` PR.
- Versions follow SemVer. `release/X.Y` ships as `vX.Y.0`, and hotfixes bump the patch number.
- Branch rulesets for `main`, `release/*` and `dev/*` allow changes by PR only and require all four checks. On a private repo, rulesets are only enforced on a paid GitHub plan; otherwise the checks still run but can't block a merge.
