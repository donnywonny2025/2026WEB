# Foxy Playground — Architecture Guide

> **Last updated:** Feb 15, 2026

A living experiment: a pixel fox powered by Gemini 2.0 Flash that roams your page, thinks out loud, and responds to visitors.

## File Structure

| File | Purpose |
|---|---|
| `playground.html` | HTML skeleton — DOM elements, script tags, world selector |
| `playground.css` | All visual styles including animations, need icons, care popups |
| `foxy-soul.js` | **Persistent memory** — needs system (hunger/thirst/fun/energy), personality traits, session tracking, action history |
| `foxy-body.js` | **Renderer** — canvas sprite system, 8+ animation sets, physics (gravity, throw), motion blur trails |
| `foxy-brain.js` | **AI Engine** — Gemini 2.0 Flash decisions, rate limiter (10/min), moods, chat, need icons, click-to-run, question bubbles |
| `foxy-world.js` | **Environment** — time of day, weather, world state |
| `foxy-buddy.js` | **NPC** — Opossum buddy companion |
| `forest-gen.js` | **Background** — procedural forest generation |

## How It Works

All files share state through `window.Foxy` namespace. No build step, no npm, no modules — just `<script>` tags in order.

**Load order matters:**
1. `foxy-soul.js` — creates `window.Foxy`, initializes needs & personality
2. `foxy-body.js` — sets up canvas, sprites, physics
3. `foxy-world.js` — environment systems
4. `foxy-brain.js` — AI decision engine, starts brain loop
5. `foxy-buddy.js` — spawns buddy NPC

## Key Systems

### Needs & Energy
Foxy has four needs that decay over time:
- **Hunger** — decays at 0.4/tick
- **Thirst** — decays at 0.5/tick
- **Fun** — decays at 0.8/tick
- **Energy** — decays based on activity; faster at night, faster when moving

Energy formula: `(0.6 + curiosity * 0.4) * nightFactor * moveFactor`

### Tamagotchi Care Icons
When needs drop below threshold, clickable emoji icons appear above Foxy:
- 🍖 Hunger (threshold: 40, critical: 15, restores +40)
- 💧 Thirst (threshold: 40, critical: 15, restores +40)
- 💤 Energy (threshold: 35, critical: 15, restores +30)
- 🎾 Fun (threshold: 30, critical: 15, restores +25)

Icons pulse red when critical. Clicking shows a reaction thought + floating green score popup.

### AI Brain (Gemini 2.0 Flash)
- Main decision loop: every **12 seconds**
- Smart thoughts: every **4 seconds**
- Hard rate limit: **10 API calls/minute** (rolling window)
- Every 3rd call is a reflection instead of an action decision
- Reactions to clicks, chat messages, need fulfillment, and world events

### Sleep Cycle
Energy decays naturally. At night, decay is 3x faster. When energy hits 0, Foxy triggers nap/sleep behaviors. The system tracks `session.actionHistory` to determine if Foxy has been active (faster drain) or idle (slower drain).

### Click-to-Run
Clicking anywhere on the page (except UI elements) makes Foxy run to that spot with a cute reaction. The click filter excludes: canvas, buttons, question options, chat, need icons.

### Chat System
Visitors type messages → sent to Gemini with Foxy's personality context → response shown as thought bubble.

### Question Bubbles
Foxy periodically asks visitors questions with multiple-choice answers. Reactions vary based on the answer chosen.

## API Configuration

```javascript
const GEMINI_COOLDOWN = 12000;      // 12s between main brain calls
var SMART_THOUGHT_COOLDOWN = 4000;  // 4s between smart thoughts
const API_MAX_PER_MINUTE = 10;      // hard cap, rolling window
```

**Console monitoring:**
- Needs ticker: logs every 5 seconds with emoji status
- API calls: `Foxy.brain.getApiRate()` shows current calls/minute
- Care events: `[Foxy Care] 🍖 hunger fulfilled! (+40)`

## Adding New Features

### New care need
1. Add the need to `foxy-soul.js` needs object
2. Add decay in `decayNeeds()`
3. Add entry to `NEED_THRESHOLDS` in `foxy-brain.js`

### New buddy NPC
1. Create a new file following `foxy-buddy.js` pattern
2. Add script tag to `playground.html`

### New animation
1. Add sprite files to `assets/sunny-land/player/`
2. Add animation entry in `foxy-body.js` anims object

## Design Principles

- **Single responsibility** — each file owns one concern
- **No build step** — open `playground.html` in a browser, done
- **Namespace pattern** — `window.Foxy` is the only global
- **Rate-limited AI** — never exceed free tier API limits
- **Tamagotchi feel** — visitors care for Foxy through interactive icons
