# Contributing

How work moves through this repo. The full environment and pipeline picture is in [docs/environments.md](docs/environments.md), and the decisions behind it are in [docs/architecture-decisions.md](docs/architecture-decisions.md).

## Issues and the project board

- Every change starts from a GitHub issue. New issues use the **Feature / enhancement** or **Accessibility** template.
- All issues live on the [Thad-The-Barber V1](https://github.com/orgs/The-Last-Barbershop-of-Ladysmith/projects/6) project. Move the card to **In progress** when you start and **In review** when the PR opens. Merging moves it to **Done**.
- Business rules are recorded once, in [docs/business-rules.md](docs/business-rules.md), with `BR-` IDs.

## Branches

| Branch | Example | Lifetime | Deploys to |
| --- | --- | --- | --- |
| `main` | `main` | Permanent; only receives releases | — |
| `release/<name>` | `release/angry-apple-1.0.0.0` | Kept after release; hotfixes land here | test |
| `dev/<name>` | `dev/angry-apple-1.0.0.0` | Deleted after its release ships; only one at a time | dev |
| `Topic/<issue#>-<slug>` | `Topic/41-booking-http` | Deleted when merged | — |
| `hotfix/<version>-<slug>` | `hotfix/1.0.0.1-hours-typo` | Deleted when merged | test, then prod |

- Use a **capital `Topic/`**. On Windows a lowercase `topic/` collides with the existing `Topic/` folder in `.git/refs` and the push fails.
- Branch topics off the active `dev/*` branch, and name them after the issue number.

## Merging

| From → to | Style | Why |
| --- | --- | --- |
| `Topic/*` → `dev/*` | **Squash** | One commit per issue on dev |
| `dev/*` → `release/*` | **Merge commit** | Keeps history between long-lived branches |
| `release/*` → `main` | **Merge commit** | Done by the release automation after prod approval |
| `hotfix/*` → `release/*` | Either | Short-lived |
| `main` or `release/*` → `dev/*` | **Merge commit** | Syncs a hotfix or release back into dev |

- Never squash between long-lived branches. It rewrites history and causes false conflicts later.
- `Closes #N` only closes an issue when the change reaches `main`. After merging into `dev/*`, close the issue by hand with a comment linking the PR.
- Delete the topic branch after merging (`gh pr merge --squash --delete-branch`).

## Releasing

1. Cut `release/<name>` from `main`, then `dev/<name>` from it.
2. Work issues on topic branches and squash them into dev. Each merge deploys to **dev**.
3. When a feature or epic is done, open `dev/<name>` → `release/<name>` and merge with a merge commit. That deploys to **test** and runs the smoke tests.
4. Approve the `production` environment. The same tested artifact deploys to prod, then the automation merges to `main`, tags the version, publishes release notes and deletes the dev branch.

**Hotfix:** branch `hotfix/<version>-<slug>` off the release branch, PR it into the release branch (deploys to test), approve prod, and the fix flows to `main` and back into the active dev branch.

## Merges aren't blocked (the policy alert is the safety net)

The repo is private on GitHub's **Free** plan, so rulesets and branch protection **aren't enforced**: GitHub will let a bad merge or a direct push through. Instead, the [`policy-alert`](.github/workflows/policy-alert.yml) workflow checks every push and merged PR on `main`, `release/*` and `dev/*`, and flags:

- a direct push (a commit with no merged PR)
- a PR merged while a required check was failing, pending or missing
- the wrong merge style (see the table above)
- a branch merged into the wrong target, such as `Topic/*` → `main`

On a violation it opens (or updates) one `policy-violation` issue for that branch, assigns it to you, and comments on the PR with a ready-made `git revert` command. It never reverts anything itself.

Repository variables (Settings → Secrets and variables → Actions → Variables):

- `POLICY_OWNER`: who the alert issues are assigned to.
- `REQUIRED_CHECKS`: comma-separated check names, the job names in [`ci.yml`](.github/workflows/ci.yml): `gitleaks,ui,api,e2e,lighthouse`.

The rules live in [`.github/policy/`](.github/policy/). Run their tests with `npm test` in that folder (Node 24, no install needed).

## Security checks

- `gitleaks` (in `ci.yml`) scans each PR's commits for secrets. [`.gitleaks.toml`](.gitleaks.toml) extends the default rules and allows only the public Azure role IDs in `infra/`. GitHub secret scanning and push protection are on too.
- `npm audit --audit-level=high` runs in the `ui` check. NuGet audit (`NuGetAuditLevel` in [`Directory.Build.props`](Directory.Build.props)) fails the .NET restore on a high or critical advisory, transitive packages included.
- [Dependabot](.github/dependabot.yml) opens weekly grouped PRs for npm, NuGet and Actions into the active dev branch. Update its `target-branch` when a new `dev/*` branch is cut. Its `dependabot/*` branches squash into dev like topic branches.
- [CodeQL](.github/workflows/codeql.yml) scans TypeScript and C# on PRs, pushes and weekly.
- Every action is pinned to a commit SHA with its version in a comment, every workflow declares `permissions`, and `pull_request_target` isn't allowed. `npm run workflows` in `.github/policy/` checks this, and `policy-tests` runs it on every `.github` change.

## Running things locally

The Angular app lives in `thad-the-barber-ui/`. Node must satisfy `^22.22.3 || ^24.15.0 || >=26`.

```bash
cd thad-the-barber-ui
npm ci
npm start                                  # http://localhost:4200
npm run lint                               # ESLint (TS + templates)
npm test                                   # Vitest, watch mode
npx ng test --watch=false                  # single run
npx ng test --include src/app/store/app.reducer.spec.ts   # one spec
npm run build                              # production build
```

API (.NET 10 SDK, from the repo root):

```bash
dotnet run --project thad-the-barber-api                            # http://localhost:5078
dotnet test --solution thad-the-barber-api/thad-the-barber-api.sln  # xUnit v3 on Microsoft.Testing.Platform
```

Warnings fail the build (`Directory.Build.props`). Coming with their issues: the fake Square gateway and coverage for the API tests (#12), the Playwright end-to-end suite (#14), and the CI workflow that runs all four checks on every PR (#15).

## Pull requests

The [PR template](.github/pull_request_template.md) asks for the issue, the tests you added and screenshots at 390px and 1280px for UI changes. Before opening one:

- lint, tests and build pass locally
- conventions in [CLAUDE.md](CLAUDE.md) and [thad-the-barber-ui/README.md](thad-the-barber-ui/README.md) are followed
- docs are updated if behavior changed
