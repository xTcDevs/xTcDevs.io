#!/usr/bin/env python3
"""Lists every hyphen or dash (- ‐ ‑ ‒ – — ―) that a visitor could see:
HTML text, alt/aria-label/title/placeholder attributes, <title>, description and
Open Graph meta tags, and every locale string. Exit code 1 if any are found."""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ["index.html", "404.html"] + sorted(str(p.relative_to(ROOT)) for p in (ROOT / "projects").glob("*.html"))
DASH = re.compile(r"[-‐-―−]")
ATTRS = {"alt", "aria-label", "title", "placeholder"}
META = {"description", "og:title", "og:description", "og:image:alt", "og:site_name"}
hits = []

class P(HTMLParser):
    def __init__(self, name):
        super().__init__(convert_charrefs=True); self.name = name; self.skip = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style"): self.skip += 1
        for k in ATTRS:
            if a.get(k) and DASH.search(a[k]): hits.append((self.name, f"@{k}", a[k]))
        if tag == "meta" and (a.get("name") in META or a.get("property") in META):
            if DASH.search(a.get("content", "")): hits.append((self.name, f"meta {a.get('name') or a.get('property')}", a["content"]))
    def handle_endtag(self, tag):
        if tag in ("script", "style"): self.skip -= 1
    def handle_data(self, d):
        if not self.skip and DASH.search(d) and d.strip(): hits.append((self.name, "text", d.strip()))

for page in PAGES:
    P(page).feed((ROOT / page).read_text(encoding="utf-8"))

def flat(d, p=""):
    for k, v in d.items():
        key = f"{p}.{k}" if p else k
        if isinstance(v, dict): yield from flat(v, key)
        else: yield key, v
for f in sorted((ROOT / "locales").glob("*.json")):
    for k, v in flat(json.loads(f.read_text(encoding="utf-8"))):
        if DASH.search(str(v)): hits.append((f.name, k, v))

for h in hits: print(" | ".join(map(str, h)))
print(f"\n{len(hits)} dash(es) found")
sys.exit(1 if hits else 0)
