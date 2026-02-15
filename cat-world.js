/* ═══════════════════════════════════════════════════════
   CAT-WORLD.JS — Environment systems
   Ball physics, atmosphere, dust, stars, events, butterfly.
   Depends on: cat-soul.js (Cat namespace)
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const C = window.Cat;

    /* ═══════════════════════════════════════════
       BOUNCING BALL — physics toy (v2: juicy physics)
       Rotation, squash-stretch, spin transfer,
       sub-step integration, rolling, shadow.
       ═══════════════════════════════════════════ */

    C.ball = {
        x: 0, y: 0,
        vx: 0, vy: 0,
        active: false,
        el: null,
        shadowEl: null,
        radius: 5,
        // Physics constants (tuned for 60fps)
        gravity: 0.09,         // was 0.55 at 10fps — divide by ~6
        friction: 0.97,        // ground friction per frame (gentler at 60fps)
        airFriction: 0.9997,   // air drag per frame
        bounceLoss: 0.62,
        // Rotation
        angle: 0,
        angularVel: 0,
        angularDrag: 0.98,
        // Squash-stretch
        scaleX: 1,
        scaleY: 1,
        squashRecovery: 0.15,
        // State
        restTimer: 0,
        spawnTimer: 0,
        hasSpawnedOnce: false,
        bounceCount: 0,
        onGround: false,
        lastBounceTime: 0
    };

    C.spawnBall = function () {
        if (C.ball.active) return;
        const b = C.ball;

        // Create ball element
        if (!b.el) {
            b.el = document.createElement('div');
            b.el.className = 'toy-ball';
            document.body.appendChild(b.el);
        }
        // Create shadow element
        if (!b.shadowEl) {
            b.shadowEl = document.createElement('div');
            b.shadowEl.className = 'toy-ball-shadow';
            document.body.appendChild(b.shadowEl);
        }

        b.x = window.innerWidth * 0.3 + Math.random() * window.innerWidth * 0.4;
        b.y = window.innerHeight * 0.12;
        b.vx = (Math.random() - 0.5) * 2.5;
        b.vy = -0.5 - Math.random() * 1;
        b.angle = 0;
        b.angularVel = (Math.random() - 0.5) * 4;
        b.scaleX = 1;
        b.scaleY = 1;
        b.bounceCount = 0;
        b.onGround = false;
        b.active = true;
        b.restTimer = 0;
        b.hasSpawnedOnce = true;
        b.el.style.display = 'block';
        b.shadowEl.style.display = 'block';
    };

    function updateBall() {
        if (!C.ball.active) return;
        const b = C.ball;
        const W = window.innerWidth;
        const H = window.innerHeight;
        const r = b.radius;

        /* ─── Sub-step integration (2 steps for stability) ─── */
        const SUB_STEPS = 2;
        for (let s = 0; s < SUB_STEPS; s++) {
            b.vy += b.gravity / SUB_STEPS;
            b.vx *= Math.pow(b.airFriction, 1 / SUB_STEPS);
            b.x += b.vx / SUB_STEPS;
            b.y += b.vy / SUB_STEPS;
        }

        // Rotation from horizontal movement
        b.angle += b.angularVel;
        b.angularVel *= b.angularDrag;

        b.onGround = false;

        /* ─── Wall bounces with spin transfer ─── */
        if (b.x < r) {
            b.x = r;
            b.vx = Math.abs(b.vx) * b.bounceLoss;
            b.angularVel += b.vy * 0.15;  // spin from vertical velocity
            triggerBounce(b, 'wall');
        }
        if (b.x > W - r) {
            b.x = W - r;
            b.vx = -Math.abs(b.vx) * b.bounceLoss;
            b.angularVel -= b.vy * 0.15;
            triggerBounce(b, 'wall');
        }
        if (b.y < r) {
            b.y = r;
            b.vy = Math.abs(b.vy) * b.bounceLoss;
            triggerBounce(b, 'ceiling');
        }

        /* ─── Floor bounce — the juiciest one ─── */
        if (b.y > H - r) {
            b.y = H - r;
            const impactSpeed = Math.abs(b.vy);
            b.vy = -Math.abs(b.vy) * b.bounceLoss;

            // Spin transfer: horizontal velocity contributes to angular velocity
            b.angularVel += b.vx * 0.3;
            // Ground friction on horizontal
            b.vx *= b.friction;

            // Kill micro-bounces with eased threshold
            if (Math.abs(b.vy) < 0.25) {
                b.vy = 0;
                b.y = H - r;
                b.onGround = true;
            }

            // Squash-stretch on impact (proportional to impact speed)
            const squashAmt = Math.min(0.45, impactSpeed * 0.04);
            b.scaleX = 1 + squashAmt;
            b.scaleY = 1 - squashAmt;

            triggerBounce(b, 'floor');
        }

        /* ─── Rolling physics when on ground ─── */
        if (b.onGround) {
            // Rolling friction is stronger
            b.vx *= 0.995;
            // Angular velocity from rolling
            b.angularVel = b.vx * 1.5;
            // Very slow balls just stop
            if (Math.abs(b.vx) < 0.04) b.vx = 0;
        }

        /* ─── Squash-stretch recovery (spring back to circle) ─── */
        b.scaleX += (1 - b.scaleX) * b.squashRecovery;
        b.scaleY += (1 - b.scaleY) * b.squashRecovery;

        // Airborne stretch: elongate in direction of travel
        if (!b.onGround && Math.abs(b.vy) > 0.5) {
            const stretchAmt = Math.min(0.2, Math.abs(b.vy) * 0.015);
            b.scaleX += (1 - stretchAmt - b.scaleX) * 0.1;
            b.scaleY += (1 + stretchAmt - b.scaleY) * 0.1;
        }

        /* ─── Rest detection ─── */
        const speed = Math.abs(b.vx) + Math.abs(b.vy);
        if (speed < 0.15 && b.y >= H - r - 2) {
            b.restTimer++;
            if (b.restTimer > 180) {
                b.active = false;
                b.el.style.display = 'none';
                if (b.shadowEl) b.shadowEl.style.display = 'none';
                b.spawnTimer = 150 + Math.floor(Math.random() * 150);
            }
        } else {
            b.restTimer = 0;
        }

        /* ─── Render ball with rotation + squash-stretch ─── */
        b.el.style.left = (b.x - r) + 'px';
        b.el.style.top = (b.y - r) + 'px';
        b.el.style.transform = `rotate(${b.angle.toFixed(1)}deg) scale(${b.scaleX.toFixed(3)}, ${b.scaleY.toFixed(3)})`;

        /* ─── Render shadow (scales with height) ─── */
        if (b.shadowEl) {
            const groundY = H - 2;
            const heightRatio = 1 - Math.min(1, (groundY - b.y) / (H * 0.8));
            const shadowScale = 0.3 + heightRatio * 0.7;
            const shadowOpacity = heightRatio * 0.3;
            b.shadowEl.style.left = (b.x - r * shadowScale) + 'px';
            b.shadowEl.style.top = (groundY - 1) + 'px';
            b.shadowEl.style.width = (r * 2 * shadowScale) + 'px';
            b.shadowEl.style.height = '3px';
            b.shadowEl.style.opacity = shadowOpacity;
        }
    }

    function triggerBounce(b, surface) {
        const now = Date.now();
        if (now - b.lastBounceTime < 60) return; // debounce
        b.lastBounceTime = now;
        b.bounceCount++;
    }

    C.batBall = function (fromX, direction) {
        const b = C.ball;
        b.vx = direction * (1.5 + Math.random() * 1.5);
        b.vy = -(1.5 + Math.random() * 1);
        b.angularVel = direction * (3 + Math.random() * 4);
        b.restTimer = 0;
        b.onGround = false;
        // Impact squash from the bat
        b.scaleX = 0.7;
        b.scaleY = 1.3;
    };

    /* ═══════════════════════════════════════════
       TIME-OF-DAY ATMOSPHERE
       ═══════════════════════════════════════════ */

    const atmosphereEl = document.getElementById('atmosphereOverlay');

    C.getTimeOfDay = function () {
        const h = new Date().getHours();
        if (h >= 22 || h < 6) return 'night';
        if (h >= 6 && h < 12) return 'morning';
        if (h >= 12 && h < 17) return 'afternoon';
        return 'evening';
    };

    C.updateAtmosphere = function () {
        const tod = C.getTimeOfDay();
        switch (tod) {
            case 'night':
                atmosphereEl.style.background = 'radial-gradient(ellipse at 50% 30%, rgba(10, 15, 40, 0.3) 0%, transparent 70%)';
                break;
            case 'morning':
                atmosphereEl.style.background = 'radial-gradient(ellipse at 60% 50%, rgba(255, 160, 60, 0.03) 0%, transparent 60%)';
                break;
            case 'afternoon':
                atmosphereEl.style.background = 'none';
                break;
            case 'evening':
                atmosphereEl.style.background = 'radial-gradient(ellipse at 40% 50%, rgba(60, 80, 160, 0.04) 0%, transparent 60%)';
                break;
        }
        updateNightStars(tod);
    };

    /* ═══════════════════════════════════════════
       NIGHT STARS
       ═══════════════════════════════════════════ */

    let nightStarEls = [];

    function updateNightStars(tod) {
        const shouldShow = (tod === 'night' || tod === 'evening');
        if (shouldShow && nightStarEls.length === 0) {
            const count = 8 + Math.floor(Math.random() * 5);
            for (let i = 0; i < count; i++) {
                const el = document.createElement('div');
                el.className = 'night-star';
                el.textContent = '.';
                el.style.left = (Math.random() * window.innerWidth) + 'px';
                el.style.top = (Math.random() * window.innerHeight * 0.5) + 'px';
                el.style.animationDelay = (Math.random() * 3) + 's';
                el.style.animationDuration = (2 + Math.random() * 3) + 's';
                document.body.appendChild(el);
                nightStarEls.push(el);
            }
        } else if (!shouldShow && nightStarEls.length > 0) {
            nightStarEls.forEach(el => el.remove());
            nightStarEls = [];
        }
    }

    /* ═══════════════════════════════════════════
       AMBIENT DUST MOTES
       ═══════════════════════════════════════════ */

    const dustMotes = [];
    const MAX_DUST = 5;

    C.spawnDustMote = function () {
        if (dustMotes.length >= MAX_DUST) return;
        const el = document.createElement('div');
        el.className = 'dust-mote';
        const mote = {
            el, x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.1 - Math.random() * 0.2,
            life: 300 + Math.floor(Math.random() * 400),
            age: 0
        };
        el.style.left = mote.x + 'px';
        el.style.top = mote.y + 'px';
        el.style.opacity = 0;
        document.body.appendChild(el);
        dustMotes.push(mote);
    };

    function updateDustMotes() {
        for (let i = dustMotes.length - 1; i >= 0; i--) {
            const m = dustMotes[i];
            m.age++;
            m.x += m.vx + Math.sin(m.age * 0.02) * 0.15;
            m.y += m.vy;
            m.el.style.left = m.x + 'px';
            m.el.style.top = m.y + 'px';

            const lifeRatio = m.age / m.life;
            if (lifeRatio < 0.1) {
                m.el.style.opacity = lifeRatio * 10 * 0.12;
            } else if (lifeRatio > 0.8) {
                m.el.style.opacity = (1 - lifeRatio) * 5 * 0.12;
            } else {
                m.el.style.opacity = 0.12;
            }

            if (m.age > m.life || m.y < -10 || m.x < -10 || m.x > window.innerWidth + 10) {
                m.el.remove();
                dustMotes.splice(i, 1);
            }
        }

        if (dustMotes.length < MAX_DUST && Math.random() < 0.02) {
            C.spawnDustMote();
        }
    }

    /* ═══════════════════════════════════════════
       WORLD EVENTS — birds, leaves, shooting stars
       ═══════════════════════════════════════════ */

    C.worldEvents = {
        birdTimer: 450 + Math.floor(Math.random() * 450),
        leafTimer: 600 + Math.floor(Math.random() * 600),
        starTimer: 1200 + Math.floor(Math.random() * 1800),
        activeBird: null,
        activeLeaf: null,
        activeStar: null
    };

    function spawnWorldBird() {
        if (C.worldEvents.activeBird) return;
        const el = document.createElement('div');
        el.className = 'world-bird';
        el.textContent = '>';
        const y = 30 + Math.random() * (window.innerHeight * 0.3);
        el.style.top = y + 'px';
        el.style.left = '-20px';
        document.body.appendChild(el);
        C.worldEvents.activeBird = { el, x: -20, y, speed: 1.5 + Math.random() * 2 };
    }

    function spawnWorldLeaf() {
        if (C.worldEvents.activeLeaf) return;
        const el = document.createElement('div');
        el.className = 'world-leaf';
        el.textContent = '~';
        const x = Math.random() * window.innerWidth;
        el.style.left = x + 'px';
        el.style.top = '-15px';
        document.body.appendChild(el);
        C.worldEvents.activeLeaf = { el, x, y: -15, age: 0 };
    }

    function spawnShootingStar() {
        if (C.worldEvents.activeStar) return;
        const el = document.createElement('div');
        el.className = 'world-star-streak';
        const x = Math.random() * window.innerWidth * 0.7;
        const y = 20 + Math.random() * (window.innerHeight * 0.15);
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.body.appendChild(el);
        C.worldEvents.activeStar = { el, x, y, age: 0 };
    }

    function updateWorldEvents() {
        const we = C.worldEvents;
        we.birdTimer--;
        we.leafTimer--;
        we.starTimer--;

        if (we.birdTimer <= 0 && !we.activeBird) {
            spawnWorldBird();
            we.birdTimer = 450 + Math.floor(Math.random() * 450);
        }
        if (we.leafTimer <= 0 && !we.activeLeaf) {
            spawnWorldLeaf();
            we.leafTimer = 600 + Math.floor(Math.random() * 600);
        }
        const tod = C.getTimeOfDay();
        if (we.starTimer <= 0 && !we.activeStar && (tod === 'night' || tod === 'evening')) {
            spawnShootingStar();
            we.starTimer = 1200 + Math.floor(Math.random() * 1800);
        }

        // Update bird
        if (we.activeBird) {
            const b = we.activeBird;
            b.x += b.speed;
            b.el.style.left = b.x + 'px';
            b.el.style.top = (b.y + Math.sin(b.x * 0.02) * 8) + 'px';
            if (b.x > window.innerWidth + 30) {
                b.el.remove();
                we.activeBird = null;
            }
        }

        // Update leaf
        if (we.activeLeaf) {
            const lf = we.activeLeaf;
            lf.age++;
            lf.x += Math.sin(lf.age * 0.05) * 1.2;
            lf.y += 0.6;
            lf.el.style.left = lf.x + 'px';
            lf.el.style.top = lf.y + 'px';
            lf.el.style.transform = `rotate(${Math.sin(lf.age * 0.08) * 30}deg)`;
            if (lf.y > window.innerHeight + 20) {
                lf.el.remove();
                we.activeLeaf = null;
            }
        }

        // Update shooting star
        if (we.activeStar) {
            const s = we.activeStar;
            s.age++;
            s.x += 8;
            s.y += 4;
            s.el.style.left = s.x + 'px';
            s.el.style.top = s.y + 'px';
            s.el.style.opacity = Math.max(0, 1 - s.age / 20);
            if (s.age > 20) {
                s.el.remove();
                we.activeStar = null;
            }
        }
    }

    /* ═══════════════════════════════════════════
       BUTTERFLY SYSTEM
       ═══════════════════════════════════════════ */

    C.butterfly = null;
    C.butterflyEl = null;
    C.nextButterflyTime = Date.now() + 8000 + Math.random() * 15000;

    const bugEmoji = ['~o~', '*bug*', '-o-', '~.~'];

    C.spawnButterfly = function () {
        if (C.butterfly) return;
        const p = C.platforms[C.cat.platIdx];
        if (!p) return;

        C.butterfly = {
            x: p.left + Math.random() * p.width,
            y: p.y - 40 - Math.random() * 60,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 1.5,
            life: 0,
            maxLife: 80 + Math.random() * 60,
            emoji: bugEmoji[Math.floor(Math.random() * bugEmoji.length)],
        };

        C.butterflyEl = document.createElement('div');
        C.butterflyEl.className = 'butterfly';
        C.butterflyEl.textContent = C.butterfly.emoji;
        C.butterflyEl.style.fontSize = '20px';
        C.butterflyEl.style.position = 'fixed';
        C.butterflyEl.style.zIndex = '49';
        C.butterflyEl.style.pointerEvents = 'none';
        C.butterflyEl.style.transition = 'none';
        document.body.appendChild(C.butterflyEl);
    };

    C.updateButterfly = function () {
        if (!C.butterfly) return;
        C.butterfly.life++;
        C.butterfly.vx += (Math.random() - 0.5) * 0.4;
        C.butterfly.vy += (Math.random() - 0.5) * 0.3;
        C.butterfly.vx = Math.max(-3, Math.min(3, C.butterfly.vx));
        C.butterfly.vy = Math.max(-2, Math.min(2, C.butterfly.vy));
        C.butterfly.x += C.butterfly.vx;
        C.butterfly.y += C.butterfly.vy;

        C.butterfly.x = Math.max(50, Math.min(window.innerWidth - 50, C.butterfly.x));
        C.butterfly.y = Math.max(50, Math.min(window.innerHeight - 200, C.butterfly.y));

        C.butterflyEl.style.left = C.butterfly.x + 'px';
        C.butterflyEl.style.top = C.butterfly.y + 'px';
        C.butterflyEl.style.transform = `rotate(${Math.sin(C.butterfly.life * 0.3) * 15}deg)`;

        if (C.butterfly.life > C.butterfly.maxLife) {
            C.removeButterfly();
        }
    };

    C.removeButterfly = function () {
        if (C.butterflyEl) C.butterflyEl.remove();
        C.butterfly = null;
        C.butterflyEl = null;
        C.nextButterflyTime = Date.now() + 12000 + Math.random() * 20000;
    };

    /* ═══════════════════════════════════════════
       BALL — its own 60fps loop (decoupled from cat's 10fps)
       ═══════════════════════════════════════════ */

    let ballSpawnTick = 0;
    let ballFirstSpawnDone = false;

    function ballLoop() {
        updateBall();

        // Ball spawn logic (runs at 60fps, so adjust timers)
        if (!C.ball.active && C.ball.hasSpawnedOnce) {
            C.ball.spawnTimer--;
            if (C.ball.spawnTimer <= 0) C.spawnBall();
        }
        if (!ballFirstSpawnDone) {
            ballSpawnTick++;
            if (ballSpawnTick > 300) {
                C.spawnBall();
                ballFirstSpawnDone = true;
            }
        }

        requestAnimationFrame(ballLoop);
    }
    // Kick off the ball's independent 60fps loop
    requestAnimationFrame(ballLoop);

    /* ═══════════════════════════════════════════
       RAIN WEATHER SYSTEM
       ═══════════════════════════════════════════ */

    const rain = {
        active: false,
        drops: [],
        splashes: [],
        maxDrops: 80,
        wind: 0,
        windTarget: 1.5,
        intensity: 0,     // 0→1 ramp for fade-in
        containerEl: null,
        lightningTimer: 0,
    };

    C.rain = rain;

    C.toggleRain = function () {
        rain.active = !rain.active;
        if (rain.active) {
            rain.intensity = 0;
            rain.wind = 0;
            rain.windTarget = 1 + Math.random() * 2;
            if (!rain.containerEl) {
                rain.containerEl = document.createElement('div');
                rain.containerEl.id = 'rainContainer';
                rain.containerEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:40;overflow:hidden;';
                document.body.appendChild(rain.containerEl);
            }
            rain.containerEl.style.display = 'block';
            C.showStatus('*ears flatten*', 2000);
        } else {
            // Fade out — clear drops gradually
            rain.intensity = 0;
            rain.drops.forEach(d => { if (d.el) d.el.remove(); });
            rain.drops = [];
            rain.splashes.forEach(s => { if (s.el) s.el.remove(); });
            rain.splashes = [];
            if (rain.containerEl) rain.containerEl.style.display = 'none';
            C.showStatus('*shakes off*', 2000);
        }
    };

    function spawnRainDrop() {
        const el = document.createElement('div');
        el.className = 'rain-drop';
        const W = window.innerWidth;
        const H = window.innerHeight;
        const x = Math.random() * (W + 100) - 50;
        const y = -10 - Math.random() * 60;
        const speed = 12 + Math.random() * 8;
        const length = 10 + Math.random() * 15;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.height = length + 'px';
        el.style.opacity = (0.15 + Math.random() * 0.35) * rain.intensity;
        rain.containerEl.appendChild(el);
        rain.drops.push({ el, x, y, speed, length });
    }

    function spawnSplash(x, y) {
        const el = document.createElement('div');
        el.className = 'rain-splash';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        rain.containerEl.appendChild(el);
        rain.splashes.push({ el, life: 0, maxLife: 8 });
    }

    function updateRain() {
        if (!rain.active) return;
        const W = window.innerWidth;
        const H = window.innerHeight;

        // Ramp up intensity
        if (rain.intensity < 1) rain.intensity = Math.min(1, rain.intensity + 0.008);

        // Wind variation
        rain.wind += (rain.windTarget - rain.wind) * 0.02;
        if (Math.random() < 0.005) rain.windTarget = 0.5 + Math.random() * 3;

        // Spawn drops
        const targetDrops = Math.floor(rain.maxDrops * rain.intensity);
        while (rain.drops.length < targetDrops) {
            spawnRainDrop();
        }

        // Update drops
        for (let i = rain.drops.length - 1; i >= 0; i--) {
            const d = rain.drops[i];
            d.y += d.speed;
            d.x += rain.wind;
            d.el.style.top = d.y + 'px';
            d.el.style.left = d.x + 'px';
            d.el.style.transform = `rotate(${Math.atan2(d.speed, rain.wind) * (180 / Math.PI) - 90}deg)`;

            if (d.y > H - 5) {
                // Splash on landing
                if (Math.random() < 0.3) spawnSplash(d.x, H - 3);
                d.el.remove();
                rain.drops.splice(i, 1);
            }
        }

        // Update splashes
        for (let i = rain.splashes.length - 1; i >= 0; i--) {
            const s = rain.splashes[i];
            s.life++;
            const t = s.life / s.maxLife;
            s.el.style.opacity = (1 - t) * 0.4;
            s.el.style.transform = `scaleX(${1 + t * 2}) scaleY(${1 - t})`;
            if (s.life > s.maxLife) {
                s.el.remove();
                rain.splashes.splice(i, 1);
            }
        }

        // Occasional lightning flash
        rain.lightningTimer--;
        if (rain.lightningTimer <= 0 && rain.intensity > 0.7 && Math.random() < 0.002) {
            const flash = document.createElement('div');
            flash.className = 'screen-flicker';
            flash.style.background = 'rgba(200, 210, 255, 0.08)';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 450);
            rain.lightningTimer = 300; // ~5 sec cooldown at 60fps
        }
    }

    // Rain runs on its own 60fps loop too
    function rainLoop() {
        updateRain();
        requestAnimationFrame(rainLoop);
    }
    requestAnimationFrame(rainLoop);

    /* ═══════════════════════════════════════════
       WORLD SYSTEMS MASTER UPDATER (10fps — cat stuff only)
       ═══════════════════════════════════════════ */

    let worldTick = 0;

    C.updateWorldSystems = function () {
        worldTick++;

        // Ball is now on its own 60fps loop — NOT here anymore

        updateDustMotes();
        updateWorldEvents();

        if (worldTick % 300 === 0) {
            C.updateAtmosphere();
        }
    };

})();
