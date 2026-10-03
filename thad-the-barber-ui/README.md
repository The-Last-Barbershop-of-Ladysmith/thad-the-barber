# Thad The Barber UI

Angular 22 site for Thad The Barber: a one-page home with announcements, hours, location, reviews and gallery, plus a booking page. Built from the wireframe in `../wireframe/site`. See [docs/wireframe-audit.md](docs/wireframe-audit.md) for how each wireframe element maps into the app.

## Stack

| Package | Version | Purpose |
| --- | --- | --- |
| Angular | 22.2 | Framework (standalone, zoneless, signals) |
| PrimeNG | 22.1 | UI components, styled mode |
| @primeuix/themes | 3.0 | Aura preset, extended in `src/app/theme` |
| NgRx Store / Effects / DevTools | 22.0 | State management |
| Tailwind CSS | 4.3 | Utilities and responsive layout (no PrimeFlex) |
| tailwindcss-primeui | 0.6 | Tailwind utilities mapped to PrimeNG tokens |
| PrimeIcons | 8.0 | Icons |
| TypeScript | 6.0 | |
| Vitest | 5.0 | Unit tests (`ng test`) |
| Playwright | 1.63 | End-to-end and smoke tests (`e2e/`) |
| @axe-core/playwright | 4.13 | Accessibility checks in the end-to-end tests |

## Requirements

