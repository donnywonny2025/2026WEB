/* ═══════════════════════════════════════════════════════
   CAT-WORLD.JS — Environment systems
   Ball physics, atmosphere, dust, stars, events, butterfly.
   Depends on: cat-soul.js (Cat namespace)
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const C = window.Cat;

    /* ═══════════════════════════════════════════
       BOUNCING BALL — physics toy
       ═══════════════════════════════════════════ */

    C.ball = {
        x: 0, y: 0,
        vx: 0, vy: 0,
        active: false,
        el: null,
        radius: 5,
        gravity: 0.8,        // heavy — 10fps needs ~3x normal 60fps gravity
        friction: 0.92,       // strong ground drag so it stops
        airFriction: 0.995,   // very light drag while airborne
        bounceLoss: 0.55,     // loses 45% energy each bounce
        restTimer: 0,
        spawnTimer: 0,
        hasSpawnedOnce: false
    };

    C.spawnBall = function () {
        if (C.ball.active) return;
        if (!C.ball.el) {
            C.ball.el = document.createElement('div');
            C.ball.el.className = 'toy-ball';
            document.body.appendChild(C.ball.el);
        }
        C.ball.x = window.innerWidth * 0.3 + Math.random() * window.innerWidth * 0.4;
        C.ball.y = window.innerHeight * 0.15;
        C.ball.vx = (Math.random() - 0.5) * 10;
        C.ball.vy = -4 - Math.random() * 4;
        C.ball.active = true;
        C.ball.restTimer = 0;
        C.ball.hasSpawnedOnce = true;
        C.ball.el.style.display = 'block';
    };

    function updateBall() {
        if (!C.ball.active) return;
        const b = C.ball;

        b.vy += b.gravity;
        b.vx *= b.airFriction;
        b.x += b.vx;
        b.y += b.vy;

        const W = window.innerWidth;
        const H = window.innerHeight;
        const r = b.radius;

        // Wall bounces
        if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * b.bounceLoss; }
        if (b.x > W - r) { b.x = W - r; b.vx = -Math.abs(b.vx) * b.bounceLoss; }
        if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * b.bounceLoss; }

        // Floor bounce — apply ground friction on horizontal
        if (b.y > H - r) {
            b.y = H - r;
            b.vy = -Math.abs(b.vy) * b.bounceLoss;
            b.vx *= b.friction;   // ground friction only on contact
            // Kill micro-bounces: if upward velocity is tiny, kill it
            if (Math.abs(b.vy) < 1.5) { b.vy = 0; b.y = H - r; }
        }

        const speed = Math.abs(b.vx) + Math.abs(b.vy);
        if (speed < 0.8 && b.y >= H - r - 2) {
            b.restTimer++;
            if (b.restTimer > 40) {
                b.active = false;
                b.el.style.display = 'none';
                b.spawnTimer = 150 + Math.floor(Math.random() * 150);
            }
        } else {
            b.restTimer = 0;
        }

        b.el.style.left = (b.x - r) + 'px';
        b.el.style.top = (b.y - r) + 'px';
    }

    C.batBall = function (fromX, direction) {
        C.ball.vx = direction * (6 + Math.random() * 6);
        C.ball.vy = -(6 + Math.random() * 5);
        C.ball.restTimer = 0;
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
       WORLD SYSTEMS MASTER UPDATER
       ═══════════════════════════════════════════ */

    let worldTick = 0;

    C.updateWorldSystems = function () {
        worldTick++;

        updateBall();

        if (!C.ball.active && C.ball.hasSpawnedOnce) {
            C.ball.spawnTimer--;
            if (C.ball.spawnTimer <= 0) C.spawnBall();
        }
        if (!C.ball.hasSpawnedOnce && worldTick > 300) {
            C.spawnBall();
        }

        updateDustMotes();
        updateWorldEvents();

        if (worldTick % 300 === 0) {
            C.updateAtmosphere();
        }
    };

})();
