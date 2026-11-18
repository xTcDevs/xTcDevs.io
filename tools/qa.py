#!/usr/bin/env python3
"""Automated QA: serves the site locally and checks layouts, themes, languages,
links, images, console errors and metadata. Screenshots go to argv[1]."""
import sys, json, threading, functools, http.server, socketserver, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
PORT = 0

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
handler = functools.partial(Quiet, directory=str(ROOT))
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORT), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
PORT = srv.server_address[1]
BASE = f"http://127.0.0.1:{PORT}"
PAGES = ["/index.html"] + sorted("/projects/" + q.name for q in (ROOT / "projects").glob("*.html"))
SIZES = {"wide": (1920, 1080), "desktop": (1440, 900), "laptop": (1024, 768), "tablet": (768, 1024), "mobile": (390, 844), "small": (320, 640)}
FULL = {"/index.html", "/projects/toilet-wars.html", "/projects/completed.html", "/projects/bookverse.html", "/projects/pitchit.html"}
issues = []

def note(msg):
    issues.append(msg); print("  ✗", msg)

with sync_playwright() as p:
    b = p.chromium.launch()
    for page_path in PAGES:
        for sname, (w, h) in SIZES.items():
            if page_path not in FULL and sname not in ("desktop", "mobile", "small"): continue
            for theme in ("dark", "light"):
                ctx = b.new_context(viewport={"width": w, "height": h}, color_scheme=theme, locale="en-US")
                pg = ctx.new_page()
                errs = []
                pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
                pg.on("pageerror", lambda e: errs.append(str(e)))
                failed = []
                pg.on("response", lambda r: failed.append(f"{r.status} {r.url}") if r.status >= 400 and "127.0.0.1" in r.url else None)
                pg.goto(BASE + page_path, wait_until="networkidle")
                pg.wait_for_timeout(2200)
                tag = f"{page_path} {sname} {theme}"
                if pg.evaluate("document.documentElement.getAttribute('data-theme')") != theme:
                    note(f"{tag}: system theme not respected")
                overflow = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                if overflow > 1: note(f"{tag}: horizontal overflow {overflow}px")
                for e in [x for x in errs if "ERR_TUNNEL" not in x and "fonts.g" not in x]: note(f"{tag}: console error: {e}")
                for f in failed: note(f"{tag}: failed request {f}")
                if page_path == "/index.html":
                    rows = pg.evaluate("document.querySelectorAll('.wgrid .wcard').length")
                    if rows != 17: note(f"{tag}: expected 17 project cards (14 by stage + 3 client), got {rows}")
                pg.evaluate("async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo({top: y, behavior: 'instant'}); await new Promise(r => setTimeout(r, 40)); } window.scrollTo({top: 0, behavior: 'instant'}); }")
                pg.wait_for_timeout(900)
                pg.wait_for_timeout(600)
                broken = pg.evaluate("[...document.images].filter(i=>i.getAttribute('src')&&i.complete&&i.naturalWidth===0).map(i=>i.src)")
                if broken: note(f"{tag}: broken images {broken}")
                spill = pg.evaluate("""() => [...document.querySelectorAll('.wcard__body, .pj-facts dd, .showcase__copy, .feat-list li, .pj-nav__link')].filter(el => el.scrollWidth > el.clientWidth + 2).map(el => el.className).slice(0, 5)""")
                if spill: note(f"{tag}: content spills out of its box: {spill}")
                if theme == "light" and sname == "desktop" and page_path == "/index.html":
                    ink = pg.evaluate("() => { const c = document.getElementById('echo-field'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++; return n; }")
                    if ink < 500: note(f"{tag}: echo animation draws nothing in light mode ({ink} px)")
                    else: print(f"  echo field in light mode: {ink} painted pixels")
                hidden = pg.evaluate("[...document.querySelectorAll('.reveal')].filter(e=>!e.classList.contains('is-in')).length")
                if hidden: note(f"{tag}: {hidden} reveal elements never became visible")
                pg.screenshot(path=str(OUT / f"{page_path.strip('/').replace('/', '_').replace('.html','')}-{sname}-{theme}.png"), full_page=(sname != "desktop" or True))
                ctx.close()

    # Language switching + persistence + completeness on screen
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, color_scheme="dark", locale="fr-FR")
    pg = ctx.new_page()
    pg.goto(BASE + "/index.html", wait_until="networkidle"); pg.wait_for_timeout(800)
    if pg.evaluate("document.documentElement.lang") != "fr": note("browser language fr not detected")
    LANGS = ["en", "es", "pt", "de", "ig", "yo", "ha", "ar", "hi", "zh", "fr"]
    DASH_JS = r"""() => { const re = /[\u002D\u2010-\u2015]/; const out = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement && n.parentElement.closest('script,style,noscript,.sr-only') === null) ? 1 : 2 });
      while (w.nextNode()) { const t = w.currentNode.nodeValue; if (t.trim() && re.test(t) && n_visible(w.currentNode.parentElement)) out.push(t.trim().slice(0, 80)); }
      function n_visible(el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }
      document.querySelectorAll('[alt],[aria-label],[title]').forEach(e => ['alt','aria-label','title'].forEach(a => { const v = e.getAttribute(a); if (v && re.test(v)) out.push('@' + a + ': ' + v.slice(0, 80)); }));
      if (re.test(document.title)) out.push('title: ' + document.title);
      return out; }"""
    for code in LANGS:
        pg.select_option("#lang-select", code); pg.wait_for_timeout(350)
        lang = pg.evaluate("document.documentElement.lang")
        nav = pg.inner_text("#nav-links")
        card = pg.inner_text("#work-title")
        expected = {"zh": "zh-Hans"}.get(code, code)
        if lang != expected: note(f"lang switch to {code} failed (got {lang})")
        if pg.evaluate("document.documentElement.dir") != ("rtl" if code == "ar" else "ltr"): note(f"[{code}] wrong text direction")
        for d in pg.evaluate(DASH_JS): note(f"[{code}] dash in visible text: {d}")
        print(f"  [{code}] nav: {' / '.join(nav.split())[:80]} | work: {card}")
        over = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        if over > 1: note(f"[{code}] horizontal overflow {over}px")
    pg.select_option("#lang-select", "de"); pg.wait_for_timeout(300)
    pg.reload(wait_until="networkidle"); pg.wait_for_timeout(600)
    if pg.evaluate("document.documentElement.lang") != "de": note("language preference not persisted")
    pg.goto(BASE + "/projects/echomind.html", wait_until="networkidle"); pg.wait_for_timeout(600)
    if pg.evaluate("document.documentElement.lang") != "de": note("language not carried to project page")
    pg.screenshot(path=str(OUT / "echomind-de.png"))
    for page_path in ["/projects/pitchit.html", "/projects/echomind.html", "/projects/haunting-mother.html"]:
        for code in LANGS:
            pg.goto(BASE + page_path, wait_until="networkidle"); pg.select_option("#lang-select", code); pg.wait_for_timeout(250)
            for d in pg.evaluate(DASH_JS): note(f"[{code}] {page_path} dash: {d}")
            over = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            if over > 1: note(f"[{code}] {page_path} horizontal overflow {over}px")
    pg.select_option("#lang-select", "de"); pg.wait_for_timeout(250)
    ctxa = b.new_context(viewport={"width": 390, "height": 844}, color_scheme="dark", locale="ar")
    am = ctxa.new_page(); am.goto(BASE + "/index.html", wait_until="networkidle"); am.wait_for_timeout(2000)
    if am.evaluate("document.documentElement.dir") != "rtl": note("Arabic browser locale not detected as rtl")
    over = am.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    if over > 1: note(f"[ar 390px] horizontal overflow {over}px")
    am.screenshot(path=str(OUT / "mobile-ar.png"), full_page=True); ctxa.close()
    # mobile German header (longest labels)
    ctx2 = b.new_context(viewport={"width": 360, "height": 780}, color_scheme="light", locale="de-DE")
    m = ctx2.new_page(); m.goto(BASE + "/index.html", wait_until="networkidle"); m.wait_for_timeout(2200)
    over = m.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    if over > 1: note(f"[de 360px] horizontal overflow {over}px")
    m.click("#menu-toggle"); m.wait_for_timeout(400)
    m.screenshot(path=str(OUT / "mobile-de-menu.png"))
    if m.get_attribute("#menu-toggle", "aria-expanded") != "true": note("mobile menu did not open")
    m.click("#nav-links a[href='#about']"); m.wait_for_timeout(900)
    if m.get_attribute("#menu-toggle", "aria-expanded") != "false": note("mobile menu did not close after navigation")
    ctx2.close()

    # Theme toggle + persistence
    ctx = b.new_context(viewport={"width": 1200, "height": 800}, color_scheme="dark")
    pg = ctx.new_page(); pg.goto(BASE + "/index.html", wait_until="networkidle"); pg.wait_for_timeout(1500)
    pg.click("#theme-toggle"); pg.wait_for_timeout(300)
    if pg.evaluate("document.documentElement.dataset.theme") != "light": note("theme toggle failed")
    pg.reload(wait_until="networkidle")
    if pg.evaluate("document.documentElement.dataset.theme") != "light": note("theme not persisted")

    # Old case file links now redirect to the case pages
    pg.goto(BASE + "/index.html#case-land", wait_until="networkidle"); pg.wait_for_timeout(800)
    if not pg.url.endswith("/projects/ai-land.html"): note(f"old #case-land link did not redirect (at {pg.url})")
    pg.goto(BASE + "/index.html", wait_until="networkidle"); pg.wait_for_timeout(600)
    # Tic tac toe: hard mode must never lose
    pg.click("#ttt [data-level='hard']")
    for _ in range(3):
        for i in range(9):
            if pg.evaluate("document.querySelector('#ttt .ttt__status').textContent.match(/wins|win|draw/i) !== null"): break
            btn = f"#ttt .ttt__board button[data-i='{i}']"
            if pg.is_enabled(btn): pg.click(btn); pg.wait_for_timeout(450)
        if pg.inner_text("#ttt [data-score='x']") != "0": note("hard tic tac toe lost to a naive player")
        pg.click("#ttt [data-ttt-reset]")
    # PitchIT demo loads inside the phone frame
    pg.click(".demo__start"); pg.wait_for_timeout(9000)
    live = pg.evaluate("!!document.querySelector('.demo.is-live iframe')")
    if not live: note("PitchIT demo did not reach live state")
    fr = pg.frame_locator(".demo iframe")
    try:
        ok = pg.frames[-1].evaluate("!!document.querySelector('flutter-view, flt-glass-pane')")
        if not ok: note("Flutter view not found in demo iframe")
    except Exception as ex: note(f"demo iframe check failed: {ex}")
    pg.screenshot(path=str(OUT / "demo-live.png"))
    pg.click(".demo__stop"); pg.wait_for_timeout(200)

    # Contact form validation (no backend locally → should show error + mailto fallback after valid submit)
    pg.click("#contact-form [type=submit]"); pg.wait_for_timeout(200)
    if "is-err" not in (pg.get_attribute("#form-status", "class") or ""): note("empty form not rejected")
    pg.fill("#f-name", "QA Bot"); pg.fill("#f-email", "qa@example.com"); pg.fill("#f-msg", "Hello")
    pg.click("#contact-form [type=submit]"); pg.wait_for_timeout(800)
    st = pg.inner_html("#form-status")
    print("  form status (local, no Netlify):", st[:140])
    if "mailto:" not in st: note("form failure did not offer email fallback")

    # Projects dropdown: keyboard and mouse
    pg.goto(BASE + "/index.html", wait_until="networkidle"); pg.wait_for_timeout(600)
    pg.focus(".navdd__btn"); pg.keyboard.press("ArrowDown"); pg.wait_for_timeout(250)
    if pg.get_attribute(".navdd__btn", "aria-expanded") != "true": note("projects menu did not open with ArrowDown")
    if not pg.evaluate("document.activeElement.closest('.navdd__menu') !== null"): note("ArrowDown did not focus the first menu item")
    pg.keyboard.press("ArrowDown"); pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    if pg.get_attribute(".navdd__btn", "aria-expanded") != "false" or not pg.evaluate("document.activeElement.classList.contains('navdd__btn')"): note("Escape did not close the projects menu and return focus")
    pg.click(".navdd__btn"); pg.wait_for_timeout(250)
    labels = pg.inner_text(".navdd__menu")
    for want in ("Completed projects", "In development", "Concepts and explorations", "Client work"):
        if want not in labels: note(f"projects menu missing '{want}'")
    with pg.expect_navigation(): pg.click(".navdd__menu a[href*='in-development']")
    if not pg.url.endswith("/projects/in-development.html"): note(f"menu link did not open In development (at {pg.url})")
    mctx = b.new_context(viewport={"width": 390, "height": 844}); mp = mctx.new_page(); mp.goto(BASE + "/projects/bookverse.html", wait_until="networkidle"); mp.wait_for_timeout(800)
    mp.click("#menu-toggle"); mp.wait_for_timeout(300); mp.click(".navdd__btn"); mp.wait_for_timeout(300)
    if not mp.is_visible(".navdd__menu a[href*='completed']"): note("mobile projects menu does not expand")
    mp.screenshot(path=str(OUT / "mobile-projects-menu.png")); mctx.close()

    # CV download and identity
    import re as _re
    pg.goto(BASE + "/index.html", wait_until="networkidle")
    cvs = pg.evaluate("[...document.querySelectorAll('a[data-cv-link]')].map(a => [a.getAttribute('href'), a.hasAttribute('download')])")
    if not cvs or any(not h.endswith("cv/David_Somadina_Obichukwu_CV.pdf") or not d for h, d in cvs): note(f"CV links wrong: {cvs}")
    with pg.expect_download() as dl:
        pg.click(".hero__cta a[data-cv-link]")
    d = dl.value
    if d.suggested_filename != "David_Somadina_Obichukwu_CV.pdf": note(f"CV downloads as {d.suggested_filename}")
    pdf = pathlib.Path(d.path()).read_bytes()
    if not pdf.startswith(b"%PDF"): note("CV download is not a PDF")
    from pypdf import PdfReader
    rd = PdfReader(d.path()); text = " ".join(pg_.extract_text() for pg_ in rd.pages)
    print(f"  CV: {len(rd.pages)} pages, {len(text)} characters of selectable text, author={rd.metadata.get('/Author')}")
    if "David Somadina Obichukwu" not in text or rd.metadata.get("/Author") != "David Somadina Obichukwu": note("CV name or metadata wrong")
    if len(rd.pages) != 2: note("CV is not two pages")
    for bad in ("Martina", "Obitriku", "Bachelor"):
        if bad.lower() in text.lower(): note(f"CV contains {bad}")
    site_text = " ".join(f.read_text(errors="ignore") for f in list(ROOT.glob("*.html")) + list((ROOT / "projects").glob("*.html")) + list((ROOT / "locales").glob("*.json")))
    for bad in ("Martina", "Obitriku", "Obuchukwu"):
        if bad in site_text: note(f"site contains incorrect name variant {bad}")

    # Toilet Wars play links: card, showcase and case page all point at the verified experience
    TW = "https://www.roblox.com/games/111542210820745/Toilet-Wars"
    hrefs = pg.evaluate("[...document.querySelectorAll('a')].filter(a => /Play on Roblox/.test(a.textContent) && /Toilet|111542210820745/.test(a.href)).map(a => a.href)")
    if len(hrefs) < 2 or any(h != TW for h in hrefs): note(f"homepage Toilet Wars play links wrong: {hrefs}")
    pg.goto(BASE + "/projects/toilet-wars.html", wait_until="networkidle")
    if TW not in pg.evaluate("[...document.querySelectorAll('.pj-actions a')].map(a => a.href)"): note("Toilet Wars case page has no Play on Roblox link")

    # Links & metadata
    for page_path in PAGES + ["/404.html"]:
        pg.goto(BASE + page_path, wait_until="networkidle")
        data = pg.evaluate("""() => ({
          title: document.title,
          desc: document.querySelector('meta[name=description]')?.content,
          canonical: document.querySelector('link[rel=canonical]')?.href,
          og: document.querySelector('meta[property="og:image"]')?.content,
          h1: document.querySelectorAll('h1').length,
          links: [...document.querySelectorAll('a[href]')].map(a => a.href),
          noAlt: [...document.querySelectorAll('img:not([alt])')].length,
          unlabeled: [...document.querySelectorAll('button')].filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).length
        })""")
        print(f"  {page_path}: h1={data['h1']} title='{data['title'][:60]}' canonical={data['canonical']} og={'yes' if data['og'] else 'no'}")
        if page_path != "/404.html" and (not data["desc"] or not data["og"] or not data["canonical"]): note(f"{page_path}: missing SEO metadata")
        if data["h1"] != 1: note(f"{page_path}: {data['h1']} h1 elements")
        if data["noAlt"]: note(f"{page_path}: images without alt")
        if data["unlabeled"]: note(f"{page_path}: unlabeled buttons")
        for href in set(data["links"]):
            if href.startswith(BASE):
                path = href[len(BASE):].split("#")[0]
                if page_path == "/404.html" and path in ("", "/"): continue
                r = pg.request.get(BASE + (path or "/index.html"))
                if r.status >= 400: note(f"{page_path}: broken internal link {path} ({r.status})")
    ext = sorted({l for l in data["links"]})
    b.close()

srv.shutdown()
print("\nRESULT:", "PASS" if not issues else f"{len(issues)} issue(s)")
json.dump(issues, open(OUT / "issues.json", "w"), indent=1)
