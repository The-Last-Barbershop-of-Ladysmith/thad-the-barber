from typing import Any

from plan import Plan, update_line_description
from square_api import Json, SquareState


def flatten(settings: Json) -> Json:
    """Square nests the appointment settings in the profile; their names don't clash with the top-level ones."""
    nested: Json = settings.get("business_appointment_settings", {})
    return {**{k: v for k, v in settings.items() if k != "business_appointment_settings"}, **nested}


def setting_value(settings: Json, key: str, desired: Any) -> Any:
    """Square leaves out zero values, so a missing number counts as 0."""
    return settings.get(key, 0 if type(desired) is int else None)


def plan_booking_settings(seed: Json, state: SquareState, plan: Plan) -> None:
    current_settings: Json = flatten(state.business_booking_profile)
    for key, desired in flatten(seed["booking_settings"]).items():
        current: Any = setting_value(current_settings, key, desired)
        if current != desired:
            plan.dashboard_steps.append("Booking settings " + update_line_description(key, current, desired))

    location_profile: Json = next(
        (p for p in state.location_booking_profiles if p["location_id"] == plan.location_id), {})
    if not location_profile.get("online_booking_enabled"):
        plan.dashboard_steps.append("Turn on online booking for the location")
