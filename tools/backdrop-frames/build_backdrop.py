import argparse
from pathlib import Path

from PIL import Image

from crop import crop_portrait, subject_center_at
from settings import (
    CLIP_COUNT,
    FRAME_STRIDE,
    KEY_NUMBERS,
    KEY_SUBJECT_CENTERS,
    OUTPUT_FOLDER,
    SOURCE_FRAMES_PER_CLIP,
    VARIANTS,
    Variant,
)
from sources import source_frame_path, source_key_path


def save_avif(image: Image.Image, size: tuple[int, int], quality: int, path: Path) -> int:
    resized: Image.Image = image if image.size == size else image.resize(size, Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    resized.save(path, "AVIF", quality=quality, speed=4)
    return path.stat().st_size


def build_frames(variant: Variant, clip_numbers: list[int]) -> int:
    total_bytes: int = 0
    for clip_number in clip_numbers:
        clip: int = clip_number - 1
        for kept_frame, source_frame in enumerate(range(0, SOURCE_FRAMES_PER_CLIP, FRAME_STRIDE)):
            source: Image.Image = Image.open(source_frame_path(clip, source_frame)).convert("RGB")
            if variant.is_portrait_crop:
                source = crop_portrait(source, subject_center_at(clip, source_frame))
            total_bytes += save_avif(
                source,
                variant.frame_size,
                variant.frame_quality,
                OUTPUT_FOLDER / variant.name / "frames" / f"c{clip_number}" / f"{kept_frame:03d}.avif",
            )
    return total_bytes


def build_keys(variant: Variant, key_numbers: list[int]) -> int:
    total_bytes: int = 0
    for key_number in key_numbers:
        source: Image.Image = Image.open(source_key_path(key_number)).convert("RGB")
        if variant.is_portrait_crop:
            source = crop_portrait(source, KEY_SUBJECT_CENTERS[key_number - 1])
        total_bytes += save_avif(
            source,
            variant.key_size,
            variant.key_quality,
            OUTPUT_FOLDER / variant.name / "keys" / f"k{key_number}.avif",
        )
    return total_bytes


def main() -> None:
    parser: argparse.ArgumentParser = argparse.ArgumentParser(description="Build the backdrop frames and keyframes.")
    parser.add_argument("--variant", choices=[variant.name for variant in VARIANTS])
    parser.add_argument("--clips", type=int, nargs="*", help="Clip numbers to build (default: all).")
    parser.add_argument("--keys", type=int, nargs="*", help="Keyframe numbers to build (default: all).")
    arguments: argparse.Namespace = parser.parse_args()
    clip_numbers: list[int] = list(range(1, CLIP_COUNT + 1)) if arguments.clips is None else arguments.clips
    key_numbers: list[int] = KEY_NUMBERS if arguments.keys is None else arguments.keys
    for variant in VARIANTS:
        if arguments.variant and arguments.variant != variant.name:
            continue
        frame_bytes: int = build_frames(variant, clip_numbers)
        key_bytes: int = build_keys(variant, key_numbers)
        print(f"{variant.name}: frames {frame_bytes / 1e6:.2f} MB, keyframes {key_bytes / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
