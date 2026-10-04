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
| BR-08 | Changing a booking requires the **signed manage link** from the confirmation; a booking ID alone isn't enough. | ✅ | API (signed token) |
| BR-09 | Booking requires a name (at least 2 characters) and a 10-digit US phone number. | ✅ | UI + API validation |
| BR-10 | A slot taken by someone else before confirming can't be double-booked; the customer is asked to pick another time. | ✅ | Square availability re-check + API |
| BR-11 | The site never shows the **service's price**, because the service is variable-priced in Square. The booking summary and confirmation show the service's name and duration. Announcements may still mention prices or discounts (BR-33). | ✅ 2026-09-29 | Square Catalog → `/api/shop` → booking summary |
| BR-12 | Confirmations and reminders are sent by Square. | ⚠ reminders turned on in Square 2026-09-29; the [#21](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/21) spike couldn't check in sandbox that they fire for website bookings; needs a live test ([#89](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/89)) | Square → Appointments → Communications |
| BR-13 | A phone number can hold at most **5 upcoming appointments**; past or cancelled ones don't count, and only bookings made on the website are counted (Square doesn't show the site other bookings on the Free plan). Beyond that, the customer is asked to call or text. Booking attempts are limited to **5 per device/IP per 10 minutes**. | ✅ 2026-09-28 | App config (`Booking:MaxUpcomingPerPhone`, `RateLimits:Booking`) + API |

## Customer data and privacy

| ID | Rule | Status | Where it's enforced |
| --- | --- | --- | --- |
| BR-20 | The site **never shows customer information based on a phone number alone**. | ✅ | API |
| BR-21 | Returning customers are **matched silently**: the booking is linked to their existing Square customer (found by phone) or a new one is created, and nothing about them is shown or prefilled. | ✅ 2026-09-28 | API |
| BR-22 | Name and phone aren't kept in the browser after a booking is confirmed; the confirmation link is kept for 24 hours. | ✅ | UI (store persistence) |
| BR-23 | Names and phone numbers are never written to logs. | ✅ | API logging |
| BR-24 | Visitors pass an invisible **Google reCAPTCHA v3** check before they can book. If they fail it, they're asked to call or text instead. | ✅ 2026-09-28 | API (`Recaptcha:MinScore`, app config) + UI |

## Announcements and content

| ID | Rule | Status | Where it's enforced |
| --- | --- | --- | --- |
| BR-30 | An announcement is **active** from its `publishedAt` date until its `expiresAt` date (inclusive). Both dates are required (BR-33). | ✅ | Content file + UI selectors |
| BR-31 | The ticker bar shows active announcements **published within the last `tickerWindowDays`** (30). | ✅ | Content file (`tickerWindowDays`) |
| BR-32 | With no active announcements, the Announcements section, its menu links and the ticker bar are **all hidden**. | ✅ | UI |
| BR-33 | Announcements are written in Thad's own words, with no style rules: prices, discounts, emoji and any characters are allowed. Each has a **title** (at most 60 characters), which is also the ticker text, and a **body** (at most 200 characters). The tag is one of **Hours, Special, New, News**. Every announcement has a required end date (`expiresAt`), which defaults to **30 days after `publishedAt`** and can be changed. There's no "never expires" option; for a long-running post, set a far-off end date. The date label on the card is generated from the dates, not typed. The ticker has a pause control. | ✅ 2026-09-29 | Content file (JSON schema) + UI |
| BR-34 | Announcements are edited in `content/announcements.json`, and gallery photos by adding the original to `media/gallery/` plus an entry (with alt text) in `content/gallery.json`, until the admin portal exists. | ✅ | Content files + media pipeline |
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
