/* ═══════════════════════════════════════════════════════
   FOXY-BALL.JS — Ball drag-to-throw physics
   Handles grab, drag, release, physics simulation, and Foxy chase.
   Depends on: foxy-soul.js, foxy-body.js, foxy-vfx.js, foxy-brain.js
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const F = window.Foxy;

    var ballEl = document.getElementById('itemBall');
    if (!ballEl) {
        console.log('[BALL] No ball element found, skipping ball physics');
        return;
    }

    var isDragging = false;
    var startX = 0, startY = 0;
    var lastX = 0, lastY = 0;
    var velX = 0, velY = 0;
    var lastTime = 0;
    var W = window.innerWidth;
    var H = window.innerHeight;

    function getXY(e) {
        if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    }

    function onGrab(e) {
        e.preventDefault();
        e.stopPropagation();
        var pt = getXY(e);
        isDragging = true;
        startX = pt.x; startY = pt.y;
        lastX = pt.x; lastY = pt.y;
        velX = 0; velY = 0;
        lastTime = Date.now();
        W = window.innerWidth;
        H = window.innerHeight;

        ballEl.classList.add('dragging');
        ballEl.classList.remove('thrown', 'kicked');

        // Pause AI so it doesn't override ball interaction
        if (F.brain) {
            F.brain.playerTakeover();
            F.brain.showThought('ooh! the ball!');
            F.brain.setMood('playful');
        }
        console.log('[BALL] Grabbed!');
    }

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        var pt = getXY(e);
        var now = Date.now();
        var dt = Math.max(now - lastTime, 1);

        // Track velocity (pixels per ms, scaled up)
        velX = (pt.x - lastX) / dt * 16;
        velY = (pt.y - lastY) / dt * 16;
        lastX = pt.x; lastY = pt.y;
        lastTime = now;

        // Move ball to cursor/finger position
        var pctX = (pt.x / W) * 100;
        var bottomPx = H - pt.y;
        ballEl.style.left = pctX + '%';
        ballEl.style.bottom = bottomPx + 'px';
    }

    function onRelease(e) {
        if (!isDragging) return;
        isDragging = false;
        e.preventDefault();
        var pt = getXY(e);

        ballEl.classList.remove('dragging');

        // VFX at throw origin
        if (F.vfx) {
            F.vfx.ballKick(pt.x, pt.y);
        }

        // Calculate throw power for Foxy's reaction
        var throwDist = Math.sqrt(velX * velX + velY * velY);
        var isBigThrow = throwDist > 3;
        console.log('[BALL] Thrown! vel=' + throwDist.toFixed(1));

        if (F.brain) {
            F.brain.showThought(isBigThrow ? 'BALL!! BIG THROW!!' : 'ball! I see it!');
            F.brain.setMood('playful');
        }

        // ─── PHYSICS SIMULATION ───
        var GRAVITY = 0.6;          // px per frame²
        var BOUNCE_DAMPING = 0.55;  // energy kept per bounce
        var FRICTION = 0.985;       // horizontal drag
        var GROUND = 68;            // ground level in px from bottom
        var MIN_VEL = 0.3;          // stop threshold
        var MAX_BOUNCES = 6;

        // Ball position in pixels (x from left, y from bottom)
        var ballX = pt.x;
        var ballY = H - pt.y;

        // Throw velocity — scale up for satisfying feel
        var physVX = velX * 1.8;
        var physVY = velY * -1.8; // flip because velY is screen-space (down = positive)

        // Give upward impulse if throwing mostly horizontal
        if (physVY < 2) physVY = Math.max(physVY, 4 + Math.abs(physVX) * 0.3);

        var bounceCount = 0;
        var settled = false;

        // Remove CSS transitions — we're driving position manually
        ballEl.style.transition = 'none';

        function physicsTick() {
            if (isDragging || settled) return;

            // Apply gravity (pulls down = reduces bottom)
            physVY -= GRAVITY;

            // Apply friction to horizontal
            physVX *= FRICTION;

            // Update position
            ballX += physVX;
            ballY += physVY;

            // ── Wall bounces ──
            if (ballX < 30) {
                ballX = 30;
                physVX = Math.abs(physVX) * BOUNCE_DAMPING;
            }
            if (ballX > W - 30) {
                ballX = W - 30;
                physVX = -Math.abs(physVX) * BOUNCE_DAMPING;
            }

            // ── Ground bounce ──
            if (ballY <= GROUND) {
                ballY = GROUND;
                bounceCount++;

                // Bounce back up with damping
                physVY = Math.abs(physVY) * BOUNCE_DAMPING;
                physVX *= 0.9; // lose some horizontal on bounce

                // Dust VFX on bounce
                if (F.vfx && physVY > 1.5) {
                    F.vfx.dust(ballX, H - GROUND, Math.min(6, Math.ceil(physVY)));
                }

                // Settle if barely bouncing
                if (physVY < MIN_VEL || bounceCount >= MAX_BOUNCES) {
                    ballY = GROUND;
                    settled = true;
                }
            }

            // ── Ceiling clamp ──
            if (ballY > H - 30) {
                ballY = H - 30;
                physVY = -Math.abs(physVY) * 0.3;
            }

            // ── Apply position to DOM ──
            var pctX = (ballX / W) * 100;
            ballEl.style.left = pctX + '%';
            ballEl.style.bottom = ballY + 'px';

            if (!settled) {
                requestAnimationFrame(physicsTick);
            } else {
                // Ball has settled — restore default transition
                ballEl.style.transition = '';
                ballEl.classList.remove('kicked', 'thrown');

                console.log('[BALL] Settled at ' + pctX.toFixed(0) + '% after ' + bounceCount + ' bounces');

                // ── Foxy FETCHES the ball: run to it → pick up → carry back → drop ──
                if (F.brain) F.brain.playerTakeover(); // keep AI paused during fetch
                var targetX = ballX;
                var centerX = W * 0.5; // return destination
                var carryInterval = null;

                if (F.body && F.body.runSequence) {
                    F.body.runSequence([
                        // 1. Spot the ball
                        { anim: 'look_around', duration: isBigThrow ? 200 : 400, thought: isBigThrow ? 'GOTTA GO FAST' : 'ooh where did it go' },

                        // 2. Run TO the ball
                        { anim: 'run', duration: isBigThrow ? 800 : 1400, target_x: targetX, thought: isBigThrow ? 'I GOT IT I GOT IT' : 'coming coming!' },

                        // 3. Pounce and "pick up" — attach ball to Foxy
                        {
                            anim: 'pounce', duration: 600, thought: '*POUNCE!*',
                            onStart: function () {
                                F.fulfillNeed('fun', isBigThrow ? 40 : 25);
                                if (F.vfx) {
                                    var pos = F.body.getPosition();
                                    F.vfx.dust(targetX, pos.y + 20, isBigThrow ? 8 : 4);
                                }
                                // Snap ball to Foxy and start carrying
                                carryInterval = setInterval(function () {
                                    var foxyPos = F.body.getPosition();
                                    if (foxyPos) {
                                        var pct = (foxyPos.x / W) * 100;
                                        ballEl.style.left = pct + '%';
                                        ballEl.style.bottom = '78px'; // slightly above ground, in Foxy's mouth
                                    }
                                }, 16);
                            }
                        },

                        // 4. Pause with ball in mouth
                        { anim: 'idle', duration: 500, thought: 'got it! 🎾' },

                        // 5. Carry ball back to center
                        {
                            anim: 'run', duration: 1200, target_x: centerX, thought: isBigThrow ? 'bringing it back!!' : '*prances back*',
                            onStart: function () {
                                if (F.brain) F.brain.playerTakeover(); // extend override for return trip
                            }
                        },

                        // 6. Drop the ball at center
                        {
                            anim: 'idle', duration: 800, thought: isBigThrow ? 'AGAIN!! THROW IT AGAIN!!' : 'hehe fetch! 🐕',
                            onStart: function () {
                                // Stop carrying — drop ball at current position
                                if (carryInterval) {
                                    clearInterval(carryInterval);
                                    carryInterval = null;
                                }
                                // Place ball neatly at center ground
                                var dropPct = (centerX / W) * 100;
                                ballEl.style.left = dropPct + '%';
                                ballEl.style.bottom = '68px';
                                if (F.vfx) {
                                    F.vfx.dust(centerX, H - 68, 3);
                                }
                                console.log('[BALL] Fetched and returned to center!');
                            }
                        },
                    ]);
                }
            }
        }

        // Kick off physics
        ballEl.classList.add('thrown');
        requestAnimationFrame(physicsTick);
    }

    // Mouse events
    ballEl.addEventListener('mousedown', onGrab);
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', onRelease);

    // Touch events
    ballEl.addEventListener('touchstart', onGrab, { passive: false });
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('touchend', onRelease, { passive: false });

    /* ─── EXPORT ─── */

    F.ball = {
        isDragging: () => isDragging,
    };

    console.log('[BALL] Ball physics module ready');

})();
