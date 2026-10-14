# Business Rules

This is the single record of how the shop's booking and website behave. Each rule has an ID that issues, code comments and tests can reference (for example `// BR-04`).

- **How rules get here:** a [`business-rule` issue](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues?q=label%3Abusiness-rule) discusses a rule. The issue closes when the decided rule is written here.
- **Changing a rule:** update it here in the same PR as the code or setting change, and add a line to the change log at the bottom.
- **Values Square owns aren't copied here.** They'd go stale. The rule says where the value is set, and Square is the source of truth ([architecture-decisions.md §K](architecture-decisions.md#k-single-source-of-truth)).

**Status:** ✅ decided · ⚠ open (linked issue) · ⏸ deferred

---

## Booking

| ID | Rule | Status | Where it's enforced |
| --- | --- | --- | --- |
| BR-01 | The shop offers **one service**. Customers never choose a service; there's no services page and no service step. | ✅ | Square Catalog (the one service), resolved by the API |
| BR-02 | Slot length equals the service's duration. | ✅ | Square Catalog → service duration |
| BR-03 | How far ahead customers can book (booking window). | ✅ set in Square 2026-09-29 ([#5](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/5)) | Square → Appointments → online booking settings (max lead time) |
| BR-04 | Minimum notice before a slot; this is also the same-day cutoff. | ✅ set in Square 2026-09-29 ([#5](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/5)) | Square → Appointments → online booking settings (min lead time) |
| BR-05 | Available days and times are whatever Square reports as open, which accounts for **every booking on Thad's calendar**, including ones made in the Square app or by hand. Regular hours come from the location's business hours; time off and holidays are blocked in the Square calendar. | ✅ | Square location hours + Square calendar |
| BR-06 | **No deposits, prepayment or no-show fees.** | ✅ 2026-09-28; confirmed none set in Square 2026-09-29 | Square service and booking policy (none set) |
| BR-07 | Customers can **cancel or reschedule any time until the appointment's start time**, with no fee. After the start time, the actions aren't offered. | ✅ set in Square 2026-09-29 | Square cancellation policy (no window, no fee) + API start-time guard |
| BR-08 | Changing a booking requires the **signed manage link** from the confirmation; a booking ID alone isn't enough. | ✅ | API (`X-Manage-Token`, HMAC of the booking ID, [#29](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/29)) |
| BR-09 | Booking requires a name (at least 2 characters) and a 10-digit US phone number. | ✅ | UI + API validation |
| BR-10 | A slot taken by someone else before confirming can't be double-booked; the customer is asked to pick another time. | ✅ | Square availability re-check + API |
| BR-11 | The site never shows the **service's price**, because the service is variable-priced in Square. The booking summary and confirmation show the service's name and duration. Announcements may still mention prices or discounts (BR-33). | ✅ 2026-09-29 | Square Catalog → `/api/shop` → booking summary |
| BR-12 | Confirmations and reminders are sent by Square. | ⚠ reminders turned on in Square 2026-09-29; the [#21](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/21) spike couldn't check in sandbox that they fire for website bookings; needs a live test ([#89](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/89)) | Square → Appointments → Communications |
| BR-13 | A phone number can hold at most **5 upcoming appointments**; past or cancelled ones don't count, and every upcoming booking counts, wherever it was made (Square shows the API all bookings, [#21](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/21)). Beyond that, the customer is asked to call or text. Booking attempts are limited to **5 per device/IP per 10 minutes**. | ✅ 2026-09-28 | `Booking:MaxUpcomingPerPhone` in app config, counted by the API's `BookingService` from the Square bookings of every customer with that phone (409 `booking_limit`, [#35](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/35)); `RateLimits:Booking` per IP ([#32](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/32)) |
| BR-14 | Whenever booking on this site isn't available (the server error page, the 404 page, and the booking page when the API is down), customers get a link to **Thad's Square booking site**, with the phone as the last fallback. The link is part of the build, not loaded from the API, so it works when the API is down. | ✅ 2026-10-04 | `SHOP_INFO.bookingUrl` → `shop.json` → Express error page ([#146](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/146)); 404 page ([#74](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/74)); booking page ([#65](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/65)) |

## Customer data and privacy

| ID | Rule | Status | Where it's enforced |
| --- | --- | --- | --- |
| BR-20 | The site **never shows customer information based on a phone number alone**. | ✅ | API |
| BR-21 | Returning customers are **matched silently**: the booking is linked to their existing Square customer (found by phone) or a new one is created, and nothing about them is shown or prefilled. | ✅ 2026-09-28 | API |
| BR-22 | Name and phone aren't kept in the browser after a booking is confirmed; the confirmation link is kept for 24 hours. | ✅ | UI (store persistence) |
| BR-23 | Names and phone numbers are never written to logs. | ✅ | API: redacting log and span processors before export ([#32](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/32)) |
| BR-24 | Visitors pass an invisible **Google reCAPTCHA v3** check before they can book. If they fail it, they're asked to call or text instead. | ✅ 2026-09-28 | API (`Recaptcha:MinScore`, app config) + UI |

## Announcements and content

| ID | Rule | Status | Where it's enforced |
| --- | --- | --- | --- |
| BR-30 | An announcement is **active** from its `startDate` through its `endDate` (inclusive), both required `YYYY-MM-DD` days, compared with the visitor's local date. An item without a title, or with a missing, impossible or reversed date, is skipped. | ✅ 2026-10-11 | UI (`AnnouncementsService`, `selectActiveAnnouncements`, [#30](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/30)) |
| BR-31 | A ticker bar showing active announcements that started within the last **30 days** (an app rule, not content), with a pause control. Neither the wireframe nor the app has a ticker yet. | ⏸ deferred 2026-10-11 | n/a |
| BR-32 | With no active announcements, or when `content/announcements.json` is missing or broken, the Announcements section and its menu links (header, drawer, footer) are **hidden**. The gallery's links hide the same way while it is empty. | ✅ 2026-10-11 | UI |
| BR-33 | Announcements are written in Thad's own words, with no style rules: prices, discounts, emoji and any characters are allowed. Each has a **title** (at most 60 characters) and a rich-text **body** (`bodyHtml`, at most **4000 characters of raw HTML, markup included**, since editors add markup and URLs run long; plain text works too). The limits are the admin portal's to enforce; the site shows longer text as it is. The end date defaults to **30 days after the start date** (an admin portal default) and can be changed; there's no "never expires" option. An announcement can have one **image** (a file in the media container's `announcements/` folder, optional alt text, left or right of the text on wide screens and always below it on phones) and any number of **buttons** (`label`, `url`, `variant` primary, secondary, outlined or text; unknown variants are outlined). Button links to `/…` open in the app, `https://` links in a new tab, `tel:` and `mailto:` on the device; any other link drops the button. Links to this site's pages in the body also open in the app. The body's HTML is cleaned by Angular's sanitizer. The date label on the card is generated from the dates, not typed. There are no tags. | ✅ 2026-10-11 | Content file + UI ([#30](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/30)) |
| BR-34 | Until the admin portal exists, Thad edits content straight in the environment's media container in the Azure portal. **Gallery:** every `.jpg`, `.jpeg`, `.png`, `.webp` or `.avif` in `gallery/` shows, newest upload first, with alt text from its file name (extension dropped, `-` and `_` become spaces, first letter capitalised); other files are skipped, and deleting a file removes it. **Announcements:** `content/announcements.json` (`{ "items": [...] }`, BR-30, BR-33), with their images in `announcements/`; a change shows on the next page load, with no deploy. | ✅ 2026-10-11 | Media container + UI ([#168](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/168), [#30](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/30)) |
| BR-35 | Text-alert sign-up is **not offered** for now. | ⏸ M7 | n/a |
| BR-36 | Reviews on the site are **Google reviews**: the **latest 5-star reviews with written text**, newest first, up to `reviewsToShow` (6). The rating and review count are Google's. Review text is never edited. If Google is unavailable, the hand-kept fallback in `content/reviews.json` is shown. | ✅ 2026-09-28 | Google Business Profile API → `/api/content/reviews`; `reviewsToShow` in the content file |

## Shop information

| ID | Rule | Status | Where it's enforced |
| --- | --- | --- | --- |
| BR-40 | Shop name, phone, address, hours and social links shown on the site come from the Square location profile. Social links that aren't set in Square are hidden. The **tagline** is site content, not the Square description. | ✅ 2026-09-29 | Square location profile; tagline in `content/shop.json` |
| BR-42 | The Square location **description** is shown as a notice at the top of the booking page (before the time picker) and in the home page's location and hours area. It's shown as plain text with line breaks kept, and hidden when empty. | ✅ 2026-09-29 | Square location profile → `/api/shop` → UI |
| BR-41 | "Open now" status is calculated in the shop's timezone. | ✅ | Square location timezone + UI |

---

## Change log

| Date | Change |
| --- | --- |
| 2026-09-28 | Created. BR-01 (single service), BR-06 (no deposits or no-show fees) and BR-11 (price in the booking summary only) decided. |
| 2026-09-28 | BR-21 decided: match returning customers silently (no one-time code for now). |
| 2026-09-28 | BR-36 decided: Google Business Profile reviews, latest 5-star with text. |
| 2026-09-28 | BR-13 decided: 5 upcoming appointments per phone; 5 booking attempts per device/IP per 10 minutes. |
| 2026-09-28 | BR-24 added: Google reCAPTCHA v3 bot check before booking (instead of Cloudflare Turnstile). |
| 2026-09-29 | Square setup checklist done ([#5](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/5)): BR-03, BR-04 and BR-07 configured in Square, BR-06 confirmed (no deposits or fees set), BR-12 reminders on (still pending the #21 spike). Values stay in Square. |
| 2026-09-29 | BR-11 changed: no price shown (the service is variable-priced). BR-40: tagline is site content, and unset social links are hidden. BR-42 added: the Square description is shown as a notice on the booking page and home page. |
| 2026-09-29 | BR-33 decided ([#6](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/6)): free wording, title is the ticker text (60 chars max), body 200 chars max, fixed tags, 30-day default expiry, generated date label. BR-11 clarified: announcements may mention prices. BR-30 updated for the default expiry. |
| 2026-09-29 | BR-30 and BR-33: the end date is required and defaults to 30 days after publishing; the `noExpiry` option is removed. |
| 2026-10-04 | BR-13 changed: the 5-per-phone cap counts every upcoming booking, not just website ones ([#21](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/21) found the API can read them all). The 5 attempts per device/IP per 10 minutes stays. |
| 2026-10-04 | BR-14 added: a link to Thad's Square booking site whenever booking on this site isn't available ([#146](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/146)). |
| 2026-10-11 | BR-34 changed ([#168](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/168)): the gallery is whatever is in the media container's `gallery/` folder, edited in the Azure portal; no repo copy or `gallery.json`. |
| 2026-10-11 | BR-30 to BR-34 changed ([#30](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/30)): announcements come from `content/announcements.json` in the media container with `startDate`/`endDate`, a `bodyHtml` body of up to 4000 characters, an optional image and buttons, and no tags; the length limits are the admin portal's; the menu links hide with the section. BR-31 (ticker) deferred. |
