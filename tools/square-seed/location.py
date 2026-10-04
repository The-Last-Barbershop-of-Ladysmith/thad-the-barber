import re
from typing import Any

from plan import Plan, change_line
from square_api import Json


def get_phone_digits(phone: str | None) -> str:
    return re.sub(r"\D", "", phone or "")


def get_sorted_time_periods(hours: Json | None) -> list[tuple[str, str, str]]:
    periods: list[Json] = (hours or {}).get("periods", [])
    return sorted((p["day_of_week"], p["start_local_time"], p["end_local_time"]) for p in periods)


def location_value_matches(key: str, current: Any, desired: Any) -> bool:
    if key == "phone_number":
        return get_phone_digits(current) == get_phone_digits(desired)
    if key == "business_hours":
        return get_sorted_time_periods(current) == get_sorted_time_periods(desired)
    return current == desired


def plan_location(seed: Json, location: Json, plan: Plan) -> None:
    for key, desired in seed["location"].items():
        current: Any = location.get(key)
        if not location_value_matches(key, current, desired):
            plan.location_changes[key] = desired
            plan.location_change_lines.append(change_line(key, current, desired))
