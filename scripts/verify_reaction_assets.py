"""Validate generated reaction WebPs and build a compact visual QA sheet."""

from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "mobies" / "reactions"
QA_DIR = ROOT / "tmp" / "reaction-generated" / "qa"
PATTERN = re.compile(
    r"^(?P<character>.+?)_extra_reaction_(?P<index>\d{2})_(?P<slug>.+)\.webp$"
)
CHARACTERS = (
    "mobichi",
    "mobiyan",
    "yami",
    "mobibou",
    "mobirin",
    "mobiyura",
    "reomoby",
    "potemoby",
    "babumoby",
)


def checkerboard(size: tuple[int, int], tile: int = 12) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size, "#efe7dc")
    draw = ImageDraw.Draw(image)
    for y in range(0, height, tile):
        for x in range(0, width, tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill="#ddd1c2")
    return image


def main() -> None:
    grouped: dict[str, list[tuple[int, str, Path]]] = defaultdict(list)
    failures: list[str] = []

    for path in sorted(ASSET_DIR.glob("*_extra_reaction_*.webp")):
        match = PATTERN.match(path.name)
        if match is None:
            failures.append(f"unexpected filename: {path.name}")
            continue
        character = match.group("character")
        index = int(match.group("index"))
        grouped[character].append((index, match.group("slug"), path))

        with Image.open(path) as image:
            rgba = image.convert("RGBA")
            alpha = rgba.getchannel("A")
            if rgba.size != (1024, 1024):
                failures.append(f"{path.name}: size={rgba.size}")
            if alpha.getbbox() is None:
                failures.append(f"{path.name}: fully transparent")
            if min(alpha.getextrema()) != 0:
                failures.append(f"{path.name}: no transparent pixels")
            if alpha.getpixel((0, 0)) != 0:
                failures.append(f"{path.name}: top-left corner is not transparent")

    for character in CHARACTERS:
        frames = sorted(grouped.get(character, []))
        indexes = [index for index, _, _ in frames]
        if indexes != list(range(9, 21)):
            failures.append(f"{character}: indexes={indexes}")

    if failures:
        raise SystemExit("\n".join(failures))

    QA_DIR.mkdir(parents=True, exist_ok=True)
    cell_w, cell_h = 124, 138
    label_w, header_h = 108, 28
    sheet = Image.new(
        "RGB",
        (label_w + cell_w * 12, header_h + cell_h * len(CHARACTERS)),
        "#5c485b",
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for column, index in enumerate(range(9, 21)):
        draw.text(
            (label_w + column * cell_w + 49, 8),
            f"{index:02d}",
            fill="#fff8ee",
            font=font,
        )

    for row, character in enumerate(CHARACTERS):
        y = header_h + row * cell_h
        draw.text((9, y + 60), character, fill="#fff8ee", font=font)
        for column, (_, _, path) in enumerate(sorted(grouped[character])):
            background = checkerboard((cell_w - 4, cell_h - 4))
            with Image.open(path) as image:
                preview = image.convert("RGBA")
                preview.thumbnail((cell_w - 10, cell_h - 10), Image.Resampling.LANCZOS)
            left = (background.width - preview.width) // 2
            top = background.height - preview.height
            background.paste(preview, (left, top), preview)
            sheet.paste(background, (label_w + column * cell_w + 2, y + 2))

    output = QA_DIR / "all-extra-reactions.webp"
    sheet.save(output, "WEBP", quality=90, method=4)
    print(f"validated={sum(len(frames) for frames in grouped.values())}")
    print(f"characters={len(CHARACTERS)} frames_per_character=12")
    print(output)


if __name__ == "__main__":
    main()
