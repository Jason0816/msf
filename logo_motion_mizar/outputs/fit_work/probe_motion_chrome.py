#!/usr/bin/env python3
"""Pixel2Motion computed-style probe using an existing Chrome binary."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("html", type=Path)
    parser.add_argument("--times", required=True)
    parser.add_argument("--probe", required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--chrome", default="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    args = parser.parse_args()

    times = [float(value) for value in args.times.split(",") if value]
    pairs = []
    for item in args.probe.split(","):
        selector, _, prop = item.rpartition(":")
        pairs.append((selector.strip(), prop.strip()))

    rows = []
    base_url = args.html.resolve().as_uri()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chrome)
        page = browser.new_page(viewport={"width": 900, "height": 900}, device_scale_factor=1)
        for time_ms in times:
            page.goto(f"{base_url}?t={time_ms}")
            page.wait_for_function("window.__p2mReady === true")
            values = {}
            for selector, prop in pairs:
                value = page.evaluate(
                    "([selector, prop]) => { const el = document.querySelector(selector);"
                    " return el ? getComputedStyle(el).getPropertyValue(prop).trim() : '<missing>'; }",
                    [selector, prop],
                )
                values[f"{selector}:{prop}"] = value
            rows.append({"t_ms": time_ms, **values})
            print(f"t={time_ms:.0f}ms {values}")
        browser.close()

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps({"html": str(args.html), "probe": rows}, indent=2), encoding="utf-8")
    print(f"report -> {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
