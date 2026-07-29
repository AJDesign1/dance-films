# Dance Films Design System

_Last updated: July 2026_

## 1. Purpose

This document defines the core visual direction for Dance Films across:

- the parent portal
- the admin area
- the future marketing website

It is intentionally lightweight. It sets the brand boundaries without prescribing every component or interaction. New UI patterns may be designed as needed, provided they remain consistent with the principles below.

---

## 2. Brand idea

Dance Films captures the excitement, movement and emotion of a live dance show while making professional filming simple for schools and families.

The brand should feel:

- energetic
- modern
- confident
- warm
- polished
- accessible

Avoid visual treatments that feel corporate, cold, childish or overly theatrical.

---

## 3. Brand messaging

### Primary strapline

**Capturing the energy of your dance show.**

Set **“dance show”** in Dance Films Pink when the layout and accessibility allow.

### Supporting line

**Modern dance show filming, made for schools & families.**

### Tone of voice

Use clear, friendly and reassuring language.

Prefer:

- short sentences
- plain English
- confident, helpful instructions
- warm language for parents and families
- efficient, direct language in the admin area

Avoid:

- technical jargon
- exaggerated marketing claims
- overly formal wording
- unnecessary exclamation marks

---

## 4. Logo system

### Primary logo

Use the stacked logo as the default brand mark.

Asset:

`DanceFilms_logo_stacked.svg`

Use it for:

- primary website branding
- prominent landing-page placement
- login and welcome screens
- brand-led communications
- layouts with sufficient vertical space

### Secondary logo

Use the linear logo where horizontal space is more appropriate.

Asset:

`DanceFilms_logo_linear.svg`

Use it for:

- navigation headers
- compact interface areas
- narrow banners
- layouts where the stacked logo would feel too tall

### Logo rules

- Preserve the logo’s original proportions.
- Do not stretch, distort, rotate or redraw it.
- Keep generous clear space around it.
- Do not add shadows, outlines or effects.
- Use the stacked version by default unless the layout clearly favours the linear version.
- Ensure sufficient contrast between the logo and its background.
- Do not place the logo over visually busy imagery.

The current JPEG assets may be replaced later with optimised SVG or transparent PNG versions without changing these usage rules.

---

## 5. Colour palette

### Dance Films Blue

`#232835`

Primary uses:

- main backgrounds
- navigation
- headings
- dark interface surfaces
- body text on light backgrounds

This is the grounding colour of the brand.

### Dance Films Pink

`#E5007E`

Primary uses:

- emphasis
- active states
- selected words within headlines
- links and highlights
- key calls to action
- small graphic accents

Pink should feel intentional and energetic. Avoid using it across large areas unless the design has been checked carefully for readability and visual balance.

### Supporting colours

Supporting neutrals may be introduced as needed for:

- page backgrounds
- borders
- muted text
- disabled states
- cards and panels
- success, warning and error feedback

Any supporting colour should harmonise with the core blue and pink palette. Avoid introducing additional strong brand colours without a clear reason.

### Accessibility

- Check text and interactive-element contrast against WCAG guidance.
- Do not rely on pink alone to communicate status or meaning.
- Pair colour with text, icons or another visual cue.
- Use white or an appropriate light neutral on Dance Films Blue.
- Test pink text carefully, especially at small sizes.

---

## 6. Typography

### Primary typeface

**Montserrat**

Use Montserrat across the marketing site, parent portal and admin area unless a technical constraint requires a system-font fallback.

Suggested fallback:

`Montserrat, Arial, Helvetica, sans-serif`

### Headings

Use bold Montserrat for headlines and important section titles.

Headings should feel:

- clear
- confident
- spacious
- modern

Use strong hierarchy rather than excessive decoration.

### Body copy

Use regular or medium Montserrat for body text.

Body copy should be comfortably readable, with:

- sensible line lengths
- generous line spacing
- clear paragraph separation
- restrained use of bold text

### Emphasis

Use weight, scale and spacing before introducing additional colours or decorative treatments.

Pink may be used selectively to highlight a meaningful word or phrase, including **“dance show”** in the primary strapline.

---

## 7. Background graphic

