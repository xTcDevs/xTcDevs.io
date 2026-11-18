#!/usr/bin/env python3
"""Generates the case study pages and the homepage work section from tools/cases.py.
Run: python3 tools/build_cases.py   then   python3 tools/build_locales.py
"""
import html, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from cases import CASES, EXISTING, CATS, STATUS_RANK, STAGES

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://xtcdev.netlify.app"
STATUS = {"published": "Published", "live": "Live", "demo": "Working demo", "mvp": "MVP in testing", "ready": "Ready to launch",
          "dev": "In development", "prototype": "Prototype", "explore": "UI/UX exploration", "concept": "Concept"}
STATUS_KEY = {"mvp": "status.mvpTesting"}
GROUPS = [
    ("web", "Websites", "Live sites, platforms and business websites, from launched to in progress."),
    ("apps", "Apps", "Mobile and web apps, from working demos to prototypes."),
    ("games", "Games", "Roblox games, one published and one in development."),
    ("ai", "AI", "AI tools and systems, from a working prototype to concepts on paper."),
    ("uiux", "UI/UX and product design", "Projects where the interface and the product thinking are the work."),
]
GROUP_CATS = {"web": "web", "apps": "apps", "games": "games", "ai": "ai", "uiux": "uiux"}
e = lambda s: html.escape(s, quote=True)
ICON = lambda name, root: f'<svg aria-hidden="true"><use href="{root}assets/img/icons.svg#i-{name}"/></svg>'

def status_badge(st):
    return f'<span class="status status--{st}" data-i18n="{STATUS_KEY.get(st, "status." + st)}">{STATUS[st]}</span>'

def cat_chips(cats, root=""):
    return "".join(f'<span class="cat cat--{c}" data-i18n="cat.{c}">{CATS[c]}</span>' for c in cats)

def all_projects():
    items = []
    for pid, p in EXISTING.items():
        items.append(dict(p, id=pid))
    for c in CASES:
        play = next((h for (lab, h, k, ic) in c["ctas"] if ic == "play"), None)
        items.append({"id": c["id"], "title": c["title"], "href": f"projects/{c['id']}.html", "status": c["status"], "cats": c["cats"], "stage": c["stage"],
                      "client": c.get("client", False), "concept": c.get("hero_concept", False), "play": play,
                      "desc": c["desc"], "thumb": (c["hero"][0] + "-640.webp") if c.get("hero") else None, "thumb_kind": "wide", "font": c.get("font")})
    order = {pid: i for i, pid in enumerate(["toilet-wars", "haunting-mother", "anthony-studios", "pitchit", "echomind", "bookverse", "zaga",
                                              "princess-uc", "steal-the-moon", "ai-studio", "fintech", "personal-ai", "ai-land", "drawing-board"])}
    return sorted(items, key=lambda p: (STATUS_RANK.index(p["status"]), order.get(p["id"], 99)))

# ---------------------------------------------------------------- homepage work section
def card(p, gid, root=""):
    key = f"card.{p['id']}"
    title_attr = ' data-i18n="c.fintech.title"' if p["id"] == "fintech" else ""
    if p.get("thumb"):
        cls = "wcard__thumb wcard__thumb--" + p["thumb_kind"]
        ctag = '<span class="wcard__concept" data-i18n="ui.conceptArt">Concept artwork</span>' if p.get("concept") else ""
        thumb = f'<div class="{cls}"><img src="{root}{p["thumb"]}" alt="" loading="lazy" decoding="async">{ctag}</div>'
    else:
        thumb = (f'<div class="wcard__thumb wcard__thumb--none"><span class="wcard__mono">{e(p["title"][:1].upper())}</span>'
                 f'<span data-i18n="ui.noVisual">Visuals not published yet</span></div>')
    font = f' wcard__title--{p["font"]}' if p.get("font") else ""
    play = (f'<a class="btn btn--primary btn--sm wcard__play" href="{p["play"]}" target="_blank" rel="noopener">{ICON("play", root)}<span data-i18n="ui.playRoblox">Play on Roblox</span></a>'
            if p.get("play") else "")
    chips = cat_chips(p["cats"])
    return (f'<li class="wcard wcard--c-{p["cats"][0]} reveal{" wcard--has-play" if play else ""}"><a class="wcard__link" href="{root}{p["href"]}">{thumb}'
            f'<div class="wcard__body"><p class="wcard__meta">{status_badge(p["status"])}{chips}</p>'
            f'<h4 class="wcard__title{font}"{title_attr}>{e(p["title"])}</h4>'
            f'<p class="wcard__desc" data-i18n="{key}.desc">{e(p["desc"])}</p>'
            f'<span class="wcard__go"><span data-i18n="ui.caseStudy">Read the case study</span>{ICON("arrow", root)}</span></div></a>{play}</li>')

