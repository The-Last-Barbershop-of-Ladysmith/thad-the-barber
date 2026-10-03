# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

- `wireframe/site/` — the original static HTML/JS wireframe (`index.html`, `mobile.html`, `book.html`, `support.js`). It is the design and behavior reference; don't edit it as part of app work.
- `thad-the-barber-ui/` — the Angular 22 app built from the wireframe. All commands below run from this folder.
- `thad-the-barber-express/` — the Express 5 web server (JavaScript, CommonJS) that App Service runs for the site; the zip deploy is this folder with the Angular build in `public/app/thad-the-barber-ui` (one folder per app, so a later portal can sit beside it; `npm run build:express:<env>` in the UI writes it there, plus `csp-sources.json` and `brand.css` from its post-build hook, `scripts/write-express-files.ts`). `routes/index.js` serves prerendered pages, the app shell for `clientRoutes` (`/book` until #58) and the prerendered `/404` page with a 404 for anything else; `lib/` holds the per-request CSP nonce, security headers (helmet, `NOINDEX`) and telemetry (Azure Monitor, started from `bin/www` only when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set); `routes/health.js` serves `/healthz`. Thrown errors render the themed `views/error.ejs` (`lib/error-handler.js` middleware: status, request ID = trace ID, own strict CSP, styled by `public/stylesheets/error.css` over `/brand.css`); the stack trace shows only when `NODE_ENV=development`, which App Service never sets. `ERROR_TEST_ROUTE=true` adds `/_test/error?status=` for tests (Playwright's CI server). Tests: `npm test` (Vitest + supertest against a fake build).
- `thad-the-barber-api/` — the ASP.NET Core (.NET 10) minimal API, `/api/*` only; xUnit v3 tests in the sibling `thad-the-barber-api.tests/`. Run with `dotnet run --project thad-the-barber-api` and test with `dotnet test --solution thad-the-barber-api/thad-the-barber-api.sln` from the repo root (`global.json` pins the SDK and opts into Microsoft.Testing.Platform). Every test run writes Cobertura coverage to `thad-the-barber-api.tests/TestResults/coverage.cobertura.xml` (options in the test csproj's `TestingPlatformCommandLineArguments`; `coverage.config` leaves out generated code). Tests host the API through `ApiFactory`, which swaps in `Fakes/FakeSquareService`; pass `new ApiFactory(square: …)` to change what Square returns. Key Vault loads when `KeyVault:Name` is set (only in `appsettings.Development.json`/`appsettings.Test.json`, picked by `ASPNETCORE_ENVIRONMENT`; one `Development` environment covers local runs and the Azure dev app, debug behavior included, so local runs need `az login`; tests run as `Testing` with no vault; prod will need `appsettings.Production.json`). CORS origins come from `Cors:AllowedOrigins` in Key Vault (dev's list includes `http://localhost:4200`) and startup fails if the list is empty or has a wildcard. Minimal APIs in feature folders (the user's choice, 2026-09-30): `Features/<Feature>/` holds that feature's `*Endpoints.cs` (`Add…`/`Map…Endpoints` extension methods), service and interface, rules and request/response records; `Square/` holds `ISquareService`/`SquareService` (every Square call) and `SquareSettings`; `Infrastructure/` holds app-wide setup (`Cors/`, `SecurityHeaders`). Configuration classes are named `*Settings` (`*Options` would clash with ASP.NET's `CorsOptions`). One project, no Domain/Infrastructure project split until a second deployable or the database needs it. Keep business rules in plain classes (no `HttpContext` or Square types) and Square behind an interface.
- `tools/report-viewer/` — the CI reports viewer (.NET 10 minimal API, issue #137): serves the private `reports` blob container behind App Service authentication (Entra, owner only). `Features/Reports/` (path rules, folder listing, endpoint), `Storage/` (`IReportStore`/`BlobReportStore`), `Infrastructure/` (headers). Tests in the sibling `tools/report-viewer.tests/`: `dotnet test --solution tools/report-viewer/report-viewer.slnx`. Infra is `infra/reports.bicep`, deployed separately from `main.bicep` (it creates Entra objects, which what-if can't preview).
- `thad-the-barber-ui/README.md` is the detailed source of truth for stack versions, theming tables and conventions. `docs/wireframe-audit.md` maps every wireframe element, token, and piece of logic to its place in the app.

## Commands

```bash
cd thad-the-barber-ui
npm start                     # ng serve → http://localhost:4200
npm run build                 # production build to dist/
npm test                      # Vitest via @angular/build:unit-test
npx ng test --watch=false     # single run
npx ng test --include src/app/store/app.reducer.spec.ts   # one spec file
npm run e2e                   # Playwright against mocks (Chromium + WebKit, desktop + mobile); CI=1 serves the build with Express (run `build:express:test` first); see README
npm run start:express:dev     # build into the Express app and serve it at http://localhost:3000
npm run e2e:smoke             # Playwright smoke; local URLs unless BASE_URL / API_BASE_URL are set
npm run lint                  # ESLint (TS + templates)
npm run lint:fix              # ESLint also formats .ts files
npm run format                # Prettier — HTML/SCSS/CSS only
```

Node must satisfy `^22.22.3 || ^24.15.0 || >=26` or the Angular CLI refuses to run.

## Architecture

- **Standalone, zoneless, signals.** Files use Angular 22 CLI naming (`home.ts` / class `Home`, no `.component` suffix). Bootstrap is `src/app/app.config.ts`, which `app.config.browser.ts` (adds browser telemetry, `core/telemetry/`) and `app.config.server.ts` (prerender) each merge.
- **Features own their state.** `app.routes.ts` loads `features/home` eagerly (it's the prerendered landing page, so a click shouldn't wait on a second download) and lazy-loads `features/booking`; each `<feature>.routes.ts` registers its NgRx slice with `provideState` + `provideEffects`, so a slice only exists after its route loads. Only the root `layout` slice (mobile menu, `src/app/store/`) is registered at bootstrap.
- **State folder pattern** (per feature `state/`): `*.state.ts` (interface + initial state), `*.actions.ts` (`createActionGroup`, page vs API sources), `*.feature.ts` (`createFeature` + reducer + `extraSelectors`/derived `MemoizedSelector`s), `*.effects.ts` (functional effects calling the feature's services). Put reusable helpers in `shared/utils`.
- **Persistence.** `store/meta/meta.reducers.ts` uses `ngrx-store-localstorage` to sync the `home` and `booking` slices to localStorage under `ttb-<key>`, base64-encoded, rehydrating when a lazy slice registers. Each feature clears its persisted state with its own `State Reset` action. Add a slice to `syncKeys` to persist it.
- **Mocked backend.** `HomeContentService`, `SmsSignupService`, `AvailabilityService`, `BookingService` return local data (`features/home/data`, pseudo-random booked slots). Each notes the endpoint it should eventually call; `environments/` has one file per build configuration (`development` local, `devCloud`, `test`, `production`), typed by `environment.model.ts`; build request URLs as `${environment.apiBaseUrl}/path`.
- **Shop data** (phone, address, hours, socials) lives in `core/config/shop-info.ts`; `core/services/shop-hours.service.ts` derives the hours table and the live "Open now" status.
- **Backdrop.** `shared/components/backdrop` renders the fixed background. `scroll` mode is the wireframe's scroll-scrubbed video: `FrameScrubber` (`frame-scrubber.ts`) progressively loads 7 clips × 121 AVIF frames from `public/assets/frames3/c1..c7` onto a canvas, with keyframes anchored to page sections. `still` mode shows one keyframe (booking page). (The README's "not in this version yet" note about the backdrop predates the scrubber.)

## Theming

Rule: **if PrimeNG has a component for it, restyle it with tokens instead of building a custom component.**

- `src/app/theme/`: `tokens/primitive.ts` (palette, radii, font) → `tokens/semantic.ts` (plus brand values under `semantic.extend.brand`, emitted as `--p-brand-*`) → `tokens/components/*.ts` (one file per PrimeNG component) → `thad-preset.ts` (`definePreset(Aura, …)`).
- `theme/tailwind/theme.css` maps tokens to Tailwind colors/radii and defines named utilities (`glass`, `tile`, `eyebrow`, `section-title`, …).
- `styles.css` sets the CSS layer order `theme, base, primeng, components, utilities` so Tailwind beats PrimeNG without `!important`. Dark scheme is on via `<html class="app-dark">`.
- Tailwind 4 + `tailwindcss-primeui`. **Never PrimeFlex.** PrimeNG 22 needs the license key in `core/config/primeui-license.ts`.

## Conventions (enforced or expected)

Components:
- Templates over 4 lines go in a `.html` file.
- Style a wrapper element in the template, never the host (no `host: { class }`, no `:host`).
- At most 2 plain Tailwind utilities per element; move the rest to a named class in the component `.scss`. Theme utilities and breakpoint prefixes (`md:`, `lg:`) don't count and stay inline.
- SCSS nests to follow the DOM. PrimeNG overlay content (drawer, Galleria lightbox) stays top-level.
- Component SCSS is unlayered and beats Tailwind, so never set in SCSS a property that an inline breakpoint class changes — keep the base value inline too (`px-6 md:px-8`).
- For `nav-link`, set `--link-color`, not `color`.

TypeScript (`eslint.config.js`, plus `eslint/items-per-line.js`):
- Explicit types on every variable, property, parameter (including callbacks/destructuring) and return value. The only exceptions are the `createActionGroup`/`createFeature` declarations, which carry a one-line `eslint-disable` with a reason.
- Semicolons everywhere, including interface/type members.
- One item per line from 3 items; 1-2 items stay on one line (array items, object props, call args, params, destructured props, import specifiers).
- ESLint formats `.ts`; Prettier formats HTML/SCSS/CSS only (Prettier would undo the one-per-line wrapping).
- NgRx typing: effects are `FunctionalEffect`; derived selectors are `MemoizedSelector<object, T>`; feature selectors are destructured with `: typeof xFeature`; action payloads are named interfaces; store is injected as `inject<Store<AppState>>(Store)`.
- `tsconfig.json` is strict with `noUncheckedIndexedAccess`, `noUnused*`, and `strictTemplates`.

## Tests

The existing specs encode the wireframe's placeholder behavior (booking rules, hours, mock data), not confirmed business rules. When business rules change, a failing spec may need updating rather than indicating a bug. Keep the existing specs; add new ones per feature (see `docs/wireframe-audit.md` §9).
