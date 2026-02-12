# Jeff Kerr Portfolio — "The Editorial"

> **Last updated:** Feb 12, 2026 · **Status:** V4 "The Editorial" — **PRODUCTION SITE**

## Active Files

| File | Purpose | Status |
|---|---|---|
| `v4.html` | **V4 "The Editorial"** — main production site | 🔥 **Active** |
| `political.html` | Legal & Political work — private shareable page | 🔥 **Active** |
| `styles.css` | Shared stylesheet (used by both pages) | 🔥 **Active** |
| `main.js` | Main site JavaScript (transitions, interactions) | 🔥 **Active** |

## Archived / Reference Files

| File | What it is |
|---|---|
| `the_editorial.html` | Locked copy of V4 at launch |
| `v4_pre_animations.html` | V4 pre-nav-animations snapshot |
| `v4_baseline.html` | V4 pre-video-hero snapshot |
| `v4_monolith.html.bak` | Monolith backup |
| `index.html` | Original live site replica |
| `redesign.html` / `v2_refined.html` | V2 archived |
| `v3_radical.html` / `v3_radical_polished.html` | V3 archived |
| `kerr-engine.js` | Legacy JS engine |
| `upgrade.css` | Legacy upgrade stylesheet |

## Design System

Inspired by Big Dirty Agency, Wist.chat, and Balky Studio.

**Typography:** Space Grotesk (display) + Inter (body)

**Palette:**
- Cream `#f0ebe0` (light sections)
- Black `#0a0a0a` (dark sections)
- Accent `#e85533` (red-orange)

**Layout:** Cinematic video hero → client strip → numbered project list → about → contact → footer

## Key Features

- Full-viewport showreel video behind hero text with `mix-blend-mode: screen`
- Hero wordmark with slow color flow + light sweep animations
- Alternating cream/black sections (editorial rhythm)
- Massive condensed uppercase typography
- Numbered asymmetric project layouts (01-07)
- Hover-to-play video on project cards
- Project detail overlays with panel wipe transitions (Vimeo/YouTube embeds)
- Scroll-triggered reveal animations
- About section with animated stat count-ups
- Nav auto-switches dark/light mode per section
- Contact section shimmer text animation + accent line glow
- Nav micro-animations: logo shimmer, staggered link glows, CTA sweep

## Pages

### Main Site (`v4.html`)
7 projects: Showreel, New Balance Rome, Danny Was Here TV, CRN, FTC, Justice for Lai Dai Han, Apollo 11

### Legal & Political (`political.html`)
Private portfolio page — shareable on a case-by-case basis. Contains legal/government/advocacy work:
- FTC — LeanSpa (national campaign)
- Justice for Lai Dai Han (documentary)
- Council for Responsible Nutrition (explainer)

Features a "Private Portfolio" confidential notice and links back to the main site.

## Contact Form

The contact form uses **Formspree**. The current endpoint is:
```
https://formspree.io/f/xcolour8k
```

### Formspree Setup
1. Go to [formspree.io](https://formspree.io) and sign in
2. Create a new form → copy the form endpoint ID (e.g. `f/xyzabc123`)
3. Replace `xcolour8k` in `v4.html` line 257 with your real form ID
4. Test by submitting a test message — it will arrive at your Formspree inbox

**Contact:** colour8k@mac.com · 407-620-3618

## Deployment

The site is a set of static files. For deployment:
1. Rename `v4.html` → `index.html`
2. Push to the GitHub repo connected to Netlify
3. Video assets in `Videos/` must be deployed alongside
4. `political.html` deploys as-is (separate URL path)

## Git

- **Remote:** `git@github.com:colour8k/2026WEB.git`
- **Branch:** `main`

## To Resume
1. Open `v4.html` — main active working file
2. `political.html` — legal/political private page
3. `the_editorial.html` — locked launch copy (safe revert point)
4. `v4_pre_animations.html` — revert point before nav animations