STAGE_PAGE = {"completed": "projects/completed.html", "dev": "projects/in-development.html", "concepts": "projects/concepts.html"}

def work_section():
    items = all_projects()
    out = ['<nav class="groupnav" aria-label="Project stages" data-i18n-attr="aria-label:work.stages"><ul>']
    for gid, label, _ in STAGES:
        n = sum(1 for p in items if p["stage"] == gid)
        out.append(f'<li><a href="#stage-{gid}"><span class="stage-dot stage-dot--{gid}" aria-hidden="true"></span><span data-i18n="stage.{gid}.title">{label}</span><span class="groupnav__n">{n}</span></a></li>')
    out.append("</ul></nav>")
    for gid, label, lede in STAGES:
        ps = [p for p in items if p["stage"] == gid]
        out.append(f'<section class="group group--{gid}" id="stage-{gid}" aria-labelledby="stage-{gid}-t">'
                   f'<header class="group__head"><h3 id="stage-{gid}-t" data-i18n="stage.{gid}.title">{label}</h3>'
                   f'<p data-i18n="stage.{gid}.lede">{lede}</p><a class="group__more" href="{STAGE_PAGE[gid]}"><span data-i18n="stage.open">Open this list on its own page</span>{ICON("arrow", "")}</a></header><ul class="wgrid">')
        out += [card(p, gid) for p in ps]
        out.append("</ul></section>")
    return "\n".join(out)

def clients_section():
    items = [p for p in all_projects() if p.get("client")]
    return '<ul class="wgrid wgrid--clients">' + "".join(card(p, "clients") for p in items) + "</ul>"

# ---------------------------------------------------------------- case pages
def shot(base, alt_key, alt, root, lightbox, cap_key=None, cap=None):
    a = (f'<a class="shot-link frame" href="{root}{base}.webp" data-lightbox="{lightbox}">'
         f'<img src="{root}{base}-640.webp" srcset="{root}{base}-640.webp 640w, {root}{base}.webp 1440w" sizes="(min-width: 960px) 45vw, 92vw" '
         f'width="640" height="400" loading="lazy" decoding="async" alt="{e(alt)}" data-i18n-attr="alt:{alt_key}"></a>')
    if cap:
        return f'<li>{a}<span class="screens__cap" data-i18n="{cap_key}">{e(cap)}</span></li>'
    return a

