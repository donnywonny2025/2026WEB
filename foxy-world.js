/* ═══════════════════════════════════════════════════════
   FOXY-WORLD.JS — Environment sensing & DOM awareness
   Gathers bounding boxes of all visible elements.
   Depends on: foxy-soul.js (Foxy namespace), foxy-body.js
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const F = window.Foxy;

    /* ─── DOM ELEMENT REFERENCES ─── */

    const headingEl = document.getElementById('headingEl');
    const labelEl = document.getElementById('labelEl');
    const accentLine = document.getElementById('accentLine');
    const subEl = document.getElementById('subEl');

    /* ─── BOUNDING BOX CACHE (updated ~10fps) ─── */

    let worldCache = null;
    let lastWorldUpdate = 0;
    const WORLD_UPDATE_MS = 100; // 10fps

    function safeRect(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    }

    function gatherWorld() {
        const now = Date.now();
        if (worldCache && now - lastWorldUpdate < WORLD_UPDATE_MS) return worldCache;
        lastWorldUpdate = now;

        const W = window.innerWidth;
        const H = window.innerHeight;

        // Gather element positions
        const elements = {};
        if (headingEl) elements.heading = safeRect(headingEl);
        if (labelEl) elements.label = safeRect(labelEl);
        if (accentLine) elements.accentLine = safeRect(accentLine);
        if (subEl) elements.subtitle = safeRect(subEl);

        // Gather front-layer trees
        const treeEls = document.querySelectorAll('.tree-silhouette.layer-front');
        const trees = [];
        treeEls.forEach(t => {
            const r = t.getBoundingClientRect();
            trees.push({ left: r.left, right: r.right, top: r.top, width: r.width, height: r.height, centerX: r.left + r.width / 2 });
        });

        // Count fireflies
        const fireflyCount = document.querySelectorAll('.firefly').length;

        // Gather props
        const propEls = document.querySelectorAll('.foxy-prop');
        const props = [];
        propEls.forEach(p => {
            const r = p.getBoundingClientRect();
            props.push({
                id: p.id,
                type: Array.from(p.classList).find(c => ['house', 'crate', 'sign', 'big-crate'].includes(c)),
                left: r.left,
                right: r.right,
                top: r.top,
                bottom: r.bottom,
                width: r.width,
                height: r.height,
                centerX: r.left + r.width / 2,
                label: p.dataset.label,
                note: p.dataset.note
            });
        });

        // Gather items
        const itemEls = document.querySelectorAll('.foxy-item');
        const items = [];
        itemEls.forEach(i => {
            const r = i.getBoundingClientRect();
            items.push({
                id: i.id,
                type: i.dataset.type,
                label: i.dataset.label,
                centerX: r.left + r.width / 2,
                left: r.left,
                right: r.right
            });
        });

        // Gather buddy
        const buddyEl = document.getElementById('buddy-opossum');
        let buddy = null;
        if (buddyEl) {
            const r = buddyEl.getBoundingClientRect();
            buddy = {
                id: 'opossum',
                centerX: r.left + r.width / 2,
                dist_x: Math.round((r.left + r.width / 2) - (F.body ? F.body.getPosition().x : 0))
            };
        }

        // Foxy's position
        const pos = F.body ? F.body.getPosition() : { x: W / 2, y: H - 140, xPercent: 50 };

        worldCache = {
            screen: { width: W, height: H },
            ground: H - 140,
            elements,
            trees,
            props,
            items,
            buddy,
            fireflyCount,
            foxy: {
                x: pos.x,
                y: pos.y,
                xPercent: pos.xPercent,
                facing: F.body ? F.body.getFacing() : 'right',
                currentAnim: F.body ? F.body.state.currentAnim : 'idle',
            }
        };

        return worldCache;
    }

    /* ─── PROXIMITY HELPERS ─── */

    function getNearby() {
        const w = gatherWorld();
        const fx = w.foxy.x;

        return {
            nearLeftWall: fx < 80,
            nearRightWall: fx > w.screen.width - 120,
            underHeading: w.elements.heading && fx > w.elements.heading.left - 30 && fx < w.elements.heading.right + 30,
            nearTree: w.trees.find(t => Math.abs(fx - t.centerX) < 60) || null,
            nearAccentLine: w.elements.accentLine && Math.abs(w.foxy.y - w.elements.accentLine.top) < 50,
            nearSubtitle: w.elements.subtitle && fx > w.elements.subtitle.left - 20 && fx < w.elements.subtitle.right + 20,
            centerOfScreen: fx > w.screen.width * 0.35 && fx < w.screen.width * 0.65,
            nearProp: w.props.find(p => Math.abs(fx - p.centerX) < 80) || null,
            nearItem: w.items.find(i => Math.abs(fx - i.centerX) < 50) || null,
            nearBuddy: w.buddy && Math.abs(fx - w.buddy.centerX) < 100,
        };
    }

    /* ─── STATE FOR GEMINI PROMPT ─── */

    function getStateForPrompt() {
        const w = gatherWorld();
        const nearby = getNearby();
        const soul = F.soul;

        return {
            foxy: {
                position_x_percent: Math.round(w.foxy.xPercent),
                facing: w.foxy.facing,
                current_animation: w.foxy.currentAnim,
                mood: soul.dominantMood,
                personality: { ...soul.traits },
                needs: { ...soul.needs },
            },
            world: {
                screen_width: w.screen.width,
                screen_height: w.screen.height,
                ground_y: w.ground,
                heading_text: headingEl ? headingEl.textContent : null,
                heading_rect: w.elements.heading || null,
                trees_count: w.trees.length,
                tree_positions: w.trees.map(t => Math.round(t.centerX / w.screen.width * 100)),
                fireflies: w.fireflyCount,
                visible_props: w.props.map(p => ({
                    id: p.id,
                    type: p.type,
                    label: p.label,
                    dist_x: Math.round(p.centerX - w.foxy.x)
                })),
                visible_items: w.items.map(i => ({
                    type: i.type,
                    label: i.label,
                    dist_x: Math.round(i.centerX - w.foxy.x)
                })),
                buddy: w.buddy
            },
            proximity: nearby,
            context: {
                time_alive_seconds: soul.totalPlaytime,
                visits: soul.visits,
                discoveries_count: soul.discoveries.length,
                self_notes: soul.selfNotes.slice(-5),
                dominant_mood: soul.dominantMood,
            }
        };
    }

    /* ─── EXPORT ─── */

    F.world = {
        gather: gatherWorld,
        getNearby,
        getStateForPrompt,
    };

})();
