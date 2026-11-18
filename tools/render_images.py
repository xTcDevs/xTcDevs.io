#!/usr/bin/env python3
"""Renders favicons and Open Graph share images with headless Chromium (Playwright).
Usage: python3 tools/render_images.py <fonts dir>
<fonts dir> holds @fontsource packages unpacked as <slug>/package/files/*.woff2
(newsreader, manrope, tektur, plus-jakarta-sans, instrument-serif, special-elite)."""
import sys, pathlib, tempfile
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = pathlib.Path(sys.argv[1]).resolve()
IMG = (ROOT / "assets/img").as_uri() + "/"

def face(fam, slug, w, style="normal"):
    f = FONTS / slug / "package/files" / f"{slug}-latin-{w}-{style}.woff2"
    return f"@font-face {{ font-family: '{fam}'; font-weight: {w}; font-style: {style}; src: url('{f.as_uri()}'); }}\n"

CSS = "".join([
    face("NR", "newsreader", 400), face("NR", "newsreader", 300, "italic"), face("NR", "newsreader", 400, "italic"),
    face("MR", "manrope", 500), face("MR", "manrope", 600), face("MR", "manrope", 700),
    face("TK", "tektur", 800), face("PJ", "plus-jakarta-sans", 800), face("PJ", "plus-jakarta-sans", 600),
    face("IS", "instrument-serif", 400), face("SE", "special-elite", 400),
]) + """
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; position: relative; font-family: MR, sans-serif; }
.dots { position: absolute; inset: 0; background-image: radial-gradient(rgba(201,169,106,.16) 1.2px, transparent 1.3px); background-size: 34px 34px; }
.mark { position: absolute; left: 80px; top: 64px; font: 800 38px TK; color: #c9a96a; } .mark b { color: #efe7d6; font-weight: 800; }
.copy { position: absolute; left: 80px; bottom: 76px; z-index: 3; }
.kick { font: 700 18px MR; letter-spacing: .16em; text-transform: uppercase; color: #c9a96a; margin-bottom: 20px; }
.sub { font: 500 26px/1.4 MR; color: #b5ae9f; margin-top: 22px; }
"""

def page(body, bg):
    return f"<html><head><style>{CSS}</style></head><body style='background:{bg}'>{body}</body></html>"

