#!/usr/bin/env python3
"""Pixel2Motion deterministic frame capture using an existing Chrome binary."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright


def rgb_on_white(path: Path) -> Image.Image:
    image = Image.open(path)
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGBA")
        background = Image.new("RGBA", image.size, "#ffffff")
        background.alpha_composite(image)
        return background.convert("RGB")
    return image.convert("RGB")


def diff_images(first: Path, second: Path, resize_second: bool = False) -> dict:
    a = rgb_on_white(first)
    b = rgb_on_white(second)
    if a.size != b.size:
        if not resize_second:
            return {"exact": False, "reason": f"size mismatch: {a.size} vs {b.size}"}
        b = b.resize(a.size, Image.Resampling.LANCZOS)
    aa = np.asarray(a, dtype=np.int16)
    bb = np.asarray(b, dtype=np.int16)
    delta = np.abs(aa - bb)
    return {
        "exact": bool(np.array_equal(aa, bb)),
        "mean_abs_diff": round(float(delta.mean()), 6),
        "max_abs_diff": int(delta.max()),
        "pixels_changed": int(np.any(delta != 0, axis=2).sum()),
        "pct_pixels_off_by_25plus": round(float((delta.max(axis=2) >= 25).mean() * 100), 6),
    }


def build_strip(frames: list[Path], times: list[int], output: Path) -> None:
    images = [Image.open(frame).convert("RGB") for frame in frames]
    label_height = 32
    cell_width = max(image.width for image in images)
    cell_height = max(image.height for image in images) + label_height
    strip = Image.new("RGB", (cell_width * len(images), cell_height), "#ffffff")
    draw = ImageDraw.Draw(strip)
    for index, (image, time_ms) in enumerate(zip(images, times)):
        x = index * cell_width + (cell_width - image.width) // 2
        strip.paste(image, (x, label_height))
        draw.text((index * cell_width + 10, 8), f"t={time_ms}ms", fill="#183047")
        if index:
            draw.line((index * cell_width, 0, index * cell_width, cell_height), fill="#dce5ed", width=1)
    output.parent.mkdir(parents=True, exist_ok=True)
    strip.save(output)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("html", type=Path)
    parser.add_argument("--times", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--strip", type=Path, required=True)
    parser.add_argument("--compare-final", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--chrome", default="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    parser.add_argument("--viewport", default="900x900")
    parser.add_argument("--scale", type=float, default=2.0)
    args = parser.parse_args()

    times = [int(value.strip()) for value in args.times.split(",") if value.strip()]
    width, height = (int(value) for value in args.viewport.split("x"))
    args.out.mkdir(parents=True, exist_ok=True)
    base_url = args.html.resolve().as_uri()
    frames: list[Path] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chrome)
        page = browser.new_page(
            viewport={"width": width, "height": height},
            device_scale_factor=args.scale,
        )
        for time_ms in times:
            page.goto(f"{base_url}?t={time_ms}")
            page.wait_for_function("window.__p2mReady === true")
            frame = args.out / f"frame_{time_ms:06d}ms.png"
            page.locator("#logo-root").screenshot(path=str(frame))
            frames.append(frame)
            print(f"captured t={time_ms}ms -> {frame}")

        contract_page = browser.new_page(
            viewport={"width": width, "height": height},
            device_scale_factor=args.scale,
        )
        contract_page.goto(f"{base_url}?t={times[-1]}")
        contract_page.wait_for_function("window.__p2mReady === true")
        animated_contract_frame = args.out / "frame_animated_same_pipeline.png"
        contract_page.locator("#logo-root").screenshot(path=str(animated_contract_frame))
        contract_page.goto(f"{base_url}?static=1")
        contract_page.wait_for_function("window.__p2mReady === true")
        static_frame = args.out / "frame_static_same_pipeline.png"
        contract_page.locator("#logo-root").screenshot(path=str(static_frame))
        browser.close()

    build_strip(frames, times, args.strip)
    same_pipeline = diff_images(animated_contract_frame, static_frame)
    cross_pipeline = diff_images(frames[-1], args.compare_final, resize_second=True)
    report = {
        "html": str(args.html),
        "times_ms": times,
        "frames": [str(frame) for frame in frames],
        "strip": str(args.strip),
        "same_pipeline_final_frame_contract": {
            "animated_final": str(animated_contract_frame),
            "static_final": str(static_frame),
            **same_pipeline,
        },
        "cross_pipeline_final_frame_contract": {
            "animated_final": str(frames[-1]),
            "reference_static": str(args.compare_final),
            **cross_pipeline,
        },
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"strip -> {args.strip}")
    print(f"same-pipeline final diff -> {same_pipeline}")
    print(f"cross-pipeline final diff -> {cross_pipeline}")
    print(f"report -> {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
