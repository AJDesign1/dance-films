# Claude Design — Prompt Library

All the prompts for designing the Dance Show platform in Claude Design, in one place. Copy the block you need. Suggested order: **1 → 2 → 3 → 4 → 5**. Paste follow-ups into the *same* project so everything shares one design system.

---

## 1. Main design brief (the core screens)

> Use to establish the customer-facing platform. *(Already applied — kept here for reference.)*

Design a **premium online video platform** that lets parents buy and watch professionally filmed dance shows — the modern replacement for show DVDs/USBs. Build it as a **themeable white-label system**: logo, colours, typography and imagery are swappable tokens, and **Liberty Dance Company** is the first theme. Present it themed as Liberty, but keep the layouts brand-neutral underneath so it could become any dance school's own platform.

Key screens: **login (magic-link, invite-only)**, **shows/shop** (all shows, each "Watch" if owned or "Buy" if not), **show page** (hero with show artwork + featured full-show video, then a filterable library of individual performance videos), **video viewing** (large embedded Vimeo player, title, class/group, previous/next/back), and **"Meet the media team"** (linked from footer).

Brand: teal `#13D1C4`, slate `#43576E`, warm/vibrant/inclusive tone, modern sans-serif. Feel: premium, cinematic, contemporary, warm, simple, visually led. **Mobile-first.** Avoid generic SaaS and dance-school clichés.

Real filter categories (treat as data, not hard-coded): Minis (3–5), Midis (5–7), Juniors (7–10), Pre-Teens (10–12), Seniors (13+), Elite Performance Team; styles: Ballet, Tap, Modern/Jazz, Street/Commercial.

Footer carries a discreet credit: **"Filmed & delivered by Dance Films."**

---

## 2. Design system setup

> Run this to put the whole prototype on a consistent, swappable foundation before adding more screens.

Set up a proper, reusable **design system** so every screen inherits it and the whole platform can be reskinned by changing the system once (multi-school template; Liberty is the first theme).

Define and name these tokens:

- **Colour:** expand the brand into 4–6 named values, not just two flat ones. Base: teal `#13D1C4`, slate `#43576E`. Add a dark/ink tone, a light/paper tone, and one restrained accent. Define text, background, surface, border and "success/owned" uses.
- **Typography:** a characterful **display** face (show titles, hero), a clean **body** face, and a **utility** face for labels/metadata — from a modern sans set (e.g. Poppins/Inter). Set a clear type scale with intentional weights and spacing.
- **Spacing, radius, elevation:** consistent scales for each.

Then build the **shared components**, all driven by those tokens:

- Buttons (primary / secondary / quiet)
- Email input + magic-link form
- **Show card** with **"Watch"** (owned) and **"Buy"** (not owned) states
- Performance / video card (thumbnail, title, class, play affordance)
- Filter chips (flexible categories)
- Header/nav and footer (footer carries the "Filmed & delivered by Dance Films" credit)
- Modal/overlay (for video viewing)
- Feedback states: empty, error, "link sent", "not invited"

Keep the feel premium, cinematic and warm; design **mobile-first**. Apply this system consistently to all existing screens.

---

## 3. Art direction (push past templated)

> Use if the design feels generic/templated. Distils Anthropic's frontend-design principles.

Act as the design lead at a small studio known for identities that couldn't be mistaken for anyone else's. Treat the current design as a rejected first proposal — too templated. Make deliberate, opinionated choices specific to this brief and take **one real aesthetic risk you can justify**.

- **Ground it in the subject:** the world of live dance performance — the stage, spotlights, curtains, the hush before a number, the energy of a full company. Draw distinctive choices from *that*, not generic streaming/SaaS.
- **Hero as thesis:** open with the most characteristic thing — motion, a performance still, a cinematic frame. Avoid the template hero (centred headline + subtext + button on a flat background).
- **Typography with personality:** deliberate display/body pairing, intentional scale; make the type treatment memorable.
- **Structure means something:** only use numbered markers/eyebrows/dividers if they encode something true (programme order, class groupings).
- **Motion, deliberately:** one orchestrated moment (a load reveal, a scroll unveil of the library, refined hover states), not scattered effects. Respect reduced-motion.
- **Signature element:** decide the one thing the platform is remembered by and spend boldness there; keep everything else quiet.
- **Avoid the AI defaults:** (1) cream + serif + terracotta; (2) near-black + one acid accent; (3) broadsheet hairline rules + zero radius + dense columns.

Return a compact token plan (colour 4–6 hex, type roles, one-line layout per screen, the signature) and review it against this brief — if any part reads like the default you'd produce for any dance/video site, revise it and say what you changed and why. Then rebuild from the revised plan. Quality floor (don't announce it): responsive to mobile, visible keyboard focus, reduced-motion respected.

---

## 4. Login & invite-only access

> Use to make the entry screen login-first, passwordless and invite-only.

Make the entry **login-first** — nothing is visible until signed in.

- The screen takes an **email only** with a "Send me a login link" action (**passwordless magic link**). No password fields, no open sign-up form.
- **Strapline (generic default for all schools):** headline *"Relive the show, whenever you like."* + sub-line *"Sign in to watch your dance school's professionally filmed performances — the full show and every dance."* No school name in the copy — the logo/colours brand the page.
- Access is **invite-only**: only pre-approved parents can get in. Design a clear **"not invited" state** for an email that isn't on the list — e.g. *"We couldn't find an invitation for this email. Please contact Liberty Dance Company to be added."* — plus the **"link sent, check your email"** confirmation state.
- Keep it warm, premium and reassuring — it's the branded first impression.
- **Name capture:** if we don't already have the parent's name, ask for it in a quick one-field step on their **first sign-in**, then continue into the platform.

