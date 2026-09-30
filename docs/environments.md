# Environments, CI/CD and Branching

How code moves from a topic branch to production. The decisions behind this are in [architecture-decisions.md](architecture-decisions.md).

## Environments

| | dev | test | prod (later) |
| --- | --- | --- | --- |
| Resource group | `rg-ttb-nonprod-eastus` | `rg-ttb-nonprod-eastus` | `rg-ttb-prod-eastus` |
| App Service plan | `asp-ttb-nonprod-eastus` (**F1 Free Linux**, shared) | `asp-ttb-nonprod-eastus` | `asp-ttb-prod-eastus` (**B1 Linux, Always On**) |
| Web app (Express) | `as-ttb-ui-dev-eastus` | `as-ttb-ui-test-eastus` | `as-ttb-ui-prod-eastus` |
| API app (.NET) | `as-ttb-api-dev-eastus` | `as-ttb-api-test-eastus` | `as-ttb-api-prod-eastus` |
| Deploys when | a PR merges into `dev/*` | a PR merges into `release/*` or `hotfix/*` | a person approves the tested `release/*` artifact |
| Square | Sandbox | Sandbox (seeded test data) | Production |
| Frontend config | `environment.dev.ts` (`-c dev`) | `environment.test.ts` (`-c test`) | `environment.ts` (`-c production`) |
| URL | `*.azurewebsites.net` | `*.azurewebsites.net` | Site on the custom domain, API on `api.<domain>`, managed certificates |
| Cost | $0 | $0 | ~$13/mo |

