/* ═══════════════════════════════════════════════════════
   FOXY-BODY.JS — Canvas renderer, animations, physics
   Handles all visual representation of Foxy.
   Depends on: foxy-soul.js (Foxy namespace)
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const F = window.Foxy;

    /* ─── CANVAS SETUP ─── */

    const canvas = document.getElementById('foxyCanvas');
    const ctx = canvas.getContext('2d');
    const SCALE = 4;

    /* ─── ANIMATION DATA ─── */

    const anims = {
        idle: {
            files: [
                'assets/sunny-land/player/idle/player-idle-1.png',
                'assets/sunny-land/player/idle/player-idle-2.png',
                'assets/sunny-land/player/idle/player-idle-3.png',
                'assets/sunny-land/player/idle/player-idle-4.png'
            ], speed: 12, loop: true
        },
        run: {
            files: [
                'assets/sunny-land/player/run/player-run-1.png',
                'assets/sunny-land/player/run/player-run-2.png',
                'assets/sunny-land/player/run/player-run-3.png',
                'assets/sunny-land/player/run/player-run-4.png',
                'assets/sunny-land/player/run/player-run-5.png',
                'assets/sunny-land/player/run/player-run-6.png'
            ], speed: 6, loop: true, move: true
        },
        jump: {
            files: [
                'assets/sunny-land/player/jump/player-jump-1.png',
                'assets/sunny-land/player/jump/player-jump-1.png',
                'assets/sunny-land/player/jump/player-jump-1.png',
                'assets/sunny-land/player/jump/player-fall.png',
                'assets/sunny-land/player/jump/player-fall.png',
                'assets/sunny-land/player/jump/player-fall.png'
            ], speed: 8, loop: false, jumpArc: true
        },
        crouch: {
            files: [
                'assets/sunny-land/player/crouch/player-crouch-1.png',
                'assets/sunny-land/player/crouch/player-crouch-2.png',
                'assets/sunny-land/player/crouch/player-crouch-1.png',
                'assets/sunny-land/player/crouch/player-crouch-2.png'
            ], speed: 10, loop: false, duration: 2000
        },
        climb: {
            files: [
                'assets/sunny-land/player/climb/player-climb-1.png',
                'assets/sunny-land/player/climb/player-climb-2.png',
                'assets/sunny-land/player/climb/player-climb-3.png',
                'assets/sunny-land/player/climb/player-climb-2.png'
            ], speed: 8, loop: false, climbUp: true, duration: 2500
        },
        hurt: {
            files: [
                'assets/sunny-land/player/hurt/player-hurt-1.png',
                'assets/sunny-land/player/hurt/player-hurt-2.png',
                'assets/sunny-land/player/hurt/player-hurt-1.png',
                'assets/sunny-land/player/hurt/player-hurt-2.png'
            ], speed: 6, loop: false, duration: 1200
        },
        // ── PERSONALITY ANIMATIONS (creative combos of existing frames) ──
        sleep: {
            files: [
                'assets/sunny-land/player/idle/player-idle-1.png',
                'assets/sunny-land/player/idle/player-idle-1.png',
                'assets/sunny-land/player/idle/player-idle-2.png',
                'assets/sunny-land/player/idle/player-idle-2.png'
            ], speed: 25, loop: true, sleepBob: true, sleepTilt: true, duration: 5000
        },
        sniff: {
            files: [
                'assets/sunny-land/player/crouch/player-crouch-1.png',
                'assets/sunny-land/player/crouch/player-crouch-2.png',
                'assets/sunny-land/player/crouch/player-crouch-1.png',
                'assets/sunny-land/player/crouch/player-crouch-2.png',
                'assets/sunny-land/player/crouch/player-crouch-1.png',
                'assets/sunny-land/player/crouch/player-crouch-2.png'
            ], speed: 4, loop: false, duration: 1800
        },
        sit: {
            files: [
                'assets/sunny-land/player/crouch/player-crouch-1.png'
            ], speed: 30, loop: true, duration: 4000
        },
        pounce: {
            files: [
                'assets/sunny-land/player/crouch/player-crouch-1.png',
                'assets/sunny-land/player/crouch/player-crouch-1.png',
                'assets/sunny-land/player/crouch/player-crouch-2.png',
                'assets/sunny-land/player/jump/player-jump-1.png',
                'assets/sunny-land/player/jump/player-jump-1.png',
                'assets/sunny-land/player/jump/player-fall.png'
            ], speed: 4, loop: false, jumpArc: true, duration: 1500
        },
        celebrate: {
            files: [
                'assets/sunny-land/player/jump/player-jump-1.png',
                'assets/sunny-land/player/idle/player-idle-1.png',
                'assets/sunny-land/player/jump/player-jump-1.png',
                'assets/sunny-land/player/idle/player-idle-2.png',
                'assets/sunny-land/player/jump/player-jump-1.png',
                'assets/sunny-land/player/idle/player-idle-1.png'
            ], speed: 4, loop: false, duration: 1800
        },
        look_around: {
            files: [
                'assets/sunny-land/player/idle/player-idle-1.png',
                'assets/sunny-land/player/idle/player-idle-2.png',
                'assets/sunny-land/player/idle/player-idle-3.png',
                'assets/sunny-land/player/idle/player-idle-4.png'
            ], speed: 10, loop: false, flipMid: true, duration: 3000
        },
        peek: {
            files: [
                'assets/sunny-land/player/climb/player-climb-1.png'
            ], speed: 30, loop: true, duration: 2500
        },
        fall: {
            files: [
                'assets/sunny-land/player/jump/player-fall.png',
                'assets/sunny-land/player/jump/player-fall.png'
            ], speed: 8, loop: true
        },
        // ── MORE NOVEL COMBOS ──
        stalk: {
            files: [
                'assets/sunny-land/player/run/player-run-1.png',
                'assets/sunny-land/player/run/player-run-2.png',
                'assets/sunny-land/player/run/player-run-3.png',
                'assets/sunny-land/player/run/player-run-4.png',
                'assets/sunny-land/player/run/player-run-5.png',
                'assets/sunny-land/player/run/player-run-6.png'
            ], speed: 20, loop: true, move: true, moveSpeed: 0.5, duration: 3000
        },
        stretch: {
            files: [
                'assets/sunny-land/player/crouch/player-crouch-1.png',
                'assets/sunny-land/player/crouch/player-crouch-2.png',
                'assets/sunny-land/player/idle/player-idle-1.png',
                'assets/sunny-land/player/idle/player-idle-2.png',
                'assets/sunny-land/player/climb/player-climb-1.png',
                'assets/sunny-land/player/climb/player-climb-2.png',
                'assets/sunny-land/player/idle/player-idle-3.png',
                'assets/sunny-land/player/idle/player-idle-4.png'
            ], speed: 10, loop: false, duration: 3000
        },
        dizzy: {
            files: [
                'assets/sunny-land/player/hurt/player-hurt-1.png',
                'assets/sunny-land/player/hurt/player-hurt-2.png',
                'assets/sunny-land/player/hurt/player-hurt-1.png',
                'assets/sunny-land/player/hurt/player-hurt-2.png'
            ], speed: 3, loop: true, flipMid: true, duration: 2000
        },
        shiver: {
            files: [
                'assets/sunny-land/player/idle/player-idle-1.png',
                'assets/sunny-land/player/idle/player-idle-2.png',
                'assets/sunny-land/player/idle/player-idle-1.png',
                'assets/sunny-land/player/idle/player-idle-3.png'
            ], speed: 2, loop: true, shiverEffect: true, duration: 2500
        },
        excited: {
            files: [
                'assets/sunny-land/player/run/player-run-1.png',
                'assets/sunny-land/player/run/player-run-2.png',
                'assets/sunny-land/player/run/player-run-3.png',
                'assets/sunny-land/player/run/player-run-4.png',
                'assets/sunny-land/player/run/player-run-5.png',
                'assets/sunny-land/player/run/player-run-6.png'
            ], speed: 3, loop: true, duration: 2000
        },
        hangout: {
            files: [
                'assets/sunny-land/player/climb/player-climb-2.png',
                'assets/sunny-land/player/climb/player-climb-3.png',
                'assets/sunny-land/player/climb/player-climb-2.png'
            ], speed: 15, loop: true, sleepBob: true, duration: 3000
        },
        frustrated: {
            files: [
                'assets/sunny-land/player/hurt/player-hurt-1.png',
                'assets/sunny-land/player/idle/player-idle-1.png',
                'assets/sunny-land/player/hurt/player-hurt-2.png',
                'assets/sunny-land/player/idle/player-idle-2.png'
            ], speed: 5, loop: false, duration: 2000
        }
    };

    /* ─── LOAD FRAMES ─── */

    const loadedFrames = {};
    let totalToLoad = 0, totalLoaded = 0;
    let onReady = null;

    for (const [, anim] of Object.entries(anims)) {
        [...new Set(anim.files)].forEach(src => {
            if (loadedFrames[src]) return;
            totalToLoad++;
            const img = new Image();
            img.onload = () => {
                loadedFrames[src] = img;
                if (++totalLoaded >= totalToLoad && onReady) onReady();
            };
            img.src = src;
        });
    }

    /* ─── STATE ─── */

    const state = {
        currentAnim: 'idle',
        frameIndex: 0,
        tick: 0,
        x: window.innerWidth / 2 - 50,
        y: window.innerHeight - 140,
        baseY: window.innerHeight - 140,
        facingRight: true,
        actionTimer: null,
        jumpPhase: 0,
        climbOffset: 0,
        isJumping: false,
        aiMoving: false,
        aiTargetX: null,
        aiTargetY: null,
        // Squash & stretch
        scaleX: 1,
        scaleY: 1,
        // Motion blur trail
        trail: [],        // [{x, y, frame, facingRight, alpha}]
        // Drag & drop
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        isFalling: false,
        fallVelocity: 0,
        throwVelX: 0,
    };

    /* ─── ANIMATION CONTROL ─── */

    function setAnim(name) {
        if (state.currentAnim === name) return;
        state.currentAnim = name;
        state.frameIndex = 0;
        state.jumpPhase = 0;
        state.climbOffset = 0;
    }

    function playAction(name, callback) {
        if (state.actionTimer) clearTimeout(state.actionTimer);
        setAnim(name);
        const anim = anims[name];
        const dur = anim.duration || 2000;
        if (!anim.loop) {
            state.actionTimer = setTimeout(() => {
                setAnim('idle');
                state.actionTimer = null;
                if (callback) callback();
            }, dur);
        }
    }

    /* ─── COMPOUND BEHAVIOR SEQUENCER ─── */

    let sequenceQueue = [];
    let sequenceRunning = false;

    function runSequence(steps) {
        // steps = [{anim, duration, target_x, thought, onStart, onEnd}, ...]
        sequenceQueue = steps.slice();
        sequenceRunning = true;
        F.soul.stats.compoundBehaviors++;
        executeNextStep();
    }

    function executeNextStep() {
        if (sequenceQueue.length === 0) {
            sequenceRunning = false;
            setAnim('idle');
            state.aiMoving = false;
            return;
        }

        const step = sequenceQueue.shift();

        if (step.onStart) step.onStart();

        // Set direction based on target
        if (step.target_x != null) {
            state.aiTargetX = step.target_x;
            state.facingRight = step.target_x > state.x;
            state.aiMoving = true;
        } else {
            state.aiMoving = false;
            state.aiTargetX = null;
        }

        if (step.thought && F.brain) {
            // Route ALL thoughts through Gemini AI
            if (F.brain._smartThought) {
                F.brain._smartThought(step.thought);
            } else {
                F.brain.showThought(step.thought);
            }
        }

        if (step.anim === 'jump') {
            state.isJumping = true;
            setAnim('jump');
        } else if (step.anim) {
            setAnim(step.anim);
        }

        const dur = step.duration || anims[step.anim]?.duration || 2000;
        setTimeout(() => {
            if (step.onEnd) step.onEnd();
            executeNextStep();
        }, dur);
    }

    function isSequenceRunning() { return sequenceRunning; }
    function cancelSequence() {
        sequenceQueue = [];
        sequenceRunning = false;
    }

    /* ─── MOVEMENT & PHYSICS ─── */

    function moveToward(targetX, speed) {
        const dist = targetX - state.x;
        if (Math.abs(dist) > 5) {
            state.x += dist > 0 ? speed : -speed;
            state.facingRight = dist > 0;
            return false; // not arrived
        }
        return true; // arrived
    }

    function applyBounds() {
        const W = window.innerWidth;
        const H = window.innerHeight;
        if (state.x > W - 80) {
            state.facingRight = false;
            state.x = W - 80;
            return 'right'; // hit right wall
        }
        if (state.x < 20) {
            state.facingRight = true;
            state.x = 20;
            return 'left'; // hit left wall
        }
        // Y bounds — don't let Foxy go too high or below screen
        var minY = H * 0.15;  // don't go above 15% from top
        var maxY = H - 80;     // don't go below screen
        if (state.baseY < minY) { state.baseY = minY; state.y = minY; state.aiTargetY = null; }
        if (state.baseY > maxY) { state.baseY = maxY; state.y = maxY; state.aiTargetY = null; }

        // Gentle gravity — if no Y target and Foxy is above default ground, slowly drift down
        var defaultGround = H - 120;
        if (state.aiTargetY == null && !state.isDragging && !state.isFalling && state.baseY < defaultGround - 50) {
            state.baseY += 0.3; // slow drift back to ground
            state.y = state.baseY;
        }
        return null;
    }

    function land() {
        // Squash on landing
        state.scaleX = 1.2;
        state.scaleY = 0.8;
    }

    /* ─── MOTION BLUR TRAIL ─── */

    function updateTrail() {
        const anim = anims[state.currentAnim];
        if (anim && anim.move && state.aiMoving) {
            state.trail.push({
                x: state.x,
                y: state.y,
                frame: anim.files[state.frameIndex],
                facingRight: state.facingRight,
                alpha: 0.2
            });
            if (state.trail.length > 3) state.trail.shift();
        } else {
            // Fade out trail
            state.trail = state.trail.filter(t => {
                t.alpha -= 0.05;
                return t.alpha > 0;
            });
        }
    }

    /* ─── MAIN RENDER LOOP ─── */

    const thoughtBubble = document.getElementById('thoughtBubble');
    const moodBadge = document.getElementById('moodBadge');

    function loop() {
        state.tick++;
        const anim = anims[state.currentAnim];
        if (!anim) { requestAnimationFrame(loop); return; }

        // Advance frame
        if (state.tick % anim.speed === 0) {
            if (anim.loop) state.frameIndex = (state.frameIndex + 1) % anim.files.length;
            else if (state.frameIndex < anim.files.length - 1) state.frameIndex++;
        }

        // ── DRAG & FALL PHYSICS ──
        if (state.isDragging) {
            // Skip all movement — mouse controls position

        } else if (state.isFalling) {
            // Gravity!
            state.fallVelocity += 0.6;
            state.y += state.fallVelocity;

            // Horizontal momentum with friction
            if (state.throwVelX) {
                state.x += state.throwVelX;
                state.throwVelX *= 0.98; // Air friction
                // Face direction of travel
                if (Math.abs(state.throwVelX) > 0.5) state.facingRight = state.throwVelX > 0;
                // Dampen tiny velocities
                if (Math.abs(state.throwVelX) < 0.3) state.throwVelX = 0;
            }

            // Wall bounce
            const cw = canvas.width || 64;
            if (state.x < 0) {
                state.x = 0;
                state.throwVelX = Math.abs(state.throwVelX) * 0.5; // Bounce!
            } else if (state.x > window.innerWidth - cw) {
                state.x = window.innerWidth - cw;
                state.throwVelX = -Math.abs(state.throwVelX) * 0.5;
            }

            // Update canvas during flight
            canvas.style.left = state.x + 'px';
            canvas.style.top = state.y + 'px';

            // Hit the ground
            if (state.y >= state.baseY) {
                state.y = state.baseY;
                state.isFalling = false;
                // Landing squash scales with impact velocity
                const impact = Math.abs(state.fallVelocity);
                state.scaleX = 1 + Math.min(impact * 0.03, 0.5);
                state.scaleY = 1 - Math.min(impact * 0.02, 0.4);
                state.fallVelocity = 0;
                state.throwVelX = 0;
                setAnim('idle');
                canvas.style.zIndex = '';
            }

        } else {
            // ── Normal movement ──

            // AI target movement
            if (state.aiMoving && state.aiTargetX != null) {
                const speed = F.soul.traits.playfulness > 0.6 ? 2.5 : 2;
                const arrived = moveToward(state.aiTargetX, speed);

                // Move vertically toward target Y too
                if (state.aiTargetY != null) {
                    var dy = state.aiTargetY - state.baseY;
                    if (Math.abs(dy) > 2) {
                        state.baseY += (dy > 0 ? 1 : -1) * Math.min(speed * 0.8, Math.abs(dy));
                        state.y = state.baseY;
                    } else {
                        state.baseY = state.aiTargetY;
                        state.y = state.baseY;
                        state.aiTargetY = null;
                    }
                }

                if (arrived) {
                    state.aiTargetX = null;
                    if (state.currentAnim === 'run' && !sequenceRunning) {
                        state.aiMoving = false;
                        setAnim('idle');
                    }
                }
            } else if (state.aiMoving && state.aiTargetX == null) {
                state.x += state.facingRight ? 2 : -2;
            }

            // Wall bounds
            const wallHit = applyBounds();
            if (wallHit) {
                state.aiTargetX = null;
                if (state.currentAnim === 'run' && !sequenceRunning) {
                    state.aiMoving = false;
                    setAnim('idle');
                }
            }

            // Jump arc
            if (anim.jumpArc) {
                state.jumpPhase += 0.06;
                state.y = state.baseY - Math.max(0, Math.sin(state.jumpPhase) * 120);
                if (state.jumpPhase >= Math.PI) {
                    state.y = state.baseY;
                    state.jumpPhase = 0;
                    state.isJumping = false;
                    land();
                    if (state.aiMoving) setAnim('run');
                    else if (!sequenceRunning) setAnim('idle');
                }
            } else {
                state.y = state.baseY - state.climbOffset;
            }
        }

        // Climb
        if (anim.climbUp) state.climbOffset = Math.min(state.climbOffset + 1.5, 80);

        // Sleep breathing bob
        if (anim.sleepBob) {
            state.y = state.baseY - state.climbOffset + Math.sin(state.tick * 0.05) * 3;
        }

        // Look around — flip direction mid-animation
        if (anim.flipMid && state.frameIndex === Math.floor(anim.files.length / 2)) {
            state.facingRight = !state.facingRight;
        }

        // Shiver — rapid X jitter (scared/cold)
        if (anim.shiverEffect) {
            canvas.style.transform = 'translateX(' + (Math.random() * 4 - 2) + 'px)';
        } else if (anim.sleepTilt) {
            // Sleep tilt — rotate to look like lying down + slight bob
            canvas.style.transform = 'rotate(-30deg) translateY(8px)';
        } else {
            canvas.style.transform = '';
        }

        // Squash & stretch recovery
        state.scaleX += (1 - state.scaleX) * 0.15;
        state.scaleY += (1 - state.scaleY) * 0.15;

        // Position canvas
        canvas.style.left = state.x + 'px';
        canvas.style.top = state.y + 'px';

        // Position thought bubble, question bubble & mood badge (ANTI-OVERLAP)
        var bubbleOffset = 60;
        var qOffset = 180;

        // If Foxy is too high up, show bubbles BELOW him instead
        if (state.y < 250) {
            bubbleOffset = -140;
            qOffset = -260; // question bubble is tall
        }

        if (thoughtBubble) {
            thoughtBubble.style.left = (state.x + canvas.width / 2) + 'px';
            thoughtBubble.style.top = (state.y - bubbleOffset) + 'px';

            // Flip the tail if bubble is below
            var tail = thoughtBubble.querySelector('.thought-tail');
            var tailSm = thoughtBubble.querySelector('.thought-tail-sm');
            if (tail) tail.style.top = state.y < 250 ? '-10px' : '';
            if (tailSm) tailSm.style.top = state.y < 250 ? '-18px' : '';
        }

        var qBubble = document.getElementById('questionBubble');
        if (qBubble) {
            qBubble.style.left = (state.x + canvas.width / 2) + 'px';
            qBubble.style.top = (state.y - qOffset) + 'px';

            // Flip tail for question bubble too
            var qTail = qBubble.querySelector('.question-tail');
            var qTailSm = qBubble.querySelector('.question-tail-sm');
            if (qTail) {
                qTail.style.bottom = state.y < 250 ? 'auto' : '-10px';
                qTail.style.top = state.y < 250 ? '-10px' : 'auto';
            }
            if (qTailSm) {
                qTailSm.style.bottom = state.y < 250 ? 'auto' : '-18px';
                qTailSm.style.top = state.y < 250 ? '-18px' : 'auto';
            }
        }
        if (moodBadge) {
            moodBadge.style.left = (state.x + canvas.width + 4) + 'px';
            moodBadge.style.top = (state.y - 4) + 'px';
        }

        // Update motion blur trail
        updateTrail();

        // ── DRAW ──
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;

        // Draw motion blur ghosts
        for (const ghost of state.trail) {
            const gImg = loadedFrames[ghost.frame];
            if (!gImg) continue;
            const offsetX = ghost.x - state.x;
            const offsetY = ghost.y - state.y;
            ctx.save();
            ctx.globalAlpha = ghost.alpha;
            if (!ghost.facingRight) {
                ctx.scale(-1, 1);
                ctx.drawImage(gImg, -canvas.width + offsetX, offsetY, canvas.width, canvas.height);
            } else {
                ctx.drawImage(gImg, offsetX, offsetY, canvas.width, canvas.height);
            }
            ctx.restore();
        }

        // Draw main sprite with squash/stretch
        const src = anim.files[state.frameIndex];
        const img = loadedFrames[src];
        if (img) {
            ctx.save();
            // Apply squash/stretch from center-bottom
            const cx = canvas.width / 2;
            const cy = canvas.height;
            ctx.translate(cx, cy);
            ctx.scale(state.scaleX * (state.facingRight ? 1 : -1), state.scaleY);
            ctx.translate(-cx, -cy);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        // Track position in soul
        const xPct = (state.x / window.innerWidth) * 100;
        F.recordPosition(xPct);

        requestAnimationFrame(loop);
    }

    /* ─── INIT ─── */

    function initBody() {
        const firstFrame = loadedFrames[anims.idle.files[0]];
        if (!firstFrame) return;
        canvas.width = firstFrame.width * SCALE;
        canvas.height = firstFrame.height * SCALE;
        canvas.style.left = state.x + 'px';
        canvas.style.top = state.y + 'px';

        // ── DRAG & DROP WITH THROW PHYSICS ──
        let dragStartTime = 0;
        let dragMoved = false;
        // Track recent mouse positions for velocity calculation
        let dragHistory = []; // [{x, y, t}, ...]

        canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            state.isDragging = true;
            state.isFalling = false;
            state.fallVelocity = 0;
            state.throwVelX = 0;
            state.throwVelY = 0;
            dragMoved = false;
            dragStartTime = Date.now();
            dragHistory = [{ x: e.clientX, y: e.clientY, t: Date.now() }];

            // Offset so he doesn't snap to cursor center
            const rect = canvas.getBoundingClientRect();
            state.dragOffsetX = e.clientX - rect.left;
            state.dragOffsetY = e.clientY - rect.top;

            // Stop all AI movement
            state.aiMoving = false;
            state.aiTargetX = null;
            stopMoving();
            if (F.brain) F.brain.playerTakeover();

            // Pickup reaction
            setAnim('hurt');
            if (F.brain) F.brain.showThought('whoa!');

            canvas.style.cursor = 'grabbing';
            canvas.style.zIndex = '999';
        });

        document.addEventListener('mousemove', (e) => {
            if (!state.isDragging) return;
            dragMoved = true;
            state.x = e.clientX - state.dragOffsetX;
            state.y = e.clientY - state.dragOffsetY;
            canvas.style.left = state.x + 'px';
            canvas.style.top = state.y + 'px';

            // Track velocity — keep last 5 positions
            dragHistory.push({ x: e.clientX, y: e.clientY, t: Date.now() });
            if (dragHistory.length > 5) dragHistory.shift();
        });

        document.addEventListener('mouseup', (e) => {
            if (!state.isDragging) return;
            state.isDragging = false;
            canvas.style.cursor = '';

            // If they didn't drag (just clicked), treat as poke
            if (!dragMoved || Date.now() - dragStartTime < 150) {
                playAction('hurt');
                if (F.brain) F.brain.showThought('hey!');
                if (F.brain) {
                    F.brain._quickThink('The human just poked you! React — annoyed? Curious? Happy?', 1500);
                }
                state.isFalling = true;
                state.fallVelocity = 0;
                state.throwVelX = 0;
                return;
            }

            // ── Calculate throw velocity from mouse history ──
            let velX = 0, velY = 0;
            if (dragHistory.length >= 2) {
                const recent = dragHistory[dragHistory.length - 1];
                const old = dragHistory[0];
                const dt = Math.max(recent.t - old.t, 16); // ms, min 1 frame
                velX = (recent.x - old.x) / dt * 16; // px per frame (at 60fps)
                velY = (recent.y - old.y) / dt * 16;
            }

            // Cap max velocity
            const maxVel = 30;
            velX = Math.max(-maxVel, Math.min(maxVel, velX));
            velY = Math.max(-maxVel, Math.min(maxVel, velY));

            const throwForce = Math.sqrt(velX * velX + velY * velY);

            // ── GENTLE PLACEMENT (low velocity = just put me down) ──
            if (throwForce < 3) {
                // Place Foxy here — update his ground level
                state.baseY = state.y;
                state.isFalling = false;
                state.throwVelX = 0;
                state.fallVelocity = 0;
                setAnim('idle');
                canvas.style.zIndex = '';
                canvas.style.left = state.x + 'px';
                canvas.style.top = state.y + 'px';

                var placementReacts = ['*sits down*', 'nice spot!', 'I live here now', 'cozy!', 'new home!', 'hmm... okay!'];
                if (F.brain) F.brain.showThought(placementReacts[Math.floor(Math.random() * placementReacts.length)]);
                if (F.brain) {
                    F.brain._quickThink('The human gently placed you at a new spot on the page! Look around and react to your new perch.', 2000);
                }
                if (F.logExperience) {
                    F.logExperience({
                        behavior: 'placed_by_human',
                        location: Math.round((state.x / window.innerWidth) * 100),
                        outcome: 'cozy',
                        mood: 'happy',
                        details: 'placed at y=' + Math.round(state.y),
                    });
                }
                return;
            }

            // ── THROWN — apply momentum! ──
            state.isFalling = true;
            state.throwVelX = velX;
            state.fallVelocity = velY;

            // Reaction based on throw force
            if (throwForce > 15) {
                setAnim('fall');
                if (F.brain) F.brain.showThought('YEET!');
                state.facingRight = velX >= 0;
            } else if (throwForce > 5) {
                setAnim('fall');
                if (F.brain) F.brain.showThought('WHEE!');
            } else {
                setAnim('fall');
                if (F.brain) F.brain.showThought('hey!');
            }

            if (F.brain) {
                var forceWord = throwForce > 15 ? 'HURLED' : throwForce > 5 ? 'tossed' : 'dropped';
                F.brain._quickThink('The human just ' + forceWord + ' you through the air! You\'re flying! React to being thrown!', 1500);
            }
            if (F.logExperience) {
                F.logExperience({
                    behavior: 'thrown_by_human',
                    location: Math.round((state.x / window.innerWidth) * 100),
                    outcome: 'flying',
                    mood: throwForce > 10 ? 'scared' : 'excited',
                    details: 'thrown with force ' + Math.round(throwForce),
                });
            }
        });

        requestAnimationFrame(loop);
    }

    onReady = initBody;
    // If frames already finished loading
    if (totalLoaded >= totalToLoad && totalToLoad > 0) initBody();

    /* ─── EXPORT ─── */

    F.body = {
        state,
        canvas,
        anims,
        setAnim,
        playAction,
        runSequence,
        isSequenceRunning,
        cancelSequence,
        initBody,
        getPosition: () => ({ x: state.x, y: state.y, xPercent: (state.x / window.innerWidth) * 100 }),
        setTarget: (x, y) => { state.aiTargetX = x; if (y != null) state.aiTargetY = y; state.aiMoving = true; },
        stopMoving: () => { state.aiMoving = false; state.aiTargetX = null; state.aiTargetY = null; },
        isMoving: () => state.aiMoving,
        getFacing: () => state.facingRight ? 'right' : 'left',
        setFacing: (dir) => { state.facingRight = dir === 'right'; },
    };

})();
