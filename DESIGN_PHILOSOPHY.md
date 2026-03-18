# Jeff Kerr Creative — Design & Technical Philosophy

This document serves as the master guide for the aesthetics, technical decisions, and user experience (UX) principles built into `www.jefferykerr.com`. When creating future sites, reference this guide to replicate the high-end, award-winning agency feel (inspired by Stink Studios).

## Core Design Aesthetic
The site is built on a "dark mode premium" aesthetic focusing on high contrast, dynamic color splashes, and hyper-clean typography.
- **Backgrounds:** Deep, rich blacks (`#0a0a0a`) and warm creams (`#f0ebe0`). Total avoidance of stark, blinding whites or artificial jet-blacks (`#000000`).
- **Typography:** Display text uses **Space Grotesk** for an architectural, modern feel with tight letter spacing (`letter-spacing: -2px`). Body text relies on **Inter** for maximum legibility and neutrality.
- **Color Accents:** Vibrant, animated gradients (magenta, cyan, orange, yellow) serve as "energy" across the site, offset by the severe monochrome backgrounds. We never use flat red/blue/green.

## Animation & Interaction
Elements should never just "appear." Everything must have inertia, easing, and physical presence.
- **Scroll Reveals:** As the user scrolls down, grid items fade in and drift upward (`transform: translateY(40px) to 0`). This creates a feeling of depth.
- **Micro-interactions:** Hovering over the floating logo applies a soft bloom (drop-shadow) and expands slightly (`scale(1.08)`). Buttons do not snap; they transition smoothly over `0.3s` using custom cubic-bezier easing (`var(--ease) = cubic-bezier(0.25, 0, 0.25, 1)`).
- **The Splash Screen:** A required buffer to hide initial load jank. We use a high-contrast animated monogram video paired with subtle, sweeping highlight text ("JUST A MOMENT...") using CSS `background-clip: text` and linear gradients to mimic a loading bar without looking generic. The screen only fades once critical fonts and layouts are stable.

## Media Handling (Video & Audio)
The portfolio relies heavily on broadcast-quality video. Our setup ensures instant loading, HD quality, and clean embedding.

### YouTube Integration
- **Forcing HD Playback:** YouTube embeds notoriously default to 360p or 480p on external sites. We bypass this by dynamically injecting `width="1920"` and `height="1080"` into the iframe attributes via our modal script (`main.js`). This tricks the YouTube player into prioritizing the 1080p stream immediately.
- **Clean UI:** We append `?autoplay=1&rel=0&modestbranding=1` to the URLs to auto-start the video without related videos from other channels bleeding into the end screen.

### Vimeo Integration
- **Authentication & Privacy:** High-end agency work (like Biogen or AISC) often uses private, password-protected Vanguard Vimeo links. We extract the exact `h=` hash from the Vimeo URL and inject it dynamically via the format: `https://player.vimeo.com/video/[ID]?h=[HASH]&autoplay=1`.
- **Thumbnail Optimization:** Thumbnails are fetched dynamically via the Vimeo API or YouTube image servers. We use `loading="lazy"` on all `<img src="...">` tags inside the project grid to prevent the browser from blocking the initial page load while fetching 40+ high-definition covers. 

## Structural Organization
- **Separation of Concerns:** The site is heavily modularized. `index.html` holds the commercial and editorial portfolio, while `site-political/index.html` acts as a parallel universe specifically tailored for political clientele.
- **Data Arrays:** Instead of hard-coding 50 massive hidden modals in the HTML, all project metadata (descriptions, roles, video IDs, titles) lives in a clean JavaScript array (`projectData`). When a user clicks a grid tile, a single universal modal overlay grabs the specific index data and populates itself instantly.

---
*Created March 2026. Use this philosophy as the blueprint for extending the JK brand or spinning up new agency prototypes.*
