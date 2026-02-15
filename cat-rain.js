/* ═══════════════════════════════════════════
   CAT-RAIN.JS — Standalone rain weather system
   Zero dependencies. Just rain.
   ═══════════════════════════════════════════ */
(function () {
    'use strict';

    const rain = {
        active: false,
        drops: [],
        splashes: [],
        maxDrops: 90,
        wind: 1.5,
        windTarget: 1.5,
        intensity: 0,
        container: null,
    };

    // Create rain container
    function ensureContainer() {
        if (rain.container) return;
        rain.container = document.createElement('div');
        rain.container.id = 'rainContainer';
        rain.container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:40;overflow:hidden;';
        document.body.appendChild(rain.container);
    }

    function spawnDrop() {
        const el = document.createElement('div');
        el.className = 'rain-drop';
        const W = window.innerWidth;
        const x = Math.random() * (W + 80) - 40;
        const y = -10 - Math.random() * 80;
        const speed = 8 + Math.random() * 7;
        const len = 12 + Math.random() * 14;
        el.style.cssText = `position:absolute;width:1.5px;height:${len}px;left:${x}px;top:${y}px;background:linear-gradient(to bottom,transparent,rgba(140,170,220,0.45));border-radius:0 0 2px 2px;opacity:${(0.2 + Math.random() * 0.4) * rain.intensity};`;
        rain.container.appendChild(el);
        rain.drops.push({ el, x, y, speed });
    }

    function spawnSplash(x, y) {
        const el = document.createElement('div');
        el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:4px;height:2px;border-radius:50%;background:rgba(140,170,220,0.3);transform-origin:center bottom;`;
        rain.container.appendChild(el);
        rain.splashes.push({ el, life: 0 });
    }

    function toggle() {
        rain.active = !rain.active;
        ensureContainer();
        if (rain.active) {
            rain.intensity = 0;
            rain.container.style.display = 'block';
            // Cat reaction
            if (window.Cat && window.Cat.showStatus) window.Cat.showStatus('*ears flatten*', 2000);
        } else {
            rain.drops.forEach(d => d.el.remove());
            rain.drops = [];
            rain.splashes.forEach(s => s.el.remove());
            rain.splashes = [];
            rain.container.style.display = 'none';
            if (window.Cat && window.Cat.showStatus) window.Cat.showStatus('*shakes off*', 2000);
        }
    }

    function tick() {
        if (!rain.active) { requestAnimationFrame(tick); return; }

        const W = window.innerWidth;
        const H = window.innerHeight;

        // Ramp up
        if (rain.intensity < 1) rain.intensity = Math.min(1, rain.intensity + 0.01);

        // Wind drift
        rain.wind += (rain.windTarget - rain.wind) * 0.02;
        if (Math.random() < 0.005) rain.windTarget = 0.5 + Math.random() * 3;

        // Spawn drops
        const target = Math.floor(rain.maxDrops * rain.intensity);
        while (rain.drops.length < target) spawnDrop();

        // Move drops
        for (let i = rain.drops.length - 1; i >= 0; i--) {
            const d = rain.drops[i];
            d.y += d.speed;
            d.x += rain.wind;
            d.el.style.top = d.y + 'px';
            d.el.style.left = d.x + 'px';
            // Angle based on wind
            const angle = Math.atan2(d.speed, rain.wind) * (180 / Math.PI) - 90;
            d.el.style.transform = `rotate(${angle}deg)`;

            if (d.y > H - 4) {
                if (Math.random() < 0.25) spawnSplash(d.x, H - 3);
                d.el.remove();
                rain.drops.splice(i, 1);
            }
        }

        // Update splashes
        for (let i = rain.splashes.length - 1; i >= 0; i--) {
            const s = rain.splashes[i];
            s.life++;
            const t = s.life / 10;
            s.el.style.opacity = (1 - t) * 0.3;
            s.el.style.transform = `scaleX(${1 + t * 2}) scaleY(${1 - t})`;
            if (s.life > 10) {
                s.el.remove();
                rain.splashes.splice(i, 1);
            }
        }

        requestAnimationFrame(tick);
    }

    // Wire up the button
    const btn = document.getElementById('btnRain');
    if (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggle();
            btn.style.background = rain.active ? 'rgba(100,150,220,0.3)' : '';
        });
    }

    // Expose for external use
    window.CatRain = { toggle, rain };

    // Start the loop
    requestAnimationFrame(tick);

})();
