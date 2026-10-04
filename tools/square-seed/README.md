# Square sandbox seed

`seed_square_sandbox.py` makes the Square sandbox seller mirror Thad's live Square setup ([#22](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/22)), so dev, test and the smoke tests book against realistic data. It uses only the Python standard library and the Azure CLI, so there's nothing to install.

`seed.json` holds the values, copied from Thad's live Square (see [#5](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/5)). When Thad changes something in Square that the site shows, update `seed.json` and run the seed again.

## Run it

You need Python 3.10 or later and `az login` with access to the dev Key Vault. The vault name is read from `thad-the-barber-api/appsettings.Development.json`.

```bash
python tools/square-seed/seed_square_sandbox.py --set-token   # once, or after rotating the token
python tools/square-seed/seed_square_sandbox.py               # dry run: prints what would change
python tools/square-seed/seed_square_sandbox.py --apply       # writes the location and the service
```

`--set-token` asks for the sandbox seller's access token (Developer Console → the app → Sandbox → Credentials) without echoing it, checks it against Square, and saves it to Key Vault as `Square--SandboxAccessToken`. Run it in your own terminal; the token never goes into a file in the repo.

The seed is idempotent: it compares the sandbox with `seed.json` and writes only the differences, so a run straight after `--apply` prints `Nothing to write.`

## What it seeds

| Part | How |
| --- | --- |
| Location: name, business name, phone, address, timezone, hours, description (the site's notice) | Written by `--apply` (Locations API) |
| The one service, "Haircut w/ Thad": 30 min, variable price, bookable, assigned to the bookable team member | Written by `--apply` (Catalog API). If the sandbox has one service under another name, it's renamed in place so its bookings stay valid |
| Booking settings: online booking on, 1-hour minimum notice, 365-day window, customers can cancel with no window or fee, one service per booking, slots aligned to the service length | **Checked only**: Square has no write API for these. The script lists every difference as a Dashboard step |
| Exactly one bookable team member, no other bookable services | **Checked only**, same as above |

## Dashboard steps

Sign in to the sandbox Seller Dashboard (Developer Console → Sandbox test accounts → Open in Square Dashboard), then change whatever the dry run listed:

- **Appointments → Online booking → Channels:** turn online booking on for the location.
- **Appointments → Online booking → Settings**, under *Online scheduling*:
  - *Appointments are scheduled*: According to service duration (`alignment_time`)
  - *Appointments must be made at least*: 1 hour in advance (`min_booking_lead_time_seconds`)
  - *Appointments can be scheduled*: up to 365 days ahead (`max_booking_lead_time_seconds`)
  - *Allow multiple services*: off (`multiple_service_booking_enabled`)
  - Customers can cancel and reschedule, with no cancellation window.
  - Click **Save**.
- **Appointments → Staff:** only one team member is bookable online.
- **Items → Services:** online booking off for any service except "Haircut w/ Thad".

Run the dry run again until it lists no Dashboard steps.

## Blocked day (for the #5 check)

Time off in the Square calendar must make the site's availability follow, with no code change. To check it in the sandbox:

1. In the sandbox Dashboard, open **Appointments → Calendar**, pick an upcoming Saturday and add **Time off** for the whole day (10:00–19:00) for the bookable team member.
2. `SearchAvailability` for that Saturday (the Postman collection in `tools/square-spike/`, or the API's availability endpoint once [#27](https://github.com/The-Last-Barbershop-of-Ladysmith/thad-the-barber/issues/27) exists) returns no slots, while the Sunday after still has slots.
3. On the booking page, that Saturday shows as unavailable.
4. Delete the time off afterwards so smoke tests keep their slots.
