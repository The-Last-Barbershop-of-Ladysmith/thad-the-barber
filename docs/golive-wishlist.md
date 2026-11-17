# Go-live wishlist

Start these only after M4 is done (the owner's order). Ask before starting any of them.

Stated 2026-11-15, updates wanted before go-live:

- ✅ **Calendar invite event title** (done; title comes from `bookingSettings.serviceName`). First said "Haircut w/ Thad", then clarified it is the same as the Square service name, "Haircut with Thad". Take it from the Square service name (one source of truth, no hardcoded string); check how the manage page gets the service name. Today `SUMMARY` in `features/booking/utils/ics.utils.ts` says "Appointment at <shop name>"; update its spec too.
- ✅ **Maps link on desktop** (done: seen in the Outlook calendar on Chrome; the invite's address was plain text, so Outlook picked its own map. The invite's description now carries a Google Maps directions link).
- **Console errors.** Console errors on the site need addressing (page, browser and message still unknown).
- ✅ **Text-message consent checkbox** (done: required, unticked by default, stored only in the form for now; unticked on purpose, since carrier and Twilio reviewers reject pre-ticked consent). The booking form's box reads "Text me to confirm this appointment and send a reminder" with rates and STOP wording; the privacy page's booking texts section says the same. Whether the API records the choice is part of #285.
- **Admin shell** (added 2026-11-15; in progress: Google sign-in, the shell and announcements management are built; shop info, the gallery and the overview data are next). An admin area with announcements and gallery management. Today both live only in the storage account; admin sign-in was planned via Google (architecture decisions). Scope, auth and layout not yet discussed: ask before designing.
- ✅ **Loading-hours animation** (done; the status dot breathes, still under reduced motion) (added 2026-11-16). The home hero pill shows "Loading hours" as plain text today; the owner wants an animation there while hours load. Keep the placeholder height unchanged (hero layout-shift e2e in `home-layout.spec.ts`) and respect `prefers-reduced-motion`.
- ✅ **Footer always at the bottom** (done; the 404 page still fills one full screen by design) (added 2026-11-16). The app layout becomes a flex column so the footer sits at the bottom of the page when content is short (min-height on the root, main grows). Check /contact, /privacy, /accessibility, the 404 page and /book at tall viewports.
- ✅ **Mobile announcement bar covers the open/closed pill** (done; hero starts below `--p-brand-page-top-offset`) above the hero title (added 2026-11-16). When the bar is visible on a phone it blocks the pill. Reproduce at 390px with an announcement showing; fix the offset (header/bar height vs hero top padding) and add a geometry e2e that fails without the fix.
- **Editable shop info: the booking-page notice** (added 2026-11-17). The owner wants to edit the shop info from the admin area, for now only the location description, which is the notice on the booking page (`ShopInfo.Notice`, today read from the Square location's description, BR-42), plus a yes/no switch that decides whether the notice shows on the page at all. Built as `shop-info.json` in the private content container (the API already writes there), returned by `GET /api/shop`: the saved text overrides Square's description when set (blank falls back to Square) and a switch hides the notice; `GET`/`PUT /api/admin/shop` and the admin page (`/admin/shop`) are done. More shop fields can follow the same way.

## Order (owner, 2026-11-15)

First finish M3's non-deferred issues (#287, #285, #71, #69, #65; #258 and #218 are deferred/on hold), then M4 (accessibility), then this wishlist. Do not start wishlist items before then.

## Open question

The owner once asked about a "message scroll to top on mobile" item and whether it was added to the pre-go-live list. Nothing about it is recorded; ask which message they mean.
