# Dance Show Platform — Master Brief

**Owner:** Alex Jarvis (Creative Director, Morgans Consult / Andco Studio)
**Status:** V1 planning — pre-design
**Last updated:** 21 July 2026
**Purpose of this file:** Single source of truth for the project. Read this before any design or development work.

---

## 1. What we're building

A **themeable online video platform** that replaces traditional dance-show DVDs/USBs with a premium online viewing experience. Parents buy access to a filmed dance show, then watch the full show and every individual performance online.

The first live instance is for **Liberty Dance Company**, but the platform is **not** a Liberty-only build. Brand identity is swappable by the admin — Liberty is simply the **first theme**. Reskin it (logo, colours, type, imagery) and it becomes any dance school's own platform.

**One-line vision:** A white-label, premium streaming + shop platform for filmed dance shows, launching as Liberty Dance Company.

## 1b. Architecture (domains & admin)

Two clean, separate zones:

- **`dancefilms.co.uk` — public marketing site (Dance Films brand).** Aimed at attracting new dance schools to work with Dance Films. Includes articles/blog and SEO. This is where "Meet the media team"/about content naturally lives.
- **`schoolname.dancefilms.co.uk` — per-school platforms** (e.g. `liberty.dancefilms.co.uk`). Private, **login-first, invite-only**, themed to that school. This is what parents see and log into to watch shows. (A school's own website — e.g. Liberty's "Parent Portal" link — points here.)

**Two-tier admin (kept separate and clean):**

- **Master admin (Dance Films):** manages the marketing site (pages, blog posts/articles, SEO, media, enquiries) **and** provisions schools — create a school, assign its subdomain, configure its branding/theme.
- **School admin (per school):** manages that one school's shows, media/performances, categories, invited parents and users/entitlements.

**V1 assumptions:**
- **Sole admin:** Alex, **ajdesign@hotmail.co.uk** — this account holds full admin rights. The master/school split is structural so schools *could* self-manage later.
- **Marketing site: not designed or built for V1.** It is only to be **considered in the architecture** — i.e. the build must not preclude adding `dancefilms.co.uk` (marketing + blog/SEO) and the master-admin CMS later. Multi-tenant structure (schools as first-class, subdomains, clean separation) makes this straightforward to add.
- **V1 build focus:** the **Liberty school platform** (`liberty.dancefilms.co.uk`) + the admin needed to run it (school setup/branding + shows/media/users).

---

## 2. Core decisions (locked)

### Platform & brand
- Themeable platform driven by **brand tokens**: logo, colours, typography, imagery.
- Admin can change branding so the platform suits any school.
- Liberty is the first theme; the design system itself must be **brand-neutral**.

### Access & accounts (revised — replaces access codes)
- **User accounts**, not access codes. Parents **create an account / log in** — this is more controlled, works across devices, and lets them buy previous shows anytime (a growing personal library).
- **Login-first:** an account is required before seeing any shows. Nothing is public.
- **Invite-only (admin email allowlist):** only emails the admin has approved can access the platform. On login, the entered email is checked against the allowlist *before* any magic link is sent. Not on the list → politely refused ("no invitation found — please contact the school"). Admin adds emails individually or by bulk paste/CSV.
- **Login method: magic link (passwordless)** — approved parent enters email, clicks an emailed one-time link, they're in. No passwords/resets. Lowest friction for non-technical parents. (Handled by Supabase Auth.)
- **Two control layers:** *invite* = permission to enter the platform (admin decides who); *purchase* = permission to watch a specific show (Stripe entitlement).
- **Parent name:** captured **both** ways — the admin *can* add a name alongside the email in the allowlist; if it's missing, the parent is asked once on first sign-in. Used to greet them and in the header account menu.

### Commerce
- Parents buy a **whole show at one price**.
- A purchase unlocks the **full-show video AND every individual performance** in that show.
- **No** per-dance sales and **no** locked cards within a show (V1).
- After login, **one unified shop shows all shows**, each with an **owned → "Watch"** or **not-owned → "Buy"** state. This markets the back-catalogue automatically.
- A purchase creates an **entitlement** (user ↔ show) via a Stripe webhook. **Row-level security** ensures a user can only open shows they own.

### Payments
- **Stripe** is the core payment provider (in-platform, GBP, live/charging).
- PayPal may be added later as a **secondary** payment button.
- Stripe fees (UK, for reference): ~1.5% + 20p per UK card transaction, no monthly fee.
- **Fixed running cost target: ~£0** — Netlify (free, commercial-allowed) + Supabase free tiers; Stripe takes only a per-sale cut.
- **Hosting note:** Vercel's free tier is **non-commercial only**, so it's unsuitable for a paid product without Pro (~£16/mo). **Netlify's free tier allows commercial use** and its 100GB bandwidth cap is a non-issue because Vimeo serves all video. SiteGround **cannot** host this (no Node.js) — it remains the WordPress host for the main Liberty site only.

