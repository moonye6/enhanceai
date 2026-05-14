# Design System — enhanceai.online

> **Source of truth for all visual & UI decisions.**
> Read this before changing any UI code. Flag deviations to the user.

## Product Context

- **What this is:** AI image upscaler (4× super-resolution via fal-ai/aura-sr) — drag image, get clean HD output, downloadable.
- **Who it's for:** Prosumer creators — artists, anime fans, game asset upscalers, high-frequency photo restorers. People who spend their work hours inside Procreate / Photoshop / Figma / Blender.
- **Space:** AI image enhancement. Direct competitors: Topaz Gigapixel ($99 one-time), Topaz Photo AI ($199), upscale.media (free + tier), Let's Enhance (subscription), waifu2x (free, anime-only).
- **Project type:** SaaS web app + 100-page SEO content site (hub/spoke).
- **The memorable thing:** *"Modern AI quality, no $99 lock-in."* — Hit price, quality, and accessibility in one sentence. Every design decision serves this.

## Aesthetic Direction

- **Direction:** Industrial Creator Utilitarian
- **Decoration level:** minimal-intentional — subtle (1%) grain texture on hero surfaces, hairline 1px borders, no purple gradients, no icon-in-rounded-square-bg pattern.
- **Mood:** "Lab notebook for AI image work." Like Linear (pre-flat era), Glyphs.app, Procreate's settings panel, Cosmos.so. **Anti-mood:** Stripe / Vercel marketing pages.
- **Reference points:** Linear, Glyphs.app, Procreate, Are.na, Figma's dark settings UI, Cosmos.so.
- **Anti-reference (DO NOT look like):** Topaz Labs, upscale.media, letsenhance.io, every Lemon Squeezy template.

## Typography

```
Display/Hero  → Fraunces (variable serif)
Body          → Geist
UI/Labels     → Geist (same as body, smaller weights)
Data/Tables   → Geist Mono (tabular-nums)
Code          → Geist Mono
```

### Why Fraunces + Geist + Geist Mono

Every competitor uses Inter or similar sans throughout. Serif display creates **editorial / craft tension** with a sans body — the visual signal of "this is for craftspeople, not for B2B." Geist (Vercel, free) is modern but not Inter. Geist Mono pairs naturally and is the right tool for the `/vs/` comparison tables.

### Font Loading

```html
<!-- Fraunces variable: load only opsz + wght axes, subset to latin -->
<link rel="preload" href="https://fonts.gstatic.com/s/fraunces/v33/...latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,700&display=swap">

<!-- Geist + Geist Mono -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
```

Use `font-display: swap`. Subset Fraunces to latin to keep payload under 80KB.

### Type Scale

```
display-xl   72px / 1.05 / -0.02em   Fraunces 500 opsz=144   hero
display-lg   56px / 1.08 / -0.02em   Fraunces 500 opsz=120   page H1
display-md   40px / 1.12 / -0.01em   Fraunces 500 opsz=96    section
heading-lg   28px / 1.25 / -0.01em   Geist 600               sub-section
heading-md   22px / 1.30              Geist 600               article H3
heading-sm   18px / 1.35              Geist 600               UI section
body-lg      18px / 1.55              Geist 400               hero paragraph
body         16px / 1.60              Geist 400               default body
body-sm      14px / 1.50              Geist 400               labels, meta
caption      12px / 1.40              Geist 500               microcopy
mono-md      14px / 1.50              Geist Mono 400          /vs/ data
mono-sm      12px / 1.45              Geist Mono 400          metadata
```

## Color

### Approach

**Restrained dark-mode-default + single warm spike.** 95% of the UI is neutrals; the orange accent is the only saturated color, used exclusively for primary CTA, active links, and brand mark.

### Dark Mode (default)

```css
--bg              : #0E0E10;   /* off-black, slightly warm — never pure #000 */
--bg-elevated     : #17171A;   /* cards, inputs, modals */
--bg-subtle       : #1F1F23;   /* hover states, code blocks */
--border          : #2A2A30;   /* 1px hairline */
--border-strong   : #3A3A42;   /* focused inputs, dividers */

--text            : #F5F5F7;   /* primary text */
--text-muted      : #8A8A95;   /* secondary text, captions */
--text-faint      : #5A5A63;   /* placeholders, disabled */

--accent          : #FF6B35;   /* primary CTA, active state, brand */
--accent-hover    : #FF8454;   /* CTA hover */
--accent-subtle   : rgba(255, 107, 53, 0.12);  /* highlight bg */

--success         : #5FB58A;
--warning         : #E7B05C;
--error           : #E26B6B;
--info            : #6BA8E2;
```

