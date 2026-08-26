#!/usr/bin/env python3
"""Build the 16 x 5 home-specific theme asset sets.

The creative material sheets in ``assets/themes/home-materials`` are authored
with ImageGen.  This script performs the deterministic production pass: it
keeps the normal-home silhouettes, alpha and content-safe areas, then applies
the selected material, style-specific trim and a small character-art motif.

Run from the repository root:

    python scripts/generate_home_theme_assets.py
    python scripts/generate_home_theme_assets.py --only mobirin:1

The generated TypeScript registry is written alongside the existing app-wide
theme registry so Metro can statically discover every ``require``.
"""

from __future__ import annotations

import argparse
import hashlib
import math
import random
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps


REPO_ROOT: Final = Path(__file__).resolve().parents[1]
THEME_ROOT: Final = REPO_ROOT / "assets" / "themes"
REGISTRY_PATH: Final = REPO_ROOT / "src" / "data" / "gachaHomeThemeAssets.generated.ts"
MOBBY_TIME_REGISTRY_PATH: Final = REPO_ROOT / "src" / "data" / "gachaMobbyTimeThemeAssets.generated.ts"


@dataclass(frozen=True)
class CharacterSpec:
    id: str
    accent: tuple[int, int, int]
    secondary: tuple[int, int, int]
    art_path: str


@dataclass(frozen=True)
class SlotSpec:
    name: str
    base_path: str
    safe_inset: tuple[float, float, float, float] | None
    motif_anchor: tuple[float, float]
    motif_scale: float


CHARACTERS: Final = (
    CharacterSpec("mobirin", (76, 97, 114), (210, 188, 146), "assets/mobies/joy/mobirin-joy.png"),
    CharacterSpec("mobichi", (227, 108, 145), (255, 202, 102), "assets/mobies/joy/mobichi-joy.png"),
    CharacterSpec("yami", (123, 106, 146), (99, 130, 157), "assets/mobies/joy/yami-joy.png"),
    CharacterSpec("mobiyan", (47, 98, 116), (224, 184, 72), "assets/mobies/joy/mobiyan-joy.png"),
    CharacterSpec("mobiyura", (77, 59, 104), (174, 143, 212), "assets/mobies/joy/mobiyura-joy.png"),
    CharacterSpec("reomoby", (147, 68, 94), (222, 178, 84), "assets/mobies/joy/reomoby-joy.png"),
    CharacterSpec("potemoby", (154, 114, 76), (200, 167, 111), "assets/mobies/joy/potemoby-joy.png"),
    CharacterSpec("mobibou", (200, 106, 53), (80, 130, 148), "assets/mobies/joy/mobibou-joy.png"),
    CharacterSpec("babumoby", (213, 138, 155), (139, 181, 195), "assets/mobies/joy/babumoby-joy.png"),
    CharacterSpec("magician", (118, 90, 158), (207, 178, 86), "assets/enemies/magician.png"),
    CharacterSpec("informant", (75, 117, 141), (164, 194, 193), "assets/enemies/informant.png"),
    CharacterSpec("tracker", (101, 118, 76), (188, 158, 90), "assets/enemies/tracker.png"),
    CharacterSpec("safecracker", (154, 104, 69), (90, 99, 109), "assets/enemies/safecracker.png"),
    CharacterSpec("veiled-duchess", (141, 85, 120), (207, 170, 192), "assets/enemies/veiled-duchess.png"),
    CharacterSpec("courier", (140, 98, 82), (210, 151, 91), "assets/enemies/courier.png"),
    CharacterSpec("commander", (83, 91, 117), (180, 159, 102), "assets/enemies/commander.png"),
)


SLOTS: Final = (
    SlotSpec("controlButton", "assets/generated-ui/home-control-button-v1.png", (0.14, 0.22, 0.14, 0.22), (0.09, 0.50), 0.13),
    SlotSpec("garland", "assets/backgrounds/home-garland-trimmed-v1.png", None, (0.50, 0.58), 0.12),
    SlotSpec("hook", "assets/backgrounds/hook-transparent.png", None, (0.50, 0.46), 0.16),
    SlotSpec("inventoryTile", "assets/generated-ui/surface-tile-square-v1.png", (0.18, 0.18, 0.18, 0.18), (0.12, 0.12), 0.105),
    SlotSpec("inventoryTileSelected", "assets/generated-ui/surface-tile-selected-v1.png", (0.20, 0.20, 0.20, 0.20), (0.12, 0.12), 0.105),
    SlotSpec("inventoryTray", "assets/generated-ui/inventory-tray-background-v1.png", (0.07, 0.18, 0.07, 0.18), (0.045, 0.50), 0.11),
    SlotSpec("reactionBubble", "assets/generated-ui/speech-bubble-paper-v1.png", (0.13, 0.18, 0.13, 0.22), (0.88, 0.20), 0.10),
    SlotSpec("shelf", "assets/backgrounds/plush-base-transparent.png", None, (0.50, 0.745), 0.075),
)


