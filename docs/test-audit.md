# Test audit (2026-11-19)

A list of tests that cost more than they protect, for the owner to pick from. **Nothing has been removed.** The repo's rule
is to keep existing specs ([CLAUDE.md](../CLAUDE.md)), so each item below needs a yes before it goes.

## How many tests there are

| Suite | Tests | Files | Run time |
| --- | --- | --- | --- |
| API (xUnit) | 1,148 | 87 | about 35 s |
| UI (Vitest) | 1,046 | 161 | about 8 s |
| Express (Vitest) | 98 | 9 | under 1 s |
| End-to-end (Playwright) | 1,172 runs | 48 | about 14 min per CI shard |

The API and UI counts include the texting work on `feature/text-messaging`, which is not merged yet; without it the UI has 1,014
tests in 155 files. The unit suites are fast. The end-to-end suite is the cost: 293 written cases run once per project (Chromium desktop, Chromium
mobile, WebKit desktop, WebKit mobile), and most of the red CI runs this month came from the WebKit half.

## Already done

- **The flaky telemetry spec** is fixed at its root, not skipped. Two specs mocked the same SDK with different fakes, and whichever
  file loaded first in a worker won. They now share one fake (`src/testing/application-insights-mock.ts`). It failed 3 of 12
  full runs before and 0 of 15 after.
- **Pull requests run Chromium only** (586 of the 1,172 e2e runs, in 2 shards instead of 3). `e2e-webkit.yml` runs WebKit every
  night, on `release/**` and `hotfix/**` pushes, and on demand.

## Removed in the second pass (owner said to pick)

- **`book-layout` and `home-layout` now run on the desktop projects only** (26 cases, so 52 fewer runs per pair of browsers).
  They set their own width and only measure CSS geometry. They pass on `chromium-desktop`. Set in `playwright.config.ts`.
- **The "reaches every page the app has" test in `app.routes.seo.spec.ts`** is gone. Its 19-path list was fully covered by the
  "hides from search" and "indexes" lists next to it, which name every page as hidden or indexed, and by "gives every route
  data.seo".
- **Not taken, on a closer read:** `layout-reflow` and `layout-shift` stay on every project, because mobile emulation lays out narrow
  pages differently, so the mobile runs are not duplicates (the estimate in item 1 below was too high). The `*-error.utils.spec.ts`
  merge would break the one-spec-per-file layout. The axe repeats each scan a different step of a flow, so they are not duplicates
  either. `environments.spec.ts` guards how URLs are joined. The texting-work merges wait until that branch lands.

## Candidates to remove or merge (with how much each saves)

The list as first written, before the second pass above.

1. **Layout specs that set their own viewport, run on all four projects.** `book-layout` (13 cases), `home-layout` (13),
   `layout-reflow` (8) and `layout-shift` (8) each call `setViewportSize` (or build their own phone context), so the desktop and
   mobile projects both run the same widths again. Run them on `chromium-desktop` only: 42 cases instead of 168 runs, saving
   **126 e2e runs**. Recommended. The WebKit run keeps one browser-engine check of them.
2. **Hard-coded route lists.** `app.routes.seo.spec.ts` ("reaches every page the app has", 19 paths), `app.routes.server.ts`
   with its spec, `thad-the-barber-express/test/routes.test.mjs` and `fake-dist.mjs` each list every page, so one new page means
   edits in up to four files. This happened twice during the texting work. Derive the list from the route tree
   (`collectRouteLeaves` already exists) and assert the property that matters, that every page has SEO data and is either indexed
   or deliberately hidden. Saves about **3 tests** and a recurring edit tax. Recommended.
3. **Selector and error-code mapping specs that restate a one-line `switch`.** The `*-error.utils.spec.ts` files (one per admin
   feature, 2 tests each) and the `selectIsLoading` cases in `gallery`, `reviews` and `shop` feature specs. Merge each family into
   one table test. Saves about **10 tests**. Low value either way.
4. **`environments.spec.ts`** (3 tests, 8 cases). Keep "each cloud build calls its own API" and "cloud builds use https", which stop
   a test build shipping with the wrong API. The trailing-slash and `/api` cases are cheap but guard little. Optional.
5. **Axe scans.** 74 scans across 26 e2e files, plus 30 in unit specs. Many scan the same page in each state of one flow (booking
   has 10, manage 8, find 7). Keep one scan per distinct page and state, and drop the repeats inside one flow. Saves roughly
   **20 scans** (about a second each, times 4 projects). Needs a look at each flow before cutting.
6. **Fine-grained tests from the texting work** (mine, on `feature/text-messaging`, so this applies once it merges). `TextMessagesSettingsValidatorTests` (7), the preview and unknown-id cases
   in `AnnouncementTextServiceTests`, and the 3 preview cases in `TwilioWebhookEndpointsTests` could be merged with `[Theory]`.
   Saves about **10 tests**, with no loss of what they check.

## Keep, even though they look many

- Anything about duplicate sends, consent and opt-outs, signatures, booking limits, time zones and token signing. A bug in those
  reaches a customer.
- `StringRedactionExtensionsTests` (37 cases): it is the PII-in-telemetry guard.
- The mapper tests (`AnnouncementsFileMapperTests`, `LocationMapperTests`, `ReviewsFileMapperTests`): they hold the business rules
  for what the site accepts from storage and Square.
- `token-contrast.spec.ts`: it fails when a color change breaks accessibility contrast.

## Still flaky, not yet fixed

- WebKit `shop.spec` (`NG0750` hydration error) and `backdrop-sections` (animation timing) fail sometimes and pass on retry. Both
  now run only in `e2e-webkit.yml`, so they no longer block pull requests. They need a trace to fix at the root.

## If all of the above is accepted

The second pass took out 52 e2e runs per pair of browsers and 1 unit test, on top of the 586 e2e runs moved off pull requests.
