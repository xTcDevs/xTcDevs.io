"""Project data for the portfolio: the work grid on the homepage and the generated case study pages.
Every sentence here must be true. Only claim what exists; anything not built is marked Planned or sits under Open questions.
English lives here; tools/build_cases.py writes it into the HTML with data-i18n keys, and build_locales.py picks it up.
"""

# Maturity order: the grid and the "next project" links follow this list.
STATUS_RANK = ["live", "published", "demo", "mvp", "ready", "dev", "prototype", "explore", "concept"]

# Stages for the Projects menu and the three project pages
STAGES = [
    ("completed", "Completed projects", "Finished work that people can use or play today."),
    ("dev", "In development", "Products being built right now. Each page separates what exists today from what is planned."),
    ("concepts", "Concepts and explorations", "Ideas, design studies and early thinking. Nothing here is presented as a working product."),
]

CATS = {  # key: English label
    "web": "Websites", "apps": "Apps", "games": "Games", "ai": "AI", "uiux": "UI/UX", "concepts": "Concepts",
}

# Projects with hand written case pages (kept, not generated)
EXISTING = {
    "pitchit": {"stage": "dev", "title": "PitchIT", "href": "projects/pitchit.html", "status": "demo", "cats": ["apps", "uiux"],
                "desc": "A marketplace for every kind of work in Nigeria, with a demo you can use right here.",
                "thumb": "assets/img/pitchit/sign-in-400.webp", "thumb_kind": "phone", "font": "pitchit"},
    "echomind": {"stage": "dev", "title": "EchoMind", "href": "projects/echomind.html", "status": "mvp", "cats": ["apps", "uiux"],
                 "desc": "A private Android journal for noticing how you really feel. No account, no internet.",
                 "thumb": "assets/img/echomind/home-400.webp", "thumb_kind": "phone", "font": "echo"},
    "haunting-mother": {"stage": "completed", "title": "Haunting Mother", "href": "projects/haunting-mother.html", "status": "published", "cats": ["games"],
                        "desc": "A published multiplayer horror memory game on Roblox. Study every room, then spot what changed.",
                        "thumb": "assets/img/haunting-mother/h3-memorize-mothers-bedroom-800.webp", "thumb_kind": "wide", "font": "hud"},
}

