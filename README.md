# Jeff Kerr Portfolio — "The Editorial"

> **Last updated:** Feb 9, 2026 · **Status:** V4 "The Editorial" — **PRODUCTION SITE**

## Active File

**`v4.html`** — The Editorial. This is the live working file.

## File Inventory

| File | What it is | Status |
|---|---|---|
| `v4.html` | **V4 "The Editorial"** — production site | 🔥 **Active** |
| `the_editorial.html` | Locked copy of V4 at launch | ✅ Locked |
| `v4_baseline.html` | V4 pre-video-hero snapshot | ✅ Backup |
| `index.html` | Original live site replica | ✅ Reference |
| `redesign.html` | V2 — previous version | ✅ Archived |
| `v2_refined.html` | V2 snapshot | ✅ Archived |
| `v3_radical.html` | V3 "Screening Room" | ✅ Archived |
| `v3_radical_polished.html` | V3 polished snapshot | ✅ Archived |
| `Videos/` | All project video assets (local) | ✅ 7 projects |

## V4: "The Editorial" — Design System

Inspired by Big Dirty Agency, Wist.chat, and Balky Studio.

**Typography:** Space Grotesk (display) + Inter (body)

**Palette:**
- Cream `#f0ebe0` (light sections)
- Black `#0a0a0a` (dark sections)
- Accent `#e85533` (red-orange)

**Layout:** Cinematic video hero → client strip → numbered project list → about → contact → footer

**Key Features:**
- Full-viewport showreel video playing behind hero text
- Alternating cream/black sections (editorial rhythm)
- Massive condensed uppercase typography
- Numbered asymmetric project layouts (01-07)
- Hover-to-play video on project cards
- Scroll-triggered reveal animations
- About section with animated stat count-ups
- Nav auto-switches dark/light mode per section
- Contact section shimmer text animation + accent line glow

**Contact:** colour8k@mac.com · 407-620-3618

## Recent Changes (Feb 9, 2026)

### Project Card Poster Fixes
Original poster images for cards 2, 3, and 6 had cinematic letterbox bars baked into the files. Clean frames were extracted directly from the source videos:

| Card | Old Poster | New Poster | Source Video |
|---|---|---|---|
| 02 — New Balance | `NBPOSTER.jpg` ❌ bars | `NBPOSTER_clean.jpg` ✅ | `NBQuickLoop2.mp4` |
| 03 — Danny Was Here | `DannyPoster.jpg` ❌ bars | `DannyPoster_clean.jpg` ✅ | `DannyQuickLoop3.mp4` |
| 06 — Justice | Wrong files entirely | `JusticePoster.jpg` ✅ | `JusticeLoop.mp4` |

### Contact Section Micro-Animations
- **Shimmer:** Gradient highlight sweeps left-to-right across "CONTACT" text, pauses ~2.5s, loops
- **Accent line glow:** Light pulse travels down the orange accent line and fades out

## Deployment

The site is a single self-contained HTML file (`v4.html`).
For deployment, rename to `index.html` and push to the GitHub repo connected to Netlify.
Video assets in `Videos/` must be deployed alongside.

## To Resume
1. Open `v4.html` — this is the active working file
2. `the_editorial.html` is the locked launch copy — safe to revert to
3. All copy verified against live jefferykerr.com on Feb 9, 2026
