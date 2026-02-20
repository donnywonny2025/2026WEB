# Architecture — Paul Ingles DMD Site Redesign

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Markup** | HTML5 | Semantic elements, SEO-optimized |
| **Styling** | Vanilla CSS | Custom properties, no preprocessor |
| **Logic** | Vanilla JS | IIFE pattern, no dependencies |
| **Fonts** | Google Fonts | Playfair Display, Outfit, DM Serif Display |
| **Icons** | Inline SVG | Hand-drawn, no icon library |
| **Maps** | Google Maps Embed | iframe in location section |
| **Video** | MP4 (self-hosted) | autoplay, muted, loop, playsinline |
| **Server** | Python http.server (dev) | No build step |
| **Hosting** | TBD | Netlify / Vercel / GitHub Pages |
| **Repo** | GitHub | github.com/donnywonny2025/ingles |

---

## File Structure

```
site_redesign/
├── index.html          # 535 lines — Homepage (all sections)
├── styles.css          # 1809 lines — Complete design system + all component styles
├── main.js             # 242 lines — All interactive behavior
└── images/             # All assets
    ├── *.mp4           # 4 video files (hero, reviews, building, dr-paul)
    ├── *.jpg           # Team photos, stock imagery, screenshots
    ├── *.png           # Logos, brand marks, care credit badges
    └── *.svg           # Tooth logo mark
```

---

## Design System (CSS Custom Properties)

### Colors
```css
--navy: #1c2a35          /* Primary dark */
--navy-deep: #141f28     /* Deepest dark (hero bg) */
--cream: #F2F0EB         /* Primary light */
--cream-warm: #E8E4DD    /* Warm backgrounds */
--sage: #6CB3A6          /* Accent — teal/sage */
--teal-dark: #2A5C53     /* Dark accent */
--charcoal: #3A4A56      /* Body text dark */
--charcoal-mid: #6B7B8A  /* Muted text */
```

### Typography
```css
--font-display: 'Playfair Display', serif    /* Headlines */
--font-body: 'Outfit', sans-serif            /* Body copy */
```

### Spacing & Radius
```css
--section-pad: 96px      /* Section vertical padding */
--container-width: 1120px
--radius: 8px            /* Standard border radius */
--radius-lg: 16px        /* Large cards */
```

### Transitions
```css
--ease: cubic-bezier(.4, 0, .2, 1)
--ease-out-expo: cubic-bezier(.19, 1, .22, 1)
```

---

## CSS Architecture (Table of Contents)

The stylesheet is organized into numbered sections:

| # | Section | Lines | Description |
|---|---------|-------|-------------|
| 0 | Variables | 32-80 | CSS custom properties |
| 1 | Reset & Base | 81-140 | Normalize, typography, utility classes |
| 2 | Components | 141-260 | Buttons, eyebrows, links, scroll reveals |
| 3 | Top Bar | 261-310 | Utility bar (phone, address) |
| 4 | Navigation | 310-460 | Sticky nav, logo, links, hamburger |
| 5 | Hero | 460-700 | Full-viewport hero with video bg |
| 6 | About | 700-800 | Two-column intro section |
| 7 | Reviews | 800-950 | Video background + testimonial cards |
| 8 | Services | 950-1080 | Video + service list with cycling highlight |
| 9 | Resources | 1080-1180 | Three-card resource grid |
| 10 | CTA | 1180-1260 | Call-to-action banner |
| 11 | Location | 1260-1500 | Building video + info cards |
| 12 | Footer | 1500-1700 | Portal cards, info columns, copyright |
| 13 | Responsive | 1700-1809 | Media queries |

---

## JavaScript Architecture

`main.js` uses an IIFE (Immediately Invoked Function Expression) with `'use strict'`. All features are self-contained functions initialized on `DOMContentLoaded`:

| # | Function | Lines | Description |
|---|----------|-------|-------------|
| 1 | `initStickyNav()` | 17-35 | Adds `.scrolled` class on scroll > 20px |
| 2 | `initScrollReveal()` | 37-70 | IntersectionObserver for `[data-reveal]` elements |
| 3 | `initMobileMenu()` | 72-95 | Hamburger toggle for mobile nav |
| 4 | `initHeroParallax()` | 97-120 | Subtle background shift on scroll (desktop only) |
| 5 | `initHeroEntrance()` | 122-132 | Staggered hero element animation |
| 6 | `initBuildingZoom()` | 134-172 | Cinematic zoom on location section scroll |
| 7 | `initServiceCycle()` | 174-226 | Looping service list highlight with hover pause |

### Scroll Reveal System
```html
<!-- Usage in HTML -->
<div data-reveal>          <!-- fade up (default) -->
<div data-reveal="fade">   <!-- fade in -->
<div data-reveal="left">   <!-- slide from left -->
<div data-reveal="right">  <!-- slide from right -->
<div data-reveal-delay="100">  <!-- delay in ms -->
```

---

## Page Sections (index.html)

| # | Section | Element | Key Features |
|---|---------|---------|-------------|
| 1 | Top Bar | `.top-bar` | Phone number, address |
| 2 | Navigation | `nav.navbar` | Sticky, logo, links, book button |
| 3 | Hero | `.hero` | Video bg, animated headline, shimmer text |
| 4 | About | `.about-intro` | Two-column, Dr. Paul bio |
| 5 | Reviews | `.reviews` | Video bg, 3 testimonial cards, Google badge |
| 6 | Services | `.services` | Dr. Paul video + service list with cycling highlight |
| 7 | Resources | `.resources` | 3 cards (Treatments, Forms, Payment) |
| 8 | CTA | `.cta` | "Ready for a Smile You'll Love?" banner |
| 9 | Location | `.location` | Building video + hours/contact/map cards |
| 10 | Footer | `footer` | Logo, portal cards, info columns, copyright |

---

## Animation System

### Hero Entrance
- Elements have `.hero-anim` class with `--hero-delay` CSS variable
- `body.hero-loaded` triggers staggered fade-up via transition-delay

### Text Shimmer
- Uses `background-clip: text` with animated gradient
- `@keyframes textShimmer` moves gradient position
- Applied to eyebrow, "Smile" word, and subtitle

### Hero Glow
- `@keyframes heroGlow` pulses text-shadow on the H1
- Subtle ambient glow effect

### Service Cycle
- JS cycles `.active` class through `.service-item` list
- 3-second intervals with hover pause
- CSS transition handles highlight opacity

### Building Zoom
- Scroll-linked transform scale on the building video
- Triggered when location section enters viewport

---

## Video Assets

| File | Size | Used In | Content |
|------|------|---------|---------|
| `hero-video.mp4` | 19 MB | Hero section bg | Dental scenes montage |
| `reviews-video.mp4` | 5 MB | Reviews section bg | Close-up dental work |
| `building.mp4` | 14 MB | Location section bg | Office exterior |
| `dr-paul-video.mp4` | 691 KB | Services section | Dr. Paul intro |
