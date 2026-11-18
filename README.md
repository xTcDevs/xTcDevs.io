# xTc | David Somadina Obichukwu portfolio

Static site (HTML, CSS, vanilla JS), same stack as the previous xtcdev.netlify.app, no build step, no dependencies.

## Deploy to Netlify (replaces the current site)

**Option A: drag and drop (fastest)**
1. Netlify dashboard, your `xtcdev` site → **Deploys**.
2. Drag this whole folder (the one containing `index.html` and `netlify.toml`) onto the deploy drop zone.
3. Open **Forms** in the site dashboard and confirm a form called `contact` appears. Under **Forms → Form notifications**, add an email notification to `obichukwudavid15@gmail.com` so messages reach your inbox.

**Option B: GitHub (recommended for ongoing updates)**
1. Push this folder to a repo, e.g. `xTcDevs/portfolio`.
2. Netlify → site → **Site configuration → Build & deploy → Link repository**. Build command: *(empty)*. Publish directory: `.`
3. Every push to `main` redeploys automatically.

Clean URLs such as `/projects/toilet-wars` and `/projects/completed` are set up in `netlify.toml`, along with redirects from the old CV links and a header that makes the CV download as a file.

## Things only you can supply

| What | Where it goes |
|---|---|
| CV changes | Edit `tools/cv/cv.html`, then run `python3 tools/cv/build_cv.py <fonts-dir>` to rebuild `cv/David_Somadina_Obichukwu_CV.pdf` (two pages, selectable text, metadata). Keep the file name. Add your phone number there if you want it on the CV. |
| More EchoMind screenshots | `assets/img/echomind/` — save a full-size `.webp` plus a 400px-wide `-400.webp`, then copy one `<li>` in the `.screens` list in `projects/echomind.html`. |
| More Haunting Mother captures | `assets/img/haunting-mother/` — full-size `.webp` plus an 800px-wide `-800.webp`, then copy one `<li>` inside the right `.house` block in `projects/haunting-mother.html`. |
| Real screenshots for Steal the Moon, xTc AI Studio, FinTech | Put `<name>.webp` and `<name>-640.webp` in `assets/img/<project>/`, point `hero` (and a `gallery` section) at them in `tools/cases.py`, remove `hero_concept` if it was concept art, then run the build. |
| A new PitchIT demo build | `flutter build web --release --base-href ./`, copy `build/web` into `demo/pitchit/`, then in `flutter_bootstrap.js` set `_flutter.loader.load({ config: { canvasKitBaseUrl: "canvaskit/" } })` so the engine loads from the site itself. Run the app in demo mode (no Supabase keys). |
| LinkedIn or other profiles | Add to the `.socials` list in `index.html` and `contact__links`. |

## Content structure

- **Text in every language:** `locales/<lang>.json`. English text also lives in the HTML (for search engines).
- **Projects:** `tools/cases.py` holds every project (English text, status, stage, categories, client flag, screenshots or concept art). Run `python3 tools/build_cases.py` to regenerate the case pages in `projects/`, the three stage pages (`completed.html`, `in-development.html`, `concepts.html`), the stage and client sections in `index.html` (between the `work:` and `clients:` comments), the shared header with the Projects menu and the footer on every page, and `sitemap.xml`. PitchIT, EchoMind and Haunting Mother keep their hand written pages. Stages: Completed, In development, Concepts and explorations. `client: True` puts a project in Client websites. `hero_concept: True` labels the hero image as concept artwork.
- **PitchIT live demo:** `demo/pitchit/` (Flutter web build in demo mode, sample data only, no keys). It only loads when a visitor presses Try the live demo.
- **Experience, education, skills:** `index.html` (`#experience`, `#skills`) + matching locale keys.

### Editing text
1. Change the English text in the HTML (or `tools/en-extra.json` for JS-only strings).
2. Run `python3 tools/build_locales.py` — it regenerates `locales/en.json` and lists any keys missing from the other languages.
3. Add the missing translations.

### Languages
English, French, Spanish, Portuguese, German, Igbo, Yoruba, Hausa, Arabic (right to left), Hindi and Simplified Chinese. Igbo, Yoruba and Hausa should get a read through from a native speaker.

### Adding a language
1. Copy `locales/en.json` to `locales/<code>.json` and translate the values.
2. Add `{ code: "<code>", name: "<native name>" }` to `LANGUAGES` in `assets/js/i18n.js` (add `dir: "rtl"` for right to left scripts).

### Adding a project
Add an entry to `CASES` in `tools/cases.py` (screenshots go in `assets/img/<id>/` as `<name>.webp` plus `<name>-640.webp`), add its id to the order list in `tools/build_cases.py`, then run `build_cases.py` and `build_locales.py` and translate the new `c.<id>.*` and `card.<id>.*` keys. Untranslated keys show in English.

## Maintenance scripts (`tools/`, not served publicly)
- `build_locales.py`: rebuilds English strings and checks every language for missing keys.
- `dash_check.py`: lists any hyphen or dash a visitor could see (pages, alt text, titles, all languages). The site's copy style uses none.
- `qa.py <out-dir>`: headless QA. Six viewports from 320px to 1920px in both themes, every page, overflow and spilled content, broken images, the echo animation in light mode, the Projects menu by keyboard and on mobile, the CV download (file name, PDF, pages, text, metadata), name checks, the Toilet Wars Play links, 11 languages, right to left, the noughts and crosses AI, the PitchIT demo, form, links, metadata and console errors.
- `cv/build_cv.py <fonts-dir>`: builds the CV PDF from `tools/cv/cv.html`.
- `render_images.py <fonts-dir>`: regenerates favicons and social share images from unpacked @fontsource packages.
