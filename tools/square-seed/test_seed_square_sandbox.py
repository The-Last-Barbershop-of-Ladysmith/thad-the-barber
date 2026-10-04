import copy
import json
import unittest
from pathlib import Path

from plan import Plan, format_plan
from seed_square_sandbox import SEED_FILE, plan_seed
from square_api import Json, SquareState

FIXTURES: Path = Path(__file__).resolve().parents[2] / "thad-the-barber-api.tests" / "Fixtures" / "Square"
SEED: Json = json.loads(SEED_FILE.read_text(encoding="utf-8"))


def fixture(name: str) -> Json:
    return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


def spike_sandbox() -> SquareState:
    """The sandbox as the #21 spike left it."""
    return SquareState(
        location={
            "id": "LVF9Q8XN61NA4",
            "name": "Thad the Barber Sandbox",
            "business_name": "Thad the Barber Sandbox",
            "phone_number": "+1 202-555-0100",
            "timezone": "America/New_York",
            "address": {"address_line_1": "1600 Pennsylvania Ave NW", "locality": "Washington"},
        },
        service_items=fixture("search-catalog-items")["items"],
        bookable_team_member_ids=[p["team_member_id"] for p in fixture("team-member-booking-profiles")["team_member_booking_profiles"]],
        business_booking_profile=fixture("business-booking-profile")["business_booking_profile"],
        location_booking_profiles=fixture("location-booking-profiles")["location_booking_profiles"],
    )


def seeded_sandbox() -> SquareState:
    """The sandbox after --apply and the Dashboard steps."""
    state: SquareState = spike_sandbox()
    state.location.update(copy.deepcopy(SEED["location"]))
    state.location["phone_number"] = "+15406212143"
    state.location["business_hours"]["periods"].reverse()
    state.service_items = [plan_seed(SEED, spike_sandbox()).service_object]
    state.business_booking_profile = copy.deepcopy(SEED["booking_settings"])
    return state


class DryRunTests(unittest.TestCase):
    def test_spike_sandbox_plans_location_service_and_dashboard_steps(self) -> None:
        output: str = format_plan(plan_seed(SEED, spike_sandbox()), applied=False)

        self.assertIn('name: "Thad the Barber Sandbox" -> "Thad"', output)
        self.assertIn("business_hours: null ->", output)
        self.assertIn('name: "Men\'s haircut" -> "Haircut w/ Thad"', output)
        self.assertIn("variation.present_at_all_locations: true -> false", output)
        self.assertIn("min_booking_lead_time_seconds: 0 -> 3600", output)
        self.assertIn('alignment_time: "HALF_HOURLY" -> "SERVICE_DURATION"', output)
        self.assertIn("booking_enabled: false -> true", output)
        self.assertTrue(output.endswith("Dry run: nothing written. Run again with --apply to write."))

    def test_rerun_after_seeding_changes_nothing(self) -> None:
        plan: Plan = plan_seed(SEED, seeded_sandbox())

        self.assertEqual({}, plan.location_changes)
        self.assertIsNone(plan.service_object)
        self.assertEqual([], plan.dashboard_steps)
        self.assertEqual(
            "Location LVF9Q8XN61NA4:\n  up to date\nService:\n  up to date\nNothing to write.",
            format_plan(plan, applied=False))

    def test_missing_service_is_created_for_the_bookable_team_member(self) -> None:
        state: SquareState = seeded_sandbox()
        state.service_items = []

        plan: Plan = plan_seed(SEED, state)

        assert plan.service_object is not None
        variation: Json = plan.service_object["item_data"]["variations"][0]["item_variation_data"]
        self.assertEqual("APPOINTMENTS_SERVICE", plan.service_object["item_data"]["product_type"])
        self.assertEqual(["TMN76Ik4Cpv-ToYe"], variation["team_member_ids"])
        self.assertEqual(["create \"Haircut w/ Thad\""], plan.service_change_lines)

    def test_extra_bookable_service_and_team_members_are_dashboard_steps(self) -> None:
        state: SquareState = seeded_sandbox()
        extra: Json = copy.deepcopy(state.service_items[0])
        extra["item_data"]["name"] = "Beard trim"
        state.service_items.append(extra)
        state.bookable_team_member_ids.append("TM2")

        steps: list[str] = plan_seed(SEED, state).dashboard_steps

        self.assertIn('Turn off online booking for the extra service "Beard trim" (the site books one service)', steps)
        self.assertIn("Make exactly one team member bookable (now 2: TM2, TMN76Ik4Cpv-ToYe)", steps)

    def test_online_booking_off_is_a_dashboard_step(self) -> None:
        state: SquareState = seeded_sandbox()
        state.location_booking_profiles[0]["online_booking_enabled"] = False

        self.assertEqual(["Turn on online booking for the location"], plan_seed(SEED, state).dashboard_steps)


if __name__ == "__main__":
    unittest.main()
