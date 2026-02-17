/* ═══════════════════════════════════════════════════════
   FOXY-INPUT.JS — Keyboard, mouse click, and button controls
   Handles player input and stage interaction.
   Depends on: foxy-soul.js, foxy-body.js, foxy-brain.js
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const F = window.Foxy;
    const chatInput = document.getElementById('foxyChatInput');

    /* ─── KEYBOARD CONTROLS ─── */

    const keysHeld = new Set();

    document.addEventListener('keydown', (e) => {
        // Don't capture keys when typing in chat
        if (document.activeElement === chatInput) return;

        if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
            keysHeld.add(e.key);

            if (!F.brain) return;
            F.brain.playerTakeover();

            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                F.body.setAnim('run');
            }
            if (e.key === ' ' && !F.body.state.isJumping) {
                F.body.state.isJumping = true;
                F.body.setAnim('jump');
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        keysHeld.delete(e.key);
        if (keysHeld.size === 0 && F.brain && F.brain._isPlayerOverride && F.brain._isPlayerOverride()) {
            if (F.body.state.currentAnim === 'run') F.body.setAnim('idle');
        }
    });

    // Player key movement — runs at 60fps
    setInterval(() => {
        if (!F.brain || !F.brain._isPlayerOverride || !F.brain._isPlayerOverride()) return;
        const body = F.body.state;
        if (keysHeld.has('ArrowRight')) {
            body.x += 3;
            body.facingRight = true;
        }
        if (keysHeld.has('ArrowLeft')) {
            body.x -= 3;
            body.facingRight = false;
        }
    }, 16); // 60fps movement

    /* ─── STAGE CLICK — Foxy runs to where you click ─── */

    document.addEventListener('click', (e) => {
        // Ignore clicks on Foxy canvas, buttons, or question options
        if (e.target.closest('#foxyCanvas') ||
            e.target.closest('.foxy-btn') ||
            e.target.closest('#questionOptions') ||
            e.target.closest('#foxyChatInput') ||
            e.target.closest('#foxyChatSend') ||
            e.target.closest('.need-icon') ||
            e.target.closest('.foxy-item') ||
            e.target.closest('.foxy-buddy') ||
            e.target.closest('.world-btn')) return;

        if (!F.brain || !F.body) return;

        var clickX = e.clientX;
        var clickY = e.clientY;

        // Run to click position
        F.body.setTarget(clickX);
        F.body.setAnim('run');

        // Smart thought about click location
        var clickXPercent = (clickX / window.innerWidth * 100).toFixed(0);
        var side = clickXPercent < 30 ? 'the left side' : clickXPercent > 70 ? 'the right side' : 'the center';
        var height = clickY < window.innerHeight * 0.3 ? 'up high' : clickY > window.innerHeight * 0.7 ? 'down low' : 'in the middle';

        if (F.brain._quickThink) {
            F.brain._quickThink(
                'The human clicked on ' + side + ', ' + height + ' of the screen. You are running over to investigate! Be funny about what you find there.',
                3000
            );
        }

        // Log the interaction
        if (F.logExperience) {
            F.logExperience({
                behavior: 'summoned_by_human',
                location: clickXPercent,
                outcome: 'fun',
                mood: F.soul.dominantMood || 'curious',
                details: 'human pointed at ' + side + ' ' + height,
            });
        }
    });

    /* ─── BUTTON CONTROLS ─── */

    document.querySelectorAll('.foxy-btn[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const aiDot = document.getElementById('aiDot');

            if (action === 'toggleAI') {
                if (F.brain) {
                    const isEnabled = F.brain.isEnabled();
                    if (isEnabled) {
                        F.brain.stop();
                    } else {
                        F.brain.start();
                    }
                    btn.classList.toggle('active', !isEnabled);
                    if (aiDot) aiDot.classList.toggle('off', isEnabled);
                    if (F.brain.showThought) {
                        F.brain.showThought(!isEnabled ? '🧠 brain ON!' : '🧠 brain paused');
                    }
                }
            } else if (action === 'run') {
                if (F.body.state.facingRight) {
                    F.body.state.facingRight = false;
                } else {
                    F.body.state.facingRight = true;
                }
                F.body.state.aiMoving = true;
                F.body.setAnim('run');
                setTimeout(() => {
                    F.body.stopMoving();
                    F.body.setAnim('idle');
                }, 2000);
            } else if (action === 'jump') {
                if (!F.body.state.isJumping) {
                    F.body.state.isJumping = true;
                    F.body.setAnim('jump');
                }
            } else {
                F.body.playAction(action);
            }
        });
    });

    /* ─── EXPORT ─── */

    F.input = {
        keysHeld,
    };

    console.log('[INPUT] Input controls module ready');

})();