### Light Mode (opt-in via `[data-theme="light"]`)

```css
--bg              : #FAFAF7;   /* warm cream — NOT pure white, NOT slate-50 */
--bg-elevated     : #FFFFFF;
--bg-subtle       : #F2F2EC;
--border          : #E5E5DD;
--border-strong   : #CFCFC4;

--text            : #1A1A1F;   /* near-black, warm-leaning */
--text-muted      : #5A5A60;
--text-faint      : #9A9A9F;

--accent          : #E55A24;   /* slightly darker orange for contrast on cream */
--accent-hover    : #C84818;
--accent-subtle   : rgba(229, 90, 36, 0.10);

--success         : #3F8F66;
--warning         : #B07F2F;
--error           : #B84444;
--info            : #3F7FB8;
```

### Accent Usage Rules

- **Primary CTA only:** "Try free", "Upscale image", "Download HD".
- **Active link** in nav (1 at a time).
- **Brand mark** in logo.
- **NEVER** as background fill on large surfaces.
- **NEVER** as gradient stop.
- **WCAG AA verified:** `#FF6B35` on `#0E0E10` = 5.4:1 (passes large+normal text). `#E55A24` on `#FAFAF7` = 4.6:1 (passes large+normal).

## Spacing

- **Base unit:** 4px
- **Density:** comfortable
- **Scale:** `2 4 8 12 16 24 32 48 64 96 128` (Tailwind: `0.5 1 2 3 4 6 8 12 16 24 32`)

## Layout

- **Approach:** grid-disciplined for content, editorial for hero
- **Grid:** 12 columns, gutter 24px (desktop) / 16px (mobile)
- **Max content widths:**
  - `--width-prose: 680px` — guide articles body
  - `--width-content: 1080px` — landing pages, /vs/ comparison
  - `--width-app: 1280px` — tool page, dashboard
- **Page padding:** 24px mobile / 48px desktop

### Border Radius (hierarchical, NOT uniform)

```
--radius-sm: 6px    /* inputs, small buttons, badges */
--radius-md: 10px   /* cards, dropdowns */
--radius-lg: 16px   /* hero blocks, modals */
--radius-full: 9999px  /* avatars only — NOT for buttons */
```

**Rule:** never apply `--radius-full` to any rectangular CTA. That's bubble-radius slop.

## Motion

