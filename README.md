# Jeff Kerr Portfolio — "The Editorial"

> **Last updated:** Feb 16, 2026 · **Status:** V4 "The Editorial" — **PRODUCTION SITE**

## All Project Files

### Main Site
| File | Purpose | Status |
|---|---|---|
| `index.html` | **V4 "The Editorial"** — main production site | 🔥 **Active** |
| `political.html` | Legal & Political work — private shareable page | 🔥 **Active** |
| `styles.css` | Shared stylesheet (used by both pages) | 🔥 **Active** |
| `main.js` | Main site JavaScript (transitions, interactions) | 🔥 **Active** |

### Political Sub-Site (`site-political/`)
| File | Purpose |
|---|---|
| `site-political/index.html` | Standalone political portfolio page |
| `site-political/styles.css` | Political site styles |
| `site-political/main.js` | Political site JavaScript |

### Foxy Playground (Active)
| File | Purpose |
|---|---|
| `playground.html` | HTML skeleton — Foxy's world, script tags, world selector |
| `playground.css` | Playground styles (world, need icons, care popups) |
| `foxy-soul.js` | Persistent memory, needs (hunger/thirst/fun/energy), personality traits |
| `foxy-body.js` | Canvas renderer, sprite animations, physics, motion blur |
| `foxy-brain.js` | AI decision engine (Gemini 2.0 Flash), rate limiter, moods, need icons |
| `foxy-behaviors.js` | 40+ behavior definitions (zoomies, parkour, eat, drink, sleep, etc.) |
| `foxy-ball.js` | Ball drag-to-throw physics, fetch-and-return sequence |
| `foxy-chat.js` | Chat system, command detection, Gemini conversation |
| `foxy-input.js` | Keyboard, mouse click, and button input handling |
| `foxy-config.js` | API keys and configuration |
| `foxy-vfx.js` | Particle effects (dust, sparkles, ball kicks) |
| `foxy-world.js` | Environment — time of day, weather, world state |
| `foxy-buddy.js` | Opossum buddy NPC |
| `forest-gen.js` | Procedural scene generator (ground tiles, trees, props, fireflies) |

### Foxy Worlds
| File | Purpose |
|---|---|
| `world1.html` | World 1 environment |
| `world2.html` | World 2 environment |
| `world3.html` | World 3 environment |
| `world4.html` | World 4 environment |
| `world4.css` | World 4 styles |
| `meadow-life.js` | Fireflies, shooting stars, clouds — ambient world life |
| `meadow-ambient.js` | Audio ambience (Web Audio API synth + real audio) |

### Cat Playground (Legacy — predecessor to Foxy)
| File | Purpose |
|---|---|
| `cat-soul.js` | Cat persistent memory, bond levels, gift system |
| `cat-world.js` | Cat environment — ball, dust motes, stars, birds, butterflies |
| `cat-brain.js` | Cat sprite system, state machine (15+ states), decision engine |
| `cat-controls.js` | Cat button handlers, click-to-pet, engagement system |
| `cat-juice.js` | Game feel — particles, squash/stretch, screen shake, dust trails |
| `cat-rain.js` | Standalone rain weather system |

### Experiments & Tools
| File | Purpose |
|---|---|
| `marble-test.html` | Marble physics experiment |
| `marble-measure.html` | Marble measurement tool |

### Documentation
| File | Purpose |
|---|---|
| `README.md` | This file — full project documentation |
| `PLAYGROUND.md` | Foxy playground architecture guide |
| `PLAYGROUND_V2_HANDOFF.md` | Legacy Cat → Foxy handoff document |
| `DEPLOY_PLAN.md` | Netlify deployment architecture |

## Foxy — AI Pet Playground

An interactive pixel fox powered by Gemini 2.0 Flash. Foxy lives on `playground.html` and has his own personality, needs, and AI-driven decisions.

### Foxy File Architecture

| File | Purpose |
|---|---|
| `foxy-soul.js` | Persistent memory, needs system, personality traits, session tracking |
| `foxy-body.js` | Canvas renderer, sprite animations, physics, motion blur |
| `foxy-brain.js` | AI decision engine (Gemini 2.0 Flash), rate limiter, moods, need icons |
| `foxy-behaviors.js` | 40+ behavior definitions (extracted from brain) |
| `foxy-ball.js` | Ball physics — drag-to-throw, bounce, fetch-and-return |
| `foxy-chat.js` | Chat system — user messages, commands, Gemini conversation |
| `foxy-input.js` | Input handling — keyboard, mouse, buttons |
| `foxy-vfx.js` | Particle effects system |
| `foxy-world.js` | Environment — time of day, weather, world state |
| `foxy-buddy.js` | Opossum buddy NPC |
| `forest-gen.js` | Procedural scene generator (ground, trees, props, fireflies) |

### How It Works

All files share state through `window.Foxy` namespace. No build step — just `<script>` tags in order.

**Load order:** soul → body → world → vfx → config → behaviors → brain → chat → ball → input → buddy

### Key Systems