The gradient background is a signature visual element.

Asset:

`DanceFilms_bg.svg`

### Intended behaviour

- Anchor it to the top-right of the page or section.
- Allow it to scale according to the layout.
- It may appear large and subtle, or smaller and more concentrated.
- It should blend smoothly into the page’s solid background colour.
- It should support the composition without competing with content.
- Important text and controls must remain easy to read.
- Cropping is acceptable when it improves the layout.
- Preserve its overall visual character rather than forcing identical placement on every page.

### Usage guidance

Use it most prominently on:

- marketing hero sections
- login or welcome screens
- key parent-facing moments
- selected admin overview screens

Use it more sparingly within dense, task-focused areas.

The implementation may use an optimised SVG, WebP or another suitable web format. The visual result and performance matter more than preserving a specific file format.

---

## 8. Layout principles

Layouts should feel clean, open and purposeful.

Use:

- clear visual hierarchy
- generous spacing
- simple content groupings
- consistent alignment
- restrained use of decoration
- responsive layouts designed for real device sizes

The parent portal should feel welcoming and easy to navigate.

The admin area should feel efficient and structured while still clearly belonging to the same brand.

The marketing site may be more expressive, but should remain simple and credible.

---

## 9. Imagery and motion

Where photography or video stills are used, favour imagery that communicates:

- movement
- performance energy
- genuine emotion
- real dance environments
- the experience of schools and families

Avoid generic stock imagery where possible.

Motion may be used to reinforce energy, but it should be subtle and purposeful. Respect reduced-motion preferences and avoid effects that slow down or distract from the task.

---

## 10. Product-area expression

### Parent portal

Priorities:

- reassurance
- clarity
- warmth
- simple journeys
- obvious next steps

### Admin area

Priorities:

- efficiency
- information hierarchy
- clear status
- easy scanning
- dependable interaction patterns

### Marketing website

Priorities:

- emotional impact
- clear explanation of the service
- strong brand presence
- trust
- conversion without pressure

All three areas should feel related, not identical.

---

## 11. Guidance for AI designers and developers

Before designing or implementing a screen:

1. Read this document.
2. Inspect existing screens and reuse established patterns where appropriate.
3. Treat the stacked logo as primary and the linear logo as secondary.
4. Use Montserrat, with bold headlines.
5. Use `#232835` and `#E5007E` as the core palette.
6. Use the gradient as a flexible top-right brand element, not a rigid template.
7. Preserve accessibility, legibility and responsive behaviour.
8. Do not invent new strong brand colours without justification.
9. Do not over-design routine product screens.
10. Allow new components and patterns to emerge when the product needs them.

When a new visual pattern becomes established, update this document so it remains the shared source of truth.

---

## 12. Established implementation patterns

Added as real patterns emerged in the product. Implemented in `app/globals.css`.

### Pink on dark surfaces

Dance Films Pink on Dance Films Blue measures **3.25:1** — below the WCAG AA
threshold of 4.5:1 for normal text. A lighter tint is therefore used for pink
text and small pink elements on dark grounds:

`#FF62B0` — **5.35:1** on Dance Films Blue.

This is an accessibility tint, not an additional brand colour. Full-strength
`#E5007E` remains correct on white (4.53:1) and for solid pink buttons with
white text (4.53:1).

Tokens: `--df-pink`, `--df-pink-light`, exposed on dark surfaces as
`--accent-on-dark`.

### Brand surfaces vs school surfaces

The platform is white-label, so brand ownership is split deliberately:

- `[data-app]` — the parent portal. Wears the **school's** colours and fonts,
  loaded from the database at runtime.
- `[data-admin]` / `[data-brand]` — admin area and marketing/holding pages.
  Always wear **Dance Films'** brand, never a school's.

A school theme must never be able to restyle Dance Films' own chrome.

### Gradient scale

Two established sizes, both anchored top-right:

- default — expressive, for brand moments (holding page, marketing heroes)
- `data-brand="compact"` — pulled back, for task-focused screens (admin sign-in)
  so form controls stay clear of it

### Still to be defined

Spacing and sizing tokens, card/panel styles, icon guidance, photography
direction, animation guidance, component examples.