def section(c, i, s, root):
    k = f"c.{c['id']}.s{i}"
    kind = s[0]
    if kind == "missing":
        return (f'<section class="pj-section"><div class="wrap pj-section__grid"><h2 data-i18n="case.visuals">Visuals</h2>'
                f'<p class="casefile__missing" data-i18n="case.noVisual">No screenshots have been published for this project yet. They will appear here when they exist. Nothing in this case file is a mockup.</p></div></section>')
    head = f'<h2 data-i18n="{k}.h">{e(s[1])}</h2>'
    if kind == "gallery":
        lis = "".join(shot(base, f"{k}.alt{j}", f"{c['title']}: {cap}", root, c["id"], f"{k}.g{j}", cap) for j, (base, cap) in enumerate(s[2]))
        note = f'<p class="pj-note" data-i18n="{k}.note">{e(s[3])}</p>' if len(s) > 3 else ""
        return f'<section class="pj-section"><div class="wrap">{head}{note}<ul class="gallery">{lis}</ul></div></section>'
    if kind == "text":
        body = "".join(f'<p{" class=\"pj-strong\"" if j == 0 and len(s[2]) == 1 and i == 0 else ""} data-i18n="{k}.p{j}">{e(t)}</p>' for j, t in enumerate(s[2]))
    elif kind in ("list", "open"):
        cls = "bullets bullets--open" if kind == "open" else "bullets"
        body = f'<ul class="{cls}">' + "".join(f'<li data-i18n="{k}.i{j}">{e(t)}</li>' for j, t in enumerate(s[2])) + "</ul>"
    elif kind == "features":
        lis = "".join(
            f'<li><h3><span data-i18n="{k}.f{j}.t">{e(t)}</span>'
            + ('<span class="badge badge--done" data-i18n="badge.built">Built</span>' if built else '<span class="badge badge--next" data-i18n="badge.planned">Planned</span>')
            + f'</h3><p data-i18n="{k}.f{j}.d">{e(d)}</p></li>' for j, (t, d, built) in enumerate(s[2]))
        note = f'<p class="pj-note" data-i18n="{k}.note">{e(s[3])}</p>' if len(s) > 3 else ""
        body = f'<ul class="feat-list feat-list--grid">{lis}</ul>{note}'
    elif kind == "steps":
        body = '<ol class="steps">' + "".join(f'<li><h3 data-i18n="{k}.t{j}">{e(t)}</h3><p data-i18n="{k}.d{j}">{e(d)}</p></li>' for j, (t, d) in enumerate(s[2])) + "</ol>"
    elif kind == "stack":
        body = '<ul class="pills">' + "".join(f"<li>{e(t)}</li>" for t in s[2]) + "</ul>"
    return f'<section class="pj-section"><div class="wrap pj-section__grid">{head}<div>{body}</div></div></section>'

def case_main(c, prev_p, next_p):
    root = "../"
    k = f"c.{c['id']}"
    title_cls = {"mark": " pj-title--mark", "toilet": " pj-title--toilet"}.get(c.get("font"), "")
    title_i18n = f' data-i18n="{k}.title"' if c["id"] == "fintech" else ""
    ctas = []
    for j, (label, href, kind, icon) in enumerate(c["ctas"]):
        ic = ICON(icon, root)
        lead = icon in ("github", "play")
        ctas.append(f'<a class="btn btn--{kind}{" btn--lg" if icon == "play" else ""}" href="{href}" target="_blank" rel="noopener">{ic if lead else ""}<span data-i18n="{k}.cta{j}">{e(label)}</span>{"" if lead else ic}</a>')
    if not ctas:
        ctas.append(f'<a class="btn btn--primary" href="{root}index.html#contact"><span data-i18n="case.ask">Ask me about this project</span>{ICON("arrow", root)}</a>')
    facts = "".join(f'<div><dt data-i18n="case.fact.{lab.lower().replace(" ", "")}">{e(lab)}</dt><dd data-i18n="{k}.fact{j}">{e(val)}</dd></div>' for j, (lab, val) in enumerate(c["facts"]) if lab != "Status")
    if c.get("hero"):
        base, alt = c["hero"]
        cap = ('<figcaption class="pj-concept"><span data-i18n="ui.conceptArt">Concept artwork</span> · <span data-i18n="case.conceptNote">made for this page, not a screenshot</span></figcaption>'
               if c.get("hero_concept") else "")
        visual = f'<figure class="pj-shot">{shot(base, k + ".heroAlt", alt, root, c["id"])}{cap}</figure>'
    else:
        visual = (f'<div class="pj-empty"><span class="pj-empty__mark" aria-hidden="true">{e(c["title"][:1].upper())}</span>'
                  f'<p data-i18n="case.noVisualShort">No screenshots yet. Nothing on this page is a mockup.</p></div>')
    secs = "".join(section(c, i, s, root) for i, s in enumerate(c["sections"]))
    nav = []
    if prev_p:
        nav.append(f'<a class="pj-nav__link" href="{root}{prev_p["href"]}"><span data-i18n="case.prev">Previous project</span><b>{e(prev_p["title"])}</b></a>')
    if next_p:
        nav.append(f'<a class="pj-nav__link pj-nav__link--next" href="{root}{next_p["href"]}"><span data-i18n="case.next">Next project</span><b>{e(next_p["title"])}</b></a>')
    return f'''  <main id="main">
    <section class="pj-hero">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="{root}index.html" data-i18n="nav.home">Home</a><span aria-hidden="true">/</span><a href="{root}{STAGE_PAGE[c['stage']]}" data-i18n="stage.{c['stage']}.title">{dict((g, l) for g, l, _ in STAGES)[c['stage']]}</a><span aria-hidden="true">/</span><span aria-current="page">{e(c["title"])}</span></nav>
        <div class="pj-hero__grid">
          <div>
            <p class="pj-cats">{cat_chips(c["cats"])}</p>
            <h1 class="pj-title{title_cls}"{title_i18n}>{"Toilet <span>Wars</span>" if c["id"] == "toilet-wars" else e(c["title"])}</h1>
            <p class="pj-tagline" data-i18n="{k}.tagline">{e(c["tagline"])}</p>
            <p class="pj-status">{status_badge(c["status"])}</p>
            <p class="pj-lede" data-i18n="{k}.lede">{e(c["lede"])}</p>
            <div class="pj-actions">{"".join(ctas)}</div>
          </div>
          <div class="feature__visual">{visual}</div>
        </div>
        <dl class="pj-facts">{facts}</dl>
      </div>
    </section>
{secs}
    <section class="pj-section">
      <div class="wrap pj-nav">{"".join(nav)}</div>
    </section>
  </main>'''

