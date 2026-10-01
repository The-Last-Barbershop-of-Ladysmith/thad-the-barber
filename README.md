# Thad The Barber

The website for Thad The Barber (The Last Barbershop of Ladysmith): a one-page home with hours, location, announcements, reviews and a gallery, plus online booking backed by Square.

> **Status:** in development, not live yet. The Angular app is ported from the wireframe and runs against mocked data. Square integration, Azure hosting and CI are next. Progress is tracked on the [Thad-The-Barber V1 project board](https://github.com/orgs/The-Last-Barbershop-of-Ladysmith/projects/6).

## What's in the repo

| Folder | What it is |
| --- | --- |
| [`thad-the-barber-ui/`](thad-the-barber-ui/) | The Angular 22 site (PrimeNG, NgRx, Tailwind). Its [README](thad-the-barber-ui/README.md) covers the stack, theming and conventions. |
| [`thad-the-barber-api/`](thad-the-barber-api/) | The ASP.NET Core (.NET 10) API, serving only `/api/*`. Tests are in [`thad-the-barber-api.tests/`](thad-the-barber-api.tests/). |
| [`wireframe/site/`](wireframe/site/) | The original static HTML/JS wireframe, kept as the design and behavior reference. |
| [`docs/`](docs/) | Architecture decisions, business rules and environments. |
| [`.github/`](.github/) | Issue and PR templates, plus the branch-policy alert workflow. |

## Planned architecture

- **Frontend:** Angular, served as static files by a small Express app, with the home page prerendered for SEO.
- **API:** ASP.NET Core. It is the only thing that talks to Square.
- **Data:** no database in v1. Square is the system of record for bookings, services and hours.
- **Hosting:** Azure App Service. Dev and test run on the free tier, and prod will be about $13/month. Secrets live in Key Vault.
- **Quality:** WCAG 2.2 AA, and every change ships with component, unit, API and Playwright tests.

The reasoning behind each choice is in [docs/architecture-decisions.md](docs/architecture-decisions.md), and the deploy pipeline is in [docs/environments.md](docs/environments.md).

## Run it locally

Requires Node `^22.22.3`, `^24.15.0` or `>=26`.

```bash
cd thad-the-barber-ui
npm ci
npm start        # http://localhost:4200
npm test         # unit tests (Vitest)
```

The API needs the .NET 10 SDK (pinned in `global.json`):

```bash
dotnet run --project thad-the-barber-api      # http://localhost:5078/api/health, allows http://localhost:4200
dotnet test --solution thad-the-barber-api/thad-the-barber-api.sln
```

## Roadmap

| Milestone | Scope |
| --- | --- |
| M0 | Foundation: repo setup, docs, open business rules |
| M1 | Dev and test infrastructure: Azure (Bicep), API scaffold, CI/CD, Playwright |
| M2 | Square integration in the API |
| M3 | Feature audit: wireframe → app |
| M4 | Accessibility: WCAG 2.2 AA |
| M5 | Production launch (deferred) |
| M6 | Barber admin portal (future) |
| M7 | Text alerts (deferred) |

## Contributing

Every change starts from an issue, gets a `Topic/<issue#>-<slug>` branch and ships through a PR. Branching, merge styles and the release flow are in [CONTRIBUTING.md](CONTRIBUTING.md).