CASES = [
  # ------------------------------------------------------------------ featured game
  {
    "id": "toilet-wars", "stage": "completed", "title": "Toilet Wars", "status": "live", "cats": ["games"], "font": "toilet",
    "desc": "A competitive multiplayer knockback brawler on Roblox: Red Plungers against Blue Scrubbers, 1v1 up to 4v4.",
    "tagline": "Flush or be flushed.",
    "lede": "Toilet Wars is a team based multiplayer arena game on Roblox. Two teams, the Red Plungers and the Blue Scrubbers, soak each other with plungers, toilet paper launchers and flush bombs, then knock their rivals off the map. It is public on Roblox and I keep developing it.",
    "facts": [("Type", "Multiplayer arena game on Roblox"), ("Built with", "Roblox Studio, Luau"), ("Teams", "1v1 up to 4v4, bots fill empty slots"), ("My role", "Concept, game direction, design and development")],
    "ctas": [("Play on Roblox", "https://www.roblox.com/games/111542210820745/Toilet-Wars", "primary", "play")],
    "hero": ("assets/img/toilet-wars/action", "Toilet Wars gameplay scene: a player with a golden plunger knocks a soaked rival at 187 percent toward the bowl, under the Plunger Brawler title"),
    "sections": [
      ("text", "What it is", ["Roblox is a platform where millions of people play games made by independent creators, on phones, computers, tablets and consoles. Toilet Wars is one of those games, and anyone can join it from the Roblox app or website.", "It is a knockback brawler: instead of losing health, players get soaked, and the aim is to send rivals flying off the arena or into the bowl. Matches are short, loud and team based, built for playing with friends."]),
      ("steps", "The core loop", [
        ("Pick a battle", "Press Play, choose a map and a team size from 1v1 to 4v4. Bots fill any empty slots so a match can always start."),
        ("Soak your rivals", "Every hit with a plunger, a toilet paper roll or a flush bomb raises a rival's soak percentage, shown above their head."),
        ("Knock them out", "Soaked players are easier to send flying. Push them off the map or into the bowl, while your team holds the objective."),
        ("Charge the Super Flush", "Build up your Super Flush and release it for a blast that can turn a round."),
        ("Earn and unlock", "Rounds feed daily rewards, quests, challenges and the Flush Pass, which unlock cosmetics."),
      ]),
      ("list", "Game modes", ["Throne Control", "Flush Frenzy", "Sinking Bowl", "A Practice Range for new players"]),
      ("list", "Weapons and abilities", ["Plunger weapons for close range hits", "Toilet paper launcher for range", "Flush Bomb", "Super Flush, a charged special ability"]),
      ("list", "Chaos events", ["Mega Flush", "Low Gravity", "Golden Plunger"]),
      ("list", "Five maps", ["The Bowl", "Spin Cycle", "Sewer Run", "Shower Tower", "The Gauntlet"]),
      ("list", "Progression without pay to win", ["Free daily rewards and login streaks", "Daily quests, weekly challenges and achievements", "Season 1 Flush Pass with 15 tiers of rewards", "A daily featured shop with skins, hats, trails, titles, emotes and victory animations", "Cosmetics never affect gameplay", "Parties so friends can play together"]),
      ("steps", "How I built it", [
        ("Concept and direction", "The idea, the tone and the rules are mine: a silly theme with a competitive core, readable for younger players and deep enough to keep playing."),
        ("Systems design", "I planned the soak and knockback rules, the three modes, the chaos events, team sizes from 1v1 to 4v4 and how rewards should feel fair."),
        ("Building in Roblox Studio", "The game is scripted in Luau. I write and change code myself and use an AI coding assistant heavily to draft systems, debug and review, then I read, adjust and decide what ships."),
        ("Arenas and interface", "Five obstacle course maps, a lobby with map and team size selection, and a HUD that shows soak percentages clearly on phones and computers."),
        ("Test and refine", "Play sessions in Studio and on Roblox after each change, then balance passes on knockback, events and rewards."),
      ]),
      ("stack", "Tools", ["Roblox Studio", "Luau", "AI coding assistant", "Roblox experience settings"]),
      ("gallery", "Gallery", [("assets/img/toilet-wars/action", "Knockback in action"), ("assets/img/toilet-wars/maps", "The maps and team sizes"), ("assets/img/toilet-wars/cosmetics", "Cosmetic plungers, never pay to win")],
       "These are the game's Roblox store images, made from in game scenes with title text added on top."),
      ("text", "Status", ["Public on Roblox since November 2026 and actively developed: new balance passes, content and fixes follow play testing."]),
    ],
  },
  # ------------------------------------------------------------------ websites
  {
    "id": "anthony-studios", "stage": "completed", "client": True, "title": "Macreamy Anthony Studios", "status": "live", "cats": ["web"],
    "desc": "The live website of Macreamy Studios, a music recording studio in Awka, Nigeria.",
    "tagline": "A studio website that sounds like the studio.",
    "lede": "A responsive business website for Macreamy Studios, the recording studio of Macreamy Anthony Studios in Awka, Anambra. It presents the studio, its services and its media, and it is live at macreamystudios.com.",
    "facts": [("Type", "Client business website"), ("Built with", "HTML, CSS, JavaScript, GSAP"), ("Live at", "macreamystudios.com"), ("My role", "Design and development")],
    "ctas": [("Visit the live site", "https://macreamystudios.com/", "primary", "external"),
             ("Source on GitHub", "https://github.com/xTcDevs/maccreamy", "ghost", "github")],
    "hero": ("assets/img/anthony/index", "The studio website home page with the studio name, Professional Music Recording Studio, and Our Services and Get Started buttons"),
    "sections": [
      ("text", "The brief", ["A recording studio sells a feeling before it sells hours in a booth. The site had to look as polished as the music, explain what the studio offers and make it easy to get in touch."]),
      ("list", "What the live site covers", ["A home page with the studio name, a one line promise and two clear calls to action", "Services: professional recording, music production, mixing and mastering, session musicians, audio post production and music lessons", "A media page with a studio gallery and the studio's music", "About, contact and support pages with email, phone and the studio's location"]),
      ("text", "Design and build", ["A dark stage with warm accents and soft glows, like studio lights in a dim room. I built it with semantic HTML, responsive CSS and JavaScript, with GSAP for the motion so headings and sections arrive smoothly without slowing the page down."]),
      ("stack", "Stack", ["HTML", "CSS", "JavaScript", "GSAP", "Responsive design"]),
      ("gallery", "Screens", [("assets/img/anthony/index", "Home"), ("assets/img/anthony/services", "Services"), ("assets/img/anthony/media", "Media and studio gallery")],
       "Captured from an earlier build in the site's GitHub repository, which used the macAnthony Global name. The live site now carries the Macreamy Studios name."),
      ("text", "Status", ["Completed and live at macreamystudios.com. I checked it on 14 November 2026."]),
    ],
  },
  {
    "id": "bookverse", "stage": "dev", "title": "BookVerse", "status": "dev", "cats": ["web", "apps", "uiux"],
    "desc": "A book and comics platform for discovering, reading and later publishing every kind of story. In development, with a live preview.",
    "tagline": "One place for every kind of story.",
    "lede": "BookVerse is a digital book platform for readers who move between formats: novels, manga, manhwa, manhua, webtoons, comics, graphic novels, web and light novels, audiobooks, poetry and non fiction. A first release is live as a preview. The reader, the full catalogue, Top Books and the writer studio are still being built.",
    "facts": [("Type", "Web platform"), ("Built with", "React 19, React Router 7, TypeScript, Supabase"), ("Live preview", "Hosted on Netlify"), ("My role", "Product owner, design direction and development")],
    "ctas": [("Open the live preview", "https://bookverse-1.netlify.app/", "primary", "external"),
             ("Source on GitHub", "https://github.com/xTcDevs/BookVerse", "ghost", "github")],
    "hero": ("assets/img/bookverse/home", "BookVerse home page: Editor's pick, Frankenstein by Mary Shelley, free to read, with Read free online and Download free buttons"),
    "sections": [
      ("text", "The problem", ["Readers no longer stay in one format. The same person reads a classic novel, follows a webtoon and listens to an audiobook, but each lives on a different site with its own account and its own way of keeping a library. Writers face the same split when they want to publish."]),
      ("text", "The vision", ["One structured place to discover books, keep a personal library and, later, write and publish next to the classics. Discovery is organised by format and genre, every book is honestly labelled with where it can be read, and readership numbers will only ever come from real readers."]),
      ("steps", "Intended experience", [
        ("Discover", "Browse by format, genre or author, or search, and open a book page that says plainly what you can read here, borrow or buy elsewhere."),
        ("Read", "Read free editions on BookVerse itself with reading settings for text, comics and audio."),
        ("Keep a library", "Save books to a personal library and organise it."),
        ("Write", "Writers publish books, serials, poetry and comics from one author profile, with a name and handle that are theirs."),
      ]),
      ("features", "What exists today and what is planned", [
        ("Explore menu by format", "Novels, manga, manhwa, manhua, webtoons, comics, graphic novels, web novels, light novels, audiobooks, poetry and non fiction, plus ways to read such as Free to read now.", True),
        ("Genre pages", "Fiction and non fiction genres with short descriptions and sub genres such as epic fantasy, dystopian, crime and gothic.", True),
        ("Book pages with free editions", "Public domain books list where to read or download them free, from sources such as Standard Ebooks and Project Gutenberg.", True),
        ("Themes and reading settings", "Eight colour themes, accent colours and separate settings for text, comics and audio, with accessible reading fonts.", True),
        ("Accounts", "Sign in with Supabase, with preferences saved to your account. Creating an account now reserves your name and handle for the writer studio.", True),
        ("Write page", "A page describing what the writer studio will do. It is a description, not a working editor.", True),
        ("Top Books", "Rankings will only use real reading data, so this section is not implemented yet.", False),
        ("Full catalogue and discovery", "The starter shelf grows into a full catalogue with richer discovery.", False),
        ("Built in reader", "Read on BookVerse itself, using your reading settings.", False),
        ("Personal library organisation", "Saving and organising books into a personal library.", False),
        ("Writer studio and author spaces", "Books and serials, comics and webtoons, drafts and scheduling, book pages, author profiles and readership.", False),
      ], "Built means it works in the live preview today. Planned items come in later milestones; the writer studio is planned for Milestone 5."),
      ("steps", "How it is built", [
        ("Milestone by milestone", "Each milestone has to work on its own before the next starts, and pages for future features describe them without faking them."),
        ("Static and fast", "The app is pre rendered into a static site on Netlify, so pages load without an application server."),
        ("Tested", "Unit tests with Vitest, browser tests with Playwright and accessibility checks with axe."),
        ("Secure by default", "A content security policy on every page, and a build check that stops secrets from reaching the browser."),
      ]),
      ("stack", "Stack", ["React 19", "React Router 7", "TypeScript", "Supabase", "Netlify", "Vitest", "Playwright", "axe"]),
      ("gallery", "Screens", [("assets/img/bookverse/home", "Home with the editor's pick"), ("assets/img/bookverse/explore", "Explore menu: formats, ways to read and genres"), ("assets/img/bookverse/genres", "Fiction genres"), ("assets/img/bookverse/nonfiction", "Non fiction genres"), ("assets/img/bookverse/write", "Write: what the studio will do"), ("assets/img/bookverse/book", "Book page")],
       "Screenshots of the live preview."),
      ("text", "Status", ["In development. The preview is live; the full catalogue, the reader, Top Books, library organisation and the writer studio come next, in that order of milestones."]),
    ],
  },
  {
    "id": "zaga", "stage": "dev", "client": True, "title": "Zaga", "status": "ready", "cats": ["web", "uiux"],
    "desc": "A fashion house website with a shop where every piece comes in ten colours. Built, waiting on the client's final details.",
    "tagline": "Wear the crown.",
    "lede": "The website for Zaga, a fashion house that designs, tailors and manufactures clothing: a ready to wear shop, bespoke tailoring and production for other brands. The site is built and waits on the brand's prices, contact details and story before launch.",
    "facts": [("Type", "Client brand website and shop"), ("Built with", "HTML, CSS, JavaScript, Python image tools"), ("Launch", "After the client adds prices and contact details"), ("My role", "Design and development")],
    "ctas": [("Source on GitHub", "https://github.com/xTcDevs/zaga", "ghost", "github")],
    "hero": ("assets/img/zaga/home", "Zaga home page: Wear the crown, with a black hoodie carrying the ZA crest"),
    "sections": [
      ("text", "The brief", ["Zaga does three things: sells its own label, tailors pieces to measure and manufactures for other brands. The site had to present all three clearly and let customers order without a full online checkout."]),
      ("features", "Features", [
        ("Shop with ten colours per piece", "Products across categories from tees and hoodies to headwear and bags, each in ten colours. Tap a swatch to see the piece in that colour.", True),
        ("Quick view and ordering", "Pick a colour and size in a quick view, then order through a ready written WhatsApp message.", True),
        ("Bespoke tailoring", "A four step flow, consult, measure, craft, fit and deliver, with a booking call to action.", True),
        ("Manufacturing for brands", "Pattern making, sampling, cut and sew, logo printing, labels and tags, team and event uniforms.", True),
        ("Contact form", "Orders, fittings and production quotes in one form.", True),
        ("Launch content", "Prices, the WhatsApp number, studio address, minimum order and the founder's story are placeholders until the client supplies them.", False),
      ]),
      ("text", "One photo, ten colours", ["Only some colours were photographed. A set of Python tools cuts each garment from its background, finds logos and metal hardware, then renders the other colours from the real photo, keeping the folds, knit and monogram. Rendered colours carry a Preview badge so customers know which ones are photographs."]),
      ("text", "Design direction", ["Black and gold with large condensed headlines, quiet product photography and a light section for tailoring, so each of the three services has its own room."]),
      ("stack", "Stack", ["HTML", "CSS", "JavaScript", "Python", "rembg", "Pillow"]),
      ("gallery", "Screens", [("assets/img/zaga/home", "Home"), ("assets/img/zaga/shop", "Shop"), ("assets/img/zaga/bespoke", "Bespoke tailoring")],
       "Captured from the finished build. Prices and some contact details are still placeholders until launch."),
      ("text", "Status", ["Built and ready to launch once the client adds prices, contact details and the brand story. There is no public URL yet."]),
    ],
  },
  {
    "id": "princess-uc", "stage": "dev", "client": True, "title": "Princess UC Crafts", "status": "ready", "cats": ["web", "uiux"],
    "desc": "A website for a handmade adornments business: fascinators, hats, crowns, beads, hand fans and stoning on clothes.",
    "tagline": "Handmade pieces, finally online.",
    "lede": "A website for Princess UC Crafts, Princess Uche Charity's handcraft studio: beaded necklaces and bridal sets, fascinators, hats, crowns, hand fans and stone work on clothing, all made to order. The site is built and waits on the business details and more photos before launch.",
    "facts": [("Type", "Client small business website"), ("Built with", "HTML, CSS, JavaScript"), ("Launch", "After the client adds contact details and photos"), ("My role", "Design and development")],
    "ctas": [],
    "hero": ("assets/img/princess-uc/home", "Princess UC Crafts home page: Adornments made for the day everyone remembers, with a gold fascinator in an arched frame"),
    "sections": [
      ("text", "The brief", ["Handmade work sells on detail: the beads, the shaping of a hat, the sparkle of stones on fabric. The site's job is to show that detail properly, explain how custom orders work and make it easy to start an order on WhatsApp."]),
      ("features", "Features", [
        ("Collections", "Six collections, from beaded necklaces and bridal sets to stoning on clothes, each with a cover photo or a bead pattern until photos arrive.", True),
        ("Filterable gallery with a viewer", "Filter recent pieces by collection and open them in a full screen viewer with keyboard and swipe support.", True),
        ("Hero slideshow", "Featured pieces rotate in an arched frame, and stop rotating for visitors who prefer reduced motion.", True),
        ("Stoning levels and ordering steps", "Three levels of stone work and a four step order process, from sending inspiration to pickup or delivery.", True),
        ("WhatsApp ordering", "Every order button opens a ready written WhatsApp message, including the piece being viewed.", True),
        ("One file to update", "All business details, collections and photos live in one data file, so the owner can add pieces without touching the layout.", True),
        ("Launch content", "The WhatsApp number, location, delivery areas, her story and more photos are still to be supplied.", False),
      ]),
      ("stack", "Stack", ["HTML", "CSS", "JavaScript", "Responsive design"]),
      ("gallery", "Screens", [("assets/img/princess-uc/home", "Home"), ("assets/img/princess-uc/collections", "Collections"), ("assets/img/princess-uc/gallery", "Gallery with filters"), ("assets/img/princess-uc/stoning", "Stone work levels")],
       "Captured from the finished build with the client's own product photos."),
      ("text", "Status", ["Built and ready to launch once the client adds contact details, delivery areas and more photos. There is no public URL yet."]),
    ],
  },
  # ------------------------------------------------------------------ games
  {
    "id": "steal-the-moon", "stage": "dev", "title": "Steal the Moon", "status": "dev", "cats": ["games"], "hero_concept": True,
    "desc": "A multiplayer tycoon and heist game on Roblox: claim a base, collect, defend and rob your way toward the moon.",
    "tagline": "Build up. Then take the moon.",
    "lede": "Steal the Moon is a multiplayer tycoon and heist game in development on Roblox. Players claim a base, collect resources, upgrade, defend what they have and rob other players, on the way to the biggest heist imaginable: the moon itself.",
    "facts": [("Type", "Multiplayer tycoon and heist game on Roblox"), ("Built with", "Roblox Studio, Luau"), ("My role", "Concept, game design and development")],
    "ctas": [],
    "hero": ("assets/img/concepts/steal-the-moon", "Concept artwork: floating player bases with team flags, a portal and a rocket heading for a huge moon"),
    "sections": [
      ("text", "The idea", ["Tycoon games are about growth: start small, build up, unlock more. Steal the Moon gives that growth a goal worth chasing and adds risk: what you collect can be stolen, so you have to defend as well as build."]),
      ("steps", "The gameplay loop", [
        ("Claim a base", "Each player claims a base of their own when they join."),
        ("Collect", "Gather resources around the world and from your base to power the economy."),
        ("Upgrade", "Spend what you collect on upgrades that make your base produce and protect more."),
        ("Defend and rob", "Protect your base from other players, or travel to theirs and take what you can."),
        ("Come back", "Daily rewards and long term goals bring players back to repeat the loop."),
      ]),
      ("list", "Systems being built", ["Claimable player bases and base ownership", "Resource collection and a farm", "Robbery and defence mechanics", "Transport and portals between areas", "A HUD, inventory and shops", "A daily spin, a rarity mixer, the Moonlog and upgrades", "Progression that rewards repeat play"]),
      ("text", "Monetisation principles", ["Robux products have to be things players genuinely want. No pay to win, no fake scarcity and no pressure tactics, and existing player data and balances are always preserved through updates."]),
      ("stack", "Tools", ["Roblox Studio", "Luau", "AI coding assistant"]),
      ("text", "Visuals", ["There are no gameplay screenshots to publish yet. The image at the top is concept artwork made for this page to show the game's identity. It is not a screenshot and not gameplay."]),
      ("text", "Status", ["In development in Roblox Studio and not yet released."]),
    ],
  },
  # ------------------------------------------------------------------ AI
  {
    "id": "ai-studio", "stage": "dev", "title": "xTc Personal AI Studio", "status": "prototype", "cats": ["ai"], "font": "mark", "hero_concept": True,
    "desc": "A personal creative studio for AI assisted video and photo editing. The Python and FFmpeg engine runs; the full studio is the vision.",
    "tagline": "Footage in, a considered edit out.",
    "lede": "A personal AI powered creative studio that brings video editing, photo editing and audio work into one place. I give it footage and a creative direction, and it makes editing decisions with an understanding of what happens in the clip. Today an experimental Python and FFmpeg engine exists; the studio around it is still the plan.",
    "facts": [("Type", "Creative technology, AI tools"), ("Built with", "Python, FFmpeg"), ("Today", "Experimental processing engine"), ("My role", "Creative direction, product design and development")],
    "ctas": [],
    "hero": ("assets/img/concepts/ai-studio", "Concept artwork of the studio: a footage bin, a cinematic preview, creative direction and style options, detected moments and a timeline synced to the beat"),
    "sections": [
      ("text", "The problem", ["I want edits with taste and intention, from gaming montages and football highlights to cinematic, vlog, travel and promo cuts, without cutting every frame by hand and without depending on expensive AI subscriptions."]),
      ("features", "Existing prototype and product vision", [
        ("Video processing engine", "A Python and FFmpeg pipeline that cuts, sequences and renders clips automatically.", True),
        ("Event understanding", "Cuts that follow what actually happens, such as a kill or a goal, instead of random cuts.", False),
        ("Edit styles", "Gaming montages, cinematic, vlog, promo, travel and football highlight edits.", False),
        ("Effects, transitions and music sync", "Transitions and effects only where they help, with cuts placed on the beat of the music.", False),
        ("Voice and audio", "Audio placement, voiceover integration, and original audio kept by default.", False),
        ("Photo editing", "Photo edits in the same studio and the same visual styles.", False),
        ("Desktop interface", "A visual studio on top of the engine, deliberately left until the engine is right.", False),
      ], "Built means it runs today in the experimental engine. Everything else is the direction of the product."),
      ("list", "Ground rules", ["Local first: it has to run on an everyday laptop", "Outside AI only where it truly helps", "Original audio stays unless I say otherwise", "Built for my own creative work first"]),
      ("text", "What testing taught me", ["The first real test, a 30 second gaming clip with two kills, produced random cuts, effects that were not needed and missing original audio. That result set the direction: the studio has to understand events before it decides where to cut, and the original sound stays by default."]),
      ("stack", "Stack", ["Python", "FFmpeg"]),
      ("text", "About the image", ["The image at the top is concept artwork of the intended studio. No interface has been built yet."]),
    ],
  },
  {
    "id": "personal-ai", "stage": "concepts", "title": "xTc Personal AI System", "status": "concept", "cats": ["ai", "concepts"], "font": "mark",
    "desc": "A local first AI that works as coder, designer, researcher and assistant, on terms I control.",
    "tagline": "One assistant, on my machine, on my terms.",
    "lede": "A personal AI system that acts as one central intelligence: coder, designer, researcher and email and productivity assistant, with its own animated desktop interface and voice, and later a mobile companion. It runs on my own laptop first and is built so that I stay in control of what it learns and what it can do.",
    "facts": [("Type", "Personal AI system"), ("Status", "Concept: brief written, design first"), ("My role", "Product owner and creative director")],
    "ctas": [],
    "hero": None,
    "sections": [
      ("text", "Why build it", ["Paid AI subscriptions add up, and each tool knows only a slice of my work. I want one system that knows my projects, runs locally where it can, and is not tied to a single provider."]),
      ("list", "Principles", ["Runs locally on my laptop first, using open weight and local models where practical", "Modular, so any model or provider can be swapped", "Learns only from sources I explicitly authorise", "Every memory can be inspected, edited and deleted, and follows my approval rules", "It can never expand its own permissions"]),
      ("list", "What it should do", ["Write and review code", "Help with design work", "Research", "Handle email and day to day productivity", "Talk by voice through its own animated desktop interface", "Later, a mobile companion", "Host the xTc Personal AI Studio for photo and video editing"]),
      ("steps", "How it will be built", [
        ("Visual identity", "How the system looks and feels before anything else."),
        ("Interface architecture", "The desktop command centre and how voice, chat and tools fit together."),
        ("Core system design", "Models, memory, permissions and how modules plug in."),
        ("Milestones", "Then built milestone by milestone, not as a rushed prototype."),
      ]),
      ("missing",),
    ],
  },  {
    "id": "ai-land", "stage": "concepts", "title": "AI Land Development Platform", "status": "concept", "cats": ["ai", "concepts"], "hero_concept": True,
    "desc": "A concept for planning land in an interactive 3D space: add, move and remove structures, then compare scenarios.",
    "tagline": "Try a plan before you build it.",
    "lede": "A product concept for AI assisted land planning. Users would work with a virtual model of a piece of land, add, remove and reposition structures, and compare different development scenarios before anything is built. Nothing has been implemented yet; this is a concept I am learning toward.",
    "facts": [("Type", "AI and real estate technology, product concept"), ("Implemented", "Nothing yet"), ("My role", "Concept and product design")],
    "ctas": [],
    "hero": ("assets/img/concepts/ai-land", "Concept artwork: an isometric land plot with roads and buildings, a new structure being placed, a tools panel and scenario comparisons"),
    "sections": [
      ("text", "The problem and the opportunity", ["Plans on paper and static drawings are hard to imagine, and changing them is slow and expensive. Owners and small developers often decide what to build on a plot without seeing the alternatives side by side."]),
      ("text", "The concept", ["Put the land into an interactive 3D environment where ideas can be tried directly: place a structure, move it, remove it, and see the result immediately. Save each arrangement as a scenario and compare them."]),
      ("list", "Intended users", ["Land owners deciding what to do with a plot", "Small developers comparing layouts", "Designers presenting options to clients"]),
      ("steps", "Proposed experience", [
        ("Load the land", "Start from the plot's shape and size."),
        ("Add structures", "Drop in buildings, roads and green space from a library."),
        ("Rearrange", "Move, rotate and remove elements, and see the layout change in 3D."),
        ("Compare scenarios", "Save alternatives and compare them side by side."),
      ]),
      ("features", "Intended functionality", [
        ("Interactive 3D land environment", "A navigable model of the plot.", False),
        ("Add, remove and reposition structures", "Direct manipulation of every element.", False),
        ("Development scenarios", "Saved layouts to compare.", False),
        ("Visualising proposed arrangements", "Clear views of what each scenario would look like.", False),
      ], "None of these exist yet. They describe the concept."),
      ("list", "Potential AI integration", ["Suggesting layouts that fit the plot", "Checking a layout against simple rules such as access and spacing", "Simulations that help compare scenarios"]),
      ("text", "Current learning and direction", ["I am learning the 3D and simulation side needed to prototype this, starting with interactive environments, which I already work with in Roblox Studio."]),
      ("list", "Future possibilities", ["Cost and material estimates per scenario", "Sharing scenarios with clients", "Use for estates and community planning"]),
      ("text", "About the image", ["The image at the top is concept artwork. There is no working platform or AI planning engine."]),
    ],
  },
  {
    "id": "drawing-board", "stage": "concepts", "title": "AI Drawing Board", "status": "concept", "cats": ["ai", "concepts"],
    "desc": "A spatial thinking tool for founders: lay out an idea on a canvas and think it through with AI.",
    "tagline": "Think on a canvas, not in a chat.",
    "lede": "A product concept for a spatial thinking tool for founders. Instead of a long chat thread, ideas live on a canvas where they can be arranged, connected and worked through with AI.",
    "facts": [("Type", "Product concept"), ("Status", "Concept: brief written"), ("My role", "Product owner")],
    "ctas": [],
    "hero": None,
    "sections": [
      ("text", "The idea", ["Founders think in maps: markets, users, features and risks that all connect. Chat tools force that into a single line of messages. A canvas lets the structure of an idea show."]),
      ("list", "Directions being weighed", ["A sharp first version for indie founders", "A canvas built on tldraw", "Freemium pricing", "Launching to communities such as Product Hunt and Indie Hackers"]),
      ("open", "Open questions", ["Which single founder task the first version should nail", "How AI shows up on the canvas without cluttering it"]),
      ("missing",),
    ],
  },  # ------------------------------------------------------------------ UI/UX
  {
    "id": "fintech", "stage": "concepts", "title": "FinTech and Banking Interfaces", "status": "explore", "cats": ["uiux", "apps"],
    "desc": "UI/UX explorations for money products: dashboards, transactions, accounts, authentication and alerts.",
    "tagline": "Interfaces that earn trust with money.",
    "lede": "A series of interface explorations for financial products: banking dashboards, transaction layouts, account management, authentication and everyday workflows, built with AI assistance and designed for Nigerian users first. These are design and front end studies. I have not built a bank, a payment processor or production banking infrastructure.",
    "facts": [("Type", "UI/UX and product exploration"), ("My role", "UI/UX design and front end, built with AI assistance")],
    "ctas": [],
    "hero": None,
    "sections": [
      ("text", "Why it matters", ["Money interfaces have to earn trust quickly. These studies are where I practise clear hierarchy, careful states, form validation and honest numbers."]),
      ("list", "What I explored", ["Banking dashboards and financial data presentation", "Transaction layouts and histories", "Account management", "Authentication and user management interfaces", "Form validation", "Financial product UI/UX"]),
      ("features", "The studies", [
        ("Vault+ balance platform", "A deposit notification interface with separate user and admin panels, Naira formatting and simulated SMS alerts.", True),
        ("Bilingual banking app", "A Korean and English banking app mockup with sign in, a dashboard, alerts and a profile picture picker.", True),
        ("Real backend", "No real money moves anywhere. A backend for Vault+ has not been built.", False),
      ]),
      ("missing",),
    ],
  },
]