- **Node ^22.22.3, ^24.15.0 or >=26.** The Angular 22 CLI refuses to run on older versions.
- **PrimeUI license key.** PrimeNG 22 shows an "Invalid PrimeUI License" banner until you add a key. The free [Community License](https://primeui.dev/licenses/community) covers a business this size. Put the key in `PRIMEUI_LICENSE` in `src/app/core/config/primeui-license.ts` (one key for dev, test and prod). The key is built to ship in the bundle and contains nothing secret.

## Commands

```bash
npm install
npm start          # dev server at http://localhost:4200
npm run build      # production build to dist/
npx ng build -c devCloud   # Azure dev build (also -c test)
npm run build:express:dev  # build into ../thad-the-barber-express/public/app/thad-the-barber-ui (also :dev-cloud, :test, :production)
npm run start:express:dev  # that build, served by Express at http://localhost:3000
npm test           # unit tests (Vitest)
npx playwright install chromium webkit   # once, for the end-to-end tests
npm run e2e        # end-to-end tests against mocks (starts ng serve unless it's already running; CI=1 uses Express and needs `npm run build:express:test` first)
npm run e2e:smoke  # smoke tests against the local site and API; set BASE_URL and API_BASE_URL for a deployed site
```

### End-to-end tests

- `e2e/mocked/*.spec.ts` run on Chromium and WebKit, each at desktop (1280×800) and mobile (390×844), against `ng serve` locally and, with `CI` set, against the `test` build served by Express on port 4200. Only Express sends the CSP header and real 404s, so the 404-status test runs in CI only. Each test gets a fresh browser context, so localStorage starts empty.
- Import `test` and `expect` from `e2e/support/fixtures.ts`, not `@playwright/test`. Its `page` fails the test on any `/api/*` call the test hasn't mocked with `page.route`, and on any CSP violation.
- `expectNoA11yViolations(page)` in `e2e/support/axe.ts` runs axe with the WCAG 2.0–2.2 A/AA tags plus `region`, contrast included. `incomplete` results are attached to the report for a manual check. Violations already tracked in M4 are listed in `e2e/support/known-a11y-issues.ts` with their issue number; they're attached instead of failing. Remove an entry when its issue is fixed.
- `e2e/smoke/` has its own config (`playwright.smoke.config.ts`). `BASE_URL` is the web app and `API_BASE_URL` the API, including `/api`, because the web app doesn't proxy the API. Unset, they default to `siteUrl` and `apiBaseUrl` from `environment.development.ts`, so the suite also runs from the Testing explorer (tick `playwright.smoke.config.ts` in the Playwright section). Each check retries for up to 3 minutes to ride out F1 cold starts.
- Traces, screenshots and video are kept for failed tests in `test-results/`. `npx playwright show-report` opens the HTML report.

### CI

`.github/workflows/ci.yml` runs five checks on every PR into `dev/**`, `release/**`, `hotfix/**` and `main`: `ui` (lint, unit tests, and the `test` build, the optimized build with test URLs), `express` (the Express app's audit and tests), `api` (build, tests, at least 80% line coverage), `e2e` (the mocked suite against the `ui` check's build served by Express) and `lighthouse` (the same build). `e2e` and `lighthouse` wait for `ui` and download its build instead of building again. Every run uploads the Playwright report (with traces, screenshots and video for failed tests), the Lighthouse reports and the API coverage report as zip artifacts. On PRs from this repo, the `report` job also publishes them to the Entra-protected reports viewer and links them from the PR comment and job summaries ([CI reports](../docs/environments.md#ci-reports)).

Each run writes a job summary (API coverage, Playwright totals with any failed or flaky tests, the Lighthouse score table), and a `report` job posts the same summary as one PR comment, which later runs update. `npm run e2e:summary` (`ci/e2e-summary.ts`) builds the Playwright part from the JSON report CI writes to `test-results/results.json`.

The `lighthouse` check runs Lighthouse (mobile) on `/` and `/book`, then `npm run lighthouse:check` (`ci/lighthouse-check.ts`) fails it when accessibility is under 95, or best practices or SEO under 90. Performance is reported but not enforced until the backdrop frames are fixed (#47, #38); #91 sets its budgets. CI serves the `test` build with Express and `NOINDEX=false`, since the noindex header dev and test send would fail SEO. To run it locally, serve the site the same way (`npm run build:express:test`, then `NOINDEX=false PORT=4200 npm --prefix ../thad-the-barber-express start`), write `lighthouse-results/<name>.report.json` with `npx lighthouse <url> --output=json --output-path=lighthouse-results/<name>`, then run the check.

### Environments

Each build configuration swaps `src/environments/environment.ts` for its own file (`fileReplacements` in `angular.json`). Every file is typed by `environment.model.ts`, so a missing field fails any build. Everything in them ships in the public bundle, so never put a secret there.

| Configuration | File | Used for |
| --- | --- | --- |
| `development` (`ng serve` default) | `environment.development.ts` | Local; calls the API from `dotnet run` at `http://localhost:5078/api` |
| `devCloud` | `environment.dev-cloud.ts` | Azure dev (`as-ttb-ui-dev-centralus`) |
| `test` | `environment.test.ts` | Azure test (`as-ttb-ui-test-centralus`) |
| `production` (`ng build` default) | `environment.ts` | Prod |

Fields: `production`, `apiBaseUrl` (absolute, includes `/api`), `siteUrl`, `mediaBaseUrl`, `recaptchaSiteKey` and `appInsightsConnectionString`. Build request URLs as `${environment.apiBaseUrl}/path`. Unit tests run with the `development` replacement, and Vitest only picks up `*.spec.ts` files, because `environment.test.ts` would otherwise match its `*.test.ts` pattern.

**Browser telemetry** (`core/telemetry/`, #121): `app.config.browser.ts` adds `provideTelemetry(environment)`, so prerendering never loads the SDK. With an empty `appInsightsConnectionString` it does nothing. Otherwise it loads the App Insights SDK (`@microsoft/applicationinsights-web`) with the Angular plugin's `ErrorHandler` (uncaught errors become exceptions and still log to the console; extra handlers go in the plugin's `errorServices`), tracks a page view on each `NavigationEnd`, and sends `traceparent` to the API host only. No cookies, no CDN config fetch, and query strings and fragments are stripped from telemetry URLs (BR-23). The mocked e2e fixture answers the ingestion endpoint itself, so test runs never reach App Insights.

## Folder structure

```
src/
├── index.html                      # <html class="app-dark"> turns on the dark scheme
├── styles.css                      # CSS layer order + Tailwind + tailwindcss-primeui + theme bridge
├── environments/                   # one file per build configuration (see Environments)
└── app/
    ├── app.ts / app.config.ts (+ .browser / .server) / app.routes.ts
    ├── theme/                      # All design tokens
    │   ├── tokens/primitive.ts     #   raw palette (copper, espresso, ink), radii, font
    │   ├── tokens/semantic.ts      #   primary, surface, text, content, formField, overlay + brand `extend`
    │   ├── tokens/components/      #   one file per PrimeNG component override
    │   ├── thad-preset.ts          #   definePreset(Aura, …) + theme options (cssLayer, dark selector)
    │   └── tailwind/theme.css      #   Tailwind @theme mapping + named utilities (eyebrow, glass, tile…)
    ├── core/
    │   ├── config/shop-info.ts     # phone, address, hours, socials, home sections
    │   ├── config/primeui-license.ts  # PrimeNG license key (all environments)
    │   ├── models/
    │   ├── services/shop-hours.service.ts   # hours table + live "Open now" status
    │   └── telemetry/              # provideTelemetry (App Insights in the browser) + URL-stripping initializer
    ├── shared/
    │   ├── components/             # backdrop, section-heading, hours-list
    │   └── utils/date.utils.ts
    ├── layout/                     # header (desktop nav + mobile drawer), footer
    ├── store/                      # root store: app.state, app.actions, app.feature, app.effects
    └── features/
        ├── home/
        │   ├── home.ts / home.html / home.routes.ts
        │   ├── components/         # hero, announcements, sms-signup, schedule-cta, visit, testimonials, gallery
        │   ├── data/  models/  services/
        │   └── state/              # home.state, home.actions, home.feature, home.effects
        └── booking/
            ├── booking.ts / booking.html / booking.routes.ts
            ├── components/         # date-step, time-step, details-step, booking-summary
            ├── models/  services/  # availability.service, booking.service
            └── state/              # booking.state, booking.actions, booking.feature, booking.effects
```

File names follow the Angular 22 CLI style (`home.ts` / class `Home`, no `.component` suffix).

## State

Each state folder has four files:

- `*.state.ts`: the state interface and initial state
- `*.actions.ts`: `createActionGroup`, split into page and API sources
- `*.feature.ts`: `createFeature` with the reducer. It generates a feature selector scoped to the slice key (for example `selectBookingState`), a selector for every property, and `extraSelectors` for derived values.
- `*.effects.ts`: functional effects that call the feature's services

Feature slices register lazily in `<feature>.routes.ts` with `provideState` and `provideEffects`, so the booking slice only exists once someone opens `/book`. The root `layout` slice (mobile menu) registers at bootstrap.

## Theming

Styling follows one rule: **if PrimeNG has a component for it, restyle it with tokens instead of building a new component.**

| Wireframe element | PrimeNG component | Token file |
| --- | --- | --- |
| Gradient CTA ("Book a cut") | `pButton` (primary) | `button.ts` |
| Outlined copper button (phone, "Book a kids cut") | `pButton [outlined]` | `button.ts` |
| Glass circle arrows, menu, social icons | `pButton severity="secondary" [rounded]` | `button.ts` |
| "Get directions →" | `pButton [link]` | `button.ts` |
| Frosted section panels, booking summary | `p-card` | `card.ts` |
| Announcements slider + dots | `p-carousel` (composable API) | `carousel.ts` |
| Gallery lightbox | `p-galleria` full-screen | `galleria.ts` |
| Booking calendar | `p-datepicker` inline | `datepicker.ts` |
| Time slots | `p-selectbutton` / toggle buttons | `selectbutton.ts` |
| Phone inputs | `p-inputmask` (form field tokens) | `semantic.ts` → `formField` |
| "You're on the list" / "You're booked" | `p-message severity="info"` | `message.ts` |
| Review stars | `p-rating` readonly | `rating.ts` |
| Mobile menu | `p-drawer` | `drawer.ts` |

Brand values PrimeNG has no slot for (glass background, CTA gradient, dividers, the "open" green) live under `semantic.extend.brand` and become `--p-brand-*` CSS variables. `tailwind/theme.css` exposes them as Tailwind colors and utilities:

- Colors: `text-primary`, `bg-surface-950`, `text-muted-color`, `border-surface` (from tailwindcss-primeui), plus `text-mint`, `border-divider`, `bg-ink`
- Radii: `rounded-control`, `rounded-tile`, `rounded-panel`
- Type: `eyebrow`, `display-title`, `section-title`, `lead`, `body-copy`, `field-label`
- Surfaces: `glass`, `glass-strong`, `tile`, `header-fade`, `photo-frame`, `photo-mat`, `media-placeholder`

The layer order in `styles.css` (`theme, base, primeng, components, utilities`) lets Tailwind utilities override PrimeNG styles without `!important`.

## Component conventions

- **Templates** go in a `.html` file. Only templates of 4 lines or fewer stay inline.
- **Wrap, don't style the host.** Each template has its own root element (such as `<section class="page-section">`). Avoid `host: { class }` and `:host` rules.
- **Class lists:** an element can carry at most 2 plain Tailwind utilities. Anything longer moves to a named class in the component's `.scss`. These don't count toward the limit and stay inline:
  - Theme utilities: `stack`, `page-section`, `eyebrow`, `glass`, `tile`, and so on
  - Breakpoint utilities: `md:`, `lg:` and similar
- **SCSS nests** to follow the template's DOM tree. Content that PrimeNG renders into an overlay (drawer links, Galleria lightbox) stays top-level, because it isn't inside the component's markup at runtime.
- **SCSS never sets a property that an inline breakpoint class changes.** Component styles are unlayered, so they beat every Tailwind utility. For a responsive property, keep the base value inline too, for example `px-6 md:px-8`.
- **Link colors:** set `--link-color` for `nav-link`, not `color`, so the copper hover still applies.

## TypeScript conventions and linting

Lint config lives in `eslint.config.js`; `npm run lint` checks and `npm run lint:fix` fixes formatting.

- **Base rule sets:**
  - ESLint recommended
  - typescript-eslint `strictTypeChecked` + `stylisticTypeChecked`
  - angular-eslint recommended, including template accessibility
- **Explicit types everywhere.** Every variable, class property, parameter (including callback and destructured parameters) and return value is annotated.
  - `@typescript-eslint/typedef` enforces the variable and parameter annotations. typescript-eslint marks this rule deprecated because its guidance is to let TypeScript infer local variables. It still works in v8; replace it if a future major version removes it.
  - **One exception:** NgRx doesn't export the types returned by `createActionGroup` and `createFeature`, so those 8 declarations carry a one-line `eslint-disable` with that reason.
- **Semicolons** end every statement and every interface/type member.
- **One item per line from 3 items**, and 1–2 items on one line (unless that passes 120 characters), for array items, object properties, call arguments, function parameters and destructured properties. `@stylistic` has no item threshold for properties, arguments, parameters or destructuring, so `eslint/items-per-line.js` covers those; `eslint-plugin-import-newlines` does the same for imports.
- **Stricter compiler:** `tsconfig.json` adds `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`/`noUnusedParameters`, and Angular `strictTemplates`, with extended diagnostics treated as errors.
- **Formatting ownership:** ESLint formats `.ts` files. Prettier formats HTML/SCSS/CSS only (`npm run format`), because Prettier would collapse the one-per-line wrapping. `.vscode/settings.json` applies both on save.
- **NgRx typing patterns:**
  - Effects are typed as `FunctionalEffect`.
  - Derived selectors are `MemoizedSelector<object, T>` constants in `*.feature.ts`.
  - Feature selectors are destructured with `: typeof xFeature`.
  - Action payloads are named interfaces (see `booking.actions.ts`).
  - Stores are injected as `inject<Store<AppState>>(Store)`.

## Mocked services

These return local data until a backend exists. Each has a note on the endpoint it should call:

- `HomeContentService`: announcements, testimonials and gallery (`features/home/data`)
- `SmsSignupService`: text-alert opt-in
- `AvailabilityService`: open dates and slots, using a fixed pseudo-random "booked" pattern like the wireframe
- `BookingService`: creates the appointment

## Not in this version yet

- **Scroll-scrubbed video background.** The wireframe plays 847 extracted frames (52 MB) on a canvas. `shared/components/backdrop` crossfades the 7 keyframe stills for now. The frame scrubber can replace it without touching the pages.
- **Real profile links** for Instagram and Facebook (`SOCIAL_LINKS`)
- **Real photos** for the "Back-to-school" and "Hot towel" announcements (set `imageUrl`)
- **SSR / prerendering**
