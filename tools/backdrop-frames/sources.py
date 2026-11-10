from pathlib import Path

from settings import REPLACEMENTS_FOLDER, SOURCE_FRAMES_FOLDER, SOURCE_KEYS_FOLDER


def source_frame_path(clip: int, source_frame: int) -> Path:
    replacement: Path = REPLACEMENTS_FOLDER / f"c{clip + 1}" / f"{source_frame:03d}.webp"
    if replacement.exists():
        return replacement
    return SOURCE_FRAMES_FOLDER / f"c{clip + 1}" / f"{source_frame:03d}.webp"


def source_key_path(key_number: int) -> Path:
    replacement: Path = REPLACEMENTS_FOLDER / "keys" / f"k{key_number}.webp"
    if replacement.exists():
        return replacement
    return SOURCE_KEYS_FOLDER / f"k{key_number}.webp"