# ---------------------------------------------------------------- 3D museum
# The museum reads data/museum.json, generated from this file by build_cases.py, so the
# Classic site and the museum share one source of truth. Rooms and installation styles
# live here; project text comes from CASES / EXISTING above.
MUSEUM_ROOMS = {
    # Steal the Moon is a real Roblox game in active development, so it is exhibited with the
    # main collection; its status stays "dev" (In development), never shown as finished.
    "collection": ["toilet-wars", "haunting-mother", "pitchit", "echomind", "bookverse", "steal-the-moon"],
    "lab": ["ai-studio", "personal-ai", "ai-land", "drawing-board", "fintech"],
    "clients": ["anthony-studios", "zaga", "princess-uc"],
}
# Real project branding found in the project sources. kind "logo" = full logo, "icon" = app or
# game icon. Projects missing here have no official logo; the museum uses their featured image.
MUSEUM_BRAND = {
    "toilet-wars": {"src": "assets/img/toilet-wars/icon.webp", "kind": "icon", "bg": "#0b2a55"},
    "pitchit": {"src": "assets/img/pitchit/logo-full.webp", "kind": "logo", "icon": "assets/img/pitchit/icon.png", "bg": "#f6f1ea"},
    "bookverse": {"src": "assets/img/bookverse/icon.webp", "kind": "icon", "bg": "#2a241f"},
    "zaga": {"src": "assets/img/zaga/logo-white.webp", "kind": "logo", "bg": "#0b0b0c"},
}

