/* ═══════════════════════════════════════════════════════
   FOXY-BEHAVIORS.JS — Behavior definition library
   All compound behavior sequences that Foxy can perform.
   Depends on: foxy-soul.js, foxy-body.js, foxy-world.js, foxy-vfx.js
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const F = window.Foxy;

    /**
     * Returns an array of available behaviors based on current context.
     * Each behavior has: name, weight, steps[]
     * Requires F.brain.setMood and F.brain.showThought to be available.
     */
    function getBehaviors() {
        const w = F.world.gather();
        const nearby = F.world.getNearby();
        const pos = F.body.getPosition();
        const traits = F.soul.traits;
        const needs = F.soul.needs;
        const W = w.screen.width;
        const setMood = F.brain.setMood;

        const behaviors = [];

        // RETURN TO CENTER — high priority when near walls to avoid edge-camping
        if (nearby.nearLeftWall || nearby.nearRightWall) {
            const centerTarget = W * (0.35 + Math.random() * 0.3);
            behaviors.push({
                name: 'return_to_center',
                weight: 3.0,
                steps: [
                    { anim: 'idle', duration: 600, thought: 'hmm...' },
                    { anim: 'run', duration: 2500, target_x: centerTarget },
                    { anim: 'idle', duration: 1000 },
                ]
            });
        }

        // INVESTIGATE — run toward something, crouch to look, then react
        if (nearby.underHeading) {
            behaviors.push({
                name: 'investigate_heading',
                weight: traits.curiosity * 1.5,
                steps: [
                    { anim: 'idle', duration: 800, thought: 'what does it say up there?' },
                    { anim: 'crouch', duration: 1500, thought: 'hmm...' },
                    { anim: 'jump', duration: 1200, thought: 'I can almost read it!' },
                    { anim: 'idle', duration: 1000 },
                ]
            });
        }

        // STALK — sneak up on something
        if (nearby.nearTree) {
            const tree = nearby.nearTree;
            behaviors.push({
                name: 'stalk_tree',
                weight: traits.caution * 1.2 + traits.boldness * 0.5,
                steps: [
                    { anim: 'crouch', duration: 1200, thought: '*sneaking...*' },
                    { anim: 'run', duration: 1500, target_x: tree.centerX, thought: '*pounce!*' },
                    { anim: 'jump', duration: 1000 },
                    { anim: 'idle', duration: 800, thought: 'got it!' },
                ]
            });
        }

        // WALL BONK — run to wall, hit it, react
        if (!nearby.nearLeftWall && !nearby.nearRightWall) {
            const wallTarget = pos.xPercent < 50 ? 15 : W - 30;
            behaviors.push({
                name: 'wall_bonk',
                weight: traits.boldness * 0.8,
                steps: [
                    { anim: 'run', duration: 2500, target_x: wallTarget, thought: 'what\'s over here?' },
                    { anim: 'hurt', duration: 1200, thought: 'ow!', onStart: () => F.soul.stats.wallBonks++ },
                    { anim: 'idle', duration: 1500, thought: '...that was a wall' },
                ]
            });
        }

        // STARGAZER — look up under the heading
        if (nearby.underHeading || nearby.centerOfScreen) {
            behaviors.push({
                name: 'stargazer',
                weight: traits.curiosity * 1.0 + (needs.energy < 40 ? 0.5 : 0),
                steps: [
                    { anim: 'idle', duration: 1500, thought: '*looks up*' },
                    { anim: 'climb', duration: 2000, thought: 'reaching for the stars...' },
                    { anim: 'idle', duration: 1200, thought: 'pretty...' },
                    { anim: 'crouch', duration: 1000 },
                ]
            });
        }

        // ZOOMIES — high energy burst
        if (needs.fun < 50 || traits.playfulness > 0.6) {
            const zoomLeft = Math.max(60, pos.x - 200);
            const zoomRight = Math.min(W - 80, pos.x + 200);
            behaviors.push({
                name: 'zoomies',
                weight: traits.playfulness * 1.5 + (needs.fun < 30 ? 1.0 : 0),
                steps: [
                    { anim: 'run', duration: 1200, target_x: zoomRight, thought: 'WHEEE!' },
                    { anim: 'run', duration: 1200, target_x: zoomLeft, thought: 'hahaha!' },
                    { anim: 'jump', duration: 1000, thought: 'YEEHAW!' },
                    { anim: 'run', duration: 800, target_x: zoomRight },
                    {
                        anim: 'idle', duration: 2000, thought: '*panting*',
                        onStart: () => { F.fulfillNeed('fun', 25); setMood('happy'); }
                    },
                ]
            });
        }

        // FIREFLY CHASE — chase fireflies
        if (w.fireflyCount > 0) {
            const chaseTarget = 30 + Math.random() * 40;
            behaviors.push({
                name: 'firefly_chase',
                weight: traits.playfulness * 1.2 + traits.curiosity * 0.5,
                steps: [
                    { anim: 'run', duration: 1500, target_x: (chaseTarget / 100) * W, thought: 'ooh a firefly!' },
                    { anim: 'jump', duration: 1000, thought: 'almost got it!' },
                    { anim: 'run', duration: 1200, target_x: ((chaseTarget + 15) / 100) * W, thought: 'come back!' },
                    { anim: 'jump', duration: 1000, thought: 'so close!' },
                    {
                        anim: 'idle', duration: 1500, thought: 'it got away...',
                        onStart: () => F.fulfillNeed('fun', 15)
                    },
                ]
            });
        }

        // PROP INVESTIGATOR — walk to a prop and check it out
        if (w.props.length > 0) {
            const chosenProp = w.props[Math.floor(Math.random() * w.props.length)];
            behaviors.push({
                name: 'investigate_prop',
                weight: traits.curiosity * 1.5,
                steps: [
                    { anim: 'run', duration: 2500, target_x: chosenProp.centerX, thought: 'what\'s that ' + chosenProp.type + '?' },
                    { anim: 'sniff', duration: 2000, thought: chosenProp.label ? 'checking out "' + chosenProp.label + '"' : 'sniff sniff' },
                    { anim: 'idle', duration: 1500, thought: chosenProp.note || 'interesting...' },
                ]
            });
        }

        // SIGN READER — specifically read signs
        const sign = w.props.find(p => p.type === 'sign');
        if (sign && Math.abs(pos.x - sign.centerX) < 100) {
            behaviors.push({
                name: 'read_sign',
                weight: traits.curiosity * 2.0,
                steps: [
                    { anim: 'sit', duration: 2000, thought: '*reading the sign*' },
                    { anim: 'idle', duration: 2000, thought: 'it says: ' + (sign.note || 'nothing...') },
                    { anim: 'look_around', duration: 1500, thought: 'who put this here?' },
                ]
            });
        }

        // TEXT READER — examine the text content
        if (nearby.underHeading) {
            behaviors.push({
                name: 'text_reader',
                weight: traits.curiosity * 1.3,
                steps: [
                    { anim: 'crouch', duration: 1200, thought: '*squints*' },
                    { anim: 'idle', duration: 2000, thought: '"Still Rendering"... what does that mean?' },
                    { anim: 'idle', duration: 1500, thought: 'am I still rendering too?' },
                ]
            });
        }

        // SCARED — get startled by nothing
        behaviors.push({
            name: 'scared',
            weight: traits.caution * 0.6,
            steps: [
                { anim: 'idle', duration: 600, thought: 'what was that?!' },
                { anim: 'hurt', duration: 1000, thought: '!!', onStart: () => setMood('scared') },
                { anim: 'run', duration: 2000, target_x: W / 2, thought: 'NOPE' },
                { anim: 'idle', duration: 1500, thought: '...false alarm', onStart: () => setMood('curious') },
            ]
        });

        // BUDDY INTERACTION — play with the Opossum
        if (w.buddy) {
            behaviors.push({
                name: 'play_with_buddy',
                weight: traits.playfulness * 2.0 + (nearby.nearBuddy ? 1.0 : 0),
                steps: [
                    { anim: 'run', duration: 1500, target_x: w.buddy.centerX, thought: 'hey friend!' },
                    { anim: 'jump', duration: 1000, thought: 'look what I can do!' },
                    { anim: 'idle', duration: 1500, thought: '*wags tail at opossum*' },
                    { anim: 'run', duration: 1000, target_x: w.buddy.centerX + 50 },
                    { anim: 'idle', duration: 1000, thought: 'you\'re quiet, I like that.' },
                ]
            });
        }

        // SNACK TIME — find food/water when needed
        const hungry = needs.hunger < 65;
        const thirsty = needs.thirst < 65;
        if (hungry || thirsty) {
            const targetType = hungry ? 'food' : 'water';
            const item = w.items.find(i => i.type === targetType);
            if (item) {
                behaviors.push({
                    name: 'snack_time',
                    weight: 2.0 + (100 - (hungry ? needs.hunger : needs.thirst)) / 10,
                    steps: [
                        { anim: 'run', duration: 1500, target_x: item.centerX, thought: hungry ? 'lunch time!' : 'staying hydrated' },
                        {
                            anim: 'sniff', duration: 1200,
                            thought: hungry ? '*crunch crunch*' : '*lap lap lap*',
                            onStart: () => {
                                var el = document.querySelector('.foxy-item[data-type="' + targetType + '"]');
                                if (el) {
                                    el.classList.add(hungry ? 'eating' : 'drinking');
                                    setTimeout(() => el.classList.remove('eating', 'drinking'), 1500);
                                }
                                if (F.vfx) {
                                    var pos = F.body.getPosition();
                                    if (hungry) F.vfx.eat(item.centerX, pos.y);
                                    else F.vfx.drink(item.centerX, pos.y);
                                }
                                if (hungry) { F.fulfillNeed('hunger', 40); needs.thirst -= 15; }
                                if (thirsty) { F.fulfillNeed('thirst', 40); needs.hunger -= 15; }
                                setMood('happy');
                            }
                        },
                        { anim: 'idle', duration: 600, thought: 'much better' },
                    ]
                });
            }
        }

        // NAP — rest when tired
        if (needs.energy < 70) {
            var napWeight = traits.laziness * 2.0 + (100 - needs.energy) / 15;
            behaviors.push({
                name: 'nap',
                weight: napWeight,
                steps: [
                    { anim: 'idle', duration: 800, thought: 'running on 2% battery...', onStart: () => setMood('sleepy') },
                    { anim: 'sit', duration: 1000, thought: '*yawns so wide jaw cracks*' },
                    { anim: 'sleep', duration: 2000, thought: 'zzz...' },
                    { anim: 'sleep', duration: 2000, thought: '*dreaming of pixels*' },
                    {
                        anim: 'idle', duration: 800, thought: '*blinks* how long was I out?',
                        onStart: () => { F.fulfillNeed('energy', 45); setMood('happy'); }
                    },
                    { anim: 'idle', duration: 500, thought: 'okay I\'m recharged let\'s GO' },
                ]
            });
        }

        // BORED — when fun is low
        if (needs.fun < 40) {
            behaviors.push({
                name: 'bored',
                weight: 1.5 + (40 - needs.fun) / 15,
                steps: [
                    { anim: 'sit', duration: 1200, thought: '*dramatic sigh*', onStart: () => setMood('bored') },
                    { anim: 'idle', duration: 1000, thought: 'boredom level: critical' },
                    { anim: 'look_around', duration: 800, thought: 'someone entertain me plz' },
                    { anim: 'idle', duration: 600, thought: 'fine I\'ll entertain myself', onStart: () => { setMood('mischievous'); F.fulfillNeed('fun', 10); } },
                ]
            });
        }

        // DEEP SLEEP — when energy is critically low OR it's night time
        const hour = new Date().getHours();
        const isNight = hour >= 23 || hour <= 6;

        if (needs.energy < 25 || (isNight && needs.energy < 80)) {
            var sleepWeight = (isNight) ? 10.0 : 5.0;
            behaviors.push({
                name: 'deep_sleep',
                weight: sleepWeight,
                steps: [
                    { anim: 'idle', duration: 600, thought: isNight ? '*half asleep*' : 'can\'t... keep... eyes...' },
                    { anim: 'hurt', duration: 500, thought: '*collapses*' },
                    { anim: 'sleep', duration: 4000, thought: 'zzz...' },
                    { anim: 'sleep', duration: 3000, thought: isNight ? '🌙' : '*snoring loudly*' },
                    { anim: 'sleep', duration: 2000, thought: '💤💤💤' },
                    {
                        anim: 'idle', duration: 1000, thought: '*wakes up confused* what year is it?',
                        onStart: () => { F.fulfillNeed('energy', 60); setMood('happy'); }
                    },
                ]
            });
        }

        // PARKOUR — chain runs and jumps
        if (traits.boldness > 0.5 && needs.energy > 40) {
            const pkLeft = Math.max(80, pos.x - 150);
            const pkRight = Math.min(W - 100, pos.x + 150);
            behaviors.push({
                name: 'parkour',
                weight: traits.boldness * 1.2 + traits.playfulness * 0.5,
                steps: [
                    { anim: 'run', duration: 800, target_x: pkRight, thought: 'parkour!' },
                    { anim: 'jump', duration: 1000 },
                    { anim: 'run', duration: 800, target_x: pkLeft },
                    { anim: 'jump', duration: 1000, thought: 'yeah!' },
                    {
                        anim: 'idle', duration: 1000, thought: 'nailed it',
                        onStart: () => F.fulfillNeed('fun', 20)
                    },
                ]
            });
        }

        // PEEK — hide behind tree and peek
        if (nearby.nearTree) {
            behaviors.push({
                name: 'peek',
                weight: traits.caution * 1.5,
                steps: [
                    { anim: 'crouch', duration: 1500, thought: '*hides*' },
                    { anim: 'peek', duration: 2000, thought: '*peeks out*' },
                    { anim: 'look_around', duration: 2000, thought: 'nobody saw me right?' },
                    { anim: 'idle', duration: 800 },
                ]
            });
        }

        // EAT — walk to the food dish when hungry
        if (needs.hunger < 65) {
            var foodItem = w.items.find(function (i) { return i.type === 'food'; });
            var foodX = foodItem ? foodItem.centerX : W * 0.75;
            behaviors.push({
                name: 'eat',
                weight: 2.5 + (100 - needs.hunger) / 15,
                steps: [
                    { anim: 'look_around', duration: 500, thought: 'so hungry...' },
                    { anim: 'run', duration: 1500, target_x: foodX, thought: 'ooh cherries!' },
                    { anim: 'sniff', duration: 600, thought: '*sniff sniff*' },
                    {
                        anim: 'crouch', duration: 1200, thought: '*crunch crunch*',
                        onStart: function () {
                            var el = document.querySelector('.foxy-item[data-type="food"]');
                            if (el) {
                                el.classList.add('eating');
                                setTimeout(function () { el.classList.remove('eating'); }, 1500);
                            }
                            if (F.vfx) {
                                var pos = F.body.getPosition();
                                F.vfx.eat(foodX, pos.y);
                            }
                            F.fulfillNeed('hunger', 35);
                            needs.thirst -= 10;
                            setMood('happy');
                        }
                    },
                    { anim: 'idle', duration: 600, thought: 'yum! that hit the spot' },
                ]
            });
        }

        // DRINK — walk to the water bowl when thirsty
        if (needs.thirst < 65) {
            var waterItem = w.items.find(function (i) { return i.type === 'water'; });
            var waterX = waterItem ? waterItem.centerX : W * 0.18;
            behaviors.push({
                name: 'drink',
                weight: 2.5 + (100 - needs.thirst) / 15,
                steps: [
                    { anim: 'idle', duration: 400, thought: 'parched...' },
                    { anim: 'run', duration: 1500, target_x: waterX, thought: 'water!' },
                    {
                        anim: 'crouch', duration: 1500, thought: '*lap lap lap*',
                        onStart: function () {
                            var el = document.querySelector('.foxy-item[data-type="water"]');
                            if (el) {
                                el.classList.add('drinking');
                                setTimeout(function () { el.classList.remove('drinking'); }, 1500);
                            }
                            if (F.vfx) {
                                var pos = F.body.getPosition();
                                F.vfx.drink(waterX, pos.y);
                            }
                            F.fulfillNeed('thirst', 40);
                            needs.hunger -= 10;
                            setMood('happy');
                        }
                    },
                    { anim: 'idle', duration: 500, thought: 'ahhhh refreshing' },
                ]
            });
        }

        // CHASE BALL — run to ball, kick it, chase it!
        if (needs.fun < 80) {
            var ballItem = w.items.find(function (i) { return i.type === 'ball'; });
            if (ballItem) {
                var ballEl = document.getElementById('itemBall');
                var kickDir = (ballItem.centerX > W / 2) ? -1 : 1;
                var kickTarget = Math.max(10, Math.min(85, (ballItem.centerX / W * 100) + kickDir * (15 + Math.random() * 20)));
                behaviors.push({
                    name: 'chase_ball',
                    weight: 2.0 + (60 - needs.fun) / 12 + traits.playfulness * 2.0,
                    steps: [
                        { anim: 'look_around', duration: 400, thought: 'ball!' },
                        { anim: 'run', duration: 1400, target_x: ballItem.centerX, thought: 'gonna get it!' },
                        {
                            anim: 'pounce', duration: 700, thought: '*POUNCE!*',
                            onStart: function () {
                                if (ballEl) {
                                    ballEl.classList.add('kicked');
                                    ballEl.style.left = kickTarget + '%';
                                    setTimeout(function () { ballEl.classList.remove('kicked'); }, 1200);
                                }
                                if (F.vfx) {
                                    F.vfx.ballKick(ballItem.centerX, F.body.getPosition().y + 20);
                                }
                                setMood('playful');
                            }
                        },
                        { anim: 'run', duration: 1200, target_x: kickTarget / 100 * W, thought: 'AGAIN!' },
                        {
                            anim: 'pounce', duration: 700, thought: '*got it!*',
                            onStart: function () {
                                F.fulfillNeed('fun', 30);
                                if (F.vfx) F.vfx.dust(kickTarget / 100 * W, F.body.getPosition().y + 20, 4);
                            }
                        },
                        { anim: 'idle', duration: 600, thought: 'best game ever' },
                    ]
                });
            }
        }

        // SIT QUIETLY — just be a normal fox
        behaviors.push({
            name: 'sit_quietly',
            weight: 0.5 + traits.laziness * 0.8,
            steps: [
                { anim: 'sit', duration: 1500 },
                { anim: 'look_around', duration: 1200 },
                { anim: 'idle', duration: 800 },
            ]
        });

        // EXPLORE — pick a random spot and go investigate
        var exploreTarget = (15 + Math.random() * 70) / 100 * W;
        behaviors.push({
            name: 'explore',
            weight: traits.curiosity * 1.8 + 0.5,
            steps: [
                { anim: 'look_around', duration: 800, thought: 'what\'s over there?' },
                { anim: 'run', duration: 1500, target_x: exploreTarget, thought: 'investigating' },
                { anim: 'sniff', duration: 1000, thought: 'sniff sniff' },
                { anim: 'climb', duration: 1000, thought: 'lemme get a better view' },
                { anim: 'idle', duration: 800, thought: F.generateThought() },
            ]
        });

        // ZOOMIES — burst of energy, run back and forth fast
        if (needs.energy > 50) {
            var zoomLeft = (5 + Math.random() * 20) / 100 * W;
            var zoomRight = (70 + Math.random() * 25) / 100 * W;
            behaviors.push({
                name: 'zoomies',
                weight: 0.8 + traits.playfulness * 1.5,
                steps: [
                    { anim: 'idle', duration: 300, thought: '*eyes go wide*', onStart: () => setMood('playful') },
                    { anim: 'run', duration: 800, target_x: zoomRight, thought: 'ZOOOOM!' },
                    { anim: 'run', duration: 800, target_x: zoomLeft, thought: 'WHEEEEE!' },
                    { anim: 'run', duration: 700, target_x: zoomRight * 0.7, thought: 'CAN\'T STOP!' },
                    { anim: 'pounce', duration: 500, thought: '*SKID*' },
                    {
                        anim: 'idle', duration: 600, thought: '*panting* that was fun',
                        onStart: () => {
                            F.fulfillNeed('fun', 20);
                            needs.energy -= 10;
                            if (F.vfx) F.vfx.dust(F.body.getPosition().x, F.body.getPosition().y + 20, 6);
                        }
                    },
                ]
            });
        }

        // CLIMB ANYTHING
        behaviors.push({
            name: 'climb_anything',
            weight: traits.boldness * 1.0 + traits.curiosity * 0.8,
            steps: [
                { anim: 'idle', duration: 500, thought: '*looks up*' },
                { anim: 'climb', duration: 2500, thought: 'climbing!', onStart: () => setMood('brave') },
                { anim: 'idle', duration: 1200, thought: 'nice view from here' },
                { anim: 'crouch', duration: 800, thought: '*hops down*' },
            ]
        });

        // CURIOUS WANDER
        var wanderSpot1 = (20 + Math.random() * 60) / 100 * W;
        var wanderSpot2 = (20 + Math.random() * 60) / 100 * W;
        behaviors.push({
            name: 'curious_wander',
            weight: traits.curiosity * 1.2 + 0.3,
            steps: [
                { anim: 'run', duration: 1500, target_x: wanderSpot1, thought: 'hmm...' },
                { anim: 'sniff', duration: 1200, thought: '*sniff sniff*' },
                { anim: 'look_around', duration: 1500, thought: 'interesting...' },
                { anim: 'run', duration: 1500, target_x: wanderSpot2, thought: 'what about here?' },
                { anim: 'sit', duration: 2000, thought: F.generateThought() },
            ]
        });

        // MISCHIEF
        if (traits.playfulness > 0.3) {
            behaviors.push({
                name: 'mischief',
                weight: traits.playfulness * 1.0,
                steps: [
                    { anim: 'sniff', duration: 800, thought: 'hehehe...', onStart: () => setMood('mischievous') },
                    { anim: 'pounce', duration: 1500, thought: '*pounce!*' },
                    { anim: 'celebrate', duration: 1800, thought: 'got it!' },
                    { anim: 'idle', duration: 1200, thought: '*looks innocent*' },
                ]
            });
        }

        // THINK
        behaviors.push({
            name: 'think',
            weight: traits.curiosity * 0.8,
            steps: [
                { anim: 'sit', duration: 3000, thought: F.generateThought() },
                { anim: 'look_around', duration: 2000, thought: F.generateThought() },
            ]
        });

        // ── PERSONALITY BEHAVIORS ──

        // DEEP SLEEP — long rest with dreaming
        if (needs.energy < 45) {
            behaviors.push({
                name: 'deep_sleep',
                weight: traits.laziness * 2.5,
                steps: [
                    { anim: 'idle', duration: 1000, thought: '*yawns big*', onStart: () => setMood('sleepy') },
                    { anim: 'sit', duration: 1500, thought: 'so sleepy...' },
                    { anim: 'sleep', duration: 5000, thought: '*dreaming of fireflies...*' },
                    { anim: 'sleep', duration: 3000, thought: '*zzz... munch munch... zzz*' },
                    {
                        anim: 'idle', duration: 2000, thought: '*yawn* ...what year is it?',
                        onStart: () => { F.fulfillNeed('energy', 50); setMood('happy'); }
                    },
                ]
            });
        }

        // CURIOUS SNIFF
        behaviors.push({
            name: 'curious_sniff',
            weight: traits.curiosity * 1.0,
            steps: [
                { anim: 'look_around', duration: 2000, thought: 'what\'s that smell?' },
                { anim: 'run', duration: 1200, target_x: (Math.random() * 0.6 + 0.2) * W },
                { anim: 'sniff', duration: 1800, thought: '*sniff sniff sniiiiiff*' },
                { anim: 'sit', duration: 2000, thought: 'smells like... adventure' },
                { anim: 'idle', duration: 1000 },
            ]
        });

        // SUNBATHING
        behaviors.push({
            name: 'sunbathe',
            weight: 0.6 + (needs.energy < 60 ? 0.5 : 0),
            steps: [
                { anim: 'sit', duration: 2000, thought: '*finds a comfy spot*' },
                { anim: 'sleep', duration: 3000, thought: 'this is nice...' },
                { anim: 'sit', duration: 1500, thought: '*stretches*' },
                {
                    anim: 'celebrate', duration: 1800, thought: 'life is good!',
                    onStart: () => { setMood('happy'); F.fulfillNeed('energy', 15); }
                },
            ]
        });

        // LOOKOUT
        behaviors.push({
            name: 'lookout',
            weight: traits.curiosity * 0.9 + traits.caution * 0.5,
            steps: [
                { anim: 'climb', duration: 2500, thought: 'gotta see everything!' },
                { anim: 'peek', duration: 2000, thought: '*scanning the horizon*' },
                { anim: 'look_around', duration: 2500, thought: 'all clear... I think' },
                { anim: 'idle', duration: 1000, thought: '*hops down*' },
            ]
        });

        // VICTORY DANCE
        if (needs.fun < 50 || traits.playfulness > 0.5) {
            behaviors.push({
                name: 'victory_dance',
                weight: traits.playfulness * 0.8,
                steps: [
                    { anim: 'idle', duration: 800, thought: 'you know what? I\'m awesome' },
                    { anim: 'celebrate', duration: 1800, thought: 'YEAH!' },
                    { anim: 'jump', duration: 1000, thought: 'woo!' },
                    { anim: 'celebrate', duration: 1800, thought: '*happy dance*' },
                    {
                        anim: 'sit', duration: 1500, thought: '*out of breath* heh',
                        onStart: () => F.fulfillNeed('fun', 25)
                    },
                ]
            });
        }

        // STALKER
        behaviors.push({
            name: 'stalker',
            weight: traits.boldness * 0.7 + traits.playfulness * 0.5,
            steps: [
                { anim: 'look_around', duration: 1500, thought: '*spots something*' },
                { anim: 'sniff', duration: 1200, thought: '*getting closer...*' },
                { anim: 'peek', duration: 1500, thought: '*ready...*' },
                { anim: 'pounce', duration: 1500, thought: '*POUNCE!*', onStart: () => setMood('brave') },
                { anim: 'celebrate', duration: 1800, thought: 'I am the mighty hunter!' },
                { anim: 'idle', duration: 1000 },
            ]
        });

        // EXISTENTIAL
        behaviors.push({
            name: 'existential',
            weight: traits.curiosity * 0.5,
            steps: [
                { anim: 'sit', duration: 2000, thought: 'why am I here?' },
                { anim: 'look_around', duration: 2000, thought: 'what is all this?' },
                { anim: 'sit', duration: 3000, thought: F.generateThought() },
                { anim: 'idle', duration: 1500, thought: '...anyway' },
            ]
        });

        // ── SLAPSTICK & FUNNY BEHAVIORS ──

        // ZOOMIES — run back and forth manically then collapse
        behaviors.push({
            name: 'zoomies',
            weight: traits.playfulness * 2.0 + 0.8,
            steps: [
                { anim: 'idle', duration: 400, thought: '...' },
                { anim: 'idle', duration: 300, thought: '!!!' },
                { anim: 'run', duration: 600, target_x: W * 0.9, thought: 'ZOOMIES!!!' },
                { anim: 'run', duration: 600, target_x: W * 0.1, thought: 'CANT STOP' },
                { anim: 'run', duration: 500, target_x: W * 0.8, thought: 'WONT STOP' },
                { anim: 'run', duration: 500, target_x: W * 0.2, thought: 'WHEEEEE' },
                { anim: 'run', duration: 400, target_x: W * 0.7 },
                { anim: 'hurt', duration: 800, thought: '*crashes*' },
                { anim: 'sit', duration: 2000, thought: '*panting*... worth it', onStart: () => { F.fulfillNeed('fun', 40); setMood('happy'); } },
            ]
        });

        // WALL BONK COMEDY
        behaviors.push({
            name: 'wall_bonk_comedy',
            weight: traits.boldness * 1.0 + 0.5,
            steps: [
                { anim: 'idle', duration: 600, thought: 'I bet I can go faster...' },
                { anim: 'run', duration: 300, target_x: W * 0.5, thought: 'warming up...' },
                { anim: 'run', duration: 800, target_x: -20, thought: 'FULL SPEED!!' },
                { anim: 'hurt', duration: 1200, thought: '*BONK*', onStart: () => setMood('scared') },
                { anim: 'sit', duration: 1500, thought: '...I saw stars' },
                { anim: 'idle', duration: 1200, thought: 'ow ow ow', onStart: () => setMood('happy') },
                { anim: 'idle', duration: 800, thought: 'totally meant to do that' },
            ]
        });

        // PEEK FROM EDGE
        behaviors.push({
            name: 'peek_from_edge',
            weight: traits.playfulness * 1.5 + traits.caution * 0.8,
            steps: [
                { anim: 'look_around', duration: 800, thought: '*looks suspicious*' },
                { anim: 'run', duration: 1000, target_x: -30, thought: 'brb!' },
                { anim: 'idle', duration: 1500, thought: '...' },
                { anim: 'peek', duration: 1000, target_x: 10, thought: '*peeks*' },
                { anim: 'idle', duration: 500, target_x: 10, thought: '...you still there?' },
                { anim: 'run', duration: 800, target_x: W * 0.3, thought: 'OK IM BACK', onStart: () => setMood('playful') },
                { anim: 'celebrate', duration: 1200, thought: 'miss me? 😏' },
            ]
        });

        // DRAMATIC FAINT
        behaviors.push({
            name: 'dramatic_faint',
            weight: traits.playfulness * 1.2,
            steps: [
                { anim: 'idle', duration: 800, thought: 'I don\'t feel so good...' },
                { anim: 'hurt', duration: 600, thought: '*gasp*' },
                { anim: 'sleep', duration: 800, thought: 'tell my story...' },
                { anim: 'sleep', duration: 2000, thought: '...' },
                { anim: 'sleep', duration: 1500, thought: '......' },
                { anim: 'idle', duration: 300, thought: 'just kidding!' },
                { anim: 'celebrate', duration: 1500, thought: 'GOTCHA 😂', onStart: () => { setMood('mischievous'); F.fulfillNeed('fun', 20); } },
            ]
        });

        // FOURTH WALL BREAK
        behaviors.push({
            name: 'fourth_wall',
            weight: 0.8,
            steps: [
                { anim: 'idle', duration: 1000, thought: 'wait...' },
                { anim: 'look_around', duration: 1500, thought: 'is someone watching me?' },
                { anim: 'idle', duration: 2000, thought: '*stares at YOU*' },
                { anim: 'idle', duration: 1500, thought: '...hi.' },
                { anim: 'idle', duration: 1200, thought: 'you know you can hire Jeff right? 👀' },
                { anim: 'celebrate', duration: 1000, thought: '😎', onStart: () => setMood('mischievous') },
            ]
        });

        // SNEAK MISSION
        behaviors.push({
            name: 'sneak_mission',
            weight: traits.caution * 1.0 + traits.playfulness * 0.8,
            steps: [
                { anim: 'idle', duration: 600, thought: '*Mission: Impossible music*' },
                { anim: 'crouch', duration: 800, thought: '*stealth mode activated*', onStart: () => setMood('brave') },
                { anim: 'crouch', duration: 2000, target_x: W * 0.6, thought: '*sneaking...*' },
                { anim: 'peek', duration: 1000, thought: '*coast is clear*' },
                { anim: 'crouch', duration: 1500, target_x: W * 0.8, thought: '*almost there...*' },
                { anim: 'celebrate', duration: 1200, thought: 'MISSION COMPLETE! 🎖️' },
                { anim: 'idle', duration: 800, thought: 'nobody saw that right?' },
            ]
        });

        // TAIL CHASE
        behaviors.push({
            name: 'tail_chase',
            weight: traits.playfulness * 1.5 + 0.3,
            steps: [
                { anim: 'look_around', duration: 800, thought: 'whats that behind me?!' },
                { anim: 'run', duration: 400, target_x: pos.x + 40, thought: '*spin*' },
                { anim: 'run', duration: 400, target_x: pos.x - 40, thought: '*spin spin*' },
                { anim: 'run', duration: 350, target_x: pos.x + 30 },
                { anim: 'run', duration: 350, target_x: pos.x - 30, thought: 'GET BACK HERE TAIL' },
                { anim: 'run', duration: 300, target_x: pos.x + 20 },
                { anim: 'hurt', duration: 800, thought: '*dizzy*' },
                { anim: 'sit', duration: 1500, thought: 'okay I give up 😵‍💫', onStart: () => F.fulfillNeed('fun', 15) },
            ]
        });

        // SHOW OFF
        behaviors.push({
            name: 'show_off',
            weight: traits.boldness * 1.0 + traits.playfulness * 1.0,
            steps: [
                { anim: 'idle', duration: 800, thought: 'hey watch this!' },
                { anim: 'jump', duration: 1000, thought: '*backflip! (kinda)*' },
                { anim: 'run', duration: 600, target_x: pos.x + 100 },
                { anim: 'jump', duration: 1000, thought: '*double jump!*' },
                { anim: 'climb', duration: 1500, thought: '*wall climb!*' },
                { anim: 'celebrate', duration: 1500, thought: 'ta-da! 🎉' },
                { anim: 'idle', duration: 1000, thought: 'Jeff taught me that', onStart: () => setMood('happy') },
            ]
        });

        // HIDE AND PEEK RIGHT EDGE
        behaviors.push({
            name: 'peek_right_edge',
            weight: traits.playfulness * 1.2 + 0.4,
            steps: [
                { anim: 'run', duration: 600, thought: 'see ya!' },
                { anim: 'run', duration: 1000, target_x: W + 30, thought: '*running away*' },
                { anim: 'idle', duration: 2000, thought: '...' },
                { anim: 'peek', duration: 1200, target_x: W - 20, thought: '*peeeek*' },
                { anim: 'idle', duration: 800, thought: 'boo! 👻' },
                { anim: 'run', duration: 800, target_x: W * 0.6, thought: 'hehe', onStart: () => setMood('mischievous') },
            ]
        });

        return behaviors;
    }

    /* ─── EXPORT ─── */

    F.behaviors = {
        get: getBehaviors,
    };

    console.log('[BEHAVIORS] Behavior library loaded (' + getBehaviors().length + ' available)');

})();
