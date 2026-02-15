/* ═══════════════════════════════════════════════════════
   CAT-CONTROLS.JS — Interactions, effects, and init
   Depends on: cat-soul.js, cat-world.js, cat-brain.js
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const C = window.Cat;

    /* ═══════════════════════════════════════════
       CLICK-BURST ENGAGEMENT SYSTEM
       ═══════════════════════════════════════════ */

    const basicSpawns = ['yarn', 'leaf', 'paw', 'dot'];
    const rareSpawns = ['star', 'gem', 'moon'];
    const legendarySpawns = ['crown', 'fish', 'butterfly'];

    function spawnRipple(x, y) {
        // Inner ring + center dot (via ::before/::after)
        const inner = document.createElement('div');
        inner.className = 'click-ripple';
        inner.style.left = (x - 4) + 'px';
        inner.style.top = (y - 4) + 'px';
        document.body.appendChild(inner);
        setTimeout(() => inner.remove(), 700);

        // Outer soft ring — larger, slower
        const outer = document.createElement('div');
        outer.className = 'click-ripple-outer';
        outer.style.left = (x - 4) + 'px';
        outer.style.top = (y - 4) + 'px';
        document.body.appendChild(outer);
        setTimeout(() => outer.remove(), 900);
    }

    // ── Single-click — cat ALWAYS reacts ──
    document.addEventListener('click', (e) => {
        spawnRipple(e.clientX, e.clientY);

        // Skip if clicking UI elements or cat itself
        if (e.target.closest('#oneko') || e.target.closest('.cat-btn') || e.target.closest('.cat-controls')) return;
        // Skip if busy
        if (C.cat.state === 'sleep' || C.cat.state === 'eat' || C.cat.state === 'drink' || C.cat.state === 'pet') return;

        const clickDist = Math.hypot(e.clientX - C.cat.x, e.clientY - C.cat.y);

        if (clickDist < 80) {
            // Very close — startle!
            C.setState('startle');
            C.cat.startleDir = e.clientX < C.cat.x ? 1 : -1;
            C.showStatus('!!', 800);
            C.setSprite('alert', 0);
        } else {
            // Walk to click — ALWAYS, immediately
            C.showStatus('!', 500);
            C.startWalk(e.clientX);
        }
    });

    function spawnEngagementItem(x, y) {
        const level = C.getBondLevel();
        let pool = basicSpawns;
        if (level === 'friend' || level === 'bestfriend' || level === 'soulmate') pool = pool.concat(rareSpawns);
        if (level === 'soulmate') pool = pool.concat(legendarySpawns);

        const emoji = pool[Math.floor(Math.random() * pool.length)];
        const el = document.createElement('div');
        el.className = 'spawn-item';
        el.textContent = emoji;
        el.style.left = (x + (Math.random() - 0.5) * 60) + 'px';
        el.style.top = (y + (Math.random() - 0.5) * 40) + 'px';
        document.body.appendChild(el);
        C.session.spawnItems.push(el);
        setTimeout(() => {
            el.classList.add('consumed');
            setTimeout(() => el.remove(), 500);
        }, 3000 + Math.random() * 2000);
    }

    document.addEventListener('dblclick', (e) => {

        C.session.clickBurst.push(Date.now());
        C.session.clickBurst = C.session.clickBurst.filter(t => Date.now() - t < 5000);
        C.session.totalClicks++;
        C.soul.totalClicks++;

        if (C.session.clickBurst.length >= 3) {
            spawnEngagementItem(e.clientX, e.clientY);
            C.addEngagement(2);
        }

        if (C.session.clickBurst.length >= 8) {
            spawnFirework(e.clientX, e.clientY);
            C.addEngagement(5);
            if (C.session.clickBurst.length >= 12) {
                triggerScreenFlicker();
            }
        }
    });

    /* ═══════════════════════════════════════════
       FIREWORKS & SCREEN EFFECTS
       ═══════════════════════════════════════════ */

    const fwColors = ['#e85533', '#f0ebe0', '#ff9966', '#ffdd44', '#88ccff'];

    function spawnFirework(x, y) {
        const count = 12;
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'firework';
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
            const dist = 40 + Math.random() * 60;
            el.style.setProperty('--fx', `${Math.cos(angle) * dist}px`);
            el.style.setProperty('--fy', `${Math.sin(angle) * dist}px`);
            el.style.backgroundColor = fwColors[Math.floor(Math.random() * fwColors.length)];
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1000);
        }
    }

    function triggerScreenFlicker() {
        const el = document.createElement('div');
        el.className = 'screen-flicker';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 500);
    }

    function triggerScreenGlitch() {
        const el = document.createElement('div');
        el.className = 'screen-glitch';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 300);
    }

    /* ═══════════════════════════════════════════
       BUTTON FEEDBACK HELPER
       ═══════════════════════════════════════════ */

    function flashButton(btn) {
        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 300);
    }

    /* ═══════════════════════════════════════════
       BUTTON INTERACTIONS
       ═══════════════════════════════════════════ */

    const btnFeed = document.getElementById('btnFeed');
    const btnWater = document.getElementById('btnWater');
    const btnPet = document.getElementById('btnPet');

    // Feed
    btnFeed.addEventListener('click', () => {
        if (C.cat.state === 'eat' || C.cat.state === 'drink') return;
        flashButton(btnFeed);
        const p = C.platforms[C.cat.platIdx];
        const fx = p ? p.left + 32 + Math.random() * Math.max(0, p.width - 64) : C.cat.x + 40;
        const fy = C.cat.y + 10;
        C.placeItem('fish', fx, fy);
        C.showStatus('ooh, fish!');
        C.startWalk(fx, () => C.setState('eat'));
        C.soul.totalFeeds++;
        C.addEngagement(5);
        if (!C.ball.hasSpawnedOnce) {
            setTimeout(C.spawnBall, 3000);
        }
    });

    // Water
    btnWater.addEventListener('click', () => {
        if (C.cat.state === 'eat' || C.cat.state === 'drink') return;
        flashButton(btnWater);
        const p = C.platforms[C.cat.platIdx];
        const wx = p ? p.left + 32 + Math.random() * Math.max(0, p.width - 64) : C.cat.x - 40;
        const wy = C.cat.y + 10;
        C.placeItem('water', wx, wy);
        C.showStatus('*laps water*');
        C.startWalk(wx, () => C.setState('drink'));
        C.addEngagement(3);
    });

    // Pet (button) — with combo system
    btnPet.addEventListener('click', () => {
        if (C.cat.state === 'eat' || C.cat.state === 'drink') return;
        flashButton(btnPet);
        const now = Date.now();
        if (now - C.cat.lastPetTime < 3000) {
            C.cat.petCombo++;
        } else {
            C.cat.petCombo = 1;
        }
        C.cat.lastPetTime = now;
        C.cat.totalPets++;
        C.soul.totalPets++;

        C.setState('pet');
        C.addEngagement(4);

        if (C.cat.petCombo >= 5) {
            C.spawnStarBurst();
            C.spawnHearts(8);
            C.showStatus('MAXIMUM PURR!!!', 3000);
            C.cat.happiness = 1;
            C.cat.petCombo = 0;
            C.addXP(10);
        } else if (C.cat.petCombo >= 3) {
            C.spawnHearts(6);
            C.showStatus('purrrRRRR!!', 2500);
            C.addXP(5);
        } else {
            C.spawnHearts(4);
            C.showStatus('purrrr~', 2000);
        }
    });

    /* ═══════════════════════════════════════════
       CLICK-TO-PET & STARTLE
       ═══════════════════════════════════════════ */

    // Pet (click cat directly)
    let justDragged = false;
    C.nekoEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (justDragged) { justDragged = false; return; }
        if (C.cat.state === 'sleep') {
            C.cat.energy = Math.max(C.cat.energy, 0.4);
            C.showStatus('*yawns* ...huh?');
            C.setState('stretch');
            return;
        }
        if (C.cat.state === 'eat' || C.cat.state === 'drink') return;
        if (C.cat.state === 'stalk' || C.cat.state === 'pounce') {
            C.showStatus('hey! hunting here!', 1500);
            return;
        }
        C.cat.totalPets++;
        C.soul.totalPets++;
        C.setState('pet');
        C.spawnHearts(3);
        C.addEngagement(2);

        const level = C.getBondLevel();
        let reactions;
        if (level === 'soulmate' || level === 'bestfriend') {
            reactions = ['purrrr~', '*headbutt*', 'mrrrrp!', '*nuzzle*', 'hi friend!', '*shows belly*'];
        } else if (level === 'friend') {
            reactions = ['purrrr~', '*headbutt*', 'mrrrrp!', '*nuzzle*', 'hey!'];
        } else {
            reactions = ['purrrr', '*headbutt*', 'mrrrrp!', '*nuzzle*'];
        }
        C.showStatus(reactions[Math.floor(Math.random() * reactions.length)]);
    });

    // Click-to-startle is now handled in the main click listener above

    /* ═══════════════════════════════════════════
       DRAG THE CAT
       ═══════════════════════════════════════════ */

    let dragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let dragStartTime = 0;
    let dragMoved = false;

    // Make the cat easier to grab with a bigger hit area
    C.nekoEl.style.padding = '12px';
    C.nekoEl.style.margin = '-12px';

    function startDrag(clientX, clientY) {
        if (C.cat.state === 'sleep') {
            C.cat.energy = Math.max(C.cat.energy, 0.4);
            C.showStatus('*yawns* ...huh?');
            C.setState('stretch');
        }
        dragging = true;
        dragMoved = false;
        dragOffsetX = clientX - C.cat.x;
        dragOffsetY = clientY - C.cat.y;
        dragStartTime = Date.now();
        C.setState('held');
        C.setSprite('alert', 0);
        const pickupMsgs = ['mrrOWW!', 'HEY!', 'put me down!', 'eep!', '*dangles*', 'MRROW!'];
        C.showStatus(pickupMsgs[Math.floor(Math.random() * pickupMsgs.length)], 1500);
        C.nekoEl.style.cursor = 'grabbing';
        document.body.style.cursor = 'grabbing';
    }

    function moveDrag(clientX, clientY) {
        if (!dragging) return;
        dragMoved = true;
        C.cat.x = clientX - dragOffsetX;
        C.cat.y = clientY - dragOffsetY;
        // Clamp to viewport
        C.cat.x = Math.max(16, Math.min(window.innerWidth - 16, C.cat.x));
        C.cat.y = Math.max(16, Math.min(window.innerHeight - 16, C.cat.y));
        // Update sprite position immediately
        C.nekoEl.style.left = (C.cat.x - 16) + 'px';
        C.nekoEl.style.top = (C.cat.y - 16) + 'px';
        C.statusEl.style.left = C.cat.x + 'px';
        C.statusEl.style.top = (C.cat.y - 40) + 'px';
        // Wiggle sprite while being held
        if (Date.now() % 300 < 150) {
            C.setSprite('alert', 0);
        } else {
            C.setSprite('S', 0);
        }
    }

    function endDrag() {
        if (!dragging) return;
        dragging = false;
        justDragged = dragMoved;  // suppress the click event if we actually moved
        C.nekoEl.style.cursor = '';
        document.body.style.cursor = '';
        const heldTime = Date.now() - dragStartTime;
        // React based on how long held
        if (heldTime > 3000) {
            C.showStatus('*traumatized*', 2000);
            C.cat.happiness = Math.max(0, C.cat.happiness - 0.15);
        } else if (heldTime > 1000) {
            C.showStatus('*hisses* >:(', 1500);
            C.cat.happiness = Math.max(0, C.cat.happiness - 0.05);
        } else {
            C.showStatus('*lands on feet*', 1200);
        }
        // Landing squash
        if (C.juiceLand) C.juiceLand(C.cat.x, C.cat.y + 16);
        if (C.juiceSquash) C.juiceSquash(1.4, 0.6);
        if (C.juiceShake) C.juiceShake(3, 5);
        C.setState('startle');
        C.cat.startleDir = Math.random() < 0.5 ? -1 : 1;
    }

    // Mouse events
    C.nekoEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startDrag(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', (e) => {
        if (dragging) {
            e.preventDefault();
            moveDrag(e.clientX, e.clientY);
        }
    });
    document.addEventListener('mouseup', () => {
        if (dragging) endDrag();
    });

    // Touch events
    C.nekoEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const t = e.touches[0];
        startDrag(t.clientX, t.clientY);
    }, { passive: false });
    document.addEventListener('touchmove', (e) => {
        if (dragging) {
            const t = e.touches[0];
            moveDrag(t.clientX, t.clientY);
        }
    }, { passive: true });
    document.addEventListener('touchend', () => {
        if (dragging) endDrag();
    });

    // Make cat grabbable
    C.nekoEl.style.cursor = 'grab';

    /* ═══════════════════════════════════════════
       VISITOR HINT — one-shot per session
       ═══════════════════════════════════════════ */

    let hintShown = false;

    setTimeout(() => {
        if (!hintShown && C.session.totalClicks === 0 && C.cat.totalPets === 0 && C.cat.totalFeeds === 0) {
            C.showStatus('psst... try the buttons ↓', 4000);
            hintShown = true;
        }
    }, 15000);

    /* ═══════════════════════════════════════════
       INIT — position cat & start loop
       ═══════════════════════════════════════════ */

    window.addEventListener('resize', C.gatherPlatforms);
    setInterval(C.gatherPlatforms, 5000);

    setTimeout(() => {
        C.gatherPlatforms();

        const startPlat = C.platforms.find(p => p.id === 'heading') || C.platforms[0];
        if (startPlat) {
            C.cat.platIdx = C.platforms.indexOf(startPlat);
            C.cat.x = startPlat.left + startPlat.width / 2;
            C.cat.y = startPlat.y;
        } else {
            C.cat.x = window.innerWidth / 2;
            C.cat.y = window.innerHeight / 2;
        }

        C.nekoEl.style.left = (C.cat.x - 16) + 'px';
        C.nekoEl.style.top = (C.cat.y - 16) + 'px';
        C.setSprite('idle', 0);

        // Initialize atmosphere and seed dust
        C.updateAtmosphere();
        for (let i = 0; i < 2; i++) C.spawnDustMote();

        // Return greeting — cat remembers you
        const rg = C.returnGreeting;
        if (rg) {
            if (rg.startAsleep) {
                C.cat.state = 'sleep';
                C.cat.stateTimer = -20;
                C.setSprite('sleeping', 0);
                setTimeout(() => {
                    C.showStatus(rg.msg, rg.dur);
                    C.cat.energy = Math.max(C.cat.energy, 0.4);
                    C.setState('stretch');
                    if (rg.hearts > 0) C.spawnHearts(rg.hearts);
                }, 1500);
            } else {
                C.cat.state = 'idle';
                C.cat.stateTimer = -15;
                setTimeout(() => {
                    C.showStatus(rg.msg, rg.dur);
                    if (rg.hearts > 0) C.spawnHearts(rg.hearts);
                }, 600);
            }
        } else {
            C.cat.state = 'idle';
            C.cat.stateTimer = -15;
        }

        requestAnimationFrame(C.loop);
    }, 1200);

})();