def build_pages():
    template = (ROOT / "projects/pitchit.html").read_text()
    head_end = template.index("<body")
    items = all_projects()
    ids = [p["id"] for p in items]
    for c in CASES:
        i = ids.index(c["id"])
        prev_p = items[i - 1] if i > 0 else None
        next_p = items[i + 1] if i + 1 < len(items) else None
        page = template
        title = f'{c["title"]} | {c["tagline"]} Case study by David Somadina Obichukwu'
        desc = c["lede"][:155].rsplit(" ", 1)[0] + "."
        url = f"{SITE}/projects/{c['id']}"
        page = page.replace('data-page="pitchit"', f'data-page="{c["id"]}"')
        page = re.sub(r"<title>.*?</title>", f"<title>{e(c['title'])} | Case study by David Somadina Obichukwu</title>", page)
        page = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{e(desc)}">', page)
        page = page.replace(f"{SITE}/projects/pitchit", url)
        page = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{e(c["title"])} | {e(c["tagline"])}">', page)
        page = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{e(desc)}">', page)
        og = f"{SITE}/{c['hero'][0]}.webp" if c.get("hero") else f"{SITE}/assets/og/og-home.png"
        page = page.replace(f"{SITE}/assets/og/og-pitchit.png", og)
        page = re.sub(r'<script type="application/ld\+json">.*?</script>',
                      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"CreativeWork","name":' + repr(c["title"]).replace("'", '"')
                      + ',"url":"' + url + '","creator":{"@type":"Person","name":"David Somadina Obichukwu","url":"' + SITE + '/"}}</script>', page, flags=re.S)
        page = page.replace('<body class="page-pitchit">', f'<body class="page-case page-{c["id"]}">')
        page = re.sub(r"  <main id=\"main\">.*?</main>", lambda m: case_main(c, prev_p, next_p), page, flags=re.S)
        (ROOT / f"projects/{c['id']}.html").write_text(page)
        print("wrote projects/%s.html" % c["id"])

CV_PATH = "cv/David_Somadina_Obichukwu_CV.pdf"

