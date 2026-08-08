"""Split the nine 5x6 transparent furniture sheets into managed sprites.

The supplied sheets are 1254x1254. Most already have transparent backgrounds;
two sheets contain a pale opaque grid/background, so the small edge-connected
background flood fill below removes it without eating isolated white furniture.
"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "furniture" / "character-sheets"
OUTPUT_DIR = ROOT / "assets" / "furniture" / "characters"

CHARACTERS = [
    "mobiyura",
    "reomoby",
    "potemoby",
    "mobichi",
    "yami",
    "mobirin",
    "mobiyan",
    "babumoby",
    "mobibou",
]


def near_color(a: tuple[int, int, int, int], b: tuple[int, int, int, int], tolerance: int = 34) -> bool:
    if a[3] == 0 or b[3] == 0:
        return False
    return sum((a[index] - b[index]) ** 2 for index in range(3)) ** 0.5 <= tolerance


def remove_edge_background(image: Image.Image) -> Image.Image:
    """Make an opaque background connected to the canvas edge transparent."""

    pixels = image.load()
    width, height = image.size
    edge_samples = []
    for x, y in [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]:
        if pixels[x, y][3] > 0:
            edge_samples.append(pixels[x, y])
    if not edge_samples:
        return image

    background = edge_samples[0]
    queue: deque[tuple[int, int]] = deque()
    seen: set[tuple[int, int]] = set()

    def add(x: int, y: int) -> None:
        if (x, y) in seen:
            return
        if not near_color(pixels[x, y], background):
            return
        seen.add((x, y))
        queue.append((x, y))

    for x in range(width):
        add(x, 0)
        add(x, height - 1)
    for y in range(height):
        add(0, y)
        add(width - 1, y)

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (pixels[x, y][0], pixels[x, y][1], pixels[x, y][2], 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                add(nx, ny)
    return image


def trim_with_padding(image: Image.Image, padding: int = 8) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    if not bbox:
        return Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, list[dict[str, object]]] = {}
    for character in CHARACTERS:
        source = SOURCE_DIR / f"{character}-sheet.png"
        if not source.exists():
            raise FileNotFoundError(source)
        image = remove_edge_background(Image.open(source).convert("RGBA"))
        character_dir = OUTPUT_DIR / character
        character_dir.mkdir(parents=True, exist_ok=True)
        entries = []
        for index in range(30):
            column = index % 5
            row = index // 5
            left = round(column * image.width / 5)
            top = round(row * image.height / 6)
            right = round((column + 1) * image.width / 5)
            bottom = round((row + 1) * image.height / 6)
            sprite = trim_with_padding(image.crop((left, top, right, bottom)))
            filename = f"{character}-furniture-{index + 1:02d}.png"
            sprite.save(character_dir / filename, optimize=True)
            entries.append({
                "id": f"{character}:furniture:{index + 1:02d}",
                "characterId": character,
                "label": f"専用家具 {index + 1:02d}",
                "path": f"assets/furniture/characters/{character}/{filename}",
                "sheetIndex": index + 1,
            })
        manifest[character] = entries

    (OUTPUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {sum(len(items) for items in manifest.values())} character furniture sprites")


if __name__ == "__main__":
    main()

