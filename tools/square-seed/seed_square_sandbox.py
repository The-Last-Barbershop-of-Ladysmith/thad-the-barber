"""Seeds the Square sandbox seller so it mirrors Thad's live Square setup (issue #22).

Dry run by default: prints what would change. --apply writes the location and the service.
Booking settings have no write API, so they're only checked and listed as Dashboard steps.
"""

import argparse
import json
import sys
import uuid
from pathlib import Path

from booking_settings import plan_booking_settings
from key_vault import read_token, store_token
from location import plan_location
from plan import Plan, format_plan
from service import plan_service
from square_api import Json, SquareCall, SquareState, fetch_state, square_client

SEED_FILE: Path = Path(__file__).with_name("seed.json")


def plan_seed(seed: Json, state: SquareState) -> Plan:
    plan: Plan = Plan(location_id=state.location["id"])
    plan_location(seed, state.location, plan)
    plan_service(seed, state, plan)
    plan_booking_settings(seed, state, plan)
    return plan


def apply_plan(call: SquareCall, plan: Plan) -> None:
    if plan.location_changes:
        plan_body = { "location": plan.location_changes }
        call("PUT", f"/v2/locations/{plan.location_id}", plan_body)
    if plan.service_object:
        plan_body = { "idempotency_key": str(uuid.uuid4()), "object": plan.service_object }
        call("POST", "/v2/catalog/object", plan_body)


def main() -> None:
    parser: argparse.ArgumentParser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="write the changes (default: dry run)")
    parser.add_argument("--set-token", action="store_true", help="prompt for the sandbox token and save it to Key Vault")
    args: argparse.Namespace = parser.parse_args()

    if args.set_token:
        store_token()
        return

    call: SquareCall = square_client(read_token())
    seed: Json = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    plan: Plan = plan_seed(seed, fetch_state(call))
    if args.apply:
        apply_plan(call, plan)
    print(format_plan(plan, applied=args.apply))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
