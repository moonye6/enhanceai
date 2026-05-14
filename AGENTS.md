<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-system -->
# Design System

**Always read [DESIGN.md](./DESIGN.md) before making any visual or UI decision.**

All font choices, colors, spacing, motion, layout, and aesthetic direction are defined there. Do not deviate without explicit user approval. In code review or QA mode, flag any UI code that doesn't match DESIGN.md as a finding.

Key non-negotiables (read DESIGN.md for the full list):
- Fonts: **Fraunces** (display), **Geist** (body), **Geist Mono** (data) — never Inter / Roboto / Space Grotesk
- Accent color: **`#FF6B35`** (dark mode) / **`#E55A24`** (light mode) — never blue / purple gradients
- Dark mode is **default**; light mode is opt-in
- Border radius is **hierarchical** (6/10/16/full) — never uniform bubble-radius
- See `## Anti-Patterns` in DESIGN.md for the AI-slop tells that must be caught in review
<!-- END:design-system -->
