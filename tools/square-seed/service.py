import copy

from plan import Plan, change_line, abbreviate_text
from square_api import Json, SquareState


def is_bookable(item: Json) -> bool:
    return any(v["item_variation_data"].get("available_for_booking") for v in item["item_data"].get("variations", []))


def pick_service_item(seed: Json, items: list[Json]) -> Json | None:
    """The item named in the seed, or the only service there is (renamed in place, so its bookings stay valid)."""
    named: list[Json] = [item for item in items if item["item_data"]["name"] == seed["service"]["name"]]
    if named:
        return named[0]
    return items[0] if len(items) == 1 else None


def verify_location_presence(location_id: str) -> Json:
    return {"present_at_all_locations": False, "present_at_location_ids": [location_id]}


def desired_variation_data(seed: Json, team_member_ids: list[str]) -> Json:
    return {
        "name": seed["service"]["variation_name"],
        "pricing_type": seed["service"]["pricing_type"],
        "service_duration": seed["service"]["service_duration"],
        "available_for_booking": True,
        "team_member_ids": team_member_ids,
    }


def new_service_object(seed: Json, location_id: str, team_member_ids: list[str]) -> Json:
    return {
        "type": "ITEM",
        "id": "#service",
        **verify_location_presence(location_id),
        "item_data": {
            "name": seed["service"]["name"],
            "product_type": "APPOINTMENTS_SERVICE",
            "variations": [
                {
                    "type": "ITEM_VARIATION",
                    "id": "#variation",
                    **verify_location_presence(location_id),
                    "item_variation_data": desired_variation_data(seed, team_member_ids),
                }
            ],
        },
    }


def update_fields(target: Json, desired: Json, prefix: str, lines: list[str]) -> None:
    for key, value in desired.items():
        if target.get(key) != value:
            lines.append(change_line(prefix + key, target.get(key), value))
            target[key] = value


def updated_service_object(seed: Json, item: Json, plan: Plan, team_member_ids: list[str]) -> Json | None:
    updated: Json = copy.deepcopy(item)
    lines: list[str] = []
    update_fields(updated, verify_location_presence(plan.location_id), "", lines)
    update_fields(updated["item_data"], {"name": seed["service"]["name"]}, "", lines)
    variations: list[Json] = updated["item_data"]["variations"]
    update_fields(variations[0], verify_location_presence(plan.location_id), "variation.", lines)
    update_fields(variations[0]["item_variation_data"], desired_variation_data(seed, team_member_ids), "variation.", lines)
    for extra in variations[1:]:
        plan.dashboard_steps.append(f"Delete the extra variation {abbreviate_text(extra['item_variation_data'].get('name'))} of the service")
    plan.service_change_lines.extend(lines)
    return updated if lines else None


def plan_service(seed: Json, state: SquareState, plan: Plan) -> None:
    team_member_ids: list[str] = sorted(state.bookable_team_member_ids)
    item: Json | None = pick_service_item(seed, state.service_items)

    if item is None:
        plan.service_object = new_service_object(seed, plan.location_id, team_member_ids)
        plan.service_change_lines.append(f"create {abbreviate_text(seed['service']['name'])}")
    else:
        plan.service_object = updated_service_object(seed, item, plan, team_member_ids)

    for other in state.service_items:
        if other is not item and is_bookable(other):
            plan.dashboard_steps.append(
                f"Turn off online booking for the extra service {abbreviate_text(other['item_data']['name'])} (the site books one service)")
    if len(team_member_ids) != 1:
        plan.dashboard_steps.append(
            f"Make exactly one team member bookable (now {len(team_member_ids)}: {', '.join(team_member_ids) or 'none'})")
