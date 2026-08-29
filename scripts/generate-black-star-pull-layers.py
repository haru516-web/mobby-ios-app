"""Generate independent fixed parts for black-star pull art.

The pull interaction deforms a clean, filled body image, while the lens,
cross-shaped control, and each round button stay pinned to their authored
positions. This script emits every fixed part as its own full-canvas
transparent WebP asset. The clean body assets are maintained separately so
this script never recreates an internal transparent hole.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "black-stars" / "pull"

# Coordinates are on the authored 1254 x 1254 canvas. The small overscan
# around each part hides the moving copy underneath the fixed layer during a
# strong pull without changing any of the other costume details.
REGIONS: dict[str, tuple[tuple[str, str, tuple[int, int, int, int]], ...]] = {
    "magician": (
        ("lens", "ellipse", (632, 397, 895, 654)),
        ("cross", "cross", (417, 714, 625, 934)),
        ("button-left", "ellipse", (634, 744, 753, 870)),
        ("button-right", "ellipse", (729, 713, 850, 851)),
    ),
    "informant": (
        ("lens", "ellipse", (661, 365, 918, 620)),
        ("cross", "cross", (381, 664, 576, 872)),
        ("button-left", "ellipse", (654, 665, 774, 800)),
        ("button-right", "ellipse", (751, 649, 870, 788)),
    ),
    "tracker": (
        ("lens", "ellipse", (658, 361, 921, 624)),
        ("cross", "cross", (409, 674, 604, 883)),
        ("button-left", "ellipse", (633, 673, 753, 807)),
        ("button-right", "ellipse", (727, 659, 850, 801)),
    ),
    "safecracker": (
        ("lens", "ellipse", (658, 327, 936, 610)),
        ("cross", "cross", (435, 693, 650, 921)),
        ("button-left", "ellipse", (673, 696, 795, 834)),
        ("button-right", "ellipse", (765, 680, 884, 818)),
    ),
    "veiled-duchess": (
        ("lens", "ellipse", (656, 369, 916, 632)),
        ("cross", "cross", (412, 760, 611, 953)),
        ("button-left", "ellipse", (646, 768, 768, 902)),
        ("button-right", "ellipse", (742, 751, 862, 889)),
    ),
    "courier": (
        ("lens", "ellipse", (661, 340, 931, 615)),
        ("cross", "cross", (402, 700, 620, 925)),
        ("button-left", "ellipse", (658, 711, 785, 850)),
        ("button-right", "ellipse", (754, 696, 882, 837)),
    ),
    "commander": (
        ("lens", "ellipse", (661, 367, 941, 647)),
        ("cross", "cross", (414, 728, 619, 948)),
        ("button-left", "ellipse", (650, 736, 776, 877)),
        ("button-right", "ellipse", (749, 723, 872, 865)),
    ),
}


def make_region_mask(size: tuple[int, int], kind: str, box: tuple[int, int, int, int]) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    if kind == "ellipse":
        draw.ellipse(box, fill=255)
    elif kind == "cross":
        left, top, right, bottom = box
        width = right - left
        height = bottom - top
        arm_width = max(1, round(width * 0.42))
        arm_height = max(1, round(height * 0.42))
        center_x = (left + right) / 2
        center_y = (top + bottom) / 2
        vertical = (
            round(center_x - arm_width / 2),
            top,
            round(center_x + arm_width / 2),
            bottom,
        )
        horizontal = (
            left,
            round(center_y - arm_height / 2),
            right,
            round(center_y + arm_height / 2),
        )
        draw.rounded_rectangle(vertical, radius=max(1, round(arm_width * 0.16)), fill=255)
        draw.rounded_rectangle(horizontal, radius=max(1, round(arm_height * 0.16)), fill=255)
    else:
        raise ValueError(f"Unsupported region kind: {kind}")
    return mask


def split_character(character: str) -> None:
    source_path = SOURCE_DIR / f"{character}-noneye.png"
    with Image.open(source_path) as source_file:
        source = source_file.convert("RGBA")

    region_masks: dict[str, Image.Image] = {}
    for name, kind, box in REGIONS[character]:
        region_mask = make_region_mask(source.size, kind, box)
        region_masks[name] = region_mask

    for name, region_mask in region_masks.items():
        part = source.copy()
        part.putalpha(ImageChops.multiply(part.getchannel("A"), region_mask))
        part.save(SOURCE_DIR / f"{character}-{name}.webp", "WEBP", lossless=True, method=6)


if __name__ == "__main__":
    for character in REGIONS:
        split_character(character)
