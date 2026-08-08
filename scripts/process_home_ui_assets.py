"""Create deterministic, green-screen-free Mobby UI assets.

The supplied sheets use a saturated #00ff00 background.  We keep the original
files under assets/home-ui/source and write small, named transparent PNGs for
the app.  This is intentionally deterministic so the exact reference artwork
is preserved (rather than regenerated or stylised).
"""

from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "home-ui" / "source"
OUT = ROOT / "assets" / "home-ui"


def chroma_key(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    pixels = np.asarray(image).copy()
    rgb = pixels[:, :, :3].astype(np.float32)
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    dominance = green - np.maximum(red, blue)

    # The background is a vivid green.  A short soft edge keeps antialiased
    # highlights while removing the green spill around the cut-out artwork.
    alpha = 255.0 - np.clip((dominance - 18.0) * 3.6, 0.0, 255.0)
    alpha = np.where((green > 145.0) & (green > red * 1.22) & (green > blue * 1.22), 0.0, alpha)
    pixels[:, :, 3] = alpha.astype(np.uint8)

    # Despill only the semitransparent edge pixels.
    edge = (pixels[:, :, 3] < 250) & (pixels[:, :, 3] > 0)
    pixels[:, :, 1][edge] = np.minimum(pixels[:, :, 1][edge], np.maximum(red[edge], blue[edge]) + 10)
    return Image.fromarray(pixels, "RGBA")


def crop(image: Image.Image, box: tuple[int, int, int, int], name: str, folder: str) -> None:
    target = OUT / folder
    target.mkdir(parents=True, exist_ok=True)
    image.crop(box).save(target / f"{name}.png")


def process_sheet(filename: str, output_name: str) -> Image.Image:
    processed = chroma_key(SOURCE / filename)
    target = OUT / output_name
    target.parent.mkdir(parents=True, exist_ok=True)
    processed.save(target)
    return processed


def main() -> None:
    icons = process_sheet("icons.png", "sheets/icons-transparent.png")
    panels = process_sheet("panels.png", "sheets/panels-transparent.png")
    logo = process_sheet("logo.png", "sheets/logo-transparent.png")
    buttons = process_sheet("buttons.png", "sheets/buttons-transparent.png")
    decor = process_sheet("room-decor.png", "sheets/room-decor-transparent.png")

    # icons.png is a 5 x 4 sheet.  The names mirror the reference quick-nav
    # and bottom-tab icons, and are imported directly by the React Native UI.
    icon_names = [
        ["heart", "coin", "plus", "bell", "menu"],
        ["notice", "book", "mission", "friend", "gift"],
        ["exchange", "search", "house", "room", "message"],
        ["gacha", "mobby", "chevron-up", "chevron-down", "sparkles"],
    ]
    cell_w, cell_h = icons.width // 5, icons.height // 4
    for row, names in enumerate(icon_names):
        for col, name in enumerate(names):
            crop(icons, (col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h), name, "icons")

    # Logo is a wide 1536 x 1024 source.  Crop the mark tightly for the header.
    crop(logo, (110, 160, 1440, 850), "mobby-logo", "logo")

    # Reusable panel/button pieces from the supplied UI sheet.  They are used
    # as transparent ImageBackgrounds where the reference has stitched paper.
    crop(panels, (35, 35, 610, 225), "wide-paper", "panels")
    crop(panels, (620, 25, 1230, 235), "quick-nav", "panels")
    crop(panels, (75, 715, 600, 870), "activity-card", "panels")
    crop(panels, (640, 720, 1195, 875), "bottom-strip", "panels")
    crop(buttons, (55, 205, 735, 455), "coral-button", "buttons")
    crop(buttons, (55, 735, 735, 1000), "cream-button", "buttons")

    # A few room-decor cut-outs are available for future room dressing and
    # provide a visual bridge between the reference and the existing room.
    crop(decor, (315, 330, 625, 620), "bunting", "room-decor")
    crop(decor, (685, 20, 900, 330), "window", "room-decor")
    crop(decor, (970, 585, 1210, 880), "lamp", "room-decor")


if __name__ == "__main__":
    main()