MUSEUM_STYLE = {
    "toilet-wars": "plunger", "haunting-mother": "candle", "pitchit": "pin", "echomind": "orbs", "bookverse": "books",
    "steal-the-moon": "moon", "ai-studio": "timeline", "personal-ai": "core", "ai-land": "land", "drawing-board": "board",
    "fintech": "card", "anthony-studios": "frame", "zaga": "frame", "princess-uc": "frame",
}
# The three hand written case pages keep their text in HTML, so their museum facts are listed here
# (copied from those pages: projects/pitchit.html, echomind.html, haunting-mother.html).
MUSEUM_EXISTING = {
    "pitchit": {
        "lede": "PitchIT is a marketplace for every kind of work in Nigeria: farm hands, fish traders, market help, artisans, movers, cleaners, errands and professionals. People who need work done post a job. People who can do it send offers. The customer funds the agreed amount before the work starts.",
        "tech": ["Flutter", "Supabase", "Paystack", "OpenStreetMap"],
        "links": [("Try the demo", "../demo/pitchit/index.html", "demo"), ("PitchIT website", "https://pitchit-ng.netlify.app/", "external")],
        "images": ["assets/img/pitchit/sign-in-400", "assets/img/pitchit/my-jobs-400", "assets/img/pitchit/messages-400", "assets/img/pitchit/profile-400"],
        "phone": True,
    },
    "echomind": {
        "lede": "EchoMind is a journaling and mood app for Android. Check in with how you feel, write freely or from a daily prompt, and look back on everything in your Journey. All of it stays on your phone. There is no account, no subscription and no internet connection.",
        "tech": ["Flutter", "Dart", "SQLite", "Android"],
        "links": [("EchoMind website", "https://echomind-journal.netlify.app/", "external"), ("Android test build", "https://drive.google.com/file/d/11pOpnL2KPW6oT8HNIXUb8hxgN_xKMRUb/view?usp=drive_link", "external")],
        "images": ["assets/img/echomind/home-400", "assets/img/echomind/check-in-400", "assets/img/echomind/insights-400", "assets/img/echomind/journey-400"],
        "phone": True,
    },
    "haunting-mother": {
        "lede": "Haunting Mother is a multiplayer horror puzzle game on Roblox. Players explore three haunted houses, memorize each room against the clock, then have to spot what changed. Best played with friends, in the dark, with the sound up.",
        "tech": ["Roblox Studio", "Luau"],
        "links": [("Play on Roblox", "https://www.roblox.com/games/111171456570495/Haunting-Mother", "play")],
        "images": ["assets/img/haunting-mother/h3-memorize-mothers-bedroom-800", "assets/img/haunting-mother/h1-explore-living-room-800", "assets/img/haunting-mother/h1-what-changed-bedroom-800"],
        "phone": False,
    },
}
# The Creator's Room. Facts match the Classic About, Experience and Contact sections and the CV.
MUSEUM_CREATOR = {
    "name": "David Somadina Obichukwu",
    "handle": "xTc",
    "portrait": "assets/img/portrait/david-1000.webp",
    "email": "obichukwudavid15@gmail.com",
    "cv": "cv/David_Somadina_Obichukwu_CV.pdf",
    "social": [("GitHub", "https://github.com/xTcDevs", "xTcDevs"), ("X", "https://x.com/xtcDev01", "@xtcDev01")],
    "experience": [
        ("Freelance Software Developer and Product Designer", "Self employed, paid client work", "Aug 2026 to present"),
        ("AI Data Annotation Specialist", "Elevate Labs", "Jan 2026 to present"),
        ("IT and Product Technician", "Smile Tech, Lagos, Nigeria", "Jul 2018 to Dec 2020"),
    ],
    "education": [
        ("Undergraduate studies", "Nnamdi Azikiwe University", "In progress"),
        ("Higher Diploma in Software Engineering", "IPMC Ghana", "Apr 2021 to Nov 2025"),
        ("Secondary education", "Anchorage Field Schools, Lagos", "Mar 2018 to Jan 2020"),
    ],
    "skills": {
        "Frontend": ["React", "TypeScript", "JavaScript", "HTML5", "CSS3", "Tailwind CSS"],
        "Mobile": ["Flutter", "Dart"],
        "Design": ["UI/UX design", "Figma", "Prototyping", "Design systems"],
        "AI": ["AI assisted development", "AI response evaluation", "RLHF", "Data annotation"],
        "Games": ["Roblox Studio", "Luau", "Multiplayer systems"],
        "Tools": ["Git", "GitHub", "Supabase", "Firebase", "Python", "FFmpeg"],
    },
    "capabilities": ["software", "product", "ai", "games", "creative"],
}
