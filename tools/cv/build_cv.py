#!/usr/bin/env python3
"""Builds cv/David_Somadina_Obichukwu_CV.pdf from tools/cv/cv.html with Chromium (selectable text) and sets PDF metadata.
Run: python3 tools/cv/build_cv.py   (needs playwright and pypdf; fonts are embedded from local fontsource packages when available)"""
import base64, pathlib, sys
from playwright.sync_api import sync_playwright
from pypdf import PdfReader, PdfWriter
HERE = pathlib.Path(__file__).resolve().parent; ROOT = HERE.parent.parent
OUT = ROOT / "cv/David_Somadina_Obichukwu_CV.pdf"
FF = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None
def faces():
    if not FF: return ""
    css = ""
    for fam, slug, specs in [("Manrope", "manrope", [(w, "normal") for w in (400, 600, 700, 800)]), ("Newsreader", "newsreader", [(500, "normal")])]:
        for w, s in specs:
            f = FF / slug / "package/files" / f"{slug}-latin-{w}-{s}.woff2"
            if f.exists(): css += f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:{s};src:url(data:font/woff2;base64,{base64.b64encode(f.read_bytes()).decode()})}}"
    return css
html = (HERE / "cv.html").read_text().replace("<style>", "<style>" + faces(), 1)
tmp = OUT.with_suffix(".tmp.pdf")
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.set_content(html); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
    pg.pdf(path=str(tmp), format="A4", print_background=True, prefer_css_page_size=True); b.close()
r = PdfReader(str(tmp)); w = PdfWriter(); [w.add_page(pg) for pg in r.pages]
w.add_metadata({"/Title": "David Somadina Obichukwu, CV", "/Author": "David Somadina Obichukwu", "/Subject": "Curriculum vitae: AI Assisted Software Developer, Product Builder, UI/UX Designer, Game Developer",
                "/Keywords": "David Somadina Obichukwu, software developer, product builder, UI/UX designer, game developer, React, TypeScript, Flutter, Dart, Roblox, Luau, AI evaluation", "/Creator": "xtcdev.netlify.app"})
with open(OUT, "wb") as f: w.write(f)
tmp.unlink(); print(f"wrote {OUT} ({len(r.pages)} pages)")
