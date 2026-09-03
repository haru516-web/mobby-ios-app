"""Generate character- and role-specific backgrounds for the three home popovers.

The popover contents are intentionally separate from the small home controls.
Each output keeps a quiet copy area for the React Native UI while carrying the
active theme's room texture, palette, and character watermark around the edge.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[1]
THEME_ROOT = REPO_ROOT / "assets" / "themes"
OUTPUT_SIZE = (720, 1080)


CHARACTERS = (
    ("mobirin", (76, 97, 114), (210, 188, 146), "assets/mobies/joy/mobirin-joy.png"),
    ("mobichi", (227, 108, 145), (255, 202, 102), "assets/mobies/joy/mobichi-joy.png"),
    ("yami", (123, 106, 146), (99, 130, 157), "assets/mobies/joy/yami-joy.png"),
    ("mobiyan", (47, 98, 116), (224, 184, 72), "assets/mobies/joy/mobiyan-joy.png"),
    ("mobiyura", (77, 59, 104), (174, 143, 212), "assets/mobies/joy/mobiyura-joy.png"),
    ("reomoby", (147, 68, 94), (222, 178, 84), "assets/mobies/joy/reomoby-joy.png"),
    ("potemoby", (154, 114, 76), (200, 167, 111), "assets/mobies/joy/potemoby-joy.png"),
    ("mobibou", (200, 106, 53), (80, 130, 148), "assets/mobies/joy/mobibou-joy.png"),
    ("babumoby", (213, 138, 155), (139, 181, 195), "assets/mobies/joy/babumoby-joy.png"),
    ("magician", (118, 90, 158), (207, 178, 86), "assets/enemies/magician.png"),
    ("informant", (75, 117, 141), (164, 194, 193), "assets/enemies/informant.png"),
    ("tracker", (101, 118, 76), (188, 158, 90), "assets/enemies/tracker.png"),
    ("safecracker", (154, 104, 69), (90, 99, 109), "assets/enemies/safecracker.png"),
    ("veiled-duchess", (141, 85, 120), (207, 170, 192), "assets/enemies/veiled-duchess.png"),
    ("courier", (140, 98, 82), (210, 151, 91), "assets/enemies/courier.png"),
    ("commander", (83, 91, 117), (180, 159, 102), "assets/enemies/commander.png"),
)

STYLE_COLORS = {
    1: ((210, 188, 146), (255, 249, 236)),
    2: ((140, 199, 197), (235, 250, 247)),
    3: ((102, 83, 125), (42, 35, 62)),
    4: ((200, 94, 111), (229, 177, 91)),
    5: ((213, 166, 74), (53, 40, 58)),
}

ROLE_TEMPLATES = {
    "dressUpPopup": REPO_ROOT / "assets/generated-ui/popup-themes/dress-up-panel-v1.png",
    "characterPickerPopup": REPO_ROOT / "assets/generated-ui/popup-themes/character-picker-panel-v1.png",
    "reactionBookPopup": REPO_ROOT / "assets/generated-ui/popup-themes/reaction-book-panel-v1.png",
}


def fit(image: Image.Image, size: tuple[int, int], centering: tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    return ImageOps.fit(image.convert("RGBA"), size, method=Image.Resampling.LANCZOS, centering=centering)


def alpha_layer(image: Image.Image, opacity: float) -> Image.Image:
    result = image.convert("RGBA")
    result.putalpha(result.getchannel("A").point(lambda value: round(value * opacity)))
    return result


def blend_room_texture(template: Image.Image, room: Image.Image, accent: tuple[int, int, int], style: int) -> Image.Image:
    """Let each theme's existing room art show through without hurting text contrast."""
    room = fit(room, OUTPUT_SIZE, centering=(0.5, 0.38)).convert("RGB")
    room = ImageEnhance.Color(room).enhance(0.62)
    room = ImageEnhance.Contrast(room).enhance(0.56)
    room = ImageEnhance.Brightness(room).enhance(1.28 if style in (3, 5) else 1.10)
    room = room.filter(ImageFilter.GaussianBlur(2.2))
    base = fit(template, OUTPUT_SIZE).convert("RGB")
    blended = Image.blend(base, room, 0.14)
    tint = Image.new("RGB", OUTPUT_SIZE, accent)
    blended = Image.blend(blended, tint, 0.035 if style in (1, 2, 4) else 0.055)
    return blended.convert("RGBA")


def draw_frame(canvas: Image.Image, accent: tuple[int, int, int], secondary: tuple[int, int, int], style: int) -> None:
    draw = ImageDraw.Draw(canvas, "RGBA")
    w, h = OUTPUT_SIZE
    inset = 19
    radius = 31
    draw.rounded_rectangle(
        (inset, inset, w - inset, h - inset),
        radius=radius,
        outline=accent + (118,),
        width=5,
    )
    inner = inset + 13
    draw.rounded_rectangle(
        (inner, inner, w - inner, h - inner),
        radius=radius - 8,
        outline=secondary + (92,),
        width=2,
    )
    # Small, non-textual style markers make the five style variants distinct
    # without putting generated glyphs underneath localized copy.
    marker_y = 42
    for index in range(5):
        x = 62 + index * 22
        color = accent if index == (style - 1) else secondary
        draw.ellipse((x - 5, marker_y - 5, x + 5, marker_y + 5), fill=color + (148 if index == style - 1 else 76,))


