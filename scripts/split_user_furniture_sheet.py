"""Split the provided green-screen furniture sheet into transparent PNG sprites.

The source is intentionally kept in assets/furniture for provenance. This script
only crops the known object regions and trims transparent margins; it does not
redraw or resample the furniture.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


SPRITES = {
    # (left, top, right, bottom) on the 1254x1254 source sheet.
    "sofa-blue": (15, 55, 480, 410),
    "coffee-table": (505, 105, 900, 410),
    "floor-lamp": (965, 15, 1190, 430),
    "bookshelf": (55, 400, 365, 790),
    "plant": (395, 370, 685, 790),
    "bed-blue": (695, 425, 1200, 790),
    "cabinet-olive": (35, 760, 370, 1045),
    "rug-round": (385, 760, 880, 988),
    "mug-blue": (950, 795, 1170, 965),
    "books-stack": (215, 1045, 500, 1235),
    "box-closed": (570, 990, 870, 1235),
    "box-open": (870, 945, 1210, 1235),
}


def trim_alpha(image: Image.Image, padding: int = 10) -> Image.Image:
    alpha = image.getchannel("A")
    # Treat barely visible matte pixels as transparent while retaining soft edges.
    mask = alpha.point(lambda value: 255 if value > 8 else 0)
    bbox = mask.getbbox()
    if not bbox:
        return image
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    args.out_dir.mkdir(parents=True, exist_ok=True)
    for name, box in SPRITES.items():
        sprite = trim_alpha(source.crop(box))
        target = args.out_dir / f"user-{name}.png"
        sprite.save(target, "PNG", optimize=True)
        print(f"Wrote {target} ({sprite.width}x{sprite.height})")


if __name__ == "__main__":
    main()