### 4b. Shows page header (personalisation)

- Add a **bold personalised welcome headline** at the top of the shows page ("Welcome back, Sarah") with a warm supporting line ("Your Liberty Dance Company shows"). Premium and on-brand, not a generic dashboard greeting.
- In the header, replace any "Sign in" button with a **logged-in account menu**: the parent's name (and/or initial/avatar) with a dropdown containing "Sign out" and a placeholder "Account". No sign-in button — the user is always logged in here.

---

## 5. Admin — two separate areas

> Design the admin as **two distinct, clean areas**. Both are neutral and functional (not the premium customer aesthetic) but built from the same design system tokens. Prioritise speed, clarity and few clicks. Desktop-primary, usable on tablet. Persistent left sidebar + main content area, sensible empty states, fast unfussy forms.

### 5a. Master admin (Dance Films)

> **V1 scope:** only the **Schools** part below is needed now (to set up Liberty + its branding). The **Marketing / Blog / SEO / Enquiries** parts are **deferred** — design later, when the marketing site is built. Listed here so the structure is considered.

Runs the marketing site and provisions schools. Sidebar: Dashboard, Marketing (Pages, Blog, SEO), Media library, Enquiries, Schools, Settings.

- **Marketing → Pages:** edit the marketing site's pages (home, services, about, contact) — copy and images.
- **Marketing → Blog:** list of articles with create/edit/publish, draft status, featured image, and per-post **SEO** fields (meta title, description, slug).
- **Media library:** uploaded images/assets for the marketing site.
- **Enquiries:** submissions from the marketing contact form (new-school leads).
- **Schools:** a **list** of schools (name, subdomain, status) with **Add school**. Each row has a **Configure** button that opens that school's admin (branding lives there, not here). Enable/disable.

### 5b. School admin (per school)

Reached via **Configure** from the master admin's schools list. Manages everything for one school, including its config. Sidebar: Dashboard, **Branding & configuration**, Shows, Media (performances), Categories, Invited parents, Users & access. Header shows which school is being managed, with a **"← Back to all schools"** link.

- **Branding & configuration:** the school's theme — subdomain, logo (colour + white), the 4–6 colour palette (pickers), font from a fixed shortlist, platform name, key imagery — with a **live preview** of the school platform.
- **Shows:** list (cover artwork, title, year, price, published/draft, drag-to-reorder) + a show editor (artwork, title, year/date, intro text, price, publish toggle).
- **Media / performances:** within a show, add/edit performances — **Vimeo reference (ID or URL)**, custom thumbnail, title, class/category, optional duration, **drag-to-reorder**; make bulk-adding quick.
- **Categories:** manage flexible class/group tags per show (add, rename, remove, order).
- **Invited parents (email allowlist):** the access gate — approved emails with **add one** and **bulk paste / CSV import**, plus remove; an **optional name** field alongside each email; show status (invited / signed up).
- **Users & access:** registered users; per user see **owned shows (entitlements)** with **grant/revoke** and refund notes.

## 6. Marketing site (Dance Films, public) — LATER, not V1

> **Deferred:** not being designed or built for V1 — kept here so the build accounts for it. Use this prompt when you're ready to create the marketing site (as its own Dance Films-branded project). The public site at `dancefilms.co.uk` — a *separate* zone from the school platforms, built to win new dance schools.

Design a confident, modern public marketing site for **Dance Films** — a premium dance-filming service that gives schools their own branded platform for parents to watch shows. Audience: **dance school owners** (and reassuring to parents). Goal: communicate the offering and **generate enquiries**.

Pages:
- **Home** — strong hero, the value proposition for schools, a **showreel/portfolio** moment, social proof, clear "get in touch" CTA.
- **How it works / Services** — what a school gets (their own branded subdomain, parents log in, buy and watch shows), simply explained.
- **About / Meet the team** — warm and human: headshot + short bio of **Alex Jarvis**, the filming approach.
- **Blog / articles** — an index and article template (for SEO), clean and readable.
- **Contact** — an enquiry form for schools.

This is the Dance Films brand, so it can look distinct from the Liberty/school theme, but keep it premium, cinematic and warm — clearly the same family of craft. **Mobile-first.** (Dance Films brand assets — logo/colours — TBC; use a tasteful placeholder direction for now.)

---

## Notes

- **Two zones, kept separate:** the **school platforms** (`schoolname.dancefilms.co.uk`, prompts 1–5b) are private/invite-only and school-themed; the **marketing site** (`dancefilms.co.uk`, prompt 6) is public and Dance Films-branded.
- **Ownership credit:** each school platform carries a discreet "Filmed & delivered by Dance Films" credit in the footer, linking out to the marketing site. The full "about / meet the team" content lives on the marketing site (prompt 6).
- **Build sequencing:** design everything now for coherence, but build the **Liberty school platform first**; the marketing site + blog/SEO CMS is a **fast-follow**.
- Paste school-platform follow-ups into the **same project** so the shared design system applies. The marketing site can be its own project under the Dance Films brand.
