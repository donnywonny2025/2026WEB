# SEO Guidelines & SOP 
**Jeffery Kerr Portfolio Sites**

This document outlines the standard operating procedure (SOP) and current status for technical SEO across `jefferykerr.com` and its sub-directories (like `/site-political/`).

## 1. Core Meta Tags
Every new page or section must include the following tags in the `<head>`:

- **Title Tag**: Highly specific. `Jeff Kerr — [Specialty / Job Title]`
- **Meta Description**: ~150-160 characters describing the specific focus of the page.
- **Canonical URL**: MUST point to the clean URL (e.g., `https://www.jefferykerr.com/site-political/` instead of `.../index.html`).

## 2. Social & Sharing Tags (Open Graph / Twitter)
When links are shared in iMessage, Slack, LinkedIn, or Twitter, they rely on these:

- `og:type = website`
- `og:title` & `twitter:title`
- `og:description` & `twitter:description`
- `og:image` & `twitter:image`: (Using `https://www.jefferykerr.com/JeffKerr.jpg` currently). Dimensions should be 1200x630.
- `og:url`
- `twitter:card = summary_large_image`

## 3. Structured Data (JSON-LD)
We use schema.org `Person` structured data so Google explicitly understands who the site is about. Every main entry point should have this script block.

```html
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Jeff Kerr",
    ...
}
</script>
```

## 4. Current Status Report
- **Main Site (`/index.html`)**: Pristine. Contains Analytics, Clarity, complete Meta/OG/Twitter tags, Canonical, and JSON-LD structured data. Semantic HTML (H1/H2s) is well structured.
- **Political Site (`/site-political/index.html`)**: Excellent Meta/OG/Twitter tags. However, it is currently **missing the JSON-LD structured data block** and its canonical URL points to exactly `/site-political/index.html` which is fine but could be cleaner as `/site-political/`.

## 5. Adding New Projects (Checklist)
When adding a new video to `index.html` or `site-political/index.html`:
1. Ensure the `<img>` poster tag has a descriptive `alt` attribute (e.g., `alt="New Balance Rome Marathon"`).
2. Ensure the text inside `.project-title` is accurate and legible.
3. No further head-tag adjustments are needed when adding standard portfolio items.