def draw_portrait(canvas: Image.Image, art: Image.Image, box: tuple[int, int, int, int], accent: tuple[int, int, int], opacity: float) -> None:
    x1, y1, x2, y2 = box
    width = max(1, x2 - x1)
    height = max(1, y2 - y1)
    fitted = ImageOps.contain(art.convert("RGBA"), (width, height), method=Image.Resampling.LANCZOS)
    alpha = fitted.getchannel("A").point(lambda value: round(value * opacity))
    fitted.putalpha(alpha)
    cx = x1 + width // 2
    cy = y1 + height // 2
    ring = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    ring_draw = ImageDraw.Draw(ring, "RGBA")
    ring_radius = min(width, height) // 2 + 12
    ring_draw.ellipse(
        (cx - ring_radius, cy - ring_radius, cx + ring_radius, cy + ring_radius),
        fill=accent + (24,),
        outline=accent + (112,),
        width=5,
    )
    for angle in range(0, 360, 45):
        # Tiny dots around the badge read as stitched framing at phone scale.
        import math

        radians = math.radians(angle)
        dot_x = cx + round(math.cos(radians) * (ring_radius + 8))
        dot_y = cy + round(math.sin(radians) * (ring_radius + 8))
        ring_draw.ellipse((dot_x - 4, dot_y - 4, dot_x + 4, dot_y + 4), fill=accent + (145,))
    canvas.alpha_composite(ring)
    canvas.alpha_composite(fitted, (x1 + (width - fitted.width) // 2, y1 + (height - fitted.height) // 2))


def draw_role_details(canvas: Image.Image, role: str, accent: tuple[int, int, int], secondary: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(canvas, "RGBA")
    if role == "dressUpPopup":
        # Two small fabric swatches sit outside the copy-safe center.
        for index, color in enumerate((accent, secondary)):
            x = 42 + index * 76
            y = 858 + index * 14
            draw.rounded_rectangle((x, y, x + 60, y + 42), radius=9, fill=color + (148,), outline=(255, 249, 236, 165), width=2)
            for offset in range(0, 58, 12):
                draw.line((x + offset, y + 3, x + offset + 20, y + 39), fill=(255, 249, 236, 70), width=2)
    elif role == "characterPickerPopup":
        # Echo the board's medallions with the active theme color.
        for row in range(3):
            y = 248 + row * 194
            for x in (84, 636):
                draw.ellipse((x - 49, y - 49, x + 49, y + 49), outline=accent + (78,), width=4)
                draw.ellipse((x - 39, y - 39, x + 39, y + 39), outline=secondary + (72,), width=2)
    else:
        # A few stitched reaction dots reinforce the notebook role.
        for x, y, radius in ((74, 278, 9), (641, 455, 11), (90, 772, 7), (628, 810, 8)):
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=accent + (118,), outline=secondary + (128,), width=2)


def make_asset(template: Image.Image, room: Image.Image, art: Image.Image, accent: tuple[int, int, int], secondary: tuple[int, int, int], style: int, role: str) -> Image.Image:
    canvas = blend_room_texture(template, room, accent, style)
    draw_role_details(canvas, role, accent, secondary)
    draw_frame(canvas, accent, secondary, style)
    if role == "dressUpPopup":
        portrait_box = (450, 700, 690, 1018)
        portrait_opacity = 0.30
    elif role == "characterPickerPopup":
        portrait_box = (444, 710, 690, 1008)
        portrait_opacity = 0.25
    else:
        portrait_box = (34, 710, 286, 1008)
        portrait_opacity = 0.27
    draw_portrait(canvas, art, portrait_box, accent, portrait_opacity)
    return canvas.convert("RGB")


def parse_only(values: list[str]) -> set[tuple[str, int]] | None:
    if not values:
        return None
    result: set[tuple[str, int]] = set()
    for value in values:
        character, style_text = value.split(":", 1)
        style = int(style_text)
        if style not in range(1, 6):
            raise SystemExit(f"Invalid style in --only: {value}")
        result.add((character, style))
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", action="append", default=[], metavar="CHARACTER:STYLE")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    selected = parse_only(args.only)

    missing = [str(path) for path in ROLE_TEMPLATES.values() if not path.is_file()]
    if missing:
        raise SystemExit("Missing popup template assets:\n" + "\n".join(missing))

    templates = {role: Image.open(path).convert("RGBA") for role, path in ROLE_TEMPLATES.items()}
    generated = 0
    try:
        for character_id, accent, secondary, art_path in CHARACTERS:
            art = Image.open(REPO_ROOT / art_path).convert("RGBA")
            try:
                for style, (style_tint, style_light) in STYLE_COLORS.items():
                    if selected is not None and (character_id, style) not in selected:
                        continue
                    room_path = THEME_ROOT / character_id / f"{style:02d}" / "appBackground.png"
                    if not room_path.is_file():
                        raise SystemExit(f"Missing themed room background: {room_path}")
                    room = Image.open(room_path).convert("RGBA")
                    try:
                        # Mix the style color into the character palette so the
                        # background follows both the character and its outfit.
                        theme_accent = tuple(round((a * 0.72) + (b * 0.28)) for a, b in zip(accent, style_tint))
                        theme_secondary = tuple(round((a * 0.55) + (b * 0.45)) for a, b in zip(secondary, style_light))
                        for role, template in templates.items():
                            output_path = THEME_ROOT / character_id / f"{style:02d}" / f"{role}.jpg"
                            if output_path.exists() and not args.force:
                                continue
                            asset = make_asset(template, room, art, theme_accent, theme_secondary, style, role)
                            output_path.parent.mkdir(parents=True, exist_ok=True)
                            asset.save(output_path, format="JPEG", quality=88, subsampling=0, optimize=True, progressive=True)
                            generated += 1
                    finally:
                        room.close()
            finally:
                art.close()
    finally:
        for template in templates.values():
            template.close()
    print(f"Generated {generated} theme popup assets")


if __name__ == "__main__":
    main()