- **Needs System:** Hunger, thirst, fun, and energy decay over time. Energy decays faster at night and when moving.
- **Tamagotchi Care Icons:** When needs drop below threshold, clickable emoji icons (🍖💧💤🎾) appear above Foxy's head. Clicking them fulfills the need with a reaction and floating "+N" popup.
- **AI Brain:** Gemini 2.0 Flash makes decisions every 12 seconds. Smart thoughts every 4 seconds. Hard-capped at 10 API calls/minute (rolling window).
- **Sleep Cycle:** Foxy's energy decays based on time of day and activity level. He naps when energy is low.
- **Chat:** Visitors can type messages to Foxy and he responds via Gemini.
- **Click-to-Run:** Click anywhere on the page and Foxy runs to that spot.
- **Question Bubbles:** Foxy asks visitors questions and reacts to their answers.
- **Props:** House, food/water bowls, world decorations.
- **Multi-World:** 4 world environments accessible via buttons.

### API Configuration

- **Model:** Gemini 2.0 Flash (free tier)
- **Rate limit:** 10 requests/minute (hard cap)
- **Main loop cooldown:** 12 seconds
- **Smart thought cooldown:** 4 seconds

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
- Hero background video: `Videos/New_Loop_3.mp4`
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

### Main Site (`index.html`)
7 projects: Showreel, New Balance Rome, Danny Was Here TV, CRN, FTC, Justice for Lai Dai Han, Apollo 11

### Legal & Political (`political.html`)
Private portfolio page — shareable on a case-by-case basis. Contains legal/government/advocacy work:
- FTC — LeanSpa (national campaign)
- Justice for Lai Dai Han (documentary)
- Council for Responsible Nutrition (explainer)

Features a "Private Portfolio" confidential notice and links back to the main site.

### Foxy Playground (`playground.html`)
Interactive AI-driven pixel fox. See "Foxy — AI Pet Playground" section above.

## Contact Form

The contact form uses **Formspree**. The current endpoint is:
```
https://formspree.io/f/xcolour8k
```

### Formspree Setup
1. Go to [formspree.io](https://formspree.io) and sign in
2. Create a new form → copy the form endpoint ID (e.g. `f/xyzabc123`)
3. Replace `xcolour8k` in `index.html` with your real form ID
4. Test by submitting a test message — it will arrive at your Formspree inbox

**Contact:** colour8k@mac.com · 407-620-3618

## Deployment

The site is a set of static files deployed via **Netlify** (auto-deploys on push to `main`).

1. Push to the GitHub repo → Netlify auto-deploys
2. Video assets in `Videos/` must be deployed alongside
3. `political.html` deploys as-is (separate URL path)
4. `playground.html` deploys as-is (linked from nav)

## Git

- **Remote:** `https://github.com/donnywonny2025/2026WEB.git`
- **Branch:** `main`

## Analytics

- **Google Analytics:** Property `G-7TS282S7NM` (jefferykerr)
- **Category:** Arts & Entertainment

## Changelog

### Feb 16, 2026
- **Brain Refactoring:** Broke `foxy-brain.js` (2,199 lines) into 5 focused modules:
  - `foxy-behaviors.js` (793 lines) — all behavior definitions
  - `foxy-ball.js` (233 lines) — ball drag-to-throw physics + fetch-and-return
  - `foxy-chat.js` (200 lines) — chat system + command detection
  - `foxy-input.js` (157 lines) — keyboard, mouse, button controls
  - `foxy-brain.js` (894 lines) — AI decisions, Gemini, UI only
- **Ground Generation:** Added procedural pixel art ground (grass + dirt) via canvas in `forest-gen.js`
- **Ball Fetch:** Foxy now runs to thrown ball, picks it up, carries it back to center

### Feb 15, 2026
- **Foxy AI Responsiveness:** Reduced main brain loop from 30s → 12s, smart thoughts from 8s → 4s
- **API Rate Limiting:** Added hard 10/min rolling window counter on all Gemini calls
- **Sleep Cycle Fix:** Fixed TypeError crash in `decayNeeds` — initialized `session.actionHistory`, energy now decays properly
- **Need Icons (Care System):** Clickable 🍖💧💤🎾 icons appear above Foxy when needs are low. Click to fulfill with reaction + floating score popup
- **Removed Dev Controls:** Stripped Run/Jump/Crouch/Climb/Bonk/AI buttons from playground
- **Hero Video Swap:** Changed main site hero background from `StatQuickLoop.mp4` → `New_Loop_3.mp4`

### Feb 13, 2026
- Dead file cleanup, push to GitHub
- Added Opossum buddy and functional water/food bowls to Foxy world

### Feb 12, 2026
- Synced political site menu, added Playground link
- Removed old political.html duplicates

## To Resume
1. Open `index.html` — main active working file
2. `political.html` — legal/political private page
3. `playground.html` — Foxy's interactive playground
4. Monitor Foxy's needs in browser console (logs every 5 seconds)
5. Test API rate: `Foxy.brain.getApiRate()` in console