- **Infrastructure as code:** Bicep in `infra/` (`main.bicep`, `nonprod.bicepparam`, and `prod.bicepparam` at M5). See [Infrastructure](#infrastructure) below.
- **Secrets:** every secret lives in **Key Vault** in every environment, and app settings hold only Key Vault references. See [architecture-decisions.md §M](architecture-decisions.md#m-security). GitHub signs in to Azure with **OIDC federated credentials**, so no Azure secrets are stored in GitHub.
- **Monitoring:** Application Insights, fed by the **Azure Monitor OpenTelemetry Distro** in the .NET API and the Express server, plus the App Insights JavaScript SDK in the browser. W3C `traceparent` headers link browser → API → Square into one transaction (CORS allows `traceparent`/`tracestate`). PII is redacted before export, with sampling and a daily cap to stay within the 5 GB/month free allowance. There's also a $5 budget alert on the subscription.
- **F1 limits:** no Always On (cold starts), 60 CPU-minutes per day, 165 MB outbound data per day, 1 GB RAM, and no deployment slots. All four nonprod apps share one plan's quota. The smoke tests warm the app up before they run. Because of the outbound cap, large media (backdrop frames, gallery) is served from Blob Storage, not the apps (M3-09, #47).

## Infrastructure

`infra/main.bicep` deploys at subscription scope. Names follow **`<type>-ttb-<env>-<region>`** (`rg`, `asp`, `as`, `kv`, `ai`, `log`; storage can't have hyphens, so it's `storttb<env><region>`). `<env>` is `nonprod`/`prod` for shared resources and `dev`/`test`/`prod` for per-environment ones. `nonprod.bicepparam` creates:

| Resource | Name | Notes |
| --- | --- | --- |
| Resource group | `rg-ttb-nonprod-eastus` | East US |
| App Service plan | `asp-ttb-nonprod-eastus` | F1 Free Linux, shared by all four apps |
| Web apps (Express) | `as-ttb-ui-dev-eastus`, `as-ttb-ui-test-eastus` | Node 24 LTS |
| API apps (.NET) | `as-ttb-api-dev-eastus`, `as-ttb-api-test-eastus` | .NET 10 LTS |
| Key Vaults | `kv-ttb-dev-eastus`, `kv-ttb-test-eastus` | One per environment, because the secret names are the same in each. Standard, RBAC, soft delete + purge protection |
| Application Insights | `ai-ttb-dev-eastus`, `ai-ttb-test-eastus` | Workspace-based, on `log-ttb-nonprod-eastus` (30-day retention, 0.15 GB/day cap ≈ 4.5 GB/month, under the 5 GB free allowance) |
| Storage | `storttbnonprodeastus` | Standard LRS, hot. Public-read containers `media-dev` and `media-test`. HTTPS only, TLS 1.2, **shared-key access off** (uploads use Entra ID). Blob CORS allows GET from the web origins |
| Budget | `budget-ttb-monthly` | $5/month on the subscription; emails at 80% and 100% actual and 100% forecast |

Every app: system-assigned identity, HTTPS only, minimum TLS 1.2, FTP and basic-auth publishing disabled, platform CORS **unset** (the API does CORS itself). App, Key Vault and storage names are globally unique in Azure, so a deploy fails if someone else already has one. Because of purge protection, a deleted vault keeps its name for 90 days; recover it instead of redeploying.

**App settings** (none sensitive):

| App | Settings |
| --- | --- |
| web | `APPLICATIONINSIGHTS_CONNECTION_STRING`, `API_ORIGIN`, `MEDIA_BASE_URL`, `NOINDEX` (`true` outside prod) |
| api | `APPLICATIONINSIGHTS_CONNECTION_STRING`, `ASPNETCORE_ENVIRONMENT` (`Dev`/`Test`), `KeyVault__Uri` |

The API reads all its secrets through the Key Vault configuration provider, so the vault URI is its only Key Vault setting (M1-03, #11). If an app ever needs a secret as a setting, use a `@Microsoft.KeyVault(SecretUri=…)` reference; `keyVaultReferenceIdentity` is already the app's own identity.

**Key Vault contents:**

| Name | Kind | Set by |
| --- | --- | --- |
| `Cors--AllowedOrigins--0…N` | secret | Bicep: the environment's web origin, then `extraCorsOrigins`. If you remove an origin, delete its leftover secret by hand |
| `session-jwt-signing` | EC P-256 key (ES256) | Bicep. Generated in the vault and never exported; re-runs don't rotate it |
| `Square--ApplicationSecret`, `Square--RefreshToken`, `Square--WebhookSignatureKey`, `ManageLink--HmacKey`, `Recaptcha--ApiKey`, `Google--ClientSecret`, `Google--RefreshToken` | secrets | You, with `infra/scripts/Set-TtbSecrets.ps1`. Bicep never writes them, so a re-run can't overwrite a real value |

**Role assignments:**

| Who | Role | Scope |
| --- | --- | --- |
| web + api identities | Key Vault Secrets User | their environment's vault |
| api identity | Key Vault Secrets Officer, with an ABAC condition allowing writes to `Square--RefreshToken` only (it rotates) | vault |
| api identity | Key Vault Crypto User | the `session-jwt-signing` key only |
| you (`TTB_ADMIN_OBJECT_ID`) | Key Vault Secrets Officer | each vault |
| GitHub OIDC principal (`TTB_DEPLOY_PRINCIPAL_ID`, #10) | Storage Blob Data Contributor | the storage account |

Key Vault ABAC conditions are in **preview**. If Azure rejects the condition, fall back to Secrets Officer on the vault without the condition and note it here.

### Deploying

You need the Azure CLI and **Owner** (or Contributor + User Access Administrator) on the subscription.

```powershell
az login
$env:TTB_BUDGET_EMAIL    = '<your email>'
$env:TTB_ADMIN_OBJECT_ID = az ad signed-in-user show --query id -o tsv
az deployment sub what-if --location eastus --parameters infra/nonprod.bicepparam
az deployment sub create  --location eastus --parameters infra/nonprod.bicepparam
./infra/scripts/Set-TtbSecrets.ps1 -Environment dev    # then -Environment test
```

Personal values come from environment variables, so they never land in this public repo. A second `create` should report no changes in `what-if`. `budgetStartDate` is fixed in the param file; Azure rejects a monthly budget whose start date is before the current month, so if the first deploy happens after October 2026, move it to the first of that month.

CI (`.github/workflows/infra.yml`) builds and lints the Bicep on every PR that touches `infra/`. Its what-if job is skipped until #10 adds the OIDC login and the `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` and `TTB_BUDGET_EMAIL` repo variables. That identity needs a `pull_request` federated credential and enough rights to run what-if on the subscription.

## CI (every pull request)

| Check | What runs |
| --- | --- |
| `ui` | `npm ci` → `ng lint` → `ng test` (Vitest) → `ng build` → Express server lint + tests (Vitest + supertest) |
| `api` | `dotnet build` → `dotnet test` (xUnit) |
| `e2e` | Playwright with a mocked API and `@axe-core/playwright`, on Chromium + WebKit, desktop + mobile |
| `lighthouse` | Lighthouse CI budgets (performance, SEO, accessibility ≥ 95) on `/` and `/book` |

All four checks must pass before a merge. On failure, traces, screenshots and video are uploaded as artifacts.

## CD (deploy pipeline)

```
merge → dev/X.Y      build web (-c dev, prerender vs dev API) + api → deploy dev apps → smoke (dev)
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