- **Approach:** minimal-functional
- **Easing:** `enter` = `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out expo); `exit` = `cubic-bezier(0.4, 0, 1, 1)` (ease-in); `move` = `cubic-bezier(0.45, 0, 0.55, 1)` (ease-in-out)
- **Duration:** micro 80-120ms · short 180ms (default) · medium 280ms · long 400ms
- **Reduced motion:** respect `prefers-reduced-motion: reduce` — disable all `transform` animations, keep opacity transitions only.

### Allowed animations

- Fade-in on scroll (page-load only, not on every interaction)
- Slider drag (60fps, transform only)
- Button hover state transitions (background, transform-scale 1.0→0.98 on active)

### NOT allowed

- Looping float / pulse animations on decorative elements
- Spring-bouncy easings (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- Sliding sections in on scroll (we're a content site, not a portfolio)

## Iconography

- **Library:** Tabler Icons (open source, 2px stroke, geometric)
- **Anti-pattern:** Lucide (overused), Heroicons (Vercel-default), emoji as icons
- **Size:** 16px (inline), 20px (buttons), 24px (section eyebrows)
- **Stroke width:** 1.75-2px — never 1px (too thin on dark bg)

## Component Specs

### Primary Button

```
height:         44px (mobile 48px for touch)
padding:        14px 24px
background:     var(--accent)
color:          #0E0E10  /* near-black on orange — readable */
font:           Geist 600 / 15px / -0.01em
radius:         var(--radius-sm)
border:         none
transition:     180ms ease-out
hover:          background var(--accent-hover), transform translateY(-1px)
active:         transform scale(0.98)
focus-visible:  outline 2px solid var(--accent), outline-offset 2px
```

### Secondary Button

```
background:     transparent
color:          var(--text)
border:         1px solid var(--border-strong)
hover:          background var(--bg-subtle), border var(--text-muted)
```

### Card (hub/spoke content)

```
background:     var(--bg-elevated)
border:         1px solid var(--border)
radius:         var(--radius-md)
padding:        24px
```

### Input / Drag-drop zone

```
background:     var(--bg-elevated)
border:         1.5px dashed var(--border-strong)
radius:         var(--radius-md)
padding:        48px 24px
focus / drag-over:  border-color var(--accent), background var(--accent-subtle)
```

## Anti-Patterns (do NOT do)

A reviewer should flag any of these in PRs. These are the AI-slop tells that prosumer creators recognize instantly.

- ❌ Purple / violet gradients (`from-purple-500 to-indigo-500` etc.)
- ❌ 3-column feature grid with icons-in-rounded-color-square (the Vercel/Linear feature-grid pattern)
- ❌ Small-caps eyebrows above section titles ("CORE TECHNOLOGY", "SIMPLE PROCESS")
- ❌ Centered hero with subtitle + button + secondary button, vertically stacked
- ❌ Gradient CTA buttons
- ❌ `system-ui` / `-apple-system` as the body or display font
- ❌ Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Space Grotesk
- ❌ Bubble-radius on every element (e.g., `rounded-full` on buttons)
- ❌ Decorative gradient blobs / mesh backgrounds
- ❌ Stock photography (Unsplash creators / Pexels SaaS shots)
- ❌ "Built for [persona]" / "Designed for [vertical]" marketing copy
- ❌ Stat cards with single big number + "+50% faster" claims without context
- ❌ Animated checkmarks / sparkles on hero
- ❌ Looping float / pulse animations on non-interactive elements

## Page-Type Specs

### `/` — Tool page (unchanged, lock as primary CTA destination)

- Hero: asymmetric 60/40 split. Left = drag-drop zone (48% width). Right = before/after demo slider at `display-md` size.
- No marketing copy above the fold beyond H1 + 1-line subtitle.
- Pricing / features / FAQ all below fold.

### `/guide/[slug]` — Hub articles (manual, 2500+ words)

- Single column, max-width `--width-prose` (680px).
- `display-lg` H1 in Fraunces, byline / date in `mono-sm`.
- Inline tool widget embed (sticky on scroll for mobile).
- Sidebar TOC on desktop (≥1024px).

### `/upscale/[slug]` & `/restore/[slug]` — Spoke pages (programmatic)

- Single column, max-width `--width-content` (1080px).
- `display-md` H1.
- 3-5 real example pairs (before/after thumbnails, 16:10 each).
- Page-specific FAQ block (use FAQ schema).
- "Try with your own image" CTA → `/` with optional source attribution param.

### `/vs/[slug]` — Comparison pages (deep, 2500+ words)

- Max-width `--width-content`.
- Comparison table uses Geist Mono for numbers (tabular-nums).
- Includes ComparisonTable schema.org markup.
- Hero shows side-by-side identical-input results.

### `/tool/image-quality-inspector` — Free viral tool

- Single-purpose page, no marketing chrome.
- Pure client-side (canvas API), zero upload — shown as a trust badge.
- Result card uses Geist Mono for the readout.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-14 | Initial design system created via /design-consultation | Pivot from generic Inter+purple SaaS to industrial creator-utilitarian. Memorable thing: "Modern AI quality, no $99 lock-in." |
| 2026-05-14 | Dark-mode default, light mode opt-in | 4 main competitors all white+blue. Differentiate via creator-tool DNA (Procreate/Figma/Linear dark). |
| 2026-05-14 | Fraunces + Geist + Geist Mono | Anti-Inter convergence trap. Serif display + sans body = editorial/craft tension. |
| 2026-05-14 | Warm orange `#FF6B35` accent | Anti-blue convergence. Signal "for art, not for finance." |
| 2026-05-14 | Hierarchical border radius | Defeats bubble-radius AI-slop signal. |
