/* ═══════════════════════════════════════════
   MEADOW LIFE — Fireflies, shooting stars, clouds
   Self-contained. Just vibes.
   ═══════════════════════════════════════════ */
(function () {
    'use strict';

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    /* ─────────────────────────────────
       FIREFLIES
       ───────────────────────────────── */
    const fireflies = [];
    const MAX_FIREFLIES = 8;
    let fireflyContainer = null;

    function ensureFireflyContainer() {
        if (fireflyContainer) return;
        fireflyContainer = document.createElement('div');
        fireflyContainer.id = 'fireflyContainer';
        fireflyContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:8;overflow:hidden;';
        document.body.appendChild(fireflyContainer);
    }

    function spawnFirefly() {
        ensureFireflyContainer();
        if (fireflies.length >= MAX_FIREFLIES) return;

        const el = document.createElement('div');
        const size = 3 + Math.random() * 3;
        const groundTop = H() * 0.55; // Stay in lower area near grass
        const y = groundTop + Math.random() * (H() * 0.35);

        const fly = {
            el,
            x: Math.random() * W(),
            y: y,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.3,
            size,
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.02 + Math.random() * 0.03,
            brightness: 0,
            driftTimer: 0,
            driftInterval: 60 + Math.floor(Math.random() * 120),
        };

        el.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(200,255,100,0.9), rgba(150,220,50,0.3));
            box-shadow: 0 0 ${size * 2}px rgba(180,255,80,0.4), 0 0 ${size * 4}px rgba(180,255,80,0.15);
            pointer-events: none;
            will-change: transform, opacity;
        `;

        fireflyContainer.appendChild(el);
        fireflies.push(fly);
    }

    function updateFireflies() {
        for (let i = fireflies.length - 1; i >= 0; i--) {
            const f = fireflies[i];

            // Drift direction change
            f.driftTimer++;
            if (f.driftTimer >= f.driftInterval) {
                f.vx = (Math.random() - 0.5) * 0.5;
                f.vy = (Math.random() - 0.5) * 0.3;
                f.driftTimer = 0;
                f.driftInterval = 60 + Math.floor(Math.random() * 120);
            }

            f.x += f.vx;
            f.y += f.vy;

            // Pulse glow
            f.phase += f.pulseSpeed;
            f.brightness = 0.15 + Math.pow(Math.sin(f.phase), 2) * 0.85;

            // Wrap around edges
            if (f.x < -20) f.x = W() + 10;
            if (f.x > W() + 20) f.x = -10;
            if (f.y < H() * 0.3) f.vy = Math.abs(f.vy);
            if (f.y > H() * 0.9) f.vy = -Math.abs(f.vy);

            f.el.style.transform = `translate(${f.x}px, ${f.y}px)`;
            f.el.style.opacity = f.brightness;
        }
    }

    /* ─────────────────────────────────
       SHOOTING STARS
       ───────────────────────────────── */
    let shootingStarContainer = null;

    function ensureShootingStarContainer() {
        if (shootingStarContainer) return;
        shootingStarContainer = document.createElement('div');
        shootingStarContainer.id = 'shootingStarContainer';
        shootingStarContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;overflow:hidden;';
        document.body.appendChild(shootingStarContainer);
    }

    function launchShootingStar() {
        ensureShootingStarContainer();

        const startX = Math.random() * W() * 0.7;
        const startY = Math.random() * H() * 0.3;
        const angle = 15 + Math.random() * 30; // degrees
        const length = 80 + Math.random() * 120;
        const duration = 600 + Math.random() * 400;

        const el = document.createElement('div');
        const rad = angle * Math.PI / 180;

        el.style.cssText = `
            position: absolute;
            left: ${startX}px;
            top: ${startY}px;
            width: ${length}px;
            height: 1.5px;
            background: linear-gradient(to right, transparent, rgba(255,255,255,0.8), white);
            border-radius: 1px;
            transform: rotate(${angle}deg);
            transform-origin: right center;
            opacity: 0;
            box-shadow: 0 0 4px rgba(255,255,255,0.5);
            pointer-events: none;
        `;

        shootingStarContainer.appendChild(el);

        // Animate: appear, streak, fade
        const endX = startX + Math.cos(rad) * length * 3;
        const endY = startY + Math.sin(rad) * length * 3;

        let start = null;
        function animate(ts) {
            if (!start) start = ts;
            const p = (ts - start) / duration;

            if (p >= 1) {
                el.remove();
                return;
            }

            const ease = p < 0.15 ? p / 0.15 : (1 - p) / 0.85;
            const cx = startX + (endX - startX) * p;
            const cy = startY + (endY - startY) * p;

            el.style.left = cx + 'px';
            el.style.top = cy + 'px';
            el.style.opacity = ease * 0.9;

            requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
    }

    function scheduleShootingStar() {
        const delay = 8000 + Math.random() * 20000; // every 8-28 seconds
        setTimeout(() => {
            launchShootingStar();
            scheduleShootingStar();
        }, delay);
    }

    /* ─────────────────────────────────
       WISPY CLOUDS
       ───────────────────────────────── */
    const clouds = [];
    let cloudContainer = null;

    function ensureCloudContainer() {
        if (cloudContainer) return;
        cloudContainer = document.createElement('div');
        cloudContainer.id = 'cloudContainer';
        cloudContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;overflow:hidden;';
        document.body.appendChild(cloudContainer);
    }

    function spawnCloud() {
        ensureCloudContainer();

        const el = document.createElement('div');
        const w = 120 + Math.random() * 200;
        const h = 20 + Math.random() * 30;
        const y = 5 + Math.random() * 30; // top 30% of sky

        const cloud = {
            el,
            x: -w - 10,
            y: y,
            speed: 0.08 + Math.random() * 0.12,
            width: w,
        };

        el.style.cssText = `
            position: absolute;
            top: ${y}%;
            width: ${w}px;
            height: ${h}px;
            background: radial-gradient(ellipse, rgba(200,210,230,0.04) 0%, transparent 70%);
            border-radius: 50%;
            filter: blur(8px);
            pointer-events: none;
            will-change: transform;
        `;

        cloudContainer.appendChild(el);
        clouds.push(cloud);
    }

    function updateClouds() {
        for (let i = clouds.length - 1; i >= 0; i--) {
            const c = clouds[i];
            c.x += c.speed;
            c.el.style.transform = `translateX(${c.x}px)`;

            if (c.x > W() + 50) {
                c.el.remove();
                clouds.splice(i, 1);
            }
        }
    }

    /* ─────────────────────────────────
       MAIN LOOP
       ───────────────────────────────── */
    let frameCount = 0;

    function tick() {
        frameCount++;

        updateFireflies();
        updateClouds();

        // Spawn fireflies very gradually
        if (frameCount < 600 && frameCount % 90 === 0 && fireflies.length < MAX_FIREFLIES) {
            spawnFirefly();
        }

        // Spawn clouds occasionally
        if (frameCount % 600 === 0 && clouds.length < 4) {
            spawnCloud();
        }

        requestAnimationFrame(tick);
    }

    // Kick off
    // Stagger firefly spawns
    for (let i = 0; i < 3; i++) {
        setTimeout(() => spawnFirefly(), i * 800);
    }

    // First cloud after 3 seconds
    setTimeout(spawnCloud, 3000);

    // First shooting star after 5 seconds
    setTimeout(() => {
        launchShootingStar();
        scheduleShootingStar();
    }, 5000);

    requestAnimationFrame(tick);

    window.MeadowLife = { fireflies, clouds, launchShootingStar };
})();