def nav_html(root, active):
    """One header for every page. active: 'projects' | '' """
    home = f"{root}index.html" if root else ""
    def stage_link(gid, label):
        n = sum(1 for p in all_projects() if p["stage"] == gid)
        return (f'<li><a href="{root}{STAGE_PAGE[gid]}" role="menuitem"><span class="stage-dot stage-dot--{gid}" aria-hidden="true"></span>'
                f'<span data-i18n="stage.{gid}.title">{label}</span><span class="navdd__n">{n}</span></a></li>')
    items = "".join(stage_link(g, l) for g, l, _ in STAGES)
    nclients = sum(1 for p in all_projects() if p.get("client"))
    items += (f'<li><a href="{home}#clients" role="menuitem"><span class="stage-dot stage-dot--client" aria-hidden="true"></span>'
              f'<span data-i18n="nav.clients">Client work</span><span class="navdd__n">{nclients}</span></a></li>')
    pact = " is-active" if active == "projects" else ""
    return f'''<header class="nav" id="nav">
    <div class="nav__inner">
      <a class="brand" href="{home or '#home'}" aria-label="xTc, home">
        <span class="brand__mark" aria-hidden="true"><b>x</b>T<b>c</b></span>
        <span class="brand__name">David Obichukwu</span>
      </a>
      <nav class="nav__links" id="nav-links" aria-label="Primary">
        <div class="navdd">
          <button class="navdd__btn{pact}" type="button" aria-expanded="false" aria-controls="navdd-menu" aria-haspopup="true"><span data-i18n="nav.projects">Projects</span><svg aria-hidden="true"><use href="{root}assets/img/icons.svg#i-chevron"/></svg></button>
          <ul class="navdd__menu" id="navdd-menu" role="menu">{items}</ul>
        </div>
        <a href="{home}#capabilities" data-i18n="nav.capabilities">What I do</a>
        <a href="{home}#about" data-i18n="nav.about">About</a>
        <a href="{root}{CV_PATH}" download data-cv-link data-i18n="nav.cv">CV</a>
        <a class="nav__cta" href="{home}#contact" data-i18n="nav.contact">Contact</a>
      </nav>
      <div class="nav__tools">
        <div class="lang">
          <label class="sr-only" for="lang-select" data-i18n="ui.language">Language</label>
          <svg class="lang__icon" aria-hidden="true"><use href="{root}assets/img/icons.svg#i-globe"/></svg>
          <select id="lang-select" class="lang__select"></select>
        </div>
        <button class="icon-btn theme-toggle" id="theme-toggle" type="button" data-i18n-attr="aria-label:ui.toggleTheme" aria-label="Switch colour theme">
          <svg class="i-sun" aria-hidden="true"><use href="{root}assets/img/icons.svg#i-sun"/></svg>
          <svg class="i-moon" aria-hidden="true"><use href="{root}assets/img/icons.svg#i-moon"/></svg>
        </button>
        <button class="icon-btn menu-toggle" id="menu-toggle" type="button" aria-expanded="false" aria-controls="nav-links" data-i18n-attr="aria-label:ui.menu" aria-label="Menu">
          <svg class="i-menu" aria-hidden="true"><use href="{root}assets/img/icons.svg#i-menu"/></svg>
          <svg class="i-close" aria-hidden="true"><use href="{root}assets/img/icons.svg#i-close"/></svg>
        </button>
      </div>
    </div>
  </header>'''

def footer_nav(root):
    home = f"{root}index.html" if root else ""
    links = "".join(f'<a href="{root}{STAGE_PAGE[g]}" data-i18n="stage.{g}.title">{l}</a>' for g, l, _ in STAGES)
    return (f'<nav class="footer__nav" aria-label="Footer">{links}<a href="{home}#clients" data-i18n="nav.clients">Client work</a>'
            f'<a href="{root}{CV_PATH}" download data-cv-link data-i18n="nav.cv">CV</a>'
            f'<a href="https://github.com/xTcDevs" target="_blank" rel="noopener">GitHub</a>'
            f'<a class="nav__cta" href="{home}#contact" data-i18n="nav.contact">Contact</a></nav>')

def apply_chrome(path, root, active):
    s = path.read_text()
    s = re.sub(r'<header class="nav" id="nav">.*?</header>', lambda m: nav_html(root, active), s, count=1, flags=re.S)
    s = re.sub(r'<nav class="footer__nav" aria-label="Footer">.*?</nav>', lambda m: footer_nav(root), s, count=1, flags=re.S)
    s = s.replace("cv/David-Obichukwu-CV.pdf", CV_PATH)
    path.write_text(s)

