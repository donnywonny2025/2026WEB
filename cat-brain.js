/* ═══════════════════════════════════════════════════════
   CAT-BRAIN.JS — Sprite system, state machine, main loop
   Depends on: cat-soul.js, cat-world.js
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const C = window.Cat;

    /* ═══════════════════════════════════════════
       SPRITE SYSTEM
       ═══════════════════════════════════════════ */

    const spriteSets = {
        idle: [[-3, -3]], alert: [[-7, -3]],
        scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
        tired: [[-3, -2]], sleeping: [[-2, 0], [-2, -1]],
        N: [[-1, -2], [-1, -3]], NE: [[0, -2], [0, -3]],
        E: [[-3, 0], [-3, -1]], SE: [[-5, -1], [-5, -2]],
        S: [[-6, -3], [-7, -2]], SW: [[-5, -3], [-6, -1]],
        W: [[-4, -2], [-4, -3]], NW: [[-1, 0], [-1, -1]]
    };

    C.nekoEl = document.getElementById('oneko');
    C.statusEl = document.getElementById('catStatus');

    C.setSprite = function (name, frame) {
        const set = spriteSets[name] || spriteSets.idle;
        const pair = set[frame % set.length];
        C.nekoEl.style.backgroundPosition = `${pair[0] * 32}px ${pair[1] * 32}px`;
    };

    /* ═══════════════════════════════════════════
       PLATFORMS — walkable surfaces (FIXED)
       ═══════════════════════════════════════════ */

    C.platforms = [];

    C.gatherPlatforms = function () {
        C.platforms = [];
        const targets = [
            { el: document.getElementById('labelEl'), id: 'label' },
            { el: document.getElementById('headingEl'), id: 'heading' },
            { el: document.getElementById('accentLine'), id: 'accent' },
        ];
        targets.forEach(t => {
            if (!t.el) return;
            let r;
            // For heading, measure the inner span for tighter text bounds
            if (t.id === 'heading') {
                const span = t.el.querySelector('span');
                r = span ? span.getBoundingClientRect() : t.el.getBoundingClientRect();
            } else {
                r = t.el.getBoundingClientRect();
            }
            C.platforms.push({
                id: t.id,
                left: r.left,
                right: r.right,
                width: r.width,
                y: r.top - 10
            });
        });
        C.platforms.sort((a, b) => a.y - b.y);
    };

    /* ═══════════════════════════════════════════
       MOUSE TRACKING
       ═══════════════════════════════════════════ */

    const mouse = { x: -1000, y: -1000, moving: false, lastMove: 0 };

    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.moving = true;
        mouse.lastMove = Date.now();
    });

    function mouseDistToCat() {
        return Math.hypot(mouse.x - C.cat.x, mouse.y - C.cat.y);
    }

    function mouseNearCat(radius) {
        return mouseDistToCat() < radius;
    }

    /* ═══════════════════════════════════════════
       CAT STATE
       ═══════════════════════════════════════════ */

    C.cat = {
        x: 0, y: 0,
        platIdx: 0,
        targetX: 0,
        speed: 2,
        facingLeft: false,

        state: 'idle',
        stateTimer: 0,
        frameCount: 0,
        idleAnimFrame: 0,

        happiness: 0.7,
        energy: 0.8,
        hunger: 0.5,
        curiosity: 0,

        jumpFrom: null,
        jumpTo: null,
        jumpT: 0,

        walkCallback: null,

        pounceTarget: null,
        pouncePrepTime: 0,

        startleDir: 1,
        landSquash: 0,

        playfulness: 0.3 + Math.random() * 0.5,
        laziness: 0.2 + Math.random() * 0.4,

        lastPetTime: 0,
        petCombo: 0,
        totalFeeds: 0,
        totalPets: 0,
    };

    // Shared mutable for controls → brain communication
    C.catInvestigateSpot = null;

    /* ═══════════════════════════════════════════
       PARTICLES
       ═══════════════════════════════════════════ */

    C.spawnParticle = function (emoji, x, y, cls) {
        const p = document.createElement('div');
        p.className = 'particle ' + (cls || 'float');
        p.textContent = emoji;
        p.style.left = (x + (Math.random() * 20 - 10)) + 'px';
        p.style.top = y + 'px';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), cls === 'zzz' ? 2000 : 1200);
    };

    C.spawnHearts = function (n) {
        for (let i = 0; i < n; i++)
            setTimeout(() => C.spawnParticle('*', C.cat.x + 16, C.cat.y - 5), i * 120);
    };

    C.spawnStarBurst = function () {
        const stars = ['*', '+', '.', 'o'];
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                C.spawnParticle(stars[i % stars.length], C.cat.x + 16, C.cat.y - 10);
            }, i * 80);
        }
    };

    C.spawnMusicNotes = function () {
        const notes = ['~', '~~', '~'];
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                C.spawnParticle(notes[i], C.cat.x + 16 + (i - 1) * 15, C.cat.y - 15, 'float');
            }, i * 200);
        }
    };

    /* ═══════════════════════════════════════════
       STATUS BUBBLE
       ═══════════════════════════════════════════ */

    let statusTO;
    C.showStatus = function (text, dur) {
        C.statusEl.textContent = text;
        C.statusEl.classList.add('visible');
        clearTimeout(statusTO);
        statusTO = setTimeout(() => C.statusEl.classList.remove('visible'), dur || 2000);
    };

    /* ═══════════════════════════════════════════
       GROUND ITEMS
       ═══════════════════════════════════════════ */

    let groundItem = null;

    C.placeItem = function (emoji, x, y) {
        if (groundItem) groundItem.remove();
        const el = document.createElement('div');
        el.className = 'ground-item';
        el.textContent = emoji;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('visible'));
        groundItem = el;
    };

    C.consumeItem = function () {
        if (!groundItem) return;
        groundItem.classList.add('consumed');
        const ref = groundItem;
        setTimeout(() => ref.remove(), 500);
        groundItem = null;
    };

    /* ═══════════════════════════════════════════
       STATE TRANSITIONS
       ═══════════════════════════════════════════ */

    const CAT_HALF_W = 32;

    C.setState = function (s) {
        C.cat.state = s;
        C.cat.stateTimer = 0;
        C.cat.idleAnimFrame = 0;
        if (s !== 'walk') C.cat.walkCallback = null;
    };

    function pickWalkTarget() {
        // FREE ROAM: random target across full viewport
        return CAT_HALF_W + Math.random() * (window.innerWidth - CAT_HALF_W * 2);
    }

    C.startWalk = function (targetX, callback) {
        // FREE ROAM: clamp to viewport edges only
        targetX = Math.max(CAT_HALF_W, Math.min(window.innerWidth - CAT_HALF_W, targetX));
        C.cat.targetX = targetX;
        C.cat.facingLeft = targetX < C.cat.x;
        C.cat.walkCallback = callback || null;
        C.setState('walk');
    };

    function startJump() {
        const others = C.platforms.filter((_, i) => i !== C.cat.platIdx);
        if (!others.length) return C.startWalk(pickWalkTarget());
        const target = others[Math.floor(Math.random() * others.length)];
        C.cat.jumpFrom = { x: C.cat.x, y: C.cat.y };
        const safeLeft = target.left + CAT_HALF_W;
        const safeRight = target.right - CAT_HALF_W;
        let landX;
        if (safeRight > safeLeft) {
            landX = safeLeft + Math.random() * (safeRight - safeLeft);
        } else {
            landX = target.left + target.width / 2;
        }
        C.cat.jumpTo = { x: landX, y: target.y };
        C.cat.platIdx = C.platforms.indexOf(target);
        C.cat.facingLeft = C.cat.jumpTo.x < C.cat.x;
        C.cat.jumpT = 0;
        C.setState('jump');
        C.setSprite('alert', 0);
    }

    /* ═══════════════════════════════════════════
       WORLD EVENT REACTIONS (cat noticing things)
       ═══════════════════════════════════════════ */

    function catNoticeWorldEvent() {
        const we = C.worldEvents;
        if (we.activeBird && C.cat.state === 'idle' && Math.random() < 0.15) {
            C.cat.facingLeft = we.activeBird.x < C.cat.x;
            C.setSprite('alert', 0);
            C.showStatus('...!', 800);
            return true;
        }
        if (we.activeLeaf && C.cat.state === 'idle' && Math.random() < 0.1) {
            if (Math.abs(we.activeLeaf.x - C.cat.x) < 200) {
                C.cat.facingLeft = we.activeLeaf.x < C.cat.x;
                C.setSprite('alert', 0);
                C.showStatus('leaf!', 600);
                return true;
            }
        }
        if (we.activeStar && C.cat.state === 'idle' && Math.random() < 0.3) {
            C.setSprite('N', 0);
            C.showStatus('...!!', 800);
            return true;
        }
        return false;
    }

    /* ═══════════════════════════════════════════
       SMART DECISION MAKING
       ═══════════════════════════════════════════ */

    function decideNext() {
        C.cat.energy = Math.max(0, C.cat.energy - 0.006);
        C.cat.hunger = Math.max(0, C.cat.hunger - 0.003);

        const hour = new Date().getHours();
        const isNight = hour >= 22 || hour < 6;
        const energyDrain = isNight ? 0.012 : 0.006;
        C.cat.energy = Math.max(0, C.cat.energy - energyDrain);

        if (C.cat.energy < 0.15) {
            C.setState('sleep');
            C.showStatus(isNight ? 'goodnight...' : 'so sleepy...', 3000);
            return;
        }

        if (C.cat.hunger < 0.15 && Math.random() < 0.5) {
            C.showStatus('hungry...', 2500);
            C.setState('beg');
            return;
        }

        if (mouseNearCat(200) && mouse.moving && Math.random() < C.cat.playfulness * 0.4) {
            C.setState('curious');
            C.cat.facingLeft = mouse.x < C.cat.x;
            C.showStatus('...?');
            return;
        }

        if (C.butterfly && Math.random() < C.cat.playfulness * 0.7) {
            C.setState('stalk');
            C.cat.pouncePrepTime = 0;
            C.cat.pounceTarget = { x: C.butterfly.x, y: C.butterfly.y };
            C.cat.facingLeft = C.butterfly.x < C.cat.x;
            C.showStatus('!', 800);
            return;
        }

        if (C.catInvestigateSpot && Math.random() < 0.8) {
            const spot = C.catInvestigateSpot;
            C.catInvestigateSpot = null;
            C.startWalk(spot.x);
            C.showStatus('...?', 1200);
            return;
        }

        if (C.ball.active && C.cat.energy > 0.3 && Math.random() < 0.6) {
            const ballDist = Math.abs(C.ball.x - C.cat.x);
            if (ballDist < 300) {
                C.setState('chaseBall');
                C.cat.facingLeft = C.ball.x < C.cat.x;
                C.showStatus('!!', 600);
                return;
            }
        }

        if (catNoticeWorldEvent()) return;

        const actions = [];
        actions.push({ action: 'walk', weight: 25 });
        actions.push({ action: 'jump', weight: 20 });
        actions.push({ action: 'idle', weight: 10 + C.cat.laziness * 20 });
        actions.push({ action: 'scratch', weight: 8 });
        actions.push({ action: 'sit', weight: 10 });
        actions.push({ action: 'wash', weight: 8 });
        actions.push({ action: 'stretch', weight: 6 });

        if (C.cat.happiness > 0.7) actions.push({ action: 'chaseTail', weight: 5 * C.cat.playfulness });
        if (C.cat.energy > 0.5) actions.push({ action: 'zoomies', weight: 3 * C.cat.playfulness });

        const totalWeight = actions.reduce((s, a) => s + a.weight, 0);
        let roll = Math.random() * totalWeight;
        let chosen = 'idle';
        for (const a of actions) {
            roll -= a.weight;
            if (roll <= 0) { chosen = a.action; break; }
        }

        switch (chosen) {
            case 'walk': C.startWalk(pickWalkTarget()); break;
            case 'jump': startJump(); break;
            case 'idle': C.setState('idle'); C.cat.stateTimer = -(1 + Math.random() * 1.5); break;
            case 'scratch': C.setState('scratch'); C.showStatus('*scratch scratch*', 1500); break;
            case 'sit': C.setState('sit'); C.showStatus(randomThought(), 2000); break;
            case 'wash': C.setState('wash'); C.showStatus('*lick lick*', 2000); break;
            case 'stretch': C.setState('stretch'); C.showStatus('*streeeetch*', 1500); break;
            case 'chaseTail': C.setState('chaseTail'); C.showStatus('!!!', 1000); break;
            case 'zoomies': startZoomies(); break;
        }
    }

    function startZoomies() {
        C.setState('zoomies');
        C.cat.speed = 5;
        C.showStatus('ZOOM!', 1500);
    }

    function randomThought() {
        const soulMsg = C.soulThought();
        if (soulMsg && Math.random() < 0.4) return soulMsg;

        const t = [
            '...', '*yawn*', 'mew?', '*tail flick*', 'prrr', '*blinks*',
            '*nose twitch*', '...nya', '*ear wiggle*', 'mrrp?',
        ];
        if (C.cat.hunger < 0.3) t.push('hungry...', 'fish?', '*stares at you*');
        if (C.cat.energy < 0.35) t.push('sleepy...', '*yawwwwn*');
        if (C.cat.happiness > 0.8) t.push('*purrs loudly*');
        if (C.cat.totalPets > 5) t.push('*headbutt*', 'mew!');
        return t[Math.floor(Math.random() * t.length)];
    }

    /* ═══════════════════════════════════════════
       MAIN LOOP (~100ms tick)
       ═══════════════════════════════════════════ */

    let lastTs = 0;
    let sleepZTimer = 0;

    C.loop = function (ts) {
        if (!C.nekoEl.isConnected) return;
        if (ts - lastTs < 100) { requestAnimationFrame(C.loop); return; }
        lastTs = ts;
        C.cat.frameCount++;
        C.cat.stateTimer++;

        C.updateWorldSystems();

        // Butterfly spawning
        if (!C.butterfly && Date.now() > C.nextButterflyTime && C.cat.state !== 'sleep') {
            C.spawnButterfly();
        }
        C.updateButterfly();

        // Auto-notice butterfly
        if (C.butterfly && C.cat.state === 'idle' && C.cat.stateTimer > 5 && Math.random() < 0.08) {
            C.setState('stalk');
            C.cat.pouncePrepTime = 0;
            C.cat.pounceTarget = { x: C.butterfly.x, y: C.butterfly.y };
            C.cat.facingLeft = C.butterfly.x < C.cat.x;
            C.setSprite('alert', 0);
            C.showStatus('!', 800);
        }

        switch (C.cat.state) {

            case 'walk': {
                const dir = C.cat.facingLeft ? 'W' : 'E';
                C.setSprite(dir, C.cat.frameCount);
                const step = C.cat.speed * (C.cat.facingLeft ? -1 : 1);
                C.cat.x += step;
                // JUICE: walking dust trail
                if (C.juiceStep) C.juiceStep(C.cat.x, C.cat.y + 16, C.cat.facingLeft ? -1 : 1);
                // FREE ROAM: viewport clamp only
                C.cat.x = Math.max(CAT_HALF_W, Math.min(window.innerWidth - CAT_HALF_W, C.cat.x));
                const dist = Math.abs(C.cat.x - C.cat.targetX);
                if (dist < 4 || C.cat.stateTimer > 60) {
                    C.cat.x = (dist < 4) ? C.cat.targetX : C.cat.x;
                    if (C.cat.walkCallback) {
                        const cb = C.cat.walkCallback;
                        C.cat.walkCallback = null;
                        cb();
                    } else {
                        decideNext();
                    }
                }
                break;
            }

            case 'jump': {
                C.cat.jumpT += 0.06;
                if (C.cat.jumpT < 0.15) {
                    C.setSprite('alert', 0);
                } else {
                    const dir = C.cat.facingLeft ? 'NW' : 'NE';
                    if (C.cat.jumpT > 0.6) {
                        C.setSprite(C.cat.facingLeft ? 'SW' : 'SE', C.cat.frameCount);
                    } else {
                        C.setSprite(dir, C.cat.frameCount);
                    }
                }
                if (C.cat.jumpT >= 1) {
                    C.cat.x = C.cat.jumpTo.x;
                    C.cat.y = C.cat.jumpTo.y;
                    C.cat.jumpFrom = null;
                    C.cat.landSquash = 1.0;
                    // JUICE: landing dust + squash + tiny shake
                    if (C.juiceLand) C.juiceLand(C.cat.x, C.cat.y + 16);
                    if (C.juiceSquash) C.juiceSquash(1.3, 0.7);
                    if (C.juiceShake) C.juiceShake(2, 4);
                    decideNext();
                } else {
                    const t = C.cat.jumpT;
                    const eased = 1 - Math.pow(1 - t, 3);
                    C.cat.x = C.cat.jumpFrom.x + (C.cat.jumpTo.x - C.cat.jumpFrom.x) * eased;
                    const linearY = C.cat.jumpFrom.y + (C.cat.jumpTo.y - C.cat.jumpFrom.y) * eased;
                    const arc = -4 * 70 * t * (t - 1);
                    C.cat.y = linearY - arc;
                }
                break;
            }

            case 'idle': {
                C.setSprite('idle', 0);
                if (C.cat.stateTimer > 0) decideNext();
                break;
            }

            case 'sit': {
                C.setSprite('idle', 0);
                if (C.cat.stateTimer > 15) decideNext();
                break;
            }

            case 'scratch': {
                C.setSprite('scratchSelf', C.cat.frameCount);
                if (C.cat.stateTimer > 12) decideNext();
                break;
            }

            case 'wash': {
                C.setSprite('scratchSelf', Math.floor(C.cat.frameCount / 2));
                if (C.cat.stateTimer > 12) {
                    C.cat.happiness = Math.min(1, C.cat.happiness + 0.05);
                    decideNext();
                }
                break;
            }

            case 'stretch': {
                if (C.cat.stateTimer < 5) C.setSprite('N', 0);
                else if (C.cat.stateTimer < 10) C.setSprite('S', 0);
                else if (C.cat.stateTimer < 15) C.setSprite('idle', 0);
                else {
                    C.cat.energy = Math.min(1, C.cat.energy + 0.03);
                    decideNext();
                }
                break;
            }

            case 'chaseTail': {
                const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                const spinDir = dirs[C.cat.stateTimer % dirs.length];
                C.setSprite(spinDir, C.cat.frameCount);
                if (C.cat.stateTimer > 16) {
                    C.showStatus('*dizzy*');
                    C.cat.happiness = Math.min(1, C.cat.happiness + 0.1);
                    C.spawnStarBurst();
                    decideNext();
                }
                break;
            }

            case 'zoomies': {
                const dir = C.cat.facingLeft ? 'W' : 'E';
                C.setSprite(dir, C.cat.frameCount);
                C.cat.x += C.cat.speed * (C.cat.facingLeft ? -1 : 1);
                // JUICE: speed lines during zoomies
                if (C.juiceZoom) C.juiceZoom(C.cat.x, C.cat.y, C.cat.facingLeft ? -1 : 1);
                // FREE ROAM: bounce off viewport edges during zoomies
                if (C.cat.x <= CAT_HALF_W) { C.cat.facingLeft = false; C.cat.x = CAT_HALF_W; }
                if (C.cat.x >= window.innerWidth - CAT_HALF_W) { C.cat.facingLeft = true; C.cat.x = window.innerWidth - CAT_HALF_W; }
                if (C.cat.stateTimer > 25) {
                    C.cat.speed = 2;
                    C.cat.energy = Math.max(0, C.cat.energy - 0.08);
                    C.showStatus('*pant pant*', 1500);
                    decideNext();
                }
                break;
            }

            case 'curious': {
                C.cat.facingLeft = mouse.x < C.cat.x;
                if (C.cat.stateTimer % 4 < 2) C.setSprite('alert', 0);
                else C.setSprite('idle', 0);
                if (mouseNearCat(80)) {
                    C.cat.curiosity += 0.1;
                    if (C.cat.curiosity > 1 && Math.random() < 0.3) {
                        C.showStatus('*headbutt*');
                        C.spawnHearts(2);
                        C.cat.happiness = Math.min(1, C.cat.happiness + 0.1);
                        C.cat.curiosity = 0;
                        decideNext();
                        break;
                    }
                }
                if (C.cat.stateTimer > 15 || !mouseNearCat(300)) {
                    C.cat.curiosity = Math.max(0, C.cat.curiosity - 0.2);
                    decideNext();
                }
                break;
            }

            case 'stalk': {
                if (C.cat.stateTimer % 6 < 4) C.setSprite('alert', 0);
                else C.setSprite('S', C.cat.frameCount);
                C.cat.pouncePrepTime++;
                if (C.cat.pouncePrepTime > 12) {
                    C.setState('pounce');
                    C.cat.pouncePrepTime = 0;
                    C.showStatus('POUNCE!', 800);
                    // JUICE: pounce anticipation squash
                    if (C.juiceSquash) C.juiceSquash(0.8, 1.3);
                }
                if (C.cat.stateTimer > 30 && !C.butterfly) {
                    C.cat.pouncePrepTime = 0;
                    decideNext();
                }
                break;
            }

            case 'pounce': {
                const target = C.butterfly
                    ? { x: C.butterfly.x, y: C.cat.y }
                    : { x: C.cat.x + (C.cat.facingLeft ? -60 : 60), y: C.cat.y };
                const dir = target.x < C.cat.x ? 'W' : 'E';
                C.setSprite(dir, C.cat.frameCount);
                C.cat.x += (target.x > C.cat.x ? 6 : -6);
                // FREE ROAM: viewport clamp
                C.cat.x = Math.max(CAT_HALF_W, Math.min(window.innerWidth - CAT_HALF_W, C.cat.x));
                if (C.butterfly && Math.abs(C.cat.x - C.butterfly.x) < 50) {
                    const caught = Math.random() < 0.4;
                    if (caught) {
                        C.showStatus('*caught ' + C.butterfly.emoji + '!*', 2000);
                        C.spawnStarBurst();
                        C.cat.happiness = Math.min(1, C.cat.happiness + 0.2);
                        // JUICE: pounce impact sparkles + shake
                        if (C.juicePounce) C.juicePounce(C.cat.x, C.cat.y);
                        if (C.juiceShake) C.juiceShake(4, 6);
                    } else {
                        C.showStatus('*missed!*', 1500);
                    }
                    C.removeButterfly();
                    decideNext();
                } else if (C.cat.stateTimer > 10) {
                    C.showStatus('*missed!*', 1200);
                    if (C.butterfly) C.removeButterfly();
                    decideNext();
                }
                break;
            }

            case 'startle': {
                if (C.cat.stateTimer < 3) {
                    C.setSprite('alert', 0);
                    C.cat.x += C.cat.startleDir * 4;
                    // FREE ROAM: viewport clamp
                    C.cat.x = Math.max(CAT_HALF_W, Math.min(window.innerWidth - CAT_HALF_W, C.cat.x));
                } else if (C.cat.stateTimer < 6) {
                    C.setSprite('alert', 0);
                } else {
                    if (Math.random() < 0.15) C.showStatus('...safe?');
                    decideNext();
                }
                break;
            }

            case 'beg': {
                if (C.cat.stateTimer % 6 < 3) C.setSprite('idle', 0);
                else C.setSprite('S', 0);
                if (C.cat.stateTimer > 15) {
                    if (C.cat.hunger < 0.2) C.showStatus('*meow!* feed me?', 2000);
                    decideNext();
                }
                break;
            }

            case 'sleep': {
                if (C.cat.stateTimer < 8) {
                    C.setSprite('tired', 0);
                } else {
                    C.setSprite('sleeping', Math.floor(C.cat.stateTimer / 4));
                    sleepZTimer++;
                    if (sleepZTimer > 12) {
                        C.spawnParticle('z', C.cat.x + 20, C.cat.y - 10, 'zzz');
                        // JUICE: floating Z particles
                        if (C.juiceSleepZ) C.juiceSleepZ(C.cat.x, C.cat.y);
                        sleepZTimer = 0;
                    }
                }
                C.cat.energy = Math.min(1, C.cat.energy + 0.01);
                if (C.cat.stateTimer > 60) {
                    C.cat.energy = 0.9;
                    sleepZTimer = 0;
                    const wakeMessages = ['*wakes up*', '*stretches*', '...morning?', '*yawns biiig*'];
                    C.showStatus(wakeMessages[Math.floor(Math.random() * wakeMessages.length)]);
                    C.setState('stretch');
                }
                break;
            }

            case 'eat': {
                C.setSprite('S', C.cat.frameCount);
                if (C.cat.stateTimer % 5 === 0 && C.cat.stateTimer < 14) {
                    C.spawnParticle('*', C.cat.x + 10 + Math.random() * 12, C.cat.y, 'float');
                    // JUICE: crumb particles while eating
                    if (C.juiceEat) C.juiceEat(C.cat.x, C.cat.y + 10);
                }
                if (C.cat.stateTimer > 15) {
                    C.consumeItem();
                    C.cat.hunger = 1;
                    C.cat.happiness = Math.min(1, C.cat.happiness + 0.2);
                    C.cat.totalFeeds++;
                    C.spawnHearts(3);
                    const eatMessages = ['yum!', 'delicious!', '*nom nom*', 'mmm!'];
                    C.showStatus(eatMessages[Math.floor(Math.random() * eatMessages.length)]);
                    if (C.cat.totalFeeds % 5 === 0) {
                        C.showStatus('*food coma*', 2500);
                        C.spawnMusicNotes();
                    }
                    decideNext();
                }
                break;
            }

            case 'drink': {
                C.setSprite('S', C.cat.frameCount);
                if (C.cat.stateTimer > 18) {
                    C.consumeItem();
                    C.cat.energy = Math.min(1, C.cat.energy + 0.15);
                    C.spawnParticle('.', C.cat.x + 16, C.cat.y - 5, 'float');
                    C.showStatus('refreshing!');
                    decideNext();
                }
                break;
            }

            case 'pet': {
                C.setSprite('idle', 0);
                if (C.cat.stateTimer % 3 === 0) {
                    C.nekoEl.style.transform = `scale(2) translateX(${Math.random() < 0.5 ? 1 : -1}px)`;
                } else {
                    C.nekoEl.style.transform = 'scale(2)';
                }
                if (C.cat.stateTimer > 18) {
                    C.nekoEl.style.transform = 'scale(2)';
                    C.cat.happiness = Math.min(1, C.cat.happiness + 0.15);
                    if (C.cat.happiness > 0.9) C.spawnMusicNotes();
                    // JUICE: hearts burst when petting ends
                    if (C.juicePet) C.juicePet(C.cat.x, C.cat.y - 10);
                    decideNext();
                }
                break;
            }

            case 'chaseBall': {
                if (!C.ball.active) { decideNext(); break; }
                const dir = C.ball.x < C.cat.x ? 'W' : 'E';
                C.setSprite(dir, C.cat.frameCount);
                C.cat.facingLeft = C.ball.x < C.cat.x;
                C.cat.x += (C.ball.x > C.cat.x ? 4 : -4);
                // FREE ROAM: viewport clamp
                C.cat.x = Math.max(CAT_HALF_W, Math.min(window.innerWidth - CAT_HALF_W, C.cat.x));
                if (Math.abs(C.ball.x - C.cat.x) < 30) {
                    C.batBall(C.cat.x, C.cat.facingLeft ? -1 : 1);
                    C.showStatus('*bat!*', 800);
                    C.spawnStarBurst();
                    // JUICE: ball hit sparks + shake
                    if (C.juiceBallHit) C.juiceBallHit(C.ball.x, C.ball.y);
                    if (C.juiceShake) C.juiceShake(3, 5);
                    C.cat.happiness = Math.min(1, C.cat.happiness + 0.1);
                    C.setState('curious');
                    C.cat.stateTimer = -8;
                }
                if (C.cat.stateTimer > 40) decideNext();
                break;
            }

            case 'held': {
                // Cat is being dragged — do nothing, controls.js handles position
                if (C.cat.stateTimer % 4 < 2) C.setSprite('alert', 0);
                else C.setSprite('S', 0);
                break;
            }

            default: {
                C.setState('idle');
                C.cat.stateTimer = 0;
                break;
            }
        }

        // Landing squash
        if (C.cat.landSquash > 0) {
            C.cat.landSquash *= 0.65;
            if (C.cat.landSquash < 0.02) C.cat.landSquash = 0;
            const squashY = 1 - C.cat.landSquash * 0.3;
            const stretchX = 1 + C.cat.landSquash * 0.15;
            C.nekoEl.style.transform = `scale(${2 * stretchX}, ${2 * squashY})`;
        } else if (C.cat.state !== 'pet') {
            C.nekoEl.style.transform = 'scale(2)';
        }

        // Position — skip when being dragged
        if (C.cat.state !== 'held') {
            C.nekoEl.style.left = (C.cat.x - 16) + 'px';
            C.nekoEl.style.top = (C.cat.y - 16) + 'px';
            C.statusEl.style.left = C.cat.x + 'px';
            C.statusEl.style.top = (C.cat.y - 40) + 'px';
        }

        requestAnimationFrame(C.loop);
    };

})();