PAGES = {
  "assets/og/og-home.png": page(f"""
    <div class="dots" style="opacity:.6"></div>
    <div style="position:absolute;right:96px;top:70px;width:356px;height:490px;border:1px solid rgba(201,169,106,.55);border-radius:178px 178px 20px 20px;transform:translate(16px,16px)"></div>
    <div style="position:absolute;right:96px;top:70px;width:356px;height:490px;border-radius:178px 178px 20px 20px;overflow:hidden;background:#9fa1a5">
      <img src="{IMG}portrait/david-640.webp" style="width:100%;height:100%;object-fit:cover;object-position:50% 18%"></div>
    <div class="mark">x<b>T</b>c</div>
    <div class="copy" style="width:640px">
      <div class="kick">David Somadina Obichukwu</div>
      <div style="font: 400 76px/1.0 NR; color:#efe7d6; letter-spacing:-1.5px">Building ideas into <i style="font-weight:300;color:#dcc08a">digital experiences.</i></div>
      <div class="sub" style="font-size:18px;white-space:nowrap">Software Developer · Product Builder · UI/UX Designer · Game Developer</div>
    </div>""", "radial-gradient(700px 500px at 85% 0%, rgba(41,58,112,.55), transparent 70%), #0a0e1a"),
  "assets/og/og-pitchit.png": page(f"""
    <img src="{IMG}pitchit/my-jobs-400.webp" style="position:absolute;right:260px;top:96px;width:236px;border-radius:30px;border:7px solid #1c1714;transform:rotate(-6deg);box-shadow:0 30px 60px -20px rgba(80,30,0,.5)">
    <img src="{IMG}pitchit/sign-in-400.webp" style="position:absolute;right:70px;top:56px;width:256px;border-radius:32px;border:7px solid #1c1714;transform:rotate(4deg);box-shadow:0 30px 60px -20px rgba(80,30,0,.5)">
    <div class="mark" style="color:#e85d00"><b style="color:#1c1714">x</b>T<b style="color:#1c1714">c</b></div>
    <div class="copy" style="width:620px">
      <div class="kick" style="color:#c24e00">Working demo · David Somadina Obichukwu</div>
      <div style="font: 800 120px/0.9 PJ; color:#1c1714; letter-spacing:-5px">Pitch<span style="color:#ff6b00">IT</span></div>
      <div class="sub" style="color:#5b5049">Work is everywhere. Find it here. A marketplace for every kind of work in Nigeria.</div>
    </div>""", "radial-gradient(520px 420px at 82% 18%, rgba(255,167,87,.5), transparent 70%), #fff4e8"),
  "assets/og/og-echomind.png": page(f"""
    <img src="{IMG}echomind/journey-400.webp" style="position:absolute;right:250px;top:84px;width:240px;border-radius:30px;border:7px solid #0b0d1c;transform:rotate(-7deg);box-shadow:0 30px 60px -20px #000">
    <img src="{IMG}echomind/home-400.webp" style="position:absolute;right:70px;top:52px;width:260px;border-radius:32px;border:7px solid #0b0d1c;transform:rotate(4deg);box-shadow:0 30px 60px -20px #000">
    <div class="mark">x<b>T</b>c</div>
    <div class="copy" style="width:620px">
      <div class="kick" style="color:#c9b6f2">Android app · David Obichukwu</div>
      <div style="font: 400 120px/0.9 IS, Georgia, serif; color:#eeedf7">EchoMind</div>
      <div class="sub" style="color:#c3c2d6">A private journal that helps you notice how you really feel.</div>
    </div>""", "radial-gradient(500px 400px at 85% 15%, rgba(201,182,242,.25), transparent 70%), linear-gradient(160deg, #262a4a, #11142a)"),
  "assets/og/og-haunting-mother.png": page(f"""
    <img src="{IMG}haunting-mother/h3-memorize-mothers-bedroom.webp" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:62% 50%">
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,2,4,.96) 0%,rgba(11,2,4,.86) 42%,rgba(11,2,4,.2) 78%,rgba(11,2,4,.35) 100%)"></div>
    <div class="mark">x<b>T</b>c</div>
    <div class="copy" style="width:680px">
      <div class="kick" style="color:#ff6b84">Roblox game · David Obichukwu</div>
      <div style="font: 400 108px/0.95 SE, 'Courier New', monospace; color:#f4e9eb">Haunting<br>Mother</div>
      <div class="sub" style="color:#d9c2c7">Study every room, then spot what changed.</div>
    </div>""", "#0b0204"),
}

ICON = (ROOT / "assets/img/favicon.svg").read_text()
ICONS = {"assets/img/favicon-32.png": 32, "assets/img/apple-touch-icon.png": 180,
         "assets/img/icon-192.png": 192, "assets/img/icon-512.png": 512}

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    tmpdir = pathlib.Path(tempfile.mkdtemp())
    for out, html in PAGES.items():
        f = tmpdir / "og.html"; f.write_text(html)
        pg.goto(f.as_uri(), wait_until="networkidle"); pg.wait_for_timeout(500)
        pg.screenshot(path=str(ROOT / out)); print("wrote", out)
    for out, size in ICONS.items():
        pg.set_viewport_size({"width": size, "height": size})
        pg.set_content(f"<html><body style='margin:0;background:{'transparent' if size < 100 else '#0a0e1a'}'>{ICON.replace('<svg ', f'<svg width=\"{size}\" height=\"{size}\" ')}</body></html>")
        pg.screenshot(path=str(ROOT / out), omit_background=size < 100); print("wrote", out)
    b.close()
