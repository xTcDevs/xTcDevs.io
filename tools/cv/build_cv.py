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
def build():
    html = (HERE / "cv.html").read_text().replace("<style>", "<style>" + faces(), 1)
    tmp = OUT.with_suffix(".tmp.pdf")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            try:
                pg = b.new_page(); pg.set_content(html); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
                pg.pdf(path=str(tmp), format="A4", print_background=True, prefer_css_page_size=True)
            finally:
                b.close()
        r = PdfReader(str(tmp)); w = PdfWriter(); [w.add_page(pg) for pg in r.pages]
        add_metadata(w)
        with open(OUT, "wb") as f: w.write(f)
        print(f"wrote {OUT} ({len(r.pages)} pages)")
    finally:
        tmp.unlink(missing_ok=True)  # never leave a half written temp PDF behind

def add_metadata(w):
    w.add_metadata({"/Title": "David Somadina Obichukwu, CV", "/Author": "David Somadina Obichukwu", "/Subject": "Curriculum vitae: AI Assisted Software Developer, Product Builder, UI/UX Designer, Game Developer",
                "/Keywords": "David Somadina Obichukwu, software developer, product builder, UI/UX designer, game developer, React, TypeScript, Flutter, Dart, Roblox, Luau, AI evaluation", "/Creator": "xtcdev.netlify.app"})

if __name__ == "__main__":
    try:
        build()
    except OSError as err:  # unreadable cv.html or fonts, or a PDF that could not be written
        sys.exit(f"build_cv: could not read or write {getattr(err, 'filename', '') or 'a file'}: {err.strerror or err}")
    except Exception as err:  # Chromium failed to start or print
        sys.exit(f"build_cv: could not render the CV: {err}")
