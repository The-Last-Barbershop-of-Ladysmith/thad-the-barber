import json
from dataclasses import dataclass, field
from typing import Any

from square_api import Json


@dataclass
class Plan:
    location_id: str
    location_changes: Json = field(default_factory=dict)
    location_change_lines: list[str] = field(default_factory=list)
    service_object: Json | None = None
    service_change_lines: list[str] = field(default_factory=list)
    dashboard_steps: list[str] = field(default_factory=list)


def abbreviate_text(value: Any) -> str:
    text: str = json.dumps(value, ensure_ascii=False)
    return text if len(text) <= 60 else text[:57] + "..."


def change_line(name: str, current: Any, desired: Any) -> str:
    return f"{name}: {abbreviate_text(current)} -> {abbreviate_text(desired)}"


def format_plan(plan: Plan, applied: bool) -> str:
    lines: list[str] = [f"Location {plan.location_id}:"]
    lines += [f"  {line}" for line in plan.location_change_lines] or ["  up to date"]
    lines.append("Service:")
    lines += [f"  {line}" for line in plan.service_change_lines] or ["  up to date"]
    if plan.dashboard_steps:
        lines.append("Set by hand in the sandbox Seller Dashboard (no write API):")
        lines += [f"  - {step}" for step in plan.dashboard_steps]
    if plan.location_changes or plan.service_object:
        lines.append("Applied." if applied else "Dry run: nothing written. Run again with --apply to write.")
    else:
        lines.append("Nothing to write.")
    return "\n".join(lines)
