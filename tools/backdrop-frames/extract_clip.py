import argparse
from pathlib import Path

import av
from PIL import Image

from settings import REPLACEMENTS_FOLDER, SOURCE_FRAMES_PER_CLIP

SOURCE_FRAME_SIZE: tuple[int, int] = (1280, 720)
SOURCE_FRAME_QUALITY: int = 92


def pick_evenly_spaced_frames(video_path: Path, count: int) -> list[Image.Image]:
    with av.open(str(video_path)) as container:
        frame_total: int = container.streams.video[0].frames
        wanted: list[int] = [round(position * (frame_total - 1) / (count - 1)) for position in range(count)]
        needed: set[int] = set(wanted)
        kept: dict[int, Image.Image] = {
            index: frame.to_image().convert("RGB")
            for index, frame in enumerate(container.decode(video=0))
            if index in needed
        }
    return [kept[index] for index in wanted]


def main() -> None:
    parser: argparse.ArgumentParser = argparse.ArgumentParser(
        description="Cut a generated clip into the 121 source frames of clip N."
    )
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--clip", type=int, required=True, help="Clip number, 1 to 6.")
    arguments: argparse.Namespace = parser.parse_args()

    chosen: list[Image.Image] = pick_evenly_spaced_frames(arguments.video, SOURCE_FRAMES_PER_CLIP)
    folder: Path = REPLACEMENTS_FOLDER / f"c{arguments.clip}"
    folder.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(chosen):
        frame.resize(SOURCE_FRAME_SIZE, Image.LANCZOS).save(
            folder / f"{index:03d}.webp",
            "WEBP",
            quality=SOURCE_FRAME_QUALITY,
        )
    print(f"clip {arguments.clip}: {len(chosen)} frames written to {folder}")


if __name__ == "__main__":
    main()