MOBBY_TIME_SLOTS: Final = (
    SlotSpec("board", "assets/backgrounds/mobby-time-board.png", (0.105, 0.06, 0.105, 0.06), (0.50, 0.045), 0.055),
    SlotSpec("timerPlaque", "assets/mobby-time/timer-plaque.png", (0.17, 0.22, 0.17, 0.22), (0.90, 0.50), 0.18),
    SlotSpec("messagePlaque", "assets/mobby-time/message-plaque.png", (0.18, 0.20, 0.18, 0.20), (0.10, 0.50), 0.16),
    SlotSpec("rewardSeal", "assets/mobby-time/reward-seal.png", (0.28, 0.28, 0.28, 0.28), (0.50, 0.84), 0.18),
)


STYLE_MATERIALS: Final = {
    style: THEME_ROOT / "home-materials" / f"style-{style:02d}.png"
    for style in range(1, 6)
}


def stable_seed(*parts: object) -> int:
    digest = hashlib.sha256(":".join(map(str, parts)).encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big")


def cover_crop(image: Image.Image, size: tuple[int, int], seed: int) -> Image.Image:
    """Cover ``size`` with a deterministic crop and mild rotation."""
    rng = random.Random(seed)
    source = image.convert("RGB")
    angle = (seed % 4) * 90
    if angle:
        source = source.rotate(angle, expand=True)
    w, h = size
    scale = max(w / source.width, h / source.height)
    scaled = source.resize((math.ceil(source.width * scale), math.ceil(source.height * scale)), Image.Resampling.LANCZOS)
    max_x = max(0, scaled.width - w)
    max_y = max(0, scaled.height - h)
    left = rng.randint(0, max_x) if max_x else 0
    top = rng.randint(0, max_y) if max_y else 0
    return scaled.crop((left, top, left + w, top + h))


def rounded_safe_mask(size: tuple[int, int], inset: tuple[float, float, float, float] | None) -> Image.Image:
    if inset is None:
        return Image.new("L", size, 255)
    w, h = size
    left, top, right, bottom = inset
    mask = Image.new("L", size, 255)
    draw = ImageDraw.Draw(mask)
    x0, y0 = round(w * left), round(h * top)
    x1, y1 = round(w * (1 - right)), round(h * (1 - bottom))
    radius = max(8, round(min(w, h) * 0.08))
    draw.rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=0)
    return mask.filter(ImageFilter.GaussianBlur(max(1, round(min(w, h) * 0.006))))


def alpha_intersection(first: Image.Image, second: Image.Image) -> Image.Image:
    return ImageChops.multiply(first.convert("L"), second.convert("L"))


def prepare_character_art(character: CharacterSpec) -> Image.Image:
    art = Image.open(REPO_ROOT / character.art_path).convert("RGBA")
    bbox = art.getchannel("A").getbbox()
    return art.crop(bbox) if bbox else art


