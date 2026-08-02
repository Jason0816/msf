#!/usr/bin/env python3
"""Export deterministic transparent WebP and white-background GIF previews."""

from __future__ import annotations

import argparse
import io
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("html", type=Path)
    parser.add_argument("--webp", type=Path, required=True)
    parser.add_argument("--gif", type=Path, required=True)
    parser.add_argument("--chrome", default="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    parser.add_argument("--duration", type=int, default=1800)
    parser.add_argument("--step", type=int, default=40)
    parser.add_argument("--hold", type=int, default=560)
    args = parser.parse_args()

    base_url = args.html.resolve().as_uri()
    times = list(range(0, args.duration, args.step)) + [args.duration]
    frames: list[Image.Image] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chrome)
        page = browser.new_page(viewport={"width": 720, "height": 720}, device_scale_factor=1)
        for time_ms in times:
            page.goto(f"{base_url}?t={time_ms}")
            page.wait_for_function("window.__p2mReady === true")
            page.evaluate(
                """() => {
                    document.documentElement.style.background = 'transparent';
                    document.body.style.background = 'transparent';
                    const root = document.querySelector('#logo-root');
                    if (root) root.style.background = 'transparent';
                }"""
            )
            png = page.locator("#logo-root").screenshot(omit_background=True)
            frames.append(Image.open(io.BytesIO(png)).convert("RGBA"))
        browser.close()

    durations = [args.step] * len(frames)
    durations[-1] = args.hold
    args.webp.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        args.webp,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        lossless=True,
        method=6,
    )

    white_frames = []
    for frame in frames:
        background = Image.new("RGBA", frame.size, "#ffffff")
        background.alpha_composite(frame)
        white_frames.append(background.convert("P", palette=Image.Palette.ADAPTIVE, colors=256))
    white_frames[0].save(
        args.gif,
        format="GIF",
        save_all=True,
        append_images=white_frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"animated WebP -> {args.webp}")
    print(f"GIF preview -> {args.gif}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