### Scope
- **Full design** of both the **customer experience** and the **admin** (including theming/branding controls).
- Note: fully designing the admin adds review overhead and pulls some focus off the premium customer experience — accepted trade-off to see the whole picture in one pass.

---

## 3. Customer journey

0. **Entry from main site** — the platform is a **separate, Liberty-branded destination** (likely its own subdomain) that the main website's **"Parent Portal"** link points to. The hand-off should feel continuous with the website even though it's a distinct app.
1. **Create account / log in** (login-first) — branded auth screen; magic-link (passwordless) sign-in. **Default strapline (generic, all schools):** *"Relive the show, whenever you like."* / *"Sign in to watch your dance school's professionally filmed performances — the full show and every dance."*
2. **Shows (unified shop)** — after login: a **bold personalised welcome headline** ("Welcome back, [name]") introduces the page; the header shows an **account menu** (name + sign out), not a sign-in button. Below, all shows with artwork, title, year/date and price; each is **"Watch"** (owned) or **"Buy"** (not owned).
3. **Buy a show → Stripe checkout** (GBP) → on success, an **entitlement** is created linking the account to that show.
4. **Show page** — hero (show artwork, title, date, optional intro), prominently featured **full-show video**, then the **performance library**.
5. **Filters** — flexible, per-show categories/groups (e.g. Minis, Midis, Juniors, Pre-Teens, Seniors, Ballet, Tap, Street, Performance Team). **Not hard-coded.**
6. **Video viewing** — large player, performance title, class/group, and **previous / next / back to show** navigation.

A show's content stays locked until the logged-in account owns it.

---

## 3a. Videographer / platform ownership

The customer experience stays school-forward (Liberty), but the videographer/platform owner is present in two tasteful ways — crediting the work and quietly positioning this as *Alex's* platform that schools plug into (important for the multi-school future):

- **Discreet persistent credit** — "Filmed & delivered by Dance Films" in the footer and on the video viewing screen of each school platform. Present, never competing with the school's brand. Links out to the Dance Films marketing site.
- **"Meet the team" / about content** — now lives on the **Dance Films marketing site** (`dancefilms.co.uk`), not the school platforms. Warm, human, with a headshot + bio of Alex Jarvis. Builds trust and markets the service to future schools.

**Ownership brand:** **Dance Films** (placeholder name) — a dedicated dance-filming brand, Alex Jarvis. Media team page features a headshot-style photo of Alex + a short bio. Still needed: Dance Films logo/mark, final photo, and bio copy.

## 4. Admin (V1) — two tiers, kept separate

> **Design note:** the admin **can** be designed in Claude Design too, since Alex wants that control and the design carries forward as code. It should read as neutral/functional (speed and clarity over brand atmosphere), but built from the same design system tokens.

### Master admin (Dance Films)
Runs the marketing site and holds the **roster** of schools:
- **Marketing content** — pages, **blog posts/articles**, **SEO** (meta titles/descriptions, slugs), media library. *(Deferred — with the marketing site.)*
- **Enquiries/leads** from the marketing contact form. *(Deferred.)*
- **Schools** — a **list** of schools (name, subdomain, status) with **Add school**. Each has a **Configure** button that opens that school's admin. *(No branding form here — that lives in the school admin.)*

### School admin (per school) — reached via "Configure" from the master admin
Manages everything for one school, including its own configuration:
- **Branding & configuration** — subdomain, logo (colour + white), the 4–6 colour palette, font from the shortlist, platform name, imagery, with a **live preview**.
- Shows — artwork, info, price, ordering, publish state.
- Performances (media) — Vimeo references, thumbnails, titles, class/category, ordering.
- Categories / tags / groups (flexible per show).
- **Invited parents (email allowlist)** — add/remove approved emails, individually or bulk paste/CSV; an **optional name** can be added alongside each email.
- Users and their entitlements (which shows an account owns); grant/revoke access and handle refunds.
- Header shows which school is being managed, with a **"← Back to all schools"** link.

---

## 5. Technology stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js** | Responsive, mobile-first |
| Design | **Claude Design** | Initial direction, then Alex refines |
| Development | **Claude Code** | Clean, maintainable web app (no no-code) |
| Version control | **GitHub** | |
| Hosting | **Netlify** | Free tier (commercial use allowed) for V1. *Not Vercel — its free tier is non-commercial.* |
| Backend / DB | **Supabase** | Free tier for V1 |
| Payments | **Stripe** | GBP; PayPal optional later |
| Video | **Vimeo Pro** | All hosting/streaming/encoding/thumbnails; platform uses **embeds only** |