def character_medallion(
    character: CharacterSpec,
    character_art: Image.Image,
    size: int,
    style: int,
    seed: int,
) -> Image.Image:
    """Small stitched portrait patch used outside the content-safe area."""
    size = max(24, size)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(result)
    outer = tuple(character.secondary) + (235,)
    inner = tuple(character.accent) + (228,)
    if style == 3:
        outer, inner = (202, 208, 225, 235), tuple(character.accent) + (238,)
    elif style == 4:
        outer = (225, 170, 72, 245)
    elif style == 5:
        outer, inner = (210, 164, 70, 245), (43, 30, 46, 240)
    draw.ellipse((1, 1, size - 2, size - 2), fill=outer, outline=(61, 44, 46, 210), width=max(1, size // 30))
    gap = max(3, size // 11)
    draw.ellipse((gap, gap, size - gap, size - gap), fill=inner)
    # Character art stays recognisable but quiet enough to remain a motif.
    art = character_art.copy()
    max_side = round(size * 0.66)
    scale = min(max_side / art.width, max_side / art.height)
    art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.Resampling.LANCZOS)
    art_alpha = art.getchannel("A").point(lambda value: round(value * 0.92))
    art.putalpha(art_alpha)
    x = (size - art.width) // 2
    y = (size - art.height) // 2 + round(size * 0.015)
    result.alpha_composite(art, (x, y))
    # Four deterministic stitch marks keep every medallion handcrafted.
    stitch = tuple(character.secondary) + (255,)
    for index in range(4):
        angle = ((seed % 19) + index * 90) * math.pi / 180
        cx = size / 2 + math.cos(angle) * size * 0.42
        cy = size / 2 + math.sin(angle) * size * 0.42
        d = max(1, size // 35)
        draw.line((cx - d, cy - d, cx + d, cy + d), fill=stitch, width=max(1, d))
        draw.line((cx - d, cy + d, cx + d, cy - d), fill=stitch, width=max(1, d))
    return result


def draw_style_trim(
    size: tuple[int, int],
    character: CharacterSpec,
    style: int,
    seed: int,
    allowed_mask: Image.Image,
) -> Image.Image:
    """Non-flat style grammar: patches, routes, constellations, confetti or gems."""
    w, h = size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rng = random.Random(seed)
    unit = max(2, round(min(w, h) * 0.008))
    accent = tuple(character.accent)
    secondary = tuple(character.secondary)

    if style == 1:
        # Alternating running stitches and tiny patch corners.
        for y in (round(h * 0.055), round(h * 0.945)):
            for x in range(round(w * 0.04), round(w * 0.96), unit * 6):
                draw.line((x, y, min(w, x + unit * 3), y), fill=accent + (150,), width=max(1, unit // 2))
        for x, y in ((0.08, 0.15), (0.90, 0.82)):
            cx, cy = round(w * x), round(h * y)
            draw.rectangle((cx - unit * 3, cy - unit * 3, cx + unit * 3, cy + unit * 3), outline=secondary + (165,), width=max(1, unit // 2))
            draw.line((cx - unit * 2, cy - unit * 2, cx + unit * 2, cy + unit * 2), fill=accent + (170,), width=max(1, unit // 2))
            draw.line((cx - unit * 2, cy + unit * 2, cx + unit * 2, cy - unit * 2), fill=accent + (170,), width=max(1, unit // 2))
    elif style == 2:
        # Travel-route dashes, map stops and a tiny directional arrow.
        points = []
        for index in range(9):
            x = w * (0.04 + index * 0.115)
            y = h * (0.09 if index % 2 == 0 else 0.91)
            points.append((round(x), round(y)))
        draw.line(points, fill=secondary + (170,), width=unit * 2, joint="curve")
        for x, y in points[::2]:
            draw.ellipse((x - unit * 2, y - unit * 2, x + unit * 2, y + unit * 2), fill=accent + (210,), outline=(231, 197, 119, 220), width=unit)
        ax, ay = points[-1]
        draw.polygon(((ax, ay - unit * 4), (ax + unit * 6, ay), (ax, ay + unit * 4)), fill=(222, 177, 84, 220))
    elif style == 3:
        # Constellation threads and silver stars.
        for band in range(2):
            points = []
            for index in range(7):
                x = round(w * (0.05 + index * 0.15))
                y = round(h * (0.075 + band * 0.84 + rng.uniform(-0.025, 0.025)))
                points.append((x, y))
            draw.line(points, fill=(202, 207, 225, 155), width=unit)
            for x, y in points:
                r = unit * (2 if rng.random() > 0.4 else 1)
                draw.regular_polygon((x, y, r), n_sides=4, rotation=45, fill=(226, 220, 203, 225))
    elif style == 4:
        # Bunting and confetti remain confined to the frame.
        top_y = round(h * 0.045)
        draw.line((round(w * 0.03), top_y, round(w * 0.97), top_y), fill=(224, 170, 72, 230), width=unit * 2)
        for index in range(12):
            x = round(w * (0.05 + index * 0.082))
            colour = accent if index % 2 == 0 else secondary
            draw.polygon(((x, top_y), (x + unit * 5, top_y), (x + unit * 2, top_y + unit * 5)), fill=colour + (210,))
        for _ in range(24):
            x = rng.choice((rng.randint(0, max(1, round(w * 0.14))), rng.randint(round(w * 0.86), w - 1)))
            y = rng.randint(round(h * 0.08), max(round(h * 0.08), round(h * 0.92)))
            draw.ellipse((x - unit, y - unit * 2, x + unit, y + unit * 2), fill=(226, 176, 76, 190))
    else:
        # Premium double piping with jewels and restrained filigree arcs.
        inset = max(unit * 3, round(min(w, h) * 0.035))
        draw.rounded_rectangle((inset, inset, w - inset, h - inset), radius=max(unit * 3, round(min(w, h) * 0.05)), outline=(222, 176, 78, 220), width=unit * 2)
        draw.rounded_rectangle((inset * 2, inset * 2, w - inset * 2, h - inset * 2), radius=max(unit * 2, round(min(w, h) * 0.04)), outline=secondary + (175,), width=unit)
        for index in range(10):
            x = round(w * (0.06 + index * 0.098))
            for y in (round(h * 0.06), round(h * 0.94)):
                r = unit * 2
                draw.regular_polygon((x, y, r), n_sides=4, rotation=45, fill=accent + (225,), outline=(232, 191, 91, 245))

    layer.putalpha(alpha_intersection(layer.getchannel("A"), allowed_mask))
    return layer


def render_slot(
    base: Image.Image,
    material: Image.Image,
    character: CharacterSpec,
    character_art: Image.Image,
    style: int,
    slot: SlotSpec,
) -> Image.Image:
    seed = stable_seed(character.id, style, slot.name)
    base_mode = base.mode
    base_rgba = base.convert("RGBA")
    base_rgb = base_rgba.convert("RGB")
    base_alpha = base_rgba.getchannel("A") if "A" in base_mode else Image.new("L", base.size, 255)
    texture = cover_crop(material, base.size, seed)

    # Preserve the normal artwork's highlights and depth while swapping the
    # material itself. This is intentionally texture compositing, not a tint.
    texture = ImageEnhance.Color(texture).enhance(0.92)
    material_depth = ImageChops.soft_light(texture, base_rgb)
    textured = Image.blend(base_rgb, material_depth, 0.62)
    accent_sheet = Image.new("RGB", base.size, character.accent)
    textured = Image.blend(textured, ImageChops.soft_light(textured, accent_sheet), 0.13)

    frame_mask = rounded_safe_mask(base.size, slot.safe_inset)
    frame_mask = alpha_intersection(frame_mask, base_alpha)
    # Interior gets only a whisper of the material; content contrast is kept.
    quiet_texture = Image.blend(base_rgb, texture, 0.035)
    rendered_rgb = Image.composite(textured, quiet_texture, frame_mask)
    rendered = rendered_rgb.convert("RGBA")
    rendered.putalpha(base_alpha)

    trim = draw_style_trim(base.size, character, style, seed, frame_mask)
    rendered.alpha_composite(trim)

    # Add a small actual-character motif outside the content-safe center.
    medallion_size = max(24, round(min(base.size) * slot.motif_scale))
    medallion = character_medallion(character, character_art, medallion_size, style, seed)
    mx = round(base.width * slot.motif_anchor[0] - medallion.width / 2)
    my = round(base.height * slot.motif_anchor[1] - medallion.height / 2)
    medallion_canvas = Image.new("RGBA", base.size, (0, 0, 0, 0))
    medallion_canvas.alpha_composite(medallion, (mx, my))
    medallion_canvas.putalpha(alpha_intersection(medallion_canvas.getchannel("A"), frame_mask))
    rendered.alpha_composite(medallion_canvas)

    # Reapply the source alpha byte-for-byte after all compositing. This keeps
    # the shelf/hook silhouettes and soft shadow edges exactly aligned.
    rendered.putalpha(base_alpha)
    # Indexed PNG keeps the 640-file package practical. The source alpha is
    # reapplied immediately before this encode, so the transparent silhouette
    # and its soft edge remain aligned with the normal-home artwork.
    if base_mode == "RGB":
        return rendered.convert("RGB").quantize(
            colors=128,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.FLOYDSTEINBERG,
        )
    return rendered.quantize(
        colors=128,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.FLOYDSTEINBERG,
    )


def parse_only(values: list[str]) -> set[tuple[str, int]] | None:
    if not values:
        return None
    parsed: set[tuple[str, int]] = set()
    valid_ids = {character.id for character in CHARACTERS}
    for value in values:
        try:
            character_id, raw_style = value.split(":", 1)
            style = int(raw_style)
        except (ValueError, TypeError) as error:
            raise SystemExit(f"Invalid --only value {value!r}; expected character:1..5") from error
        if character_id not in valid_ids or style not in STYLE_MATERIALS:
            raise SystemExit(f"Unknown theme {value!r}")
        parsed.add((character_id, style))
    return parsed


def write_registry() -> None:
    slot_union = " | ".join(f"'{slot.name}'" for slot in SLOTS)
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        f"export type GeneratedHomeThemeAssetSlot = {slot_union};",
        "export type GeneratedHomeThemeAssetGroup = Readonly<Record<GeneratedHomeThemeAssetSlot, ImageSourcePropType>>;",
        "",
        "/** 16 characters x 5 styles x 8 normal-home-derived assets. */",
        "export const GENERATED_GACHA_HOME_THEME_ASSETS: Readonly<Record<string, GeneratedHomeThemeAssetGroup>> = {",
    ]
    for character in CHARACTERS:
        for style in range(1, 6):
            style_dir = f"{style:02d}"
            lines.append(f"  '{character.id}:{style}': {{")
            for slot in SLOTS:
                lines.append(
                    f"    {slot.name}: require('../../assets/themes/{character.id}/{style_dir}/home/{slot.name}.png'),"
                )
            lines.append("  },")
    lines.extend(
        [
            "};",
            "",
            "export function getGeneratedGachaHomeThemeAssets(characterId: string, styleNumber: number): GeneratedHomeThemeAssetGroup {",
            "  const key = `${characterId}:${styleNumber}`;",
            "  const assets = GENERATED_GACHA_HOME_THEME_ASSETS[key];",
            "  if (!assets) throw new Error(`Missing generated home theme assets for ${key}`);",
            "  return assets;",
            "}",
            "",
        ]
    )
    REGISTRY_PATH.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def write_mobby_time_registry() -> None:
    slot_union = " | ".join(f"'{slot.name}'" for slot in MOBBY_TIME_SLOTS)
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        f"export type GeneratedMobbyTimeThemeAssetSlot = {slot_union};",
        "export type GeneratedMobbyTimeThemeAssetGroup = Readonly<Record<GeneratedMobbyTimeThemeAssetSlot, ImageSourcePropType>>;",
        "",
        "/** 16 characters x 5 styles x 4 normal-Mobby-Time-derived assets. */",
        "export const GENERATED_GACHA_MOBBY_TIME_THEME_ASSETS: Readonly<Record<string, GeneratedMobbyTimeThemeAssetGroup>> = {",
    ]
    for character in CHARACTERS:
        for style in range(1, 6):
            style_dir = f"{style:02d}"
            lines.append(f"  '{character.id}:{style}': {{")
            for slot in MOBBY_TIME_SLOTS:
                lines.append(
                    f"    {slot.name}: require('../../assets/themes/{character.id}/{style_dir}/mobby-time/{slot.name}.png'),"
                )
            lines.append("  },")
    lines.extend(
        [
            "};",
            "",
            "export function getGeneratedGachaMobbyTimeThemeAssets(characterId: string, styleNumber: number): GeneratedMobbyTimeThemeAssetGroup {",
            "  const key = `${characterId}:${styleNumber}`;",
            "  const assets = GENERATED_GACHA_MOBBY_TIME_THEME_ASSETS[key];",
            "  if (!assets) throw new Error(`Missing generated Mobby Time theme assets for ${key}`);",
            "  return assets;",
            "}",
            "",
        ]
    )
    MOBBY_TIME_REGISTRY_PATH.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def recompress_home_assets() -> None:
    paths = sorted(THEME_ROOT.glob("*/*/home/*.png"))
    if len(paths) != len(CHARACTERS) * 5 * len(SLOTS):
        raise SystemExit(f"Expected 640 Home assets before recompression, found {len(paths)}")
    saved = 0
    replaced = 0
    for index, path in enumerate(paths, start=1):
        original_bytes = path.stat().st_size
        original = Image.open(path)
        original.load()
        has_alpha = "A" in original.getbands() or "transparency" in original.info
        if has_alpha:
            original_rgba = original.convert("RGBA")
            compact = original_rgba.quantize(
                colors=64,
                method=Image.Quantize.FASTOCTREE,
                dither=Image.Dither.FLOYDSTEINBERG,
            )
        else:
            original_rgba = None
            compact = original.convert("RGB").quantize(
                colors=64,
                method=Image.Quantize.MEDIANCUT,
                dither=Image.Dither.FLOYDSTEINBERG,
            )
        temporary = path.with_name(path.stem + ".compressing.png")
        compact.save(temporary, format="PNG", compress_level=9)
        candidate = Image.open(temporary)
        candidate.load()
        valid = candidate.size == original.size
        if has_alpha and original_rgba is not None:
            original_opaque = original_rgba.getchannel("A").point(lambda value: 255 if value else 0)
            candidate_opaque = candidate.convert("RGBA").getchannel("A").point(lambda value: 255 if value else 0)
            valid = valid and ImageChops.difference(original_opaque, candidate_opaque).getbbox() is None
        candidate_bytes = temporary.stat().st_size
        if valid and candidate_bytes < original_bytes:
            temporary.replace(path)
            saved += original_bytes - candidate_bytes
            replaced += 1
        else:
            temporary.unlink()
        if index % 80 == 0:
            print(
                f"Compressed {index}/{len(paths)}; saved={saved / 1024 / 1024:.1f} MB; "
                f"free={shutil.disk_usage(REPO_ROOT).free / 1024 / 1024:.1f} MB",
                flush=True,
            )
    print(f"Recompressed {replaced}/{len(paths)} Home assets; saved={saved / 1024 / 1024:.1f} MB")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", action="append", default=[], metavar="CHARACTER:STYLE")
    parser.add_argument("--scope", choices=("home", "mobby-time", "all"), default="home")
    parser.add_argument("--registry-only", action="store_true")
    parser.add_argument("--recompress-home", action="store_true")
    parser.add_argument("--skip-registry", action="store_true")
    args = parser.parse_args()
    selected = parse_only(args.only)

    if args.recompress_home:
        recompress_home_assets()
        return

    missing = [str(path) for path in STYLE_MATERIALS.values() if not path.is_file()]
    if missing:
        raise SystemExit("Missing ImageGen material sheets:\n" + "\n".join(missing))

    if args.registry_only:
        if args.scope in ("home", "all"):
            write_registry()
        if args.scope in ("mobby-time", "all"):
            write_mobby_time_registry()
        print("Generated static theme asset registries")
        return

    materials = {style: Image.open(path).convert("RGB") for style, path in STYLE_MATERIALS.items()}
    scopes = []
    if args.scope in ("home", "all"):
        scopes.append(("home", SLOTS))
    if args.scope in ("mobby-time", "all"):
        scopes.append(("mobby-time", MOBBY_TIME_SLOTS))
    bases = {
        slot.name: Image.open(REPO_ROOT / slot.base_path)
        for _, slots in scopes
        for slot in slots
    }
    generated = 0
    for character in CHARACTERS:
        character_art = prepare_character_art(character)
        for style in range(1, 6):
            if selected is not None and (character.id, style) not in selected:
                continue
            free_bytes = shutil.disk_usage(REPO_ROOT).free
            if free_bytes < 180 * 1024 * 1024:
                raise SystemExit(
                    f"Stopping before {character.id}:{style}: only {free_bytes / 1024 / 1024:.1f} MB free"
                )
            for scope_name, slots in scopes:
                output_dir = THEME_ROOT / character.id / f"{style:02d}" / scope_name
                output_dir.mkdir(parents=True, exist_ok=True)
                for slot in slots:
                    output = render_slot(
                        bases[slot.name],
                        materials[style],
                        character,
                        character_art,
                        style,
                        slot,
                    )
                    output.save(output_dir / f"{slot.name}.png", format="PNG", compress_level=8, optimize=False)
                    generated += 1
            print(
                f"{character.id}:{style} complete; free={shutil.disk_usage(REPO_ROOT).free / 1024 / 1024:.1f} MB",
                flush=True,
            )
    if not args.skip_registry:
        if args.scope in ("home", "all"):
            write_registry()
        if args.scope in ("mobby-time", "all"):
            write_mobby_time_registry()
    print(f"Generated {generated} home theme assets")


if __name__ == "__main__":
    main()
