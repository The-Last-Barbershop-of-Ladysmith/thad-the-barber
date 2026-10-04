import json
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE_URL: str = "https://connect.squareupsandbox.com"
SQUARE_VERSION: str = "2026-09-16"

Json = dict[str, Any]
SquareCall = Callable[[str, str, Json | None], Json]


@dataclass
class SquareState:
    location: Json
    service_items: list[Json]
    bookable_team_member_ids: list[str]
    business_booking_profile: Json
    location_booking_profiles: list[Json]


def square_client(token: str) -> SquareCall:
    def call(method: str, path: str, body: Json | None) -> Json:
        request: Request = Request(
            BASE_URL + path,
            method=method,
            data=None if body is None else json.dumps(body).encode(),
            headers={
                "Authorization": f"Bearer {token}",
                "Square-Version": SQUARE_VERSION,
                "Content-Type": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=30) as response:
                return json.load(response)
        except HTTPError as error:
            raise SystemExit(f"Square {method} {path} returned {error.code}: {error.read().decode()}") from None

    return call


def fetch_service_items(call: SquareCall) -> list[Json]:
    items: list[Json] = []
    cursor: str | None = None
    while True:
        body: Json = {"product_types": ["APPOINTMENTS_SERVICE"]}
        if cursor:
            body["cursor"] = cursor
        page: Json = call("POST", "/v2/catalog/search-catalog-items", body)
        items += page.get("items", [])
        cursor = page.get("cursor")
        if not cursor:
            return items


def fetch_state(call: SquareCall) -> SquareState:
    team: Json = call("GET", "/v2/bookings/team-member-booking-profiles?bookable_only=true", None)
    return SquareState(
        location=call("GET", "/v2/locations/main", None)["location"],
        service_items=fetch_service_items(call),
        bookable_team_member_ids=[p["team_member_id"] for p in team.get("team_member_booking_profiles", [])],
        business_booking_profile=call("GET", "/v2/bookings/business-booking-profile", None)["business_booking_profile"],
        location_booking_profiles=call("GET", "/v2/bookings/location-booking-profiles", None).get(
            "location_booking_profiles", []),
    )
