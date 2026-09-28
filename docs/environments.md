# Environments, CI/CD and Branching

How code moves from a topic branch to production. The decisions behind this are in [architecture-decisions.md](architecture-decisions.md).

## Environments

| | dev | test | prod (later) |
| --- | --- | --- | --- |
| Resource group | `rg-ttb-nonprod` | `rg-ttb-nonprod` | `rg-ttb-prod` |
| App Service plan | `asp-ttb-nonprod` (**F1 Free Linux**, shared) | `asp-ttb-nonprod` | `asp-ttb-prod` (**B1 Linux, Always On**) |
| Web app (Express) | `app-ttb-web-dev` | `app-ttb-web-test` | `app-ttb-web-prod` |
| API app (.NET) | `app-ttb-api-dev` | `app-ttb-api-test` | `app-ttb-api-prod` |
| Deploys when | a PR merges into `dev/*` | a PR merges into `release/*` or `hotfix/*` | a person approves the tested `release/*` artifact |
| Square | Sandbox | Sandbox (seeded test data) | Production |
| Frontend config | `environment.dev.ts` (`-c dev`) | `environment.test.ts` (`-c test`) | `environment.ts` (`-c production`) |
| URL | `*.azurewebsites.net` | `*.azurewebsites.net` | Site on the custom domain, API on `api.<domain>`, managed certificates |
| Cost | $0 | $0 | ~$13/mo |

- **Infrastructure as code:** Bicep in `infra/` (`main.bicep`, `nonprod.bicepparam`, `prod.bicepparam`). Key Vault holds the Square OAuth refresh token.
- **Secrets:** every secret lives in **Key Vault** in every environment, and app settings hold only Key Vault references. See [architecture-decisions.md §M](architecture-decisions.md#m-security). GitHub signs in to Azure with **OIDC federated credentials**, so no Azure secrets are stored in GitHub.
- **Monitoring:** Application Insights, fed by the **Azure Monitor OpenTelemetry Distro** in the .NET API and the Express server, plus the App Insights JavaScript SDK in the browser. W3C `traceparent` headers link browser → API → Square into one transaction (CORS allows `traceparent`/`tracestate`). PII is redacted before export, with sampling and a daily cap to stay within the 5 GB/month free allowance. There's also a $5 budget alert on the subscription.
- **F1 limits:** no Always On (cold starts), 60 CPU-minutes per day, 1 GB RAM, and no deployment slots. The smoke tests warm the app up before they run.

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