def build_stage_pages():
    template = (ROOT / "projects/pitchit.html").read_text()
    items = all_projects()
    for gid, label, lede in STAGES:
        slug = STAGE_PAGE[gid].split("/")[1][:-5]
        ps = [p for p in items if p["stage"] == gid]
        tabs = "".join(f'<a href="{STAGE_PAGE[g].split("/")[1]}"{" aria-current=\"page\"" if g == gid else ""}><span class="stage-dot stage-dot--{g}" aria-hidden="true"></span><span data-i18n="stage.{g}.title">{l}</span></a>' for g, l, _ in STAGES)
        tabs += '<a href="../index.html#clients"><span class="stage-dot stage-dot--client" aria-hidden="true"></span><span data-i18n="nav.clients">Client work</span></a>'
        main = f'''  <main id="main">
    <section class="pj-hero stage-hero">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="../index.html" data-i18n="nav.home">Home</a><span aria-hidden="true">/</span><span data-i18n="nav.projects">Projects</span><span aria-hidden="true">/</span><span aria-current="page" data-i18n="stage.{gid}.title">{label}</span></nav>
        <h1 class="pj-title stage-title"><span class="stage-dot stage-dot--{gid}" aria-hidden="true"></span><span data-i18n="stage.{gid}.title">{label}</span></h1>
        <p class="pj-lede" data-i18n="stage.{gid}.lede">{lede}</p>
        <nav class="stage-tabs" aria-label="Project stages" data-i18n-attr="aria-label:work.stages">{tabs}</nav>
      </div>
    </section>
    <section class="pj-section">
      <div class="wrap"><ul class="wgrid">{"".join(card(p, gid, "../") for p in ps)}</ul></div>
    </section>
  </main>'''
        page = template.replace('data-page="pitchit"', f'data-page="{slug}"')
        page = re.sub(r"<title>.*?</title>", f"<title>{e(label)} | Projects by David Somadina Obichukwu</title>", page)
        page = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{e(label)}: {e(lede)}">', page)
        page = page.replace(f"{SITE}/projects/pitchit", f"{SITE}/projects/{slug}")
        page = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{e(label)} | xTc">', page)
        page = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{e(lede)}">', page)
        page = page.replace(f"{SITE}/assets/og/og-pitchit.png", f"{SITE}/assets/og/og-home.png")
        page = re.sub(r'<script type="application/ld\+json">.*?</script>', '<script type="application/ld+json">{"@context":"https://schema.org","@type":"CollectionPage","name":"' + label + '","url":"' + SITE + '/projects/' + slug + '"}</script>', page, flags=re.S)
        page = page.replace('<body class="page-pitchit">', f'<body class="page-stage page-{slug}">')
        page = re.sub(r"  <main id=\"main\">.*?</main>", lambda m: main, page, flags=re.S)
        (ROOT / STAGE_PAGE[gid]).write_text(page)
        print("wrote", STAGE_PAGE[gid])

def build_home():
    p = ROOT / "index.html"
    s = p.read_text()
    s = re.sub(r"<!-- work:start -->.*?<!-- work:end -->", lambda m: "<!-- work:start -->\n" + work_section() + "\n        <!-- work:end -->", s, flags=re.S)
    s = re.sub(r"<!-- clients:start -->.*?<!-- clients:end -->", lambda m: "<!-- clients:start -->\n" + clients_section() + "\n        <!-- clients:end -->", s, flags=re.S)
    p.write_text(s)
    print("updated index.html work and client sections")

def build_chrome():
    apply_chrome(ROOT / "index.html", "", "")
    apply_chrome(ROOT / "404.html", "/", "")
    for f in sorted((ROOT / "projects").glob("*.html")):
        apply_chrome(f, "../", "projects")

def build_sitemap():
    urls = ["/", "/projects/completed", "/projects/in-development", "/projects/concepts", "/projects/pitchit", "/projects/echomind", "/projects/haunting-mother"] + [f"/projects/{c['id']}" for c in CASES]
    body = "\n".join(f"  <url><loc>{SITE}{u}</loc></url>" for u in urls)
    (ROOT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}\n</urlset>\n')

if __name__ == "__main__":
    try:
        build_pages(); build_stage_pages(); build_home(); build_chrome(); build_sitemap()
    except OSError as err:  # missing template, unreadable index.html, or a file that could not be written
        sys.exit(f"build_cases: could not read or write {getattr(err, 'filename', '') or 'a file'}: {err.strerror or err}")
    except ValueError as err:  # a project id in cases.py that is missing from the order list
        sys.exit(f"build_cases: project data problem: {err}")
