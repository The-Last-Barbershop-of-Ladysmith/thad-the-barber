# Architecture Decisions

These are the key decisions for taking `thad-the-barber-ui` from a mocked wireframe port to a live site. The live site books appointments through Square, keeps costs near $0, and can grow into a barber admin portal.

- **Decided:** 2026-09-27
- **Status legend:** ✅ decided · ⚠ open (a `business-rule` or spike issue tracks it) · ⏸ deferred

| # | Decision | Status |
| --- | --- | --- |
| [A](#a-hosting) | Express (static) frontend + ASP.NET Core API, two App Service apps per environment, CORS in .NET | ✅ |
| [B](#b-data) | No database in v1; Square is the system of record | ✅ |
| [C](#c-square-integration) | Square .NET SDK behind our API, with buyer-level OAuth on the Appointments Free plan | ✅ (confirmed in sandbox, [#21](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/21)) |
| [D](#d-customer-info-and-privacy) | Customer data is never returned from a phone number alone; returning customers are matched silently | ✅ |
| [E](#e-admin-portal) | Admin portal: Google sign-in verified by the API, allowlist in Key Vault | ✅ |
| [F](#f-open-business-rules) | Open business rules | ⚠ |
| [G](#g-rendering-and-seo) | Prerender `/` at build time | ✅ |
| [H](#h-accessibility) | WCAG 2.2 AA | ✅ |
| [I](#i-testing) | Component + unit + API + Playwright tests on every change | ✅ |
| [J](#j-confirmations-and-reminders) | Square's built-in reminders, with a fallback only if needed | ⚠ (needs a live test, [#89](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/89)) |
| [K](#k-single-source-of-truth) | Every business fact lives in one place | ✅ |
| [L](#l-text-alerts) | Text-alerts sign-up | ⏸ |
| [M](#m-security) | Key Vault for every secret, bot-checked session JWT on every API call, hardening | ✅ |

See [environments.md](environments.md) for the deploy setup and the branching and release flow, and [business-rules.md](business-rules.md) for the business rules.

---

## A. Hosting

**Decision:** two Azure App Service apps per environment, on the **same App Service plan** (no extra cost):

| App | What it runs | Serves |
| --- | --- | --- |
| **web** (`as-ttb-ui-*`) | Node LTS + **Express 5** (`thad-the-barber-express/`, JavaScript), static only: no SSR, no proxy | The Angular build (prerendered pages + SPA), with a per-request CSP nonce, security headers, themed EJS error pages, and a correct 404 status |
| **api** (`as-ttb-api-*`) | ASP.NET Core (.NET LTS) | `/api/*` only |

- The browser calls the API **cross-origin**. **CORS is configured only in the .NET app** (ASP.NET Core middleware) and allows exactly the origins in **`Cors:AllowedOrigins`, an array stored in Key Vault** (`Cors--AllowedOrigins--0`, `--1`, …). App Service's built-in CORS stays empty, because when it's enabled it overrides the app's own CORS handling.
- **Frontend settings:** ✅ `environment.ts` per environment (`apiBaseUrl`, `siteUrl`, `recaptchaSiteKey`; nothing secret), chosen 2026-09-28. The frontend is built per environment; the release run builds the `test` and `production` web bundles from the same commit. The **API** is built once and promoted.

| Environment | Plan | Cost | Notes |
| --- | --- | --- | --- |
| dev + test | One shared **F1 Free Linux** plan, four apps (web + api × dev/test) | $0 | No Always On (slow first request after idle), and the four apps share F1's CPU and bandwidth quota. Accepted outside prod |
| prod (later) | **B1 Linux**, Always On, web + api | ~$13/mo | Site on the custom domain, API on `api.<domain>`, free managed certificates |

- Region: prod in East US (closest to the shop and its DMV customers); dev + test in Central US, because East US had no F1 quota (2026-09-29). East US B1 quota for prod was granted on 2026-10-01.
- Before go-live, scale test to B1 for about an hour (billed hourly) for a realistic performance check.

**Considered:**
- The .NET API serving the build (one app, same origin): simpler, but the user prefers a separate Express frontend they've run before, with independent deploys.
- Cloudflare Pages + Workers, and Azure Static Web Apps: rejected earlier (no .NET, and API cold starts respectively).

## B. Data

**Decision:** no database in v1. Bookings, customers, services, durations, hours, and location details all live in Square. Copying them would add cost and sync bugs.

- The only *data* we persist is the **Square OAuth refresh token**, in **Azure Key Vault** alongside every other secret (see [M](#m-security)). It's written once by `tools/square-connect` and only read by the API. It costs fractions of a cent per month.
- When the admin portal needs app-owned data (announcement editing, notes, audit log), add the **Azure SQL Database free offer** (serverless, auto-pause) through EF Core.

## C. Square integration

**Decision:** only our API talks to Square, through the official .NET SDK wrapped in an `ISquareService` interface, so tests can mock it. The browser never holds a Square token.

Endpoints (each replaces a mocked Angular service without changing its NgRx effect):

| Endpoint | Square | Replaces |
| --- | --- | --- |
| `GET /api/shop` | Locations (name, phone, address, timezone, hours, socials, description) + Business Booking Profile + the single service's duration as `bookingSettings.slotMinutes` (no name or price, BR-11) | `SHOP_INFO`, `OPENING_HOURS`, `SOCIAL_LINKS`, `BOOKING_RULES` |
| `GET /api/bookings/availability?month=YYYY-MM` | Bookings `SearchAvailability` (for the single service), one call per month, clipped to the booking window (now + minimum notice to now + maximum advance; no overlap is a 400 `outside_booking_window`). Returns `[{ date, times }]`: the shop-timezone days with an open time, each with its times as UTC instants, so picking a day needs no second request. Never cached and `no-store`: a time booked anywhere disappears right away, and `CreateBooking` re-checks; no slot holds (#27) | `AvailabilityService` mock |
| `POST /api/bookings` | Body `{ startAt, name, phone, idempotencyKey }`: phone in E.164 (`+1` and 10 digits) and name of 2+ characters (BR-09), checked by .NET's built-in validation (400 per field). `SearchAvailability` re-checks the time (inside the booking window) → `SearchCustomers` → create customer if missing → `CreateBooking`; customer and booking both use the client's idempotency key. A taken time is 409 `slot_unavailable`, unless this same attempt already booked it and lost the response: then `ListBookings` finds the customer's booking at that time and `CreateBooking` is sent again with the same key, so Square returns the original only when the key matches (any other key gets the 409, so phone and time alone never reveal a booking). A phone whose Square customers (duplicates included) already hold `Booking:MaxUpcomingPerPhone` upcoming bookings (counted with `ListBookings` in 31-day pieces up to the maximum advance) is 409 `booking_limit` (BR-13), unless one of them is at the requested time, which is this attempt's own booking or a time Square refuses. Unknown fields are 400, the name is at most 250 characters (Square takes 300), and bodies over 128 KB are 413 (#35). Returns 201 `{ id, startAt }`, no customer details (#28) | `BookingService` mock |
| `POST /api/bookings/{id}/cancel` / `reschedule` | `CancelBooking` / `UpdateBooking` | New |
| None: the UI reads `media-<env>/content/announcements.json` ([#30](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/30)) | None | `HOME_CONTENT.announcements` |
| None: the UI lists `media-<env>/gallery/` (#168) | None | `HOME_CONTENT.gallery` |
| `GET /api/content/reviews` | Google Business Profile reviews (fallback `content/reviews.json`) | `HOME_CONTENT.testimonials`, `SHOP_INFO.reviews` |
| `POST /api/webhooks/square` | Signature-verified webhooks: `location.updated` and `catalog.version.updated` mark the cached shop details or service stale, so the next read refetches them (the old copy still covers a Square outage); a repeated event id is skipped for 24 hours, Square's retry window. Both live in the instance's memory, which is right while the API runs as one App Service instance; scaling out would need a shared cache. Bodies over 32 K characters get 413 before they're read in full. Booking events aren't subscribed until the admin feed needs them (#31) | New |
| `GET /api/health` | None | New |
| `POST /api/session` | None (Google reCAPTCHA v3 check) | New: issues the session JWT (see [M](#m-security)) |

**Square plan and permissions:**
- Thad is on **Appointments Free**: checked in the Dashboard ([#5](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/5)), and his booking profile has `support_seller_level_writes: false`.
- On Free, **seller-level** writes return `403 Merchant subscription does not support write operations` (reproduced in sandbox with a personal access token, [#21](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/21)). **Buyer-level** permissions are supported, and public self-booking is a buyer-level use case.
- Required scopes: `APPOINTMENTS_READ`, `APPOINTMENTS_WRITE`, `APPOINTMENTS_ALL_READ`, `APPOINTMENTS_BUSINESS_SETTINGS_READ`, `CUSTOMERS_READ`, `CUSTOMERS_WRITE`, `ITEMS_READ`, `MERCHANT_PROFILE_READ`. **Not** `APPOINTMENTS_ALL_WRITE`. `ITEMS_READ` lets the API read the single service from the Catalog and `MERCHANT_PROFILE_READ` the location (name, phone, address, hours) for `/api/shop`: without them those calls return `403 INSUFFICIENT_SCOPES`, and with them bookings stay buyer-level.
- **Don't use a personal access token.** It carries every scope, so Square treats calls as seller-level. Use a one-time OAuth authorization of Thad's account with the scopes above, and refresh the token before its 30-day expiry.
- Buyer-level limits:
  - **Availability reflects the whole calendar**: times booked in the Square app or by hand show as unavailable. `CreateBooking` for a taken time returns `400 BAD_REQUEST` "That time slot is no longer available." (field `start_at`), not a 409. The API turns it (on create and on reschedule) into a 409 ProblemDetails with `code: slot_unavailable`. Square rejecting the customer's name or phone becomes a 400 with `code: invalid_customer_details`; any other Square 4xx is a 502, and Square down or not connected is a 503.
  - Reads aren't limited to the API's own bookings: with `APPOINTMENTS_ALL_READ`, list and retrieve also return bookings made in the Dashboard, seller's note included (sandbox; to confirm on Thad's account, [#89](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/89)). So the API returns a booking only to the holder of its manage link.
  - It can't book services that have a cancellation fee.
  - Customer cancellation follows the seller's policy.
  - The customer needs a phone number.
- Upgrade to **Plus** (~$29/mo per location) only if the admin portal needs seller-level writes (reading the full calendar works at buyer level), or if no-show fees or cancellation policies are adopted.
- The [#21](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/21) spike confirmed this in sandbox on 2026-10-04 (fixtures in `thad-the-barber-api.tests/Fixtures/Square/`). It also found:
  - `UpdateBooking` reschedules with only `version` and `start_at`. Every write raises `version`, so the API always sends the current one.
  - `SearchCustomers` by phone can return several customers, in no fixed order, so the API must pick one deterministically (for example the oldest).
  - `ListBookings` needs a `start_at_min`/`start_at_max` range of 31 days or less.
  - Customer Groups and Custom Attributes work with these scopes (for [L](#l-text-alerts)).

**Cancel and reschedule:**
- No limits until the appointment's start time passes. After that the API returns 409 `booking_started` and the UI hides the actions.
- Thad's Square settings must allow customer cancellation with no window and no fee.
- Customers act through a **signed manage link**, `/book/manage/{id}#t={hmac}`, so a guessed ID can't change someone else's booking. The token lives in the URL fragment, which is never sent to servers or put in the Referer, and the UI sends it in an `X-Manage-Token` header, so it never shows up in logs.
- The token is HMAC-SHA256 of the booking ID with the `ManageLink--HmacKey` secret, base64url, and `POST /api/bookings` returns it as `manageToken` (#29). The API checks it in constant time before calling Square. A missing or wrong token is 404 `booking_not_found`, never 403, so it doesn't reveal that the booking exists. The link never expires; replacing the key revokes every link.
- `GET /api/bookings/{id}` returns `{ id, startAt, isCancelled, canChange }`. `canChange` comes from the server's clock, so the UI doesn't trust the browser's. `POST …/cancel` and `POST …/reschedule` (`{ startAt }`, re-checked against availability) return the same shape. Repeating a cancel or reschedule that already happened returns the booking unchanged, so retries are safe. Rescheduling a cancelled booking is 409 `booking_cancelled`; a taken time is 409 `slot_unavailable`.

**One service:** the shop offers a single service, and that isn't expected to change. There's no services page, no service step, and no public services endpoint. The API still **reads that service from the Square Catalog** (`BookableServiceResolver`, cached for 60 minutes and marked stale by the `catalog.version.updated` webhook, #31), because `SearchAvailability` needs its variation ID and `CreateBooking` needs its variation ID, **version**, team member and duration. It takes the one appointment-service variation open for online booking; the optional `Square:ServiceVariationId` setting pins one. With none, or more than one and no pin, booking calls return 503 and the deep health check (`bookableService`) reports unhealthy with an error logged. Only its duration reaches the UI, as `bookingSettings.slotMinutes` in `GET /api/shop` (no name or price, BR-11).

**Booking UI:** our own UI, not Square's hosted booking page. It keeps the site's design and makes room for the admin portal.

## D. Customer info and privacy

Anyone can type any phone number into a public form, so the API **never returns customer data based on a phone number alone**.

- ✅ **Decided 2026-09-28: match silently.** Find or create the Square customer during booking and show nothing back (BR-21).
- Not chosen for now: an SMS one-time code (~$0.05 per check) before prefilling details. Revisit with a new business-rule issue if needed.

## E. Admin portal

- It lives in the same repo: a lazy Angular `features/admin` route (served by the Express web app) plus `/api/admin/*` in the .NET API.
- ✅ **Sign-in: Google** (decided 2026-09-28), through Google Identity Services in Angular.
  - The API verifies the Google ID token and checks the email against **`Admin:AllowedEmails`, an array in Key Vault**, then issues a short-lived admin JWT (role `admin`) that the interceptor sends on `/api/admin/*`.
  - Every admin endpoint enforces an `Admin` policy server-side.
  - It uses the same Google Cloud project as the reviews API and reCAPTCHA, and costs $0.
  - Not App Service Easy Auth: it's cookie-based per domain and clashes with the separate web/API origins and the no-cookie design.
- It can split into its own Angular project or app later without a backend rewrite.

## F. Open business rules

The decided rules are recorded in **[business-rules.md](business-rules.md)** with `BR-` IDs. This section only covers how they're organized.

**Square settings** are the source of truth, and Thad sets them all from one checklist issue ([#5](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/5), *Thad's Square setup checklist*):
- location profile
- the one service (no cancellation fee)
- booking window and minimum notice
- cancellation policy (no window, no fee)
- deposits and no-show fees (✅ none, decided 2026-09-28)
- confirmations and reminders
- time off
- connecting the website

**App decisions** have their own issues:
- announcement wording, cadence and expiry ([#6](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/6))

## G. Rendering and SEO

- `@angular/ssr` **prerendering** of `/`, `/privacy`, `/accessibility` and `/404`, as part of each environment's build against that environment's API; Express serves the static output (no SSR). `/book` stays client-rendered until its date step waits for availability (#58); then it's prerendered too.
- Express serves a prerendered page when its `<route>/index.html` exists, the app shell (`index.csr.html`) for the client-rendered routes it lists (`clientRoutes` in `routes/index.js`; only `/book` today), and the prerendered `/404` page otherwise. Routes with ids in the URL (`/book/manage/*`, the admin portal) join that list as prefixes. Angular's server rendering was tried for the 404 status and dropped (2026-10-03): it would run Angular in Node for every unknown URL.
- Per-route titles, descriptions, canonical, Open Graph and Twitter tags built from the store; `HairSalon` JSON-LD; `sitemap.xml` and `robots.txt`; favicon set and manifest.
- Unknown paths return a real **HTTP 404** with the themed 404 page, never `200 index.html` (a soft 404).
- Dev and test are never indexed (`robots.txt` disallow + `X-Robots-Tag: noindex`). Express sends the header unless the web app's `NOINDEX` setting is `false`, which infra sets only in prod.
- A branded startup loader appears only on client-rendered routes. The loader and the Express error pages use `brand.css`, generated from the theme tokens.

## H. Accessibility

The target is **WCAG 2.2 AA** (the "ADA" requirement).

**Tooling:**
- `axe-core` directly in Vitest component specs, through a small `expectNoAxeViolations` helper (no `jest-axe`/`vitest-axe` wrapper). `color-contrast` and `region` are off there because jsdom doesn't render and components aren't whole pages.
- `@axe-core/playwright` in the end-to-end tests, with every rule on. **Color contrast is checked only here**; `incomplete` results (text over the backdrop video, images or glass) are attached to the report and checked by hand.
- Lighthouse CI with an accessibility score of at least 95
- A manual keyboard and NVDA pass per page

**Known risk areas:**
- Background motion and `prefers-reduced-motion`
- Carousel and ticker pause controls (2.2.2)
- Lightbox focus trap
- Date picker keyboard grid
- Time-slot labels
- Announcing input-mask errors
- Copper `#E8904A` contrast on espresso
- Focus-visible styles on the glass buttons

## I. Testing

Every change ships with its tests:

| Layer | Tool | Where |
| --- | --- | --- |
| Components, services, reducers, selectors, effects, utils | Vitest (+ `axe-core`) | Next to the file under test |
| API services, mappers, webhook signatures, endpoints | xUnit + `WebApplicationFactory` | `thad-the-barber-api.tests/` |
| End-to-end, mocked API (every PR) | Playwright + `@axe-core/playwright`, Chromium + WebKit, desktop 1280 + mobile 390 | `thad-the-barber-ui/e2e/` |
| Smoke tests after each deploy | Playwright against the deployed dev/test URL + Square sandbox | `thad-the-barber-ui/e2e/smoke/` |

- The test smoke suite runs a real sandbox booking → cancel round trip that cleans up after itself. It also runs nightly.
- Every user-facing issue lists the Playwright scenarios it adds.

## J. Confirmations and reminders

- **Preferred:** Square's built-in confirmations and reminders, included in the Free plan and set in Square Dashboard → Appointments → Communications. They cost $0.
- **Unknown:** Square's docs say seller-level API bookings send no email or SMS, but they don't say what happens for buyer-level bookings. The [#21](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/21) spike couldn't check this: the sandbox Seller Dashboard's Communications page doesn't load, so the sandbox can't send them. It needs one test booking on Thad's live account once the production app exists ([#89](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/89)).
- **Fallback (only if Square doesn't send them):** our API sends its own.
  - Email via Azure Communication Services; SMS via Twilio (with A2P 10DLC registration).
  - A GitHub Actions cron job calls a secured `POST /api/jobs/reminders`, which works on F1.
  - Needs a small "reminder sent" store (Table Storage or Azure SQL free).

## K. Single source of truth

**Rule:** every business fact is read from **one** source and kept in **one** place, and templates bind to it. Simple UI wording (headings, button labels, error text) stays in the component, in the template or as a top-level readonly field in the component `.ts`. There are no copy catalogs, and this is enforced by review, not lint.

| Value | Source of truth | UI gets it from |
| --- | --- | --- |
| Shop name, phone, address, timezone, socials, logo, description (shown as a notice, BR-42) | Square Location | `GET /api/shop` → root `shop` slice |
| Opening hours | Square Location `business_hours` | `GET /api/shop` |
| Map and directions URLs | Derived by the API from the Square address | `GET /api/shop` |
| The single service's duration (no name or price, BR-11) | Square Catalog | `GET /api/shop` (`bookingSettings.slotMinutes`) |
| Booking window, lead time, cancel rules | Square Business Booking Profile + service durations | `GET /api/shop` |
| Announcements | `content/announcements.json` in the environment's media container, edited in the Azure portal until the admin portal exists ([#30](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/30)). No schema: the UI skips items it can't show and hides the section for a missing or broken file | The UI reads it in the browser with `cache: 'no-cache'` (portal uploads carry no `Cache-Control`) → `home` slice |
| `reviewsToShow`, shop area text, tagline | Content files owned by the API: `reviews.json`, `shop.json`, each with a JSON schema (the admin portal takes over later) | Reviews → **lazy** `reviews` slice loaded only where shown; `shop.json` fields merged into `/api/shop` |
| Gallery and announcement images | **Azure Blob Storage**, one public container per environment, edited in the Azure portal until the admin portal exists (#168). The gallery is whatever is in `gallery/`, newest upload first, alt text from the file name; announcement images live in `announcements/`; images are served as uploaded (no variants or EXIF stripping; a blob-triggered resize Function can be added if Lighthouse flags the weight) | The UI lists `gallery/` anonymously (`environment.mediaBaseUrl`) |
| Reviews, rating, review count | **Google Business Profile API** (owner sign-in, token in Key Vault, cached 24h); content-file fallback | `GET /api/content/reviews` → lazy `reviews` slice |
| UI microcopy | The component | Template or component field |
| API base URL, site URL, reCAPTCHA site key | `environment.*.ts` per environment (build time) | `environment` |
| PrimeUI license, theme tokens, frame counts, validator patterns | Code (not business data) | Unchanged |

- The API caches Square reads for 15–60 minutes with `IMemoryCache`, and Square's `catalog.version.updated`/`location.updated` webhooks mark the affected entry stale.
- `SHOP_INFO`, `OPENING_HOURS`, `SOCIAL_LINKS`, `BOOKING_RULES`, and `HOME_CONTENT` are deleted once nothing uses them.
- Every audit issue carries a **Hardcoded values inventory** for its component.

**Announcements:**
- An announcement is *active* when `startDate ≤ today ≤ endDate`, by the visitor's local date (BR-30).
- With no active announcements, or a missing or broken file, the Announcements section and its menu items (header, drawer, footer) are hidden (BR-32).
- `bodyHtml` renders through `[innerHTML]` with Angular's sanitizer only; links to `/…` route in the app (BR-33).
- The ticker is deferred (BR-31).

## L. Text alerts

⏸ **Deferred.** The text-alerts sign-up is removed from the announcements section for now. The `SmsSignup` component, service, effect, and state stay in the repo unused until the text-alerts milestone.

The design for when it's picked up needs no database:
- The list is a Square **Customer Group** ("Text alerts").
- Consent (TCPA) is stored as Square **customer custom attributes**: `sms_consent_at`, `sms_consent_source`, `sms_consent_text_version`, and `sms_opted_out_at`.
- The sender is still open:
  - **Square Text Message Marketing** (~$10/mo + per text). Thad sends from the Square Dashboard. Unverified: whether API sign-ups count as consent.
  - **Twilio** (~$0.01/text + A2P 10DLC). We build the sending.
- Announcement texts go out only when Thad sends them, never automatically.

## M. Security

**Secrets: Azure Key Vault in every environment (✅ required).**
- These live in Key Vault: the Square application secret, the Square OAuth refresh token, the Square webhook signature key, the manage-link HMAC key, and the session-JWT signing key.
- The .NET API loads Key Vault straight into configuration with the **Azure Key Vault configuration provider** and its managed identity; the vault **name** (`KeyVault:Name`, only in `appsettings.{Env}.json`, picked by `ASPNETCORE_ENVIRONMENT`; no app setting) is its only Key Vault-related setting. That includes the **CORS allowed-origins array** (`Cors--AllowedOrigins--N` → `Cors:AllowedOrigins`), which the session endpoint's Origin check also uses. Other apps use `@Microsoft.KeyVault(...)` references.
- Nothing sensitive goes in the repo, app settings, or GitHub. GitHub reaches Azure through OIDC, with no stored credentials.
- **No app writes to Key Vault** (✅ 2026-10-04, #23). Square's code flow returns the same refresh token on every refresh and it doesn't expire unless revoked, so nothing rotates. The one-time connect is a script (`tools/square-connect`) run under the owner's `az login`; there are no connect endpoints in the API.
- **Square tokens:** the API reads `Square--RefreshToken` and `Square--ApplicationSecret` through a `SecretClient` **only when renewing** (they're kept out of configuration). The 30-day access token lives only in memory and renews on start-up, when it's older than 7 days, or after a 401. Rejected: a token-broker Function (it only limits an *undetected* breach to 30 days, and adds a component holding the same credentials plus write access); revisit if the API scales out or serves more than one seller.
- **Detection:** vault audit logs go to Log Analytics. In prod, two log alerts (email + SMS) with different responses: **secret read** (severity 1) when a Square secret is read by anyone but the API's identity, which is a possible breach unless it was you; and **not connected** (severity 2) when Square refuses the refresh token or it's missing, which usually means Thad disconnected the app (rerun the connect script).
- **Breach checklist:** (1) revoke the app's access in Square (Developer Console → the app → OAuth, or the seller's Apps page): every token stops at once; (2) replace the app secret in Square and in `Square--ApplicationSecret` (`infra/scripts/Set-TtbSecrets.ps1`); (3) find and fix the hole, redeploy; (4) rerun `tools/square-connect`.
- Key Vault uses RBAC, with soft delete and purge protection on.

**Frontend-only API access (✅ required, with an honest limit).**
- The frontend gets a short-lived JWT from `POST /api/session`, and an Angular HTTP interceptor sends it as `Authorization: Bearer` on every `/api/*` call. The API rejects anything without a valid token. Exempt routes: `/api/session`, `/api/health`, and `/api/webhooks/*` (Square signs those).
- **The limit:** a public website can't keep a secret. Whatever the browser does to get a token, a script can copy, so a JWT alone can't prove a request came from our frontend.
- That's why getting a token requires passing **Google reCAPTCHA v3** (✅ chosen 2026-09-28 over Cloudflare Turnstile, to stay in the same Google Cloud project as the reviews API). It's invisible and score-based: the API verifies the token server-side and requires the `session` action, the site's hostname and a score ≥ `Recaptcha:MinScore` (0.5, app config). A low score gets the call/text fallback. It's free up to about 10,000 checks/month. The token endpoint also checks the `Origin`. The privacy policy mentions reCAPTCHA, and Google's notice text replaces the badge.
- JWT details: ES256, signed with a Key Vault key, 15-minute lifetime. The browser keeps it in memory only, never in localStorage.
- `POST /api/session` takes `{ recaptchaToken }` and returns `{ token, expiresAt }`. Refusals are 403 ProblemDetails with `code` `bot_check_failed` (also when Google can't be reached: it fails closed) or `origin_not_allowed`. Each score is logged with the token's validity, action and hostname, never the token or the IP, so the threshold can be tuned (#34).
- CORS (in the .NET app only) allows just the site's origin, so browsers on other sites can't call the API. Auth uses a header, not cookies, so there's no CSRF exposure.

**Abuse:**
- Rate limits per client IP (#32): `POST /api/session`, `POST /api/bookings` (BR-13) and cancel/reschedule (a separate `Manage` limit, so used-up booking attempts never block managing a booking), from `RateLimits:*` in app config, refused with 429 `rate_limited` and `Retry-After`. App Service's `X-Forwarded-For` gives the client IP (`ASPNETCORE_FORWARDEDHEADERS_ENABLED`). Per-session limits come with #35.
- A cap of 5 upcoming bookings per phone number and 5 booking attempts per device/IP per 10 minutes (BR-13, set in app config). The per-phone cap is checked in `BookingService` (#35); there's no separate per-session limit, since a new session token only takes a reCAPTCHA pass.
- Strict request validation and size limits.

**Transport and headers:**
- HTTPS only, HSTS, TLS 1.2+.
- CSP on the Express frontend, sent as a header with a **per-request nonce**, so there's no `'unsafe-inline'`. `index.html` carries `ngCspNonce="CSP_NONCE"`, the Angular build copies that placeholder onto its own script and style tags, and Express swaps in a fresh nonce for every page (PrimeNG gets it through `CSP_NONCE`). Pages are sent `no-cache` without an ETag, so a nonce is never replayed. The rest of the policy: `connect-src` (API, App Insights ingestion, reCAPTCHA), `frame-src` (Maps + reCAPTCHA), `img-src` (media host), `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. The environment's origins come from `csp-sources.json`, which the `postbuild:express:*` scripts write from the build's `environment.*.ts`, so they're never duplicated. Prerendered `style` attributes (PrimeNG's carousel) are allowed by hash (`style-src-attr 'unsafe-hashes'`). Setting `CSP_REPORT_ONLY=true` on the web app switches to `Content-Security-Policy-Report-Only` for rolling out a policy change.
- `nosniff`, a strict Referrer-Policy, and a Permissions-Policy.

**Privacy:**
- Customer data is never returned from a phone number alone (decision [D](#d-customer-info-and-privacy)).
- No names or phone numbers in logs.
- No PII kept in the browser after a booking is confirmed.
- A privacy policy page.

**Supply chain:**
- `gitleaks`, Dependabot, and failing CI on high or critical `npm audit` / NuGet vulnerabilities.
- CodeQL where the repo plan allows it.
- Actions pinned to commit SHAs, with least-privilege workflow permissions.
- `CODEOWNERS` for infra and the API.

**Telemetry:** OpenTelemetry (Azure Monitor Distro) in the API and Express, the App Insights JS SDK in the browser, and end-to-end traces via `traceparent`. Redacting log and span processors run before the exporters (#32): phone numbers and emails are masked wherever they appear, Square's error bodies never leave `Square/` (the SDK puts its whole response in the exception message, and Square's error details can repeat the customer's input, so `SquareService` throws its own `SquareRequestFailedException` with only the status and Square's error codes and fields; the full response stays in Square's API Logs), and fields named like a name, phone or email lose their value (a record with one also loses its filled-in message, so App Insights shows the template). Names in free text can't be detected, so a test books with a made-up customer and checks nothing of it is exported. Sampling stays at the distro's default of up to 5 traces per second, which keeps every trace at the shop's traffic; the Log Analytics daily cap (`logDailyCapGb`, 0.15 GB ≈ 4.5 GB a month) bounds the cost. Head sampling can't keep errors selectively, so no custom sampler. (BR-23) Code-based, not App Service auto-instrumentation, so redaction is possible. In the browser (#121), the Angular plugin supplies the `ErrorHandler`, but page views are tracked on `NavigationEnd` by our own code (the plugin's router tracking reads `router.url` before the first navigation ends and reports "/"), with a new trace per page. Telemetry loads only in the browser config, never during prerender.

**Later (admin portal):**
- Google sign-in verified by the API (allowlist in Key Vault), and an `Admin` policy checked server-side on every `/api/admin/*` route.
- Admin actions logged to an audit log.
