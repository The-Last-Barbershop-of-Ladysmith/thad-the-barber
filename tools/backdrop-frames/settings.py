from dataclasses import dataclass
from pathlib import Path

REPO_ROOT: Path = Path(__file__).resolve().parents[2]
SOURCE_FRAMES_FOLDER: Path = REPO_ROOT / "wireframe" / "site" / "assets" / "frames3"
SOURCE_KEYS_FOLDER: Path = REPO_ROOT / "wireframe" / "site" / "assets" / "keys"
OUTPUT_FOLDER: Path = REPO_ROOT / "thad-the-barber-ui" / "public" / "assets" / "backdrop"
# Newer sources (clip frames in cN/, keyframes in keys/) win over the wireframe originals; not committed.
REPLACEMENTS_FOLDER: Path = REPO_ROOT / "tools" / "backdrop-frames" / "replacements"

CLIP_COUNT: int = 6
SOURCE_FRAMES_PER_CLIP: int = 121
FRAME_STRIDE: int = 2

KEY_NUMBERS: list[int] = [1, 2, 3, 4, 5, 6, 7]

# Where each keyframe's subject sits across the 16:9 picture (0 = left edge, 1 = right edge); a phone's portrait crop
# is centred there, and the frames of a clip slide the crop from one keyframe's centre to the next.
KEY_SUBJECT_CENTERS: list[float] = [0.70, 0.72, 0.78, 0.72, 0.68, 0.45, 0.62]

PORTRAIT_ASPECT: float = 9 / 16


@dataclass(frozen=True)
class Variant:
    name: str
    frame_size: tuple[int, int]
    frame_quality: int
    key_size: tuple[int, int]
    key_quality: int
    is_portrait_crop: bool


DESKTOP: Variant = Variant(
    name="desktop",
    frame_size=(1280, 720),
    frame_quality=35,
    key_size=(1920, 1072),
    key_quality=40,
    is_portrait_crop=False,
)

PHONE: Variant = Variant(
    name="phone",
    frame_size=(405, 720),
    frame_quality=40,
    key_size=(540, 960),
    key_quality=45,
    is_portrait_crop=True,
)

VARIANTS: list[Variant] = [DESKTOP, PHONE]