Video files are never hosted or streamed by Netlify/Supabase — the app stores Vimeo references and embeds the player within the branded experience. Configure Vimeo privacy/embed settings so videos are viewed through the platform rather than publicly discovered.

---

## 6. Data model considerations (not final)

Structure to keep flexible, without over-engineering:
- **Schools** (branding config lives here).
- **Shows** (belong to a school; artwork, info, ordering, price).
- **Performances** (belong to a show; Vimeo reference, thumbnail, title, order, category/tag).
- **Categories / tags** (per show, flexible).
- **Invited emails / allowlist** (admin-approved emails permitted to sign up, per school).
- **Users** (Supabase Auth; magic-link login; only allowlisted emails).
- **Entitlements** (user ↔ show — what each account owns/can watch).
- **Orders / payments** (Stripe reference → creates the entitlement via webhook).

Design so **schools** are first-class entities from day one to avoid a rebuild for multi-school later. Enforce access with **row-level security** so users can only read shows they own.

---

## 7. Visual direction

Feel: **premium, cinematic, contemporary, warm, energetic, simple, visually led.**

- A brand-*neutral* system driven by tokens; Liberty shown as the demo theme.
- Showcase artwork, photography and video content.
- Avoid generic SaaS/corporate dashboards and traditional dance-school clichés (no stereotypical ballet silhouettes, excessive pink, sparkles or childish graphics unless part of supplied brand/show art).
- Inspired by premium streaming and modern editorial design — distinctive, not a Netflix clone.
- **Mobile-first** — many parents will use phones.

**Liberty brand assets available:** logo, colours, font, and the new Liberty website (in development) as reference. The platform should read as part of the Liberty brand family.

### Brand reference (from the websites)

- **New dev site:** https://alexj85.sg-host.com/ (WordPress/Elementor build)
- **Old site:** https://liberty-dance.co.uk/
- **Logos (saved in `/brand-assets`):** stacked "block" lockup, both colour and white:
  - `Liberty-logo-colour.svg` — teal logo (uses `#00AFAA` and `#00938E`)
  - `Liberty-logo-white.svg` — all-white version for dark backgrounds
  - Aspect ratio ~327.9 × 176.7 (landscape/stacked).
- **Brand colours (Liberty theme):**
  - Primary / brand: **#13D1C4** (bright teal) — **canonical**
  - Secondary: **#43576E** (slate blue)
  - Logo art currently uses deeper teals (`#00AFAA`, `#00938E`); logo may be nudged to the brighter `#13D1C4` later for perfect alignment. UI uses `#13D1C4`.
- **Typography:** deliberately **generic** — this is a multi-school template. Modern sans-serif only, with the admin choosing from a **small curated, reliable font set** (see Typography strategy below).
- **Tone of voice:** warm, vibrant, inclusive, family/community-led. Taglines: *"Dance, laugh & shine in every step"*, *"Join our dance family"*.
- **Entry:** main site has a **"Parent Portal"** header link — this platform is the linked (separate) destination.

### Typography strategy (multi-school)

Fonts are a themeable token, but restricted to a **short, safe, modern sans-serif shortlist** so any school looks good and nothing breaks. In a Next.js build these load self-hosted (via `next/font`), so they're as reliable as system fonts. Proposed selectable set (final list TBC):

- System UI sans (Arial/Helvetica fallback — the truly safe default)
- Inter
- Poppins
- Montserrat
- Manrope (or DM Sans)

Liberty's default within this set: **TBC** (recommend Poppins or Inter for a warm-but-clean feel). Shortlist approved.

### Real category data (use for filter examples)

These are Liberty's actual groupings — good defaults for the flexible filter system:

- **Age groups:** Minis (3–5), Midis (5–7), Juniors (7–10), Pre-Teens (10–12), Seniors (13+)
- **Elite Performance Team**
- **Styles:** Ballet, Tap, Modern/Jazz, Street/Commercial

---

## 7a. Design tokens & theming (Claude Code handoff)

The UI is finished in Claude Design. When Claude Code builds it, **everything visual must be driven by swappable theme tokens (CSS variables), not hard-coded values** — this is what makes the platform reskinnable per school, and it's *required* for the school-branding admin (colour pickers, font, logo) to actually work.

**Rule:** components reference tokens only — no hard-coded colours, fonts, radii or spacing anywhere. A school's saved branding (stored per school in the DB) is applied at runtime as CSS-variable overrides on that school's subdomain. Liberty is the default token set.

**Token spec:**

