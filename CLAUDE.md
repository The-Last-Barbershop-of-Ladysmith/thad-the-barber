# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Details that only some tasks need live in `docs/claude/`; read the one that matches your task before starting.

## Repository layout

- `wireframe/site/` — the original static HTML/JS wireframe (`index.html`, `mobile.html`, `book.html`, `support.js`). It is the design and behavior reference; don't edit it as part of app work.
- `thad-the-barber-ui/` — the Angular 22 app built from the wireframe. All commands below run from this folder. Its `README.md` is the detailed source of truth for stack versions, theming tables and conventions; `docs/wireframe-audit.md` maps every wireframe element, token, and piece of logic to its place in the app. Booking flow, manage pages, shop slice, announcements and backdrop: `docs/claude/ui-architecture.md`.
- `thad-the-barber-express/` — the Express 5 web server (JavaScript, CommonJS) that App Service runs for the site: it serves the prerendered Angular build (zip deploy is this folder with the build in `public/app/thad-the-barber-ui`), the per-request CSP nonce, security headers and the themed error page. Tests: `npm test`. Details: `docs/claude/express.md`.
- `thad-the-barber-api/` — the ASP.NET Core (.NET 10) minimal API, `/api/*` only; xUnit v3 tests in the sibling `thad-the-barber-api.tests/`. Run with `dotnet run --project thad-the-barber-api` and test with `dotnet test --solution thad-the-barber-api/thad-the-barber-api.sln` from the repo root. Feature + layer folders (`Features/<Feature>/Endpoints|Services|Models|…`), namespaces follow folders, one type per file, record declarations and `new` calls one property/argument per line with the closing `)` on its own line, booleans `Is`/`Can`/`Has`, test folders mirror the API's with one test file per class. Layers, auth, Square, errors, telemetry and test helpers: `docs/claude/api.md`.
- `tools/` — the CI reports viewer, the Square OAuth connect, the dev session token and the Square sandbox seed; plus the gallery and announcements, which live only in the environment's storage account (images in the public media container, `announcements.json` in a private content container) and reach the site through the API. Details: `docs/claude/tools-and-content.md`.

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
- **Features own their state.** `app.routes.ts` loads `features/home` eagerly and lazy-loads `features/booking`; each `<feature>.routes.ts` registers its effects with `provideEffects`. The root `layout`, `shop`, `announcements` and `home` slices are registered at bootstrap as root reducers in `app.config.ts`; `booking` is a lazy `provideState` on the booking routes. Every derived selector lives on its feature's `extraSelectors`, wrapped one argument per line, with any logic in a named `to…` function and projector parameters named after the field they get. Slices are independent: `AppState` types only `layout`, and nothing reads another slice through it.
- **State folder pattern** (per feature `state/`): `*.state.ts` (interface + initial state), `*.actions.ts` (an `<Slice>ActionTypes` enum of type strings with `[Source]` prefixes such as `[Shop]`/`[Shop API]`, so slices never share a type, plus one `createAction` per action named like `ShopInfoRequest`/`ShopInfoRequestSuccess`/`ShopInfoRequestFailure`, always wrapped one argument per line (even with no props), payloads inline as `props<{ shopInfo: ShopInfo; }>()`; no `createActionGroup`), `*.feature.ts` (`createFeature` + reducer + `extraSelectors`/derived `MemoizedSelector`s), `*.effects.ts` (functional effects calling the feature's services). Put reusable helpers in `shared/utils`.
- **Persistence.** `store/meta/meta.reducers.ts` uses `ngrx-store-localstorage` to sync the `home` slice's SMS signup and the `shop` slice's `shopInfo` (not their load statuses, so every visit refreshes them) to localStorage under `ttb-<key>`, base64-encoded, rehydrating at bootstrap. From `booking` only the 15-minute lookup token is kept, in `sessionStorage` (the tab's, a second `sessionStorageSyncReducer` in the same file): no picks, details or manage tokens stay on the device; the manage link (in the confirmation and the calendar event) and Square's booking site are the ways back to a booking. `restoreDates: false` keeps saved ISO strings as strings. `home` clears its saved copy with its `State Reset` action. Add a slice to `syncKeys` to persist it.
- **Booking, shop data, backdrop.** Booking is real (`/api/bookings/*`); the page owns the form and nothing from `booking` is saved on the device, and every booking date and time shows on the shop's clock. Shop data comes from the anonymous `GET /api/shop` into the root `shop` slice. The booking flow, manage pages, error notices, shop slice and backdrop are in `docs/claude/ui-architecture.md`.

## Theming

Rule: **if PrimeNG has a component for it, restyle it with tokens instead of building a custom component.**

- `src/app/theme/`: `tokens/primitive.ts` (palette, radii, font) → `tokens/semantic.ts` (plus brand values under `semantic.extend.brand`, emitted as `--p-brand-*`) → `tokens/components/*.ts` (one file per PrimeNG component) → `thad-preset.ts` (`definePreset(Aura, …)`).
- `theme/tailwind/theme.css` maps tokens to Tailwind colors/radii and defines named utilities (`glass`, `tile`, `eyebrow`, `section-title`, …).
- `styles.css` sets the CSS layer order `theme, base, primeng, components, utilities` so Tailwind beats PrimeNG without `!important`. Dark scheme is on via `<html class="app-dark">`.
- Tailwind 4 + `tailwindcss-primeui`. **Never PrimeFlex.** PrimeNG 22 needs the license key in `core/config/primeui-license.ts`.

## Conventions (enforced or expected)

Components:
- A component stays at most ~300 lines of logic (the user's choice, 2026-11-01): when one grows past it, move pure decisions into `utils/`, sends into its slice's effects, and repeated layout into a component.
- Templates over 4 lines go in a `.html` file.
- A page section or other single-use component selects its own state from the store; the page only lays out sections. Inputs are for reusable components (`shared/components`).
- Style a wrapper element in the template, never the host (no `host: { class }`, no `:host`).
- At most 2 plain Tailwind utilities per element; move the rest to a named class in the component `.scss`. Theme utilities and breakpoint prefixes (`md:`, `lg:`) don't count and stay inline.
- SCSS nests to follow the DOM. PrimeNG overlay content (drawer, Galleria lightbox) stays top-level.
- Component SCSS is unlayered and beats Tailwind, so never set in SCSS a property that an inline breakpoint class changes — keep the base value inline too (`px-6 md:px-8`).
- For `nav-link`, set `--link-color`, not `color`.

TypeScript (`eslint.config.js`, plus `eslint/items-per-line.js`):
- Explicit types on every variable, property, parameter (including callbacks/destructuring) and return value. The only exceptions are the `createAction`/`createFeature` declarations, which carry a one-line `eslint-disable` with a reason.
- An interface used by one file is declared in that file; only shared types get their own file in `models/` (one per file), and API request/response types go in the feature's `dtos/` (the user's choice, 2026-10-27).
- Semicolons everywhere, including interface/type members.
- One item per line from 3 items (array items, object props, type members, call args, params, destructured props); 1-2 items may stay on one line or be wrapped, with matching brackets. `pipe(...)` wraps from 2 operators. Imports are the exception: they stay on one line and wrap, one name per line, only past 120 characters, as Prettier does.
- ESLint formats `.ts`; Prettier formats HTML/SCSS/CSS only (Prettier would undo the one-per-line wrapping).
- NgRx typing: effects are `FunctionalEffect`; derived selectors are `MemoizedSelector<object, T>`; feature selectors are destructured with `: typeof xFeature`; action payloads are inline `props<{ … }>()` types in every slice; consumers import actions as a namespace (`import * as ShopActions from './shop.actions'`); store is injected as `inject<Store<AppState>>(Store)`.
- `tsconfig.json` is strict with `noUncheckedIndexedAccess`, `noUnused*`, and `strictTemplates`.
- `@microsoft/applicationinsights-*` imports are allowed only in `src/app/core/telemetry/` (`no-restricted-imports`), so switching telemetry providers rewrites that folder only. The browser stays on the App Insights SDK, not OpenTelemetry, which Microsoft doesn't support in browsers.

## Tests

The existing specs encode the wireframe's placeholder behavior (booking rules, hours, mock data), not confirmed business rules. When business rules change, a failing spec may need updating rather than indicating a bug. Keep the existing specs; add new ones per feature (see `docs/wireframe-audit.md` §9).
