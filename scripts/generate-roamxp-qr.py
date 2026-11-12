#!/usr/bin/env python3
"""
Generate verified RoamXP acquisition QR codes for PUZDEV URLs.

Requires: qrencode (CLI), Pillow, zxing-cpp (for decode verification).

Usage:
  python3 scripts/generate-roamxp-qr.py
  python3 scripts/generate-roamxp-qr.py --campaign gta_reel_01 --source Instagram --medium qr
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "qr" / "roamxp"
BASE = "https://roamxp.puzdev.com"


def flatten_png_black_on_white(png: Path) -> None:
    from PIL import Image

    im = Image.open(png)
    if im.mode in ("RGBA", "LA", "P"):
        rgba = im.convert("RGBA")
        bg = Image.new("RGB", rgba.size, (255, 255, 255))
        bg.paste(rgba, mask=rgba.split()[-1])
        bg.save(png, format="PNG", optimize=True)
    else:
        im.convert("RGB").save(png, format="PNG", optimize=True)


def run_qrencode(url: str, png: Path, svg: Path) -> None:
    # Black modules, white background, quiet zone (-m 4), crisp modules (-s 12)
    subprocess.run(
        ["qrencode", "-o", str(png), "-s", "12", "-m", "4", "-l", "M", url],
        check=True,
    )
    flatten_png_black_on_white(png)
    subprocess.run(
        ["qrencode", "-t", "SVG", "-o", str(svg), "-m", "4", "-l", "M", url],
        check=True,
    )


def decode_png(png: Path) -> str:
    from PIL import Image
    import zxingcpp

    img = Image.open(png)
    results = zxingcpp.read_barcodes(img)
    if not results:
        raise RuntimeError(f"No barcode decoded from {png}")
    return results[0].text


def build_url(path: str, params: dict[str, str] | None = None) -> str:
    if not params:
        return f"{BASE}{path}"
    return f"{BASE}{path}?{urlencode(params)}"


def generate(name: str, url: str, manifest: list[dict]) -> None:
    png = OUT_DIR / f"{name}.png"
    svg = OUT_DIR / f"{name}.svg"
    run_qrencode(url, png, svg)
    decoded = decode_png(png)
    if decoded != url:
        raise RuntimeError(f"Decode mismatch for {name}:\n  expected {url}\n  got      {decoded}")
    print(f"OK  {name}: {url}")
    manifest.append(
        {
            "name": name,
            "url": url,
            "png": str(png.relative_to(ROOT)),
            "svg": str(svg.relative_to(ROOT)),
            "verified": True,
        }
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate RoamXP QR assets")
    parser.add_argument("--campaign", default="", help="Optional utm_campaign for a custom QR")
    parser.add_argument("--source", default="instagram", help="utm_source for custom QR")
    parser.add_argument("--medium", default="qr", help="utm_medium for custom QR")
    parser.add_argument("--content", default="", help="utm_content for custom QR")
    args = parser.parse_args()

    if not shutil_which("qrencode"):
        print("qrencode not found. Install with: brew install qrencode", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: list[dict] = []

    presets = [
        ("general", build_url("/go/", {"utm_source": "qr", "utm_medium": "offline", "utm_campaign": "roamxp_download", "link_id": "qr_general"})),
        ("instagram", build_url("/ig/")),
        ("youtube", build_url("/yt/")),
        ("tiktok", build_url("/tt/")),
        ("qr_entry", build_url("/qr/")),
    ]

    for name, url in presets:
        generate(name, url, manifest)

    if args.campaign:
        params = {
            "utm_source": str(args.source).strip().lower(),
            "utm_medium": str(args.medium).strip().lower(),
            "utm_campaign": args.campaign,
            "link_id": f"qr_{args.campaign}",
        }
        if args.content:
            params["utm_content"] = args.content
        slug = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in args.campaign).strip("-_")
        generate(f"campaign-{slug}", build_url("/go/", params), manifest)

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_DIR / 'manifest.json'}")
    return 0


def shutil_which(cmd: str) -> str | None:
    from shutil import which

    return which(cmd)


if __name__ == "__main__":
    raise SystemExit(main())