- **Colour (4–6 named values):** primary `#13D1C4`, secondary `#43576E`, plus an ink/dark tone, a light/paper tone, and one restrained accent. Semantic roles mapped to these: text, background, surface, border, success/"owned", error.
- **Typography:** display, body and utility faces from the approved shortlist (System sans, Inter, Poppins, Montserrat, Manrope); a defined type scale with intentional weights. Fonts are a token too (per-school selectable).
- **Spacing, radius, elevation:** consistent scales, referenced by token.
- **Logo:** themeable asset — colour + white versions per school.

**Layout:** full-bleed backgrounds and header (edge-to-edge), with page content in a centred max-width container (~1200–1280px) and comfortable padding; mobile goes edge-to-edge with normal padding.

**Multi-tenant theming:** each school's tokens load based on its subdomain (`schoolname.dancefilms.co.uk`), so the same components render as any school's brand.

---

## 8. V1 priorities

Speed and simplicity. V1 must:
1. Provide a branded, **login-first, invite-only** entry with magic-link accounts (only allowlisted emails; login before any shows).
2. Support multiple shows (a growing archive).
3. Let each show carry its own artwork/visual identity within the platform theme.
4. Feature a full-show video.
5. Display individual dance videos.
6. Filter performances by flexible classes/groups.
7. Deliver an excellent Vimeo-based viewing experience.
8. Include previous / next / back navigation.
9. Provide a simple admin for content, theming, users and entitlements.
10. Work excellently on desktop, tablet and mobile.
11. Sell shows via Stripe and unlock the show on the buyer's account automatically (entitlement).
12. Show all shows as a unified shop with owned ("Watch") / not-owned ("Buy") states.

---

## 9. Explicitly out of scope for V1

- **Marketing site** (`dancefilms.co.uk`) + its blog/SEO CMS and the master-admin marketing tools — **not designed or built for V1**; only *considered* in the architecture so it can be added later without a rebuild.
- **Photography galleries** and photo purchasing/downloads (ShootProof-style) — future.
- Multiple **live** school themes (architecture supports it; only Liberty is themed for launch).
- PayPal (Stripe first; PayPal a possible fast-follow).
- ~~Access codes~~ — **superseded** by user accounts (magic-link login) + per-show entitlements.

---

## 10. Open items / to confirm

- Pick Liberty's **default font** from the approved shortlist (Poppins / Inter recommended).
- Confirm show price(s) and currency handling in Stripe.
- Decide video viewing as dedicated page vs modal/overlay (leave to Claude Design, mobile-led).
- Refund / access-revocation handling on the admin side (now entitlement-based).
- **Update the Claude Design prototype:** login-first, magic-link **login** screen (email only, "send me a link") with a **"not invited" state**; unified shop with owned/buy states; add an **admin "invited parents" screen**.
- **Seed the allowlist:** obtain Liberty's parent email list (note consent/GDPR when the school shares it).

---

## 11. Build workflow (decided)

**Design in Claude Design → wire up in Claude Code.** The front-end is crafted fully in Claude Design (where Alex has the most control and enjoys the flow); Claude Code then adds the backend and productionises it **while preserving the design**.

1. **Claude Design (front-end):** design the customer screens *and* the admin here — as much fidelity as Alex wants. Claude Design outputs real front-end code, so this work is **carried forward, not rebuilt**.
   - **Prototype structure:** currently a single interactive prototype with **tabs at the top** switching between screens. Those tabs are a review device only — at handoff, Claude Code turns each screen into a real route (`/login`, `/shows`, `/show/[id]`, etc.) with real navigation. Ensure a **formal design system** (tokens + components) underpins it, not just inline styling, so screens stay consistent and the theme is swappable.
2. **Claude Code (wiring + productionise):** take the Claude Design code and build the real, themeable Next.js app around it — Supabase (schema, Auth/magic-link, entitlements, row-level security), Stripe, Vimeo embeds, maintainability. **Preserve the UI; do not restyle it.**

**Key principle:** Claude Code's job is *not* to redesign. The **frontend-design** skill is there to keep any *new* pieces Code must add (connected states, edge cases, anything not designed in Design) consistent with Alex's look — not to redo finished work.

**What Claude Design can't do (so Code must):** database, access-code logic, Stripe payments, Vimeo data, secure login. The backend layer is unavoidable in code regardless.

**Alternative considered:** full-stack vibe-coding in Lovable (front + back in one tool). Rejected for V1 in favour of Claude Design → Claude Code, for better code control and maintainability as this grows into a multi-school platform.

**UI/UX skills:** install into Claude Code (start with Anthropic `frontend-design`). See separate install guide.

## 12. Next step

Design is done in Claude Design. Move to the **build in Claude Code** using **`Supabase Schema & Claude Code Handoff.md`** (schema, RLS/security, Stripe/Vimeo/subdomain integrations, and build order). Install the `frontend-design` skill first; preserve the finished UI.
