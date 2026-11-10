from PIL import Image

from settings import KEY_SUBJECT_CENTERS, PORTRAIT_ASPECT, SOURCE_FRAMES_PER_CLIP


def subject_center_at(clip: int, source_frame: int) -> float:
    start: float = KEY_SUBJECT_CENTERS[clip]
    end: float = KEY_SUBJECT_CENTERS[clip + 1]
    progress: float = source_frame / (SOURCE_FRAMES_PER_CLIP - 1)
    return start + (end - start) * progress


def crop_portrait(image: Image.Image, subject_center: float) -> Image.Image:
    crop_width: int = round(image.height * PORTRAIT_ASPECT)
    left: int = round(subject_center * image.width - crop_width / 2)
    left = min(max(left, 0), image.width - crop_width)
    return image.crop((left, 0, left + crop_width, image.height))
