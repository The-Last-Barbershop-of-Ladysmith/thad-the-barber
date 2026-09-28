# Wireframe to App Audit

This audit shows how every part of the wireframe maps into `thad-the-barber-ui`: design tokens, reusable utilities, PrimeNG components, features, services and state. It also lists what was deliberately left out or changed.

- **Audited:** `../wireframe/site/index.html` (desktop), `mobile.html` (mobile), `book.html` (booking) and `support.js` (the wireframe's runtime)
- **Date:** 2026-09-27
- **App version:** first base version (Angular 22.2, PrimeNG 22.1, @primeuix/themes 3, NgRx 22, Tailwind 4.3)

---

## 1. Wireframe inventory

| Wireframe file | Screens / sections | Behavior |
| --- | --- | --- |
| `index.html` (≥ 768px) | Hero, Announcements, Schedule Now, Visit Us, Testimonials, Gallery, Footer | Scroll-scrubbed video canvas, announcement slider, SMS sign-up, "open now" status, gallery lightbox |
| `mobile.html` (< 767px) | Same sections | Same, plus a hamburger menu and priority frame streaming |
| `book.html` | Date, Time, Details, Summary, Footer | Month calendar, time slots, form, confirm |
| `support.js` | none | Generated React "DC" runtime; not ported |

**Change:** The wireframe used separate desktop and mobile pages with a redirect script. The app has one responsive page, using Tailwind breakpoints (`md:` = 768px, matching the wireframe's split).

---

## 2. Design tokens extracted

Every hard-coded value in the wireframe was collected and grouped into PrimeNG token layers in `src/app/theme/tokens/`.

### 2.1 Colors → primitive tokens (`primitive.ts`)

| Wireframe value | Used for | Token |
| --- | --- | --- |
| `#E8904A` | CTA, eyebrows, borders, selected states | `copper.500` → `primary.color` |
| `#F4B46E` | Hover text, hours times, rating number | `copper.300` → `primary.hoverColor` |
| (generated) | Full 50–950 scale around the two above | `copper.50`–`copper.950` |
| `#f4e6d8` | Headings, primary text | `espresso.50` → `text.color` |
| `#e6d6c4` | Body copy | `espresso.100` |
| `#d8c3ad` | Booking labels | `espresso.200` |
| `#cdbba8` | Secondary links, dates, counters | `espresso.300` |
| `#a8988a` | Muted text, "Closed" rows | `espresso.400` → `text.mutedColor` |
| `#8a7a6c` | Input placeholders | `espresso.500` → `formField.placeholderColor` |
| `#6d5f54` / `#7d6d60` | Disabled calendar days / slots | `espresso.600` |
| `#2a1a0e` | CTA gradient mid-stop | `espresso.800` |
| `#1d140d` | Map well background | `espresso.900` |
| `#140d08` / `#120c08` | Page background (merged: 2 near-identical values) | `espresso.950` |
| `#0d0805` | Glass panels, header fade, gradient start | `ink` |
| `#7FD18B` | "Open now" status | `mint` → `brand.success` |
| `#fbfaf6` / `#000` | Gallery photo mat / frame | Inline in `photo-mat` / `photo-frame` utilities |

**Change:** `espresso` became the PrimeNG **surface** palette, so `tailwindcss-primeui` classes like `bg-surface-950` and `text-surface-100` resolve to the brand neutrals.

### 2.2 Transparent colors → semantic tokens (`semantic.ts`)

| Wireframe value | Used for | Token |
| --- | --- | --- |
| `rgba(13,8,5,.74–.76)` + `blur(12px)` | Section panels | `content.background`, `brand.glass.background`, `brand.glass.blur` |
| `rgba(13,8,5,.86)` | Footer panel | `brand.glass.strongBackground` |
| `rgba(232,144,74,.22)` | Panel border | `content.borderColor` |
| `rgba(232,144,74,.15)` | Row dividers | `brand.divider` |
| `rgba(232,144,74,.18)` + `rgba(244,230,216,.04)` | Testimonial tiles | `brand.tile.borderColor`, `brand.tile.background` |
| `rgba(232,144,74,.45)` | Input border | `formField.borderColor` |
| `rgba(244,230,216,.06)` | Input fill | `formField.background` |
| `rgba(232,144,74,.14)` / `.4` | "You're on the list" notice | `highlight.background`, `message.info.*` |
| `rgba(8,5,3,.92)` | Lightbox mask | `mask.background` |
| `linear-gradient(180deg, rgba(13,8,5,.92)…0)` | Fixed header fade | `brand.headerFade` |
| `linear-gradient(100deg, #0d0805, #2a1a0e 30%, #E8904A 65%, #F4B46E)` | CTA sweep | `brand.ctaGradient` |
| `0 16px 36px -10px rgba(232,144,74,.8)` | CTA hover glow | `brand.ctaGlow` |
| `cubic-bezier(.2,.8,.2,1)` | Hover motion | `brand.ease` |

Values under `semantic.extend.brand` become `--p-brand-*` CSS variables. This was verified by generating the theme CSS.

### 2.3 Radii

| Wireframe | Used for | Token | Tailwind |
| --- | --- | --- | --- |
| `2px` | Photo frame | `borderRadius.xs` | none |
| `10px` | Buttons, inputs, notices | `borderRadius.md` | `rounded-control` |
| `12px` / `14px` | Media / testimonial tiles (merged) | `borderRadius.lg` | `rounded-tile` |
| `18px` | Glass panels, modals | `borderRadius.xl` | `rounded-panel` |
| `50%` | Arrow, dot and social buttons | `pButton [rounded]` / carousel tokens | `rounded-full` |

### 2.4 Typography

| Wireframe style | Where | Result |
| --- | --- | --- |
| `Helvetica, Arial, sans-serif` | Everywhere | `fontFamily.sans` → `--font-sans` |
| 12px / 700 / `.18em` / uppercase / copper | Every section label | `eyebrow` utility |
| `clamp(48px,8vw,96px)` / 800 / `.95` / `-.03em` / uppercase | Hero wordmark | `display-title` utility |
| `clamp(32px,4.5vw,52px)` / 800 / `1` / `-.02em` / uppercase | Section headings | `section-title` utility |
| `clamp(17px,2vw,21px)` / `1.45` | Hero tagline | `lead` utility |
| 18px / `1.5` / `#e6d6c4` | Panel paragraphs | `body-copy` utility |
| 12px / 700 / `.14em` / uppercase / muted | "LOCATION", "PHONE", form labels | `field-label` utility |
| `0 2px 24px rgba(0,0,0,.55)` | Hero text shadow | `text-shadow-hero` |
| `0 1px 8px rgba(0,0,0,.8)` | Nav text shadow | `text-shadow-nav` |
| `drop-shadow(0 1px 6px rgba(0,0,0,.6))` | Logo | `drop-shadow-logo` |

**Changes:**
- `clamp(28px,min(5vw,8vh),60px)` on announcement titles now uses `section-title`.
- Booking's 40px heading now uses `section-title`, for consistency.

---

## 3. Reusable utilities (`theme/tailwind/theme.css`)

These are repeated wireframe patterns that aren't PrimeNG components.

| Utility | Wireframe pattern | Times repeated |
| --- | --- | --- |
| `eyebrow` | Copper uppercase labels | 12+ |
| `section-title` | Uppercase section H2s | 7 |
| `display-title` | Hero H1 | 1 (brand-critical) |
| `lead`, `body-copy` | Intro and panel paragraphs | 6 |
| `field-label` | Muted uppercase labels | 5 |
| `nav-link` | Link hover to `#F4B46E` | 20+ |
| `glass`, `glass-strong` | Frosted containers that aren't cards (footer) | 1 (cards cover the rest) |
| `tile` | Testimonial cards | 4 |
| `header-fade` | Fixed header gradient | 2 (site + booking) |
| `photo-frame`, `photo-mat` | Gallery prints + lightbox | 16 |
| `media-placeholder` | Striped "[ photo — … ]" wells | 2 |
| Colors `text-mint`, `border-divider`, `bg-ink` | Status, dividers, deep fills | many |

**Rule:** a utility that sets a property (color, letter-spacing) shouldn't be paired with another utility that sets the same property on the same element. `nav-link` therefore only owns hover and transition; color and weight are added per use.

---

## 4. Components: PrimeNG vs custom

Rule applied: **if PrimeNG has the component, restyle it with tokens (`theme/tokens/components/*.ts`) instead of building a new one.**

### 4.1 Mapped to PrimeNG

| Wireframe element | Occurrences | PrimeNG | Token file | Notes |
| --- | --- | --- | --- | --- |
| Gradient sweep CTA ("Book a cut", "Book online", "Text me", "Confirm booking") | 4 | `pButton` primary | `button.ts` | Gradient, sweep, lift and letter-spacing on hover come from the token `css` key |
| Copper outline button ("(540) 621-2143", "Book a kids cut", "Book a trim") | 3 | `pButton [outlined]` | `button.ts` | Fills copper on hover; text flips to contrast color |
| Glass circle buttons (slider ←/→, social icons, hamburger) | 5 | `pButton severity="secondary" [rounded]` | `button.ts` | Secondary tokens re-skinned as glass |
| "Get directions →" | 2 | `pButton [link]` | `button.ts` | |
| Frosted section panels | 6 | `p-card` | `card.ts` | Border and backdrop blur via `css` |
| Announcement slider, swipe, arrows, dots | 1 | `p-carousel` (PrimeNG 22 composable API) | `carousel.ts` | Ring dots that fill and scale when active |
| Gallery lightbox, prev/next, close, counter, Esc/arrow keys | 1 | `p-galleria [fullScreen]` | `galleria.ts` | `#item` / `#footer` templates |
| Booking month calendar and legend | 1 | `p-datepicker [inline]` | `datepicker.ts` | Square tiles, strike-through disabled days, fixed table layout |
| Time slot grid | 1 | `p-selectbutton` + toggle buttons | `selectbutton.ts` | Segmented control un-joined into a wrapping grid |
| Phone inputs (SMS + booking) | 2 | `p-inputmask` `(999) 999-9999` | `semantic.ts` `formField` | Replaces the wireframe's hand-written formatter |
| Name input | 1 | `pInputText` | `semantic.ts` `formField` | |
| "You're on the list" / "You're booked" | 2 | `p-message severity="info"` | `message.ts` | `info` re-skinned as copper (the app has no blue state) |
| "★★★★★" text stars | 5 | `p-rating [readonly]` | `rating.ts` | |
| Mobile slide-down menu | 1 | `p-drawer` | `drawer.ts` | |
| Time-slot loading state | new | `p-progress-spinner` | Default | Not in the wireframe |

### 4.2 Custom (no PrimeNG equivalent)

| Component | Location | Why custom |
| --- | --- | --- |
| `SectionHeading` | `shared/components/section-heading` | Eyebrow + title pair used in 4 sections |
| `HoursList` | `shared/components/hours-list` | One data source, 3 layouts: `table` (schedule), `stacked` (visit), `compact` (footer) |
| `Backdrop` | `shared/components/backdrop` | Fixed photo background: `scroll` (home) and `still` (booking) |
| `Header`, `Footer` | `layout/` | App shell |
| Section components | `features/home/components/*` | Page composition only |

---

## 5. Pages → features

| Wireframe | Route | Feature | Components |
| --- | --- | --- | --- |
| `index.html` / `mobile.html` | `/` | `features/home` | `hero`, `announcements` (+ `sms-signup`), `schedule-cta`, `visit`, `testimonials`, `gallery` |
| `book.html` | `/book` | `features/booking` | `date-step`, `time-step`, `details-step`, `booking-summary` |
| Header / footer on all pages | Shell | `layout/` | `header`, `footer` |

- Both features lazy-load and register their own store slices (`home.routes.ts`, `booking.routes.ts`).
- In-page links (`#schedule` and so on) use `routerLink="/" fragment="…"` with router anchor scrolling. They work from `/book` too.
- The header switches to "← Back to site" on `/book`, as in the wireframe.

---

## 6. Wireframe logic → services and state

| Wireframe logic (source) | App location | Notes |
| --- | --- | --- |
| Phone number, address, map/directions URLs, socials (hard-coded in 3 places) | `core/config/shop-info.ts` → `SHOP_INFO`, `SOCIAL_LINKS`, `HOME_SECTIONS` | Single source of truth |
| Hours rows repeated in schedule, visit, footer | `OPENING_HOURS` + `ShopHoursService.rows` | Rows are built from data |
| `openLabel` / `openColor` (`index.html` `renderVals`) | `ShopHoursService.statusAt()` / `status` signal | Refreshes every minute; unit tested |
| `ANNS`, testimonials markup, `GAL` array | `features/home/data/home-content.data.ts` via `HomeContentService` | Ready to swap for an API |
| `subscribe` / `setPhone` / `phoneErr` | `SmsSignup` component + `HomePageActions.smsSignupSubmitted` → `subscribeToSms` effect → `SmsSignupService` | Mocked 400ms |
| `slots()`, `available()`, `hash()`, `daysAhead`, `slotMinutes` (`book.html`) | `AvailabilityService` + `BOOKING_RULES` | Same deterministic "booked" pattern; mocked |
| Month nav, `canPrev` / `canNext` | DatePicker `minDate` / `maxDate` + `monthViewed` → `loadMonthAvailability` effect | |
| Day / time pick, `done`, `tried`, `missing[]` | `booking` slice + `Booking` page computed signals | See state below |
| `confirm` | `confirmRequested` → `confirmBooking` effect → `BookingService` | Mocked 500ms |
| `ann`, `touchStart` / `touchEnd`, `goAnn` | Built into `p-carousel` | Removed |
| `lb`, `stepLb`, `onKey` | Built into `p-galleria` | Removed |
| `menu` / `toggleMenu` (mobile) | Root `layout` slice + `closeMenuOnNavigation` effect | |
| Frame preloader, `MOTION` retiming, `warp()`, canvas `draw()` | Not ported (see §8) | `Backdrop` crossfades keyframes instead |

### State slices

| Slice | Files | Holds |
| --- | --- | --- |
| `layout` (root) | `store/app.*.ts` | `menuOpen` |
| `home` | `features/home/state/home.{state,actions,reducer,feature,effects}.ts` | Announcements, testimonials, gallery, content status, SMS sign-up status |
| `booking` | `features/booking/state/booking.{state,actions,reducer,feature,effects}.ts` | Visible month, unavailable dates, selected date/time, slots, submit status, confirmation |

- Each reducer lives in its own `*.reducer.ts`. Each `*.feature.ts` holds the feature key and uses `createFeature` for a scoped feature selector, with `extraSelectors` for derived values such as `selectOpenSlotCount`, `selectSelectedSlot` and `selectIsSubscribed`.
- `home` and `booking` persist to localStorage through `ngrx-store-localstorage` (`store/meta/meta.reducers.ts`). They're stored base64-encoded as `ttb-home` and `ttb-booking` and restored when each slice loads. Each feature clears its slice, and the saved copy, with its own `stateReset` action.
- Dates are stored as ISO strings to keep state serializable.
- Stale responses (a month or date the user has already moved past) are ignored by the reducer, and unit tested.
- Name and phone stay in a reactive form on the booking page; the store only gets them on confirm.

---

## 7. Assets

| Wireframe asset | App | Status |
| --- | --- | --- |
| `assets/logo-1c.png` | `public/assets/logo.png` | Copied |
| `assets/gallery/cut-01…15.webp` (1.3 MB) | `public/assets/gallery/` | Copied |
| `assets/keys/k1…k7.webp` (2.9 MB) | `public/assets/keys/` | Copied; used by `Backdrop` |
| `assets/icon-instagram.svg`, `icon-facebook.svg` | Replaced by `pi pi-instagram` / `pi pi-facebook` | Not copied |
| `assets/frames3/c1…c7` (847 frames, 52 MB) | none | Not copied (see §8) |

---

## 8. Gaps and changes from the wireframe

| Item | Status | Next step |
| --- | --- | --- |
| Scroll-scrubbed video background (canvas, 847 frames, motion retiming) | Replaced by a keyframe crossfade | Port into `Backdrop` and host the frames on a CDN (the mobile wireframe already streamed them remotely) |
| Background "loading…%" overlay | Dropped (not needed for the stills) | Bring back with the frame scrubber |
| Announcement arrows | At panel sides on desktop; beside the dots on mobile | Confirm with design |
| Lightbox arrows | Inside the photo edges (Galleria default) rather than at the viewport sides | Adjust `galleria.ts` if needed |
| Instagram / Facebook URLs (`href="#"`) | Still placeholders | Fill in `SOCIAL_LINKS` |
| Announcement photos ("kid in the chair", "hot towel") | Striped placeholders | Set `imageUrl` in content data |
| Booking page monospace styling | Replaced with the brand sans | Intentional; the wireframe mono was a placeholder style |
| Booking API, SMS provider, content API | Mocked services | Swap each service body for `HttpClient` calls (`environment.apiBaseUrl`) |
| SSR / prerender | Not set up | Add `@angular/ssr` when hosting is decided |
| Gallery images | Larger than their rendered size (Angular NG0913 warning) | Generate thumbnails or use `NgOptimizedImage` |

---

## 9. Tests

> **Note:** These tests were written to the wireframe's spec: its mock data, booking rules, hours and flows. That behavior is a placeholder, not confirmed business rules. The functionality will likely change as business rules are decided later, for example booking windows, slot lengths, availability, the SMS sign-up and the content source, so these tests will likely need to change with it. A failing test after a business-rule change may mean the test needs updating, not that there's a bug. More tests will be added per component and feature as those rules are settled.

| Spec | Covers | Tied to wireframe behavior? |
| --- | --- | --- |
| `core/services/shop-hours.service.spec.ts` | Hours rows, "Open now" / "Opens at" / "Closed" labels | Yes: wireframe hours and label wording |
| `features/booking/state/booking.reducer.spec.ts` | Date/time selection, stale responses, submit → booked, reset on edit | Yes: wireframe booking flow |
| `features/booking/state/booking.feature.spec.ts` | Open-slot count, selected slot | Yes: wireframe slot rules |
| `store/app.reducer.spec.ts` | Menu toggle / close | Mostly stable |
| `store/app.effects.spec.ts` | Menu closes after navigation | Mostly stable |
| `store/meta/meta.reducers.spec.ts` | localStorage sync of `home` / `booking` (`ttb-` keys, base64, restore) | Mostly stable |
| `shared/utils/{date,weekday,base64}.utils.spec.ts` | Date labels, weekday spans, Unicode-safe base64 | Stable |

---

## 10. Verification (2026-09-27)

**Checks run:**
- `ng build`: clean, 166 kB initial transfer (159 kB before localStorage sync was added). Home and booking load as separate chunks.
- `ng test`: 23/23 passing across 9 spec files (see §9).
- Headless Chrome over the DevTools protocol:
  - Every home section and the footer render against the wireframe.
  - The lightbox opens.
  - A full booking goes through: pick date → pick slot → name + masked phone → confirm → "You're booked" message.
  - No runtime exceptions.

**Bugs found and fixed during the check:**
- The page wrapper's `z-index` trapped the lightbox under the fixed header.
- Calendar columns had uneven widths (fixed with `table-layout: fixed`).
- The disabled time-slot strike-through targeted `:disabled` instead of `.p-disabled`.

**Environment (resolved):**
- Node is now 24.21, which meets Angular 22's minimum (24.15).
- The PrimeUI license key is set in `core/config/primeui-license.ts`, so the license banner no longer shows.
- Angular CLI analytics is disabled (`angular.json` `"analytics": false`).
