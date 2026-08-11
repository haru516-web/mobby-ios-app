"""Prepare reaction art for the Expo bundle.

The utility handles both legacy 2x2 sheets and individual chroma-key images.
Generated poses are keyed, fitted to a common transparent canvas, bottom
aligned, and encoded as WebP so reaction changes do not visibly jump in scale.
"""

from __future__ import annotations

import argparse
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PYTHON = Path(r"C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe")
CHROMA_HELPER = Path(r"C:\Users\User\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py")
GENERATED_PATTERN = re.compile(
    r"^(?P<character>.+)_(?P<index>\d{2})_(?P<slug>.+)_source\.png$"
)


def _premultiplied_resize(image: Image.Image, size: int = 1024) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32)
    alpha = rgba[..., 3:4] / 255.0
    rgba[..., :3] *= alpha
    premultiplied = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA")
    resized = np.asarray(premultiplied.resize((size, size), Image.Resampling.LANCZOS), dtype=np.float32)
    resized_alpha = resized[..., 3:4]
    resized[..., :3] = np.divide(
        resized[..., :3] * 255.0,
        resized_alpha,
        out=np.zeros_like(resized[..., :3]),
        where=resized_alpha > 0,
    )
    resized[..., :3] = np.where(resized_alpha > 0, resized[..., :3], 0)
    return Image.fromarray(np.clip(resized, 0, 255).astype(np.uint8), "RGBA")


def clean_sheet(input_path: Path, output_dir: Path, stem: str) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    cleaned = output_dir / f"{stem}__clean.png"
    subprocess.run(
        [
            str(PYTHON),
            str(CHROMA_HELPER),
            "--input",
            str(input_path),
            "--out",
            str(cleaned),
            "--auto-key",
            "corners",
            "--soft-matte",
            "--transparent-threshold",
            "24",
            "--opaque-threshold",
            "100",
            "--edge-contract",
            "1",
            "--spill-cleanup",
            "--force",
        ],
        check=True,
    )
    with Image.open(cleaned) as source:
        source = source.convert("RGBA")
        half_w = source.width // 2
        half_h = source.height // 2
        outputs: list[Path] = []
        for index, (left, top) in enumerate(
            ((0, 0), (half_w, 0), (0, half_h), (half_w, half_h)), start=1
        ):
            crop = source.crop((left, top, left + half_w, top + half_h))
            output = output_dir / f"{stem}_{index:02d}.webp"
            _premultiplied_resize(crop).save(output, "WEBP", lossless=True, method=6)
            outputs.append(output)
    return outputs


def convert_image(input_path: Path, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(input_path) as source:
        _premultiplied_resize(source).save(output_path, "WEBP", quality=90, method=4, exact=True)
    return output_path


def _fit_transparent_canvas(
    image: Image.Image,
    canvas_size: int = 1024,
    side_margin: int = 54,
    top_margin: int = 48,
    bottom_margin: int = 42,
) -> Image.Image:
    """Fit visible pixels to a stable bottom-aligned square canvas."""
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError("Reaction image is fully transparent")

    visible = rgba.crop(bbox)
    max_width = canvas_size - side_margin * 2
    max_height = canvas_size - top_margin - bottom_margin
    scale = min(max_width / visible.width, max_height / visible.height)
    width = max(1, round(visible.width * scale))
    height = max(1, round(visible.height * scale))
    fitted = _premultiplied_resize_rect(visible, (width, height))

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    left = (canvas_size - width) // 2
    top = canvas_size - bottom_margin - height
    canvas.alpha_composite(fitted, (left, top))
    return canvas


def _premultiplied_resize_rect(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32)
    alpha = rgba[..., 3:4] / 255.0
    rgba[..., :3] *= alpha
    premultiplied = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA")
    resized = np.asarray(premultiplied.resize(size, Image.Resampling.LANCZOS), dtype=np.float32)
    resized_alpha = resized[..., 3:4]
    resized[..., :3] = np.divide(
        resized[..., :3] * 255.0,
        resized_alpha,
        out=np.zeros_like(resized[..., :3]),
        where=resized_alpha > 0,
    )
    resized[..., :3] = np.where(resized_alpha > 0, resized[..., :3], 0)
    return Image.fromarray(np.clip(resized, 0, 255).astype(np.uint8), "RGBA")


def process_generated_image(
    source: Path,
    clean_dir: Path,
    output_dir: Path,
) -> Path:
    match = GENERATED_PATTERN.match(source.name)
    if match is None:
        raise ValueError(f"Unexpected generated filename: {source.name}")

    clean_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    clean = clean_dir / source.name.replace("_source.png", "_clean.png")
    subprocess.run(
        [
            str(PYTHON),
            str(CHROMA_HELPER),
            "--input",
            str(source),
            "--out",
            str(clean),
            "--auto-key",
            "border",
            "--soft-matte",
            "--transparent-threshold",
            "18",
            "--opaque-threshold",
            "110",
            "--edge-contract",
            "1",
            "--despill",
            "--force",
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    output = output_dir / (
        f"{match.group('character')}_extra_reaction_"
        f"{match.group('index')}_{match.group('slug')}.webp"
    )
    with Image.open(clean) as image:
        fitted = _fit_transparent_canvas(image)
        fitted.save(output, "WEBP", quality=90, method=4, exact=True)
    return output


def process_generated_directory(
    source_dir: Path,
    clean_dir: Path,
    output_dir: Path,
    workers: int,
) -> list[Path]:
    sources = sorted(source_dir.glob("*_source.png"))
    if not sources:
        raise ValueError(f"No generated sources found in {source_dir}")

    pending_sources: list[Path] = []
    existing_outputs: list[Path] = []
    for source in sources:
        match = GENERATED_PATTERN.match(source.name)
        if match is None:
            raise ValueError(f"Unexpected generated filename: {source.name}")
        output = output_dir / (
            f"{match.group('character')}_extra_reaction_"
            f"{match.group('index')}_{match.group('slug')}.webp"
        )
        if output.exists():
            existing_outputs.append(output)
        else:
            pending_sources.append(source)

    if existing_outputs:
        print(f"skipping {len(existing_outputs)} existing outputs", flush=True)
    if not pending_sources:
        return sorted(existing_outputs)

    outputs: list[Path] = list(existing_outputs)
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(process_generated_image, source, clean_dir, output_dir): source
            for source in pending_sources
        }
        for complete, future in enumerate(as_completed(futures), start=1):
            output = future.result()
            outputs.append(output)
            if complete % 9 == 0 or complete == len(pending_sources):
                print(
                    f"processed {complete}/{len(pending_sources)} pending "
                    f"({len(outputs)}/{len(sources)} total)",
                    flush=True,
                )
    return sorted(outputs)


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    sheet = subparsers.add_parser("sheet")
    sheet.add_argument("input", type=Path)
    sheet.add_argument("output_dir", type=Path)
    sheet.add_argument("stem")

    image = subparsers.add_parser("image")
    image.add_argument("input", type=Path)
    image.add_argument("output", type=Path)

    generated = subparsers.add_parser("generated")
    generated.add_argument("source_dir", type=Path)
    generated.add_argument("clean_dir", type=Path)
    generated.add_argument("output_dir", type=Path)
    generated.add_argument("--workers", type=int, default=4)

    args = parser.parse_args()
    if args.command == "sheet":
        clean_sheet(args.input, args.output_dir, args.stem)
    elif args.command == "image":
        convert_image(args.input, args.output)
    else:
        process_generated_directory(
            args.source_dir,
            args.clean_dir,
            args.output_dir,
            max(1, args.workers),
        )


if __name__ == "__main__":
    main()
