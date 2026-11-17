# Go-live wishlist

Start these only after M4 is done (the owner's order). Ask before starting any of them.

Stated 2026-11-15, updates wanted before go-live:

- ✅ **Calendar invite event title** (done; title comes from `bookingSettings.serviceName`). First said "Haircut w/ Thad", then clarified it is the same as the Square service name, "Haircut with Thad". Take it from the Square service name (one source of truth, no hardcoded string); check how the manage page gets the service name. Today `SUMMARY` in `features/booking/utils/ics.utils.ts` says "Appointment at <shop name>"; update its spec too.
- **Maps link on desktop.** A location/address link does not open Google Maps on desktop for some places, but does on mobile (directions links: footer, visit section, manage-booking; `directionsUrl` selector in `shop.feature.ts`). Which place and browser is still unknown.
- **Console errors.** Console errors on the site need addressing (page, browser and message still unknown).
- **Text-message consent checkbox.** The booking form needs one, visible on the site so Twilio's reviewers can see it and approve the A2P campaign (stated 2026-11-15). The privacy page already has a booking texts section; keep wording in sync.
- **Admin shell** (added 2026-11-15). An admin area with announcements and gallery management. Today both live only in the storage account; admin sign-in was planned via Google (architecture decisions). Scope, auth and layout not yet discussed: ask before designing.
- **Loading-hours animation** (added 2026-11-16). The home hero pill shows "Loading hours" as plain text today; the owner wants an animation there while hours load. Keep the placeholder height unchanged (hero layout-shift e2e in `home-layout.spec.ts`) and respect `prefers-reduced-motion`.
- **Footer always at the bottom** (added 2026-11-16). The app layout becomes a flex column so the footer sits at the bottom of the page when content is short (min-height on the root, main grows). Check /contact, /privacy, /accessibility, the 404 page and /book at tall viewports.
- **Mobile announcement bar covers the open/closed pill** above the hero title (added 2026-11-16). When the bar is visible on a phone it blocks the pill. Reproduce at 390px with an announcement showing; fix the offset (header/bar height vs hero top padding) and add a geometry e2e that fails without the fix.

## Order (owner, 2026-11-15)

First finish M3's non-deferred issues (#287, #285, #71, #69, #65; #258 and #218 are deferred/on hold), then M4 (accessibility), then this wishlist. Do not start wishlist items before then.

## Open question

The owner once asked about a "message scroll to top on mobile" item and whether it was added to the pre-go-live list. Nothing about it is recorded; ask which message they mean.
