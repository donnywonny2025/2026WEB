/* ═══════════════════════════════════════════════════════
   FOXY-VFX.JS — Particle effects for Foxy interactions
   Water splashes, food crumbs, dust clouds, impact stars.
   Depends on: foxy-soul.js (Foxy namespace)
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const F = window.Foxy;

    /* ─── VFX CANVAS SETUP ─── */

    const canvas = document.getElementById('vfxCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    /* ─── PARTICLE POOL ─── */

    const particles = [];
    const MAX_PARTICLES = 200;

    function spawn(opts) {
        if (particles.length >= MAX_PARTICLES) return;
        particles.push({
            x: opts.x || 0,
            y: opts.y || 0,
            vx: opts.vx || 0,
            vy: opts.vy || 0,
            gravity: opts.gravity !== undefined ? opts.gravity : 0.15,
            size: opts.size || 4,
            sizeDecay: opts.sizeDecay || 0.02,
            color: opts.color || '#fff',
            alpha: opts.alpha || 1,
            alphaDecay: opts.alphaDecay || 0.02,
            life: opts.life || 60,
            age: 0,
            shape: opts.shape || 'circle', // 'circle', 'square', 'star'
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.15,
            friction: opts.friction || 0.99,
        });
    }

    /* ─── BURST FUNCTIONS ─── */

    function burstEat(x, y) {
        const colors = ['#e74c3c', '#c0392b', '#d35400', '#e67e22', '#f39c12'];
        for (let i = 0; i < 12; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
            const speed = 1.5 + Math.random() * 3;
            spawn({
                x: x + (Math.random() - 0.5) * 20,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: 0.12,
                life: 40 + Math.random() * 30,
                shape: 'square',
                alphaDecay: 0.015,
            });
        }
    }

    function burstDrink(x, y) {
        const colors = ['#3498db', '#2980b9', '#5dade2', '#85c1e9', '#aed6f1'];
        for (let i = 0; i < 15; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
            const speed = 1 + Math.random() * 2.5;
            spawn({
                x: x + (Math.random() - 0.5) * 24,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                size: 2 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: 0.08,
                life: 35 + Math.random() * 25,
                shape: 'circle',
                alphaDecay: 0.02,
            });
        }
    }

    function burstBallKick(x, y) {
        // Impact stars
        const starColors = ['#f1c40f', '#f39c12', '#fff', '#e74c3c'];
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.3;
            const speed = 2 + Math.random() * 3;
            spawn({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                color: starColors[Math.floor(Math.random() * starColors.length)],
                gravity: 0,
                life: 25 + Math.random() * 15,
                shape: 'star',
                alphaDecay: 0.03,
                friction: 0.95,
            });
        }
        // Dust cloud
        burstDust(x, y, 6);
    }

    function burstDust(x, y, count) {
        count = count || 8;
        const colors = ['#8d7b6a', '#a09080', '#c4b5a5', '#d4c5b5'];
        for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
            const speed = 0.5 + Math.random() * 2;
            spawn({
                x: x + (Math.random() - 0.5) * 16,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * 0.5 - 0.5,
                size: 3 + Math.random() * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: 0.02,
                life: 30 + Math.random() * 20,
                shape: 'circle',
                alphaDecay: 0.025,
                sizeDecay: 0.04,
            });
        }
    }

    function burstLand(x, y) {
        burstDust(x, y, 10);
        // Small upward poof
        for (let i = 0; i < 4; i++) {
            spawn({
                x: x + (Math.random() - 0.5) * 30,
                y: y,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -1 - Math.random() * 1.5,
                size: 4 + Math.random() * 3,
                color: '#a09080',
                gravity: 0.03,
                life: 20 + Math.random() * 15,
                shape: 'circle',
                alphaDecay: 0.04,
                sizeDecay: 0.06,
            });
        }
    }

    function burstThrow(x, y) {
        // Impact + dust
        burstDust(x, y, 12);
        // Sparks
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            spawn({
                x: x,
                y: y,
                vx: Math.cos(angle) * (2 + Math.random() * 2),
                vy: Math.sin(angle) * (2 + Math.random() * 2),
                size: 2 + Math.random() * 2,
                color: '#f1c40f',
                gravity: 0.05,
                life: 15 + Math.random() * 10,
                shape: 'star',
                alphaDecay: 0.05,
            });
        }
    }

    /* ─── DRAW SHAPES ─── */

    function drawStar(cx, cy, size, rotation) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? size : size * 0.4;
            if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /* ─── UPDATE + RENDER LOOP ─── */

    function update() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.age++;

            // Physics
            p.vx *= p.friction;
            p.vy *= p.friction;
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;

            // Decay
            p.alpha -= p.alphaDecay;
            p.size -= p.sizeDecay;
            p.rotation += p.rotSpeed;

            // Remove dead particles
            if (p.age > p.life || p.alpha <= 0 || p.size <= 0) {
                particles.splice(i, 1);
                continue;
            }

            // Draw
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;

            if (p.shape === 'star') {
                drawStar(p.x, p.y, p.size, p.rotation);
            } else if (p.shape === 'square') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1;
        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);

    /* ─── PUBLIC API ─── */

    F.vfx = {
        eat: burstEat,
        drink: burstDrink,
        ballKick: burstBallKick,
        dust: burstDust,
        land: burstLand,
        throw: burstThrow,
        particleCount: () => particles.length,
    };

    console.log('[VFX] Particle system ready');
})();
