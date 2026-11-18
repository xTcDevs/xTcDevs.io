#!/usr/bin/env python3
"""
Builds locales/en.json from the English text in the HTML pages (data-i18n / data-i18n-attr)
plus tools/en-extra.json (strings used only by JavaScript), then checks every other
locale for missing or unknown keys.

Usage:  python3 tools/build_locales.py          (from the project root)
"""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ["index.html", "404.html"] + sorted(str(p.relative_to(ROOT)) for p in (ROOT / "projects").glob("*.html"))
VOID = {"br", "img", "input", "meta", "link", "hr", "source", "use", "wbr"}


class Collector(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []      # [key or None, text buffer, tag]
        self.out = {}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "data-i18n-attr" in a:
            for pair in a["data-i18n-attr"].split(";"):
                attr, key = [s.strip() for s in pair.split(":")]
                self.add(key, a.get(attr, ""))
        if tag in VOID:
            return
        self.stack.append([a.get("data-i18n"), [], tag])

    def handle_endtag(self, tag):
        if tag in VOID or not self.stack:
            return
        key, buf, _ = self.stack.pop()
        text = re.sub(r"\s+", " ", "".join(buf)).strip()
        if key:
            self.add(key, text)
        if self.stack:
            self.stack[-1][1].extend(buf)

    def handle_data(self, data):
        if self.stack:
            self.stack[-1][1].append(data)

    def add(self, key, val):
        if key in self.out and self.out[key] != val:
            print(f"  ! conflicting English for {key!r}:\n    {self.out[key]!r}\n    {val!r}")
        self.out[key] = val


def nest(flat):
    tree = {}
    for k in sorted(flat):
        node = tree
        parts = k.split(".")
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        node[parts[-1]] = flat[k]
    return tree


def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out


def main():
    c = Collector()
    for page in PAGES:
        c.feed((ROOT / page).read_text(encoding="utf-8"))
    flat = dict(c.out)
    extra = flatten(json.loads((ROOT / "tools/en-extra.json").read_text(encoding="utf-8")))
    flat.update(extra)
    (ROOT / "locales/en.json").write_text(json.dumps(nest(flat), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"en.json: {len(flat)} keys")

    ok = True
    for f in sorted((ROOT / "locales").glob("*.json")):
        if f.name == "en.json":
            continue
        other = flatten(json.loads(f.read_text(encoding="utf-8")))
        missing = sorted(set(flat) - set(other))
        unknown = sorted(set(other) - set(flat))
        empty = sorted(k for k, v in other.items() if not str(v).strip())
        status = "OK" if not (missing or unknown or empty) else "ISSUES"
        print(f"{f.name}: {len(other)} keys — {status}")
        for label, keys in (("missing", missing), ("unknown", unknown), ("empty", empty)):
            if keys:
                ok = False
                print(f"   {label}: {', '.join(keys)}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
