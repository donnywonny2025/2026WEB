/* ═══════════════════════════════════════════════════════
   CAT-JUICE.JS — Game feel: particles, squash/stretch,
   screen shake, dust trails, impact effects
   
   Applies patterns from:
   - game-design SKILL: ACTION → FEEDBACK → REWARD → REPEAT
   - 2d-games SKILL: squash/stretch, anticipation, follow-through
   - web-games SKILL: object pooling, performance budget
   - game-development SKILL: fixed timestep, collision feedback
   
   Depends on: cat-soul.js (Cat namespace)
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const C = window.Cat;

    /* ═══════════════════════════════════════════
       OBJECT-POOLED PARTICLE SYSTEM
       Pattern: Object Pooling (avoid GC spikes)
       ═══════════════════════════════════════════ */

    const MAX_PARTICLES = 60;
    const pool = [];
    const active = [];

    // Pre-allocate DOM elements once
    function initPool() {
        for (let i = 0; i < MAX_PARTICLES; i++) {
            const el = document.createElement('div');
            el.className = 'juice-particle';
            el.style.position = 'fixed';
            el.style.pointerEvents = 'none';
            el.style.zIndex = '9998';
            el.style.willChange = 'transform, opacity';
            el.style.display = 'none';
            document.body.appendChild(el);
            pool.push({
                el, x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 0, size: 0,
                color: '', type: 'circle', gravity: 0,
                rotation: 0, rotSpeed: 0
            });
        }
    }

    function spawn(x, y, vx, vy, life, size, color, type, gravity) {
        let p;
        if (pool.length > 0) {
            p = pool.pop();
        } else if (active.length > 0) {
            // Recycle oldest
            p = active.shift();
        } else {
            return;
        }
        p.x = x; p.y = y;
        p.vx = vx; p.vy = vy;
        p.life = life; p.maxLife = life;
        p.size = size;
        p.color = color;
        p.type = type || 'circle';
        p.gravity = gravity || 0;
        p.rotation = Math.random() * 360;
        p.rotSpeed = (Math.random() - 0.5) * 8;
        p.el.style.display = 'block';
        p.el.style.borderRadius = type === 'circle' ? '50%' : '2px';
        p.el.style.background = color;
        active.push(p);
    }

    function updateParticles() {
        for (let i = active.length - 1; i >= 0; i--) {
            const p = active[i];
            p.life--;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.97;
            p.rotation += p.rotSpeed;

            const t = p.life / p.maxLife;
            const scale = t * (p.size / 4);
            const alpha = t * t; // quadratic fade for snappy disappear

            p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg) scale(${scale})`;
            p.el.style.opacity = alpha;
            p.el.style.width = '4px';
            p.el.style.height = '4px';

            if (p.life <= 0) {
                p.el.style.display = 'none';
                active.splice(i, 1);
                pool.push(p);
            }
        }
    }

    /* ═══════════════════════════════════════════
       EFFECT EMITTERS
       Pattern: ACTION → FEEDBACK (visible reward)
       ═══════════════════════════════════════════ */

    // Dust puff when cat lands from a jump
    C.juiceLand = function (x, y) {
        const count = 10 + Math.floor(Math.random() * 6);
        for (let i = 0; i < count; i++) {
            const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 1.2;
            const speed = 2 + Math.random() * 4;
            spawn(
                x + (Math.random() - 0.5) * 30, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - 2,
                20 + Math.floor(Math.random() * 15),
                6 + Math.random() * 5,
                `rgba(255,240,220,${0.5 + Math.random() * 0.3})`,
                'circle', 0.08
            );
        }
    };

    // Dust trail when walking/running
    C.juiceStep = function (x, y, direction) {
        if (Math.random() > 0.6) return;
        spawn(
            x + direction * -10 + (Math.random() - 0.5) * 8,
            y + (Math.random() - 0.5) * 6,
            direction * -1 + (Math.random() - 0.5) * 1,
            -0.5 - Math.random() * 1,
            12 + Math.floor(Math.random() * 10),
            4 + Math.random() * 3,
            `rgba(255,240,220,${0.3 + Math.random() * 0.2})`,
            'circle', 0.03
        );
    };

    // Hearts when petted
    C.juicePet = function (x, y) {
        const heartColors = ['#ff6b8a', '#ff8fab', '#ffb3c6', '#e85533', '#ff4466'];
        for (let i = 0; i < 8; i++) {
            spawn(
                x + (Math.random() - 0.5) * 40,
                y - 10,
                (Math.random() - 0.5) * 3,
                -2 - Math.random() * 3,
                25 + Math.floor(Math.random() * 20),
                7 + Math.random() * 5,
                heartColors[Math.floor(Math.random() * heartColors.length)],
                'heart', -0.05
            );
        }
    };

    // Sparkle burst on pounce/catch
    C.juicePounce = function (x, y) {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.4;
            const speed = 3 + Math.random() * 5;
            spawn(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                15 + Math.floor(Math.random() * 12),
                5 + Math.random() * 4,
                `hsl(${20 + Math.random() * 40}, 100%, ${55 + Math.random() * 35}%)`,
                'circle', 0.12
            );
        }
    };

    // Zoomies speed lines
    C.juiceZoom = function (x, y, direction) {
        for (let i = 0; i < 5; i++) {
            spawn(
                x + direction * -12,
                y - 8 + (Math.random() - 0.5) * 24,
                direction * -(5 + Math.random() * 6),
                (Math.random() - 0.5) * 1,
                8 + Math.floor(Math.random() * 6),
                4 + Math.random() * 3,
                `rgba(255,200,100,${0.4 + Math.random() * 0.3})`,
                'streak', 0
            );
        }
    };

    // Ball hit sparks
    C.juiceBallHit = function (x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            spawn(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - 2,
                12 + Math.floor(Math.random() * 8),
                5 + Math.random() * 4,
                `hsl(${15 + Math.random() * 30}, 100%, ${50 + Math.random() * 40}%)`,
                'circle', 0.15
            );
        }
    };

    // Sleep Z's floating up
    C.juiceSleepZ = function (x, y) {
        spawn(
            x + 10 + Math.random() * 5, y - 15,
            0.3 + Math.random() * 0.3,
            -0.5 - Math.random() * 0.3,
            30 + Math.floor(Math.random() * 15),
            5 + Math.random() * 3,
            'rgba(150,180,255,0.3)',
            'circle', -0.01
        );
    };

    // Eating crumbs
    C.juiceEat = function (x, y) {
        for (let i = 0; i < 3; i++) {
            spawn(
                x + (Math.random() - 0.5) * 16,
                y + 5,
                (Math.random() - 0.5) * 1.5,
                -0.5 - Math.random() * 1.5,
                10 + Math.floor(Math.random() * 8),
                2 + Math.random() * 1.5,
                `hsl(${30 + Math.random() * 15}, ${50 + Math.random() * 30}%, ${40 + Math.random() * 20}%)`,
                'square', 0.12
            );
        }
    };

    /* ═══════════════════════════════════════════
       SQUASH & STRETCH
       Pattern: 2D Animation — anticipation + follow-through
       Applied via CSS transform on the cat sprite
       ═══════════════════════════════════════════ */

    let squashX = 1, squashY = 1;
    let targetSX = 1, targetSY = 1;
    const SQUASH_LERP = 0.15; // snappy return to normal

    C.juiceSquash = function (sx, sy) {
        targetSX = sx;
        targetSY = sy;
    };

    function updateSquash() {
        squashX += (targetSX - squashX) * SQUASH_LERP;
        squashY += (targetSY - squashY) * SQUASH_LERP;
        // Always drift back to 1,1
        targetSX += (1 - targetSX) * 0.1;
        targetSY += (1 - targetSY) * 0.1;
        return { x: squashX, y: squashY };
    }

    /* ═══════════════════════════════════════════
       SCREEN SHAKE
       Pattern: 2D Games — short duration (50-200ms),
       diminishing intensity, use sparingly
       ═══════════════════════════════════════════ */

    let shakeIntensity = 0;
    let shakeDuration = 0;
    let shakeTimer = 0;

    C.juiceShake = function (intensity, duration) {
        shakeIntensity = intensity || 3;
        shakeDuration = duration || 8; // ticks at ~60fps update rate
        shakeTimer = 0;
    };

    function updateShake() {
        if (shakeTimer >= shakeDuration) return { x: 0, y: 0 };
        shakeTimer++;
        const decay = 1 - (shakeTimer / shakeDuration);
        const power = shakeIntensity * decay;
        return {
            x: (Math.random() - 0.5) * power * 2,
            y: (Math.random() - 0.5) * power * 2
        };
    }

    /* ═══════════════════════════════════════════
       JUICE UPDATE (runs on rAF, not the 100ms tick)
       Pattern: Render at screen refresh rate,
       decouple from game logic tick
       ═══════════════════════════════════════════ */

    let juiceInitialized = false;

    function juiceLoop() {
        if (!C.nekoEl || !C.nekoEl.isConnected) {
            requestAnimationFrame(juiceLoop);
            return;
        }

        if (!juiceInitialized) {
            initPool();
            juiceInitialized = true;
        }

        // Update particles at screen refresh rate (smooth!)
        updateParticles();

        // Squash & stretch
        const sq = updateSquash();

        // Screen shake
        const sh = updateShake();

        // Apply squash/stretch + shake to cat sprite
        // Preserve the cat's position set by cat-brain.js
        if (C.nekoEl) {
            const baseTransform = C.nekoEl.style.transform || '';
            // Only add juice transforms, don't override position
            C.nekoEl.style.setProperty('--juice-sx', sq.x);
            C.nekoEl.style.setProperty('--juice-sy', sq.y);
            C.nekoEl.style.setProperty('--shake-x', sh.x + 'px');
            C.nekoEl.style.setProperty('--shake-y', sh.y + 'px');
        }

        requestAnimationFrame(juiceLoop);
    }

    // Start juice loop immediately — it's independent from the cat brain tick
    requestAnimationFrame(juiceLoop);

    /* ═══════════════════════════════════════════
       EXPOSE UPDATE FOR WORLD SYSTEMS
       ═══════════════════════════════════════════ */

    C.updateJuice = updateParticles; // Also called from brain tick for logic sync

    console.log('[cat-juice] 🧃 Game juice loaded — particles, squash, shake ready');

})();
