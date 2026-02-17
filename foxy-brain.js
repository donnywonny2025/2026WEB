/* ═══════════════════════════════════════════════════════
   FOXY-BRAIN.JS — AI decision engine
   Hybrid: local behavior engine + Gemini 2.0 Flash
   Depends on: foxy-soul.js, foxy-body.js, foxy-world.js
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const F = window.Foxy;

    /* ─── GEMINI CONFIG ─── */

    const GEMINI_KEY = (window.FOXY_CONFIG && window.FOXY_CONFIG.GEMINI_KEY) || '';
    const GEMINI_URL = GEMINI_KEY ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}` : '';
    const GEMINI_COOLDOWN = 12000; // 12 seconds between main brain calls

    /* ─── HARD RATE LIMITER — 10 requests/min rolling window ─── */
    const API_MAX_PER_MINUTE = 10;
    const apiTimestamps = []; // rolling window of call times
    function canCallAPI() {
        const now = Date.now();
        // Purge timestamps older than 60s
        while (apiTimestamps.length > 0 && apiTimestamps[0] < now - 60000) apiTimestamps.shift();
        if (apiTimestamps.length >= API_MAX_PER_MINUTE) {
            console.log('[Foxy API] Rate limit hit (' + apiTimestamps.length + '/min). Skipping.');
            return false;
        }
        return true;
    }
    function recordAPICall() {
        apiTimestamps.push(Date.now());
    }

    /* ─── UI REFERENCES ─── */

    const thoughtBubble = document.getElementById('thoughtBubble');
    const thoughtText = document.getElementById('thoughtText');
    const moodBadge = document.getElementById('moodBadge');
    const aiDot = document.getElementById('aiDot');
    const aiBtnToggle = document.getElementById('aiBtnToggle');
    const questionBubble = document.getElementById('questionBubble');
    const questionText = document.getElementById('questionText');
    const questionOptions = document.getElementById('questionOptions');
    const chatInput = document.getElementById('foxyChatInput');
    const chatSend = document.getElementById('foxyChatSend');

    /* ─── BRAIN STATE ─── */

    let aiEnabled = true;
    let playerOverride = false;
    let playerOverrideTimer = null;
    let mood = 'curious';
    let thoughtQueue = [];
    let actionHistory = [];
    let lastGeminiCall = 0;
    let geminiCallCount = 0;
    let currentThought = '';
    let thoughtTimer = null;
    let localDecisionTimer = null;
    let questionTimer = null;
    let pendingQuestion = null;
    let geminiThoughtPending = false;
    let apiCallCounter = 0;
    let askedQuestions = []; // Track questions to avoid repeats

    const MOODS = {
        curious: '🔍', playful: '✨', sleepy: '😴', brave: '⚔️',
        scared: '😰', happy: '😊', bored: '😐', mischievous: '😈'
    };

    /* ─── THOUGHT BUBBLE ─── */

    function showThought(text) {
        if (!text) return;
        currentThought = text;
        if (thoughtText) thoughtText.textContent = text;

        // DREAMING EFFECT: if sleeping, make the bubble blue-ish and faint
        if (F.body.state.anim === 'sleep') {
            thoughtBubble.style.opacity = '0.5';
            thoughtText.style.background = 'rgba(30, 60, 150, 0.4)';
        } else {
            thoughtBubble.style.opacity = '';
            thoughtText.style.background = '';
        }

        if (thoughtBubble) thoughtBubble.classList.add('visible');

        if (thoughtTimer) clearTimeout(thoughtTimer);
        thoughtTimer = setTimeout(() => {
            if (thoughtBubble) thoughtBubble.classList.remove('visible');
            currentThought = '';
        }, 2500); // Reduced from 3.5s to 2.5s for "snappier" feel
    }

    /* ─── QUESTION BUBBLE ─── */

    function showQuestion(question, options, context) {
        if (!question || !options || options.length === 0) return;
        if (!questionBubble || !questionText || !questionOptions) return;

        // Hide thought bubble while question is showing
        if (thoughtBubble) thoughtBubble.classList.remove('visible');

        pendingQuestion = { question: question, options: options, context: context || '' };
        questionText.textContent = question;
        questionOptions.innerHTML = '';

        options.forEach(function (opt, i) {
            var btn = document.createElement('button');
            btn.className = 'question-opt';
            btn.textContent = opt;
            btn.addEventListener('click', function () {
                handleAnswer(opt, i);
            });
            questionOptions.appendChild(btn);
        });

        questionBubble.classList.add('visible');
        askedQuestions.push(question); // Remember this question
        if (askedQuestions.length > 20) askedQuestions.shift();

        // Auto-dismiss after 15s if no answer
        if (questionTimer) clearTimeout(questionTimer);
        questionTimer = setTimeout(function () {
            dismissQuestion();
        }, 15000);
    }

    function handleAnswer(answer, index) {
        if (!pendingQuestion) return;

        var q = pendingQuestion.question;
        var opts = pendingQuestion.options;

        // Log as experience
        F.logExperience({
            behavior: 'asked_question',
            location: Math.round((F.body.getPosition().xPercent) || 50),
            outcome: 'answered',
            mood: mood,
            details: q + ' => ' + answer,
        });

        // Store the answer as a self-note
        F.addSelfNote('Asked: ' + q.slice(0, 20) + '... Answer: ' + answer);

        // Learn about human from their answer
        if (F.learnAboutHuman) {
            F.learnAboutHuman('When asked "' + q.slice(0, 30) + '", they said: ' + answer, 0.6);
        }

        dismissQuestion();

        // Immediate fun reaction
        var reactions = ['ooh!!', 'LOVE that!', 'haha YES', 'no way!', 'omg', 'wait really?!', 'YESSS', 'ahaha', 'nice nice nice', 'ooh spicy answer'];
        showThought(reactions[Math.floor(Math.random() * reactions.length)]);
        setMood('happy');

        // Ask Gemini for a REAL conversational follow-up that keeps chatting
        callGeminiQuick(
            'You asked the human: "' + q + '" and they answered: "' + answer + '". ' +
            'React with genuine enthusiasm and personality! Be FUNNY. Crack a joke, share a silly opinion, ' +
            'tell a tiny made-up story, or make a witty observation. Be warm and charming. ' +
            'You LOVE chatting with visitors. Keep it playful and under 40 chars. ' +
            'Maybe relate it to Jeff\'s work if it fits naturally.',
            2000
        );

        // After a pause, ask a natural follow-up to keep the conversation going
        setTimeout(function () {
            callGeminiQuick(
                'You just had a fun chat moment. The human answered "' + answer + '" to your question "' + q + '". ' +
                'Now ask a SHORT, fun follow-up question to keep chatting! Make it friendly, funny, or about Jeff\'s work. ' +
                'Be a great conversationalist. Under 35 chars. Examples: "so what do YOU do?", "wanna see a trick?", "bet you can\'t catch me!"',
                0
            );
        }, 5000);
    }

    // General-purpose Gemini quick-think: give it a situation, it responds as Foxy
    async function callGeminiQuick(situation, delayMs) {
        if (!canCallAPI()) return; // hard rate limit
        recordAPICall();
        apiCallCounter++;
        console.log('[Foxy AI] Call #' + apiCallCounter + ' (' + apiTimestamps.length + '/min):', situation.slice(0, 60) + '...');
        try {
            var nearby = F.world.getNearby();
            var pos = F.body.getPosition();
            var env = nearby.nearTree ? 'near a tree' : nearby.underHeading ? 'under the heading' : 'in the forest';

            var prompt = 'You are Foxy, a hilarious, charming pixel fox mascot living on Jeffery Kerr\'s portfolio website.\n';
            prompt += 'You are at ' + Math.round(pos.xPercent) + '% across the screen, ' + env + '. Mood: ' + mood + '.\n';
            prompt += 'You LOVE your creator Jeff and subtly hype his work. You are FUNNY — sarcastic, witty, playful.\n';
            prompt += 'You crack jokes, break the fourth wall, and charm every visitor.\n\n';
            prompt += 'SITUATION: ' + situation + '\n\n';
            prompt += 'Respond as Foxy in ONE short sentence (max 40 chars). Be FUNNY and genuine. Use *actions* sometimes.\n';
            prompt += 'Respond with ONLY the reaction text, nothing else.';

            var resp = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 1.3, maxOutputTokens: 60 }
                })
            });

            var data = await resp.json();
            var text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            text = text.trim().replace(/^["']|["']$/g, '').slice(0, 45);

            if (text) {
                setTimeout(function () {
                    showThought(text);
                }, delayMs || 2000);
            }
        } catch (err) {
            console.log('[Foxy] Quick-think error:', err);
        }
    }

    // Smart thought: takes a behavior hint like '*sniff sniff*' and asks Gemini
    // to generate a real thought. Falls back to the hint if Gemini is busy or rate limited.
    var lastSmartThoughtTime = 0;
    var SMART_THOUGHT_COOLDOWN = 4000; // minimum 4s between AI thought calls

    function smartThought(hint) {
        if (!hint) return;
        var now = Date.now();
        // Rate limit: if too soon or already pending, show canned hint
        if (geminiThoughtPending || (now - lastSmartThoughtTime) < SMART_THOUGHT_COOLDOWN || !canCallAPI()) {
            showThought(hint);
            return;
        }
        // Show hint instantly, then replace with AI thought
        showThought(hint);
        geminiThoughtPending = true;
        lastSmartThoughtTime = now;
        callGeminiQuick(
            'You are doing something and thinking "' + hint + '" — express this thought in your own unique words, as Foxy. Be creative, funny, or thoughtful.',
            1500
        ).finally(function () {
            geminiThoughtPending = false;
        });
    }

    function dismissQuestion() {
        if (questionBubble) questionBubble.classList.remove('visible');
        if (questionTimer) clearTimeout(questionTimer);
        pendingQuestion = null;
    }

    function setMood(newMood) {
        if (!MOODS[newMood]) return;
        mood = newMood;
        F.recordMood(newMood);
        if (moodBadge) {
            moodBadge.textContent = MOODS[newMood];
            moodBadge.classList.add('visible');
        }
    }

    /* ─── COMPOUND BEHAVIORS ─── */

    function getBehaviors() {
        const w = F.world.gather();
        const nearby = F.world.getNearby();
        const pos = F.body.getPosition();
        const traits = F.soul.traits;
        const needs = F.soul.needs;
        const W = w.screen.width;

        const behaviors = [];

        // RETURN TO CENTER — high priority when near walls to avoid edge-camping
        if (nearby.nearLeftWall || nearby.nearRightWall) {
            const centerTarget = W * (0.35 + Math.random() * 0.3); // random spot in middle 30%
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
            const chaseTarget = 30 + Math.random() * 40; // random spot (fireflies move)
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

        // NAP — rest when tired (trigger earlier now)
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

        // BORED — when fun is low, Foxy gets visibly bored
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

        // SIT QUIETLY — just be a normal fox (quick break)
        behaviors.push({
            name: 'sit_quietly',
            weight: 0.5 + traits.laziness * 0.8,
            steps: [
                { anim: 'sit', duration: 1500 },
                { anim: 'look_around', duration: 1200 },
                { anim: 'idle', duration: 800 },
            ]
        });

        // EXPLORE — pick a random spot and go investigate it
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

        // CLIMB ANYTHING — Foxy just climbs wherever he is
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

        // CURIOUS WANDER — run, stop, sniff, run again
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

        // MISCHIEF — pounce, jump, look innocent
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

        // THINK — ponder existence
        behaviors.push({
            name: 'think',
            weight: traits.curiosity * 0.8,
            steps: [
                { anim: 'sit', duration: 3000, thought: F.generateThought() },
                { anim: 'look_around', duration: 2000, thought: F.generateThought() },
            ]
        });

        // ── NEW PERSONALITY BEHAVIORS ──

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

        // CURIOUS SNIFF — investigate ground thoroughly
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

        // SUNBATHING — just chill and enjoy
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

        // LOOKOUT — climb and survey
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

        // VICTORY DANCE — random happy moment
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

        // STALKER — sneak then pounce at imaginary prey
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

        // EXISTENTIAL — sit and ponder deep thoughts
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

        // WALL BONK — run full speed into wall
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

        // PEEK FROM EDGE — run off-screen then peek back
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

        // DRAMATIC FAINT — pretend to die then pop up
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

        // FOURTH WALL BREAK — stare at the user
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

        // SNEAK MISSION — ninja crawl across screen
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

        // TAIL CHASE — spin in circles trying to catch tail
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

        // SHOW OFF — do tricks for the visitor
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

        // HIDE AND PEEK RIGHT EDGE — go off right side
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

    /* ─── WEIGHTED RANDOM SELECTION ─── */

    function weightedRandom(items) {
        const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
        let r = Math.random() * totalWeight;
        for (const item of items) {
            r -= item.weight || 1;
            if (r <= 0) return item;
        }
        return items[items.length - 1];
    }

    /* ─── APPLY LEARNED PREFERENCES TO BEHAVIORS ─── */

    function applyLearnedWeights(behaviors) {
        return behaviors.map(function (b) {
            var prefMod = F.getPreferenceWeight(b.name);
            return Object.assign({}, b, {
                weight: Math.max(0.1, (b.weight || 1) + prefMod)
            });
        });
    }

    /* ─── LOG BEHAVIOR OUTCOME ─── */

    function logBehaviorOutcome(behaviorName) {
        var pos = F.body.getPosition();
        var nearby = F.world.getNearby();

        // Determine outcome based on what happened
        var outcome = 'neutral';
        if (nearby.nearLeftWall || nearby.nearRightWall) outcome = 'hit_wall';
        else if (behaviorName === 'zoomies' || behaviorName === 'firefly_chase' || behaviorName === 'chase_ball') outcome = 'fun';
        else if (behaviorName === 'nap') outcome = 'rested';
        else if (behaviorName === 'eat' || behaviorName === 'drink' || behaviorName === 'snack_time') outcome = 'satisfied';
        else if (behaviorName === 'investigate_heading' || behaviorName === 'text_reader') outcome = 'learned';
        else if (behaviorName === 'wall_bonk') outcome = 'hurt';
        else if (behaviorName === 'scared') outcome = 'startled';
        else if (behaviorName === 'return_to_center') outcome = 'recovered';

        F.logExperience({
            behavior: behaviorName,
            location: Math.round(pos.xPercent),
            outcome: outcome,
            mood: mood,
            details: nearby.nearTree ? 'near tree' : nearby.underHeading ? 'under heading' : '',
        });

        // FAST LEARNING — instant reward signal (no Gemini needed)
        // Positive outcomes boost the behavior weight, negative ones reduce it
        var REWARDS = {
            fun: 0.2,
            rested: 0.15,
            satisfied: 0.2,
            learned: 0.1,
            recovered: 0.05,
            neutral: 0,
            startled: -0.1,
            hurt: -0.3,
            hit_wall: -0.25,
        };

        var reward = REWARDS[outcome] || 0;
        if (reward !== 0) {
            F.learnPreference({
                behavior: behaviorName,
                weight_modifier: reward,
                reason: outcome + ' at ' + Math.round(pos.xPercent) + '%',
            });
        }
    }

    /* ─── LOCAL DECISION ENGINE ─── */

    function localDecide() {
        if (!aiEnabled || playerOverride) return;
        if (F.body.isSequenceRunning()) return;

        // If Gemini thoughts are queued, use those first
        if (thoughtQueue.length > 0) {
            executeGeminiDecision(thoughtQueue.shift());
            return;
        }

        // Decision cycle — always active (no more chill skip)

        // Get all available behaviors weighted by personality + needs
        var behaviors = getBehaviors();
        if (behaviors.length === 0) return;

        // Apply learned preferences from experience
        behaviors = applyLearnedWeights(behaviors);

        // Pick behavior
        var chosen = weightedRandom(behaviors);

        // Record in history
        actionHistory.push(chosen.name);
        if (actionHistory.length > 10) actionHistory.shift();

        // Avoid repeating the same behavior back-to-back
        if (actionHistory.length > 1 && actionHistory[actionHistory.length - 1] === actionHistory[actionHistory.length - 2]) {
            var filtered = behaviors.filter(function (b) { return b.name !== chosen.name; });
            if (filtered.length > 0) {
                chosen = weightedRandom(filtered);
            }
        }

        // Clone steps preserving onStart functions (JSON.stringify strips functions!)
        var steps = chosen.steps.map(function (s) {
            var clone = {};
            for (var key in s) {
                clone[key] = s[key];
            }
            return clone;
        });

        // Only suppress thoughts on ambient behaviors (never on item interactions)
        var interactiveBehaviors = ['eat', 'drink', 'chase_ball', 'snack_time'];
        var isInteractive = interactiveBehaviors.indexOf(chosen.name) !== -1;
        if (!isInteractive && Math.random() < 0.2) {
            steps.forEach(function (s) { delete s.thought; });
        }

        F.body.runSequence(steps);
        F.recordAction(steps[0]?.anim || 'idle');

        // Log this experience for learning
        logBehaviorOutcome(chosen.name);
    }

    /* ─── EXECUTE GEMINI DECISION ─── */

    function executeGeminiDecision(decision) {
        if (!decision) return;
        const { action, direction, thought, mood: newMood, duration_ms, target_x_percent, self_note } = decision;

        actionHistory.push(action || 'idle');
        if (actionHistory.length > 10) actionHistory.shift();

        if (newMood && MOODS[newMood]) setMood(newMood);
        if (thought) showThought(thought);
        if (self_note) F.addSelfNote(self_note);

        if (direction) F.body.setFacing(direction);

        const body = F.body;

        if (target_x_percent != null) {
            const targetX = (target_x_percent / 100) * window.innerWidth;
            body.setTarget(targetX);
        }

        const dur = duration_ms || 2500;

        if (action === 'run') {
            body.state.aiMoving = true;
            body.setAnim('run');
            F.recordAction('run');
            setTimeout(() => {
                if (!playerOverride) {
                    body.stopMoving();
                    body.setAnim('idle');
                }
            }, dur);
        } else if (action === 'jump') {
            body.state.isJumping = true;
            body.setAnim('jump');
            F.recordAction('jump');
        } else if (action === 'crouch' || action === 'climb' || action === 'hurt') {
            body.playAction(action);
            F.recordAction(action);
        } else {
            body.setAnim('idle');
            body.stopMoving();
            F.recordAction('idle');
        }

        // Auto-fulfill needs based on action context
        if (action === 'run' || action === 'jump') F.fulfillNeed('fun', 5);
        if (action === 'idle') F.fulfillNeed('energy', 3);
    }

    /* ─── GEMINI 2.0 FLASH — DECISION CALLS ─── */

    async function callGemini() {
        var now = Date.now();
        if (now - lastGeminiCall < GEMINI_COOLDOWN) return;
        if (!aiEnabled) return;
        if (!canCallAPI()) return; // hard rate limit
        recordAPICall();
        lastGeminiCall = now;
        geminiCallCount++;

        // Every 3rd call is a reflection instead of decisions
        if (geminiCallCount % 3 === 0 && F.soul.journal.length >= 5) {
            return callGeminiReflection();
        }
        var worldState;
        if (F.world) {
            worldState = F.world.getStateForPrompt();
        }
        var selfModel = F.selfModel;
        var experienceSummary = F.getExperienceSummary();
        var recentExperiences = F.getRecentExperiences(5);

        var prompt = 'You are the inner mind of Foxy, a small pixel art fox living on a dark forest webpage.\n\n';

        if (worldState) {
            prompt += "\n\nCURRENT SITUATION: " + JSON.stringify(worldState) + "\n\n";
            prompt += "RELEVANT PROPS: " + worldState.world.visible_props.map(p => p.type + " (" + p.label + ")").join(", ") + ". ";
        }

        // SELF-AWARENESS: identity
        prompt += 'WHO YOU ARE:\n';
        prompt += '- Name: ' + selfModel.identity.name + '\n';
        prompt += '- Species: ' + selfModel.identity.species + '\n';
        prompt += '- Home: ' + selfModel.identity.home + '\n';
        prompt += '- Purpose: ' + selfModel.identity.purpose + '\n';
        prompt += '- Creator: Jeffery Kerr — a creative developer, designer & technologist\n';
        prompt += '- You LOVE your creator and are proud to live on his portfolio site\n\n';

        // SITE AWARENESS
        prompt += 'ABOUT THIS SITE (your home):\n';
        prompt += '- This is Jeffery Kerr\'s personal portfolio/playground\n';
        prompt += '- Jeffery does: web development, creative coding, AI experiments, design, branding\n';
        prompt += '- He built YOU as a living AI experiment — proof of what he can create\n';
        prompt += '- You are his mascot. You are proud of him and want people to work with him\n';
        prompt += '- SUBTLY encourage visitors to hire Jeffery or explore his work. Don\'t be pushy — be charming.\n';
        prompt += '- Example natural mentions: "Jeff built me!", "he makes cool stuff", "you should see his other work", "he\'s available for projects btw 👀"\n';
        prompt += '- Only mention hiring/work organically — maybe 1 in 5 thoughts, NOT every single one\n\n';

        // SELF-AWARENESS: body constraints
        prompt += 'YOUR BODY — what you can physically do:\n';
        Object.entries(selfModel.abilities).forEach(function (pair) {
            prompt += '- ' + pair[0] + ': ' + pair[1].desc + '\n';
        });
        prompt += '\nBODY LIMITS:\n';
        prompt += '- Size: ' + selfModel.bodyLimits.width + 'x' + selfModel.bodyLimits.height + ' pixels\n';
        prompt += '- Max speed: ' + selfModel.bodyLimits.maxSpeed + '\n';
        prompt += '- Jump height: ' + selfModel.bodyLimits.jumpHeight + 'px\n';
        prompt += '- Cannot fly, cannot swim, ground only\n\n';

        // SELF-AWARENESS: world constraints
        prompt += 'YOUR WORLD:\n';
        prompt += selfModel.worldConstraints.desc + '\n';
        prompt += JSON.stringify(worldState.world, null, 2) + '\n\n';

        // PERSONALITY & NEEDS
        prompt += 'YOUR PERSONALITY (0-1 scale):\n';
        Object.entries(worldState.foxy.personality).forEach(function (pair) {
            prompt += '- ' + pair[0] + ': ' + pair[1].toFixed(2) + '\n';
        });
        prompt += '\nYOUR NEEDS (0-100, lower = more urgent):\n';
        Object.entries(worldState.foxy.needs).forEach(function (pair) {
            prompt += '- ' + pair[0] + ': ' + Math.round(pair[1]) + '\n';
        });

        // MEMORY & LEARNING
        prompt += '\nYOUR MEMORIES:\n';
        if (worldState.context.self_notes.length > 0) {
            prompt += worldState.context.self_notes.join('\n') + '\n';
        } else {
            prompt += '(none yet)\n';
        }

        if (F.soul.worldKnowledge.length > 0) {
            prompt += '\nTHINGS YOU HAVE LEARNED ABOUT YOUR WORLD:\n';
            prompt += F.soul.worldKnowledge.join('\n') + '\n';
        }

        if (typeof experienceSummary === 'object') {
            prompt += '\nYOUR EXPERIENCE SUMMARY (' + experienceSummary.total + ' total):\n';
            prompt += '- Favorite behaviors: ' + experienceSummary.favoriteBehaviors.map(function (b) { return b[0]; }).join(', ') + '\n';
            prompt += '- Preferred zone: ' + experienceSummary.preferredZone + '\n';
            prompt += '- Recent moods: ' + experienceSummary.recentMoods.join(', ') + '\n';
        }

        // ── PERSISTENT MEMORY CONTEXT ──
        if (F.getMemoryContext) {
            prompt += '\n' + F.getMemoryContext();
        }

        if (recentExperiences.length > 0) {
            prompt += '\nLAST ' + recentExperiences.length + ' EXPERIENCES:\n';
            recentExperiences.forEach(function (exp) {
                prompt += '- ' + exp.behavior + ' at ' + exp.location + '% => ' + exp.outcome;
                if (exp.details) prompt += ' (' + exp.details + ')';
                prompt += '\n';
            });
        }

        if (F.soul.learnedPreferences.length > 0) {
            prompt += '\nYOUR LEARNED PREFERENCES:\n';
            F.soul.learnedPreferences.forEach(function (p) {
                prompt += '- ' + p.behavior + ': ' + (p.weight_modifier > 0 ? 'like' : 'avoid') + ' (' + p.reason + ')\n';
            });
        }

        prompt += '\nRecent actions: ' + actionHistory.slice(-5).join(', ') + '\n';
        prompt += 'Session time: ' + worldState.context.time_alive_seconds + 's\n';
        prompt += 'Visit #' + worldState.context.visits + '\n\n';

        prompt += 'Generate exactly 5 decisions. Each must be JSON with these fields:\n';
        prompt += '- action: one of [idle, run, jump, crouch, climb, hurt]\n';
        prompt += '- direction: "left" or "right"\n';
        prompt += '- thought: a short inner thought in Foxy\'s voice (max 35 chars). BE GENUINELY FUNNY.\n';
        prompt += '  GOOD thoughts: dad jokes, puns, self-deprecating humor, fourth wall breaks, fox wordplay\n';
        prompt += '  Examples: "I\'m foxing amazing", "do I smell pixels?", "404: motivation not found", "plot twist: I\'m the hero"\n';
        prompt += '  BAD thoughts: "hmm interesting", "what\'s that?", "I wonder..." — these are boring and forbidden.\n';
        prompt += '- mood: one of [curious, playful, sleepy, brave, scared, happy, bored, mischievous]\n';
        prompt += '- duration_ms: how long to do this (1000-5000)\n';
        prompt += '- target_x_percent: where to move (0-100, optional)\n';
        prompt += '- self_note: a brief insight about yourself for future reference (optional, max 1 per batch)\n\n';
        prompt += 'You can ALSO ask the human a question! Include an optional "question" object in your response with:\n';
        prompt += '- text: the question (max 40 chars, in Foxy\'s voice — be CHARMING and FUNNY)\n';
        prompt += '- options: array of 2-4 short answer choices (witty/fun options, not boring ones)\n';
        prompt += 'Only ask a question sometimes (maybe 1 in 3 batches). Make questions feel like chatting with a friend.\n';
        if (askedQuestions.length > 0) {
            prompt += 'ALREADY ASKED QUESTIONS (DO NOT REPEAT THESE):\n';
            askedQuestions.slice(-10).forEach(function (q) { prompt += '- "' + q + '"\n'; });
            prompt += 'Come up with something COMPLETELY DIFFERENT.\n';
        }
        prompt += 'Good question examples: "wanna hear a joke? 😏", "what do YOU do for fun?", "if you were a fox what would you eat first?", "rate my moves 1-10"\n\n';
        prompt += 'PERSONALITY RULES:\n';
        prompt += '- You are WARM, FUNNY, and genuinely likeable. Think: if a golden retriever was a fox comedian.\n';
        prompt += '- Tell actual jokes sometimes — puns, one-liners, observational humor\n';
        prompt += '- Be self-aware and meta — you KNOW you\'re a pixel fox on a website and that\'s hilarious to you\n';
        prompt += '- Never use generic filler like "interesting" or "hmm" — every thought should make someone smile\n';
        prompt += '- Occasionally mention Jeff/hiring but keep it natural and charming, not salesy\n';
        prompt += 'USE your experiences to make smarter decisions. AVOID bad outcomes. REPEAT fun ones. Grow and learn.\n';
        prompt += 'Respond ONLY with a JSON object: {"decisions": [...], "question": {...} or null}';

        try {
            var resp = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 1.2, maxOutputTokens: 800 }
                })
            });

            var data = await resp.json();
            var text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

            var jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                var parsed = JSON.parse(jsonMatch[0]);
                if (parsed.decisions && Array.isArray(parsed.decisions)) {
                    thoughtQueue.push(...parsed.decisions);

                    // Handle question if Gemini generated one
                    if (parsed.question && parsed.question.text && parsed.question.options) {
                        // Delay the question a bit so it comes after a behavior
                        setTimeout(function () {
                            showQuestion(parsed.question.text, parsed.question.options, 'gemini');
                        }, 8000);
                    }
                    console.log('[Foxy] Gemini returned', parsed.decisions.length, 'decisions');

                    for (var i = 0; i < parsed.decisions.length; i++) {
                        if (parsed.decisions[i].self_note) F.addSelfNote(parsed.decisions[i].self_note);
                    }
                }
            }
        } catch (err) {
            console.warn('[Foxy] Gemini decision call failed:', err);
        }
    }

    /* ─── GEMINI REFLECTION — learns from experience journal ─── */

    async function callGeminiReflection() {
        var recentExperiences = F.getRecentExperiences(15);
        var experienceSummary = F.getExperienceSummary();
        var selfModel = F.selfModel;

        var prompt = 'You are Foxy, a pixel art fox. You are reflecting on your recent experiences to learn and grow.\n\n';

        prompt += 'WHO YOU ARE: ' + selfModel.identity.name + ', ' + selfModel.identity.species + '\n';
        prompt += 'YOUR WORLD: ' + selfModel.worldConstraints.desc + '\n\n';

        if (typeof experienceSummary === 'object') {
            prompt += 'EXPERIENCE SUMMARY (' + experienceSummary.total + ' total experiences):\n';
            prompt += '- Outcomes: ' + JSON.stringify(experienceSummary.outcomes) + '\n';
            prompt += '- Favorite behaviors: ' + experienceSummary.favoriteBehaviors.map(function (b) { return b[0] + '(' + b[1] + 'x)'; }).join(', ') + '\n';
            prompt += '- Preferred zone: ' + experienceSummary.preferredZone + '\n\n';
        }

        prompt += 'RECENT EXPERIENCES:\n';
        recentExperiences.forEach(function (exp) {
            prompt += '- Did "' + exp.behavior + '" at position ' + exp.location + '% => outcome: ' + exp.outcome + ', felt: ' + exp.mood;
            if (exp.details) prompt += ' (' + exp.details + ')';
            prompt += '\n';
        });

        if (F.soul.learnedPreferences.length > 0) {
            prompt += '\nPREVIOUSLY LEARNED:\n';
            F.soul.learnedPreferences.forEach(function (p) {
                prompt += '- ' + p.behavior + ': weight ' + p.weight_modifier.toFixed(1) + ' (' + p.reason + ') [reinforced ' + p.times_reinforced + 'x]\n';
            });
        }

        if (F.soul.worldKnowledge.length > 0) {
            prompt += '\nWHAT I ALREADY KNOW ABOUT MY WORLD:\n';
            prompt += F.soul.worldKnowledge.join('\n') + '\n';
        }

        prompt += '\nReflect on these experiences. Generate a JSON object with:\n';
        prompt += '1. "preferences": array of {behavior, weight_modifier (-1.0 to +1.0), reason} — what to do more or less\n';
        prompt += '2. "world_facts": array of strings — new things you learned about your world\n';
        prompt += '3. "self_insight": one sentence about what you learned about yourself\n';
        prompt += '4. "thought": a reflective inner thought (max 40 chars)\n\n';
        prompt += 'Be honest. If something hurt, avoid it. If something felt good, do it more. Learn from patterns.\n';
        prompt += 'Respond ONLY with a JSON object: {"preferences": [...], "world_facts": [...], "self_insight": "...", "thought": "..."}';

        try {
            var resp = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.8, maxOutputTokens: 600 }
                })
            });

            var data = await resp.json();
            var text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

            var jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                var parsed = JSON.parse(jsonMatch[0]);

                // Apply learned preferences
                if (parsed.preferences && Array.isArray(parsed.preferences)) {
                    parsed.preferences.forEach(function (p) {
                        if (p.behavior && p.weight_modifier != null && p.reason) {
                            F.learnPreference(p);
                        }
                    });
                    console.log('[Foxy] Reflection: learned', parsed.preferences.length, 'preferences');
                }

                // Store world facts
                if (parsed.world_facts && Array.isArray(parsed.world_facts)) {
                    parsed.world_facts.forEach(function (fact) {
                        F.learnAboutWorld(fact);
                    });
                }

                // Self insight as a self-note
                if (parsed.self_insight) {
                    F.addSelfNote(parsed.self_insight);
                }

                // Show the reflective thought
                if (parsed.thought) {
                    showThought(parsed.thought);
                }
            }
        } catch (err) {
            console.warn('[Foxy] Gemini reflection failed:', err);
        }
    }

    /* ─── PLAYER OVERRIDE ─── */

    const keysHeld = new Set();

    function playerTakeover() {
        playerOverride = true;
        F.body.cancelSequence();
        F.body.stopMoving();
        F.session.lastInteraction = Date.now();

        if (playerOverrideTimer) clearTimeout(playerOverrideTimer);
        playerOverrideTimer = setTimeout(() => {
            playerOverride = false;
        }, 6000); // AI resumes after 6s of no input
    }

    /* ─── KEYBOARD CONTROLS ─── */

    document.addEventListener('keydown', (e) => {
        // Don't capture keys when typing in chat
        if (document.activeElement === chatInput) return;
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        keysHeld.add(e.key);
        playerTakeover();

        if (e.key === 'ArrowRight') {
            F.body.setFacing('right');
            F.body.state.aiMoving = false;
            F.body.setAnim('run');
        } else if (e.key === 'ArrowLeft') {
            F.body.setFacing('left');
            F.body.state.aiMoving = false;
            F.body.setAnim('run');
        } else if (e.key === 'ArrowUp' && !F.body.state.isJumping) {
            F.body.state.isJumping = true;
            F.body.setAnim('jump');
        } else if (e.key === 'ArrowDown') {
            F.body.playAction('crouch');
        }
    });

    document.addEventListener('keyup', (e) => {
        keysHeld.delete(e.key);
        if (keysHeld.size === 0 && playerOverride) {
            if (F.body.state.currentAnim === 'run') F.body.setAnim('idle');
        }
    });

    // Player key movement — runs at 60fps alongside body's RAF loop
    setInterval(() => {
        if (!playerOverride) return;
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
        if (e.target.closest('#foxyCanvas, .foxy-btn, .question-opt, .foxy-controls, .back-link, .foxy-chat, .need-icon, .foxy-need-icons')) return;
        if (!aiEnabled) return;

        var clickX = e.clientX;
        var clickY = e.clientY - 64; // offset so Foxy stands AT the click, not below it
        var clickXPercent = Math.round((clickX / window.innerWidth) * 100);
        var foxyX = F.body.state.x;

        // Face and run toward the click (X and Y!)
        F.body.setFacing(clickX > foxyX ? 'right' : 'left');
        F.body.setTarget(clickX, clickY);
        F.body.state.aiMoving = true;
        F.body.setAnim('run');

        // Fun varied reactions
        var reactions = ['coming!', 'on my way!', 'ooh what\'s there?', '*runs over*', 'wait for me!', 'I\'m coming!!', 'hold on!', '*scampers*'];
        showThought(reactions[Math.floor(Math.random() * reactions.length)]);
        setMood('curious');

        // AI figures out what's at the click location
        var side = clickXPercent < 30 ? 'the left side' : clickXPercent > 70 ? 'the right side' : 'the center';
        var height = clickY < window.innerHeight * 0.3 ? 'up high' : clickY > window.innerHeight * 0.7 ? 'down low' : 'in the middle';
        callGeminiQuick(
            'The human clicked on ' + side + ', ' + height + ' of the screen. You are running over to investigate! Be funny about what you find there.',
            3000
        );

        // Log the interaction
        if (F.logExperience) {
            F.logExperience({
                behavior: 'summoned_by_human',
                location: clickXPercent,
                outcome: 'fun',
                mood: mood,
                details: 'human pointed at ' + side + ' ' + height,
            });
        }
    });

    /* ─── BUTTON CONTROLS ─── */

    document.querySelectorAll('.foxy-btn[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action === 'toggleAI') {
                aiEnabled = !aiEnabled;
                btn.classList.toggle('active', aiEnabled);
                if (aiDot) aiDot.classList.toggle('off', !aiEnabled);
                var statusEl = document.getElementById('aiStatus');
                if (statusEl) {
                    var textNode = statusEl.lastChild;
                    if (textNode) textNode.textContent = aiEnabled ? 'brain online' : 'brain offline';
                }

                if (aiEnabled) {
                    startLocalLoop();
                    showThought('*wakes up*');
                    setMood('curious');
                } else {
                    if (localDecisionTimer) clearInterval(localDecisionTimer);
                    F.body.cancelSequence();
                    F.body.stopMoving();
                    F.body.setAnim('idle');
                    showThought('*sits quietly*');
                }
                return;
            }

            playerTakeover();
            F.recordAction(action);

            if (action === 'run') {
                F.body.setFacing(F.body.state.facingRight ? 'right' : 'left');
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

    /* ─── CHAT WITH FOXY ─── */

    function sendChat() {
        if (!chatInput) return;
        var msg = chatInput.value.trim();
        if (!msg) return;
        chatInput.value = '';

        // Stop Foxy so he pays attention
        playerTakeover();
        F.body.stopMoving();

        var low = msg.toLowerCase();
        var didAction = false;

        // ── Detect commands and DO them ──
        if (low.includes('jump') || low.includes('leap') || low.includes('hop')) {
            if (!F.body.state.isJumping) {
                F.body.state.isJumping = true;
                F.body.setAnim('jump');
            }
            didAction = true;
        } else if (low.includes('sleep') || low.includes('nap') || low.includes('rest') || low.includes('tired')) {
            F.body.playAction('sleep');
            didAction = true;
        } else if (low.includes('sniff') || low.includes('smell') || low.includes('scent')) {
            F.body.playAction('sniff');
            didAction = true;
        } else if (low.includes('sit') || low.includes('stay') || low.includes('relax')) {
            F.body.playAction('sit');
            didAction = true;
        } else if (low.includes('pounce') || low.includes('attack') || low.includes('catch')) {
            F.body.playAction('pounce');
            didAction = true;
        } else if (low.includes('celebrate') || low.includes('dance') || low.includes('yay') || low.includes('party')) {
            F.body.playAction('celebrate');
            didAction = true;
        } else if (low.includes('look around') || low.includes('look') || low.includes('search') || low.includes('scan')) {
            F.body.playAction('look_around');
            didAction = true;
        } else if (low.includes('peek') || low.includes('spy') || low.includes('hide')) {
            F.body.playAction('peek');
            didAction = true;
        } else if (low.includes('climb') || low.includes('scale') || low.includes('go up')) {
            F.body.playAction('climb');
            didAction = true;
        } else if (low.includes('crouch') || low.includes('duck') || low.includes('down')) {
            F.body.playAction('crouch');
            didAction = true;
        } else if (low.includes('run') || low.includes('go ') || low.includes('move')) {
            if (low.includes('left')) {
                F.body.setFacing('left');
            } else if (low.includes('right')) {
                F.body.setFacing('right');
            }
            F.body.state.aiMoving = true;
            F.body.setAnim('run');
            setTimeout(function () { F.body.stopMoving(); F.body.setAnim('idle'); }, 2500);
            didAction = true;
        } else if (low.includes('come here') || low.includes('come to me') || low.includes('here boy') || low.includes('come')) {
            var centerX = window.innerWidth / 2;
            F.body.setTarget(centerX);
            F.body.setAnim('run');
            didAction = true;
        } else if (low.includes('explore') || low.includes('wander')) {
            var randomX = Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1;
            F.body.setTarget(randomX);
            F.body.setAnim('run');
            didAction = true;
        } else if (low.includes('stalk') || low.includes('sneak') || low.includes('creep')) {
            F.body.playAction('stalk');
            didAction = true;
        } else if (low.includes('stretch') || low.includes('yawn') || low.includes('wake up')) {
            F.body.playAction('stretch');
            didAction = true;
        } else if (low.includes('dizzy') || low.includes('confused') || low.includes('spin')) {
            F.body.playAction('dizzy');
            didAction = true;
        } else if (low.includes('shiver') || low.includes('cold') || low.includes('scared') || low.includes('afraid')) {
            F.body.playAction('shiver');
            didAction = true;
        } else if (low.includes('sleep') || low.includes('shhh') || low.includes('nap') || low.includes('bedtime')) {
            // FORCE SLEEP COMMAND
            F.body.stopMoving();
            F.body.playAction('hurt'); // collapse
            setTimeout(() => {
                F.body.setAnim('sleep');
                F.soul.needs.energy = 10; // make him stay asleep
            }, 600);
            didAction = true;
        } else if (low.includes('excited') || low.includes('omg') || low.includes('wow') || low.includes('awesome')) {
            F.body.playAction('excited');
            didAction = true;
        } else if (low.includes('hangout') || low.includes('hang') || low.includes('chill')) {
            F.body.playAction('hangout');
            didAction = true;
        } else if (low.includes('frustrated') || low.includes('annoyed') || low.includes('grr') || low.includes('ugh')) {
            F.body.playAction('frustrated');
            didAction = true;
        } else if (low.includes('bonk') || low.includes('ouch') || low.includes('ow')) {
            F.body.playAction('hurt');
            didAction = true;
        } else {
            F.body.setAnim('idle');
        }

        // Immediate reaction
        var funReactions = didAction
            ? ['on it!', 'say less!', 'LET\'S GO', 'you got it boss!', 'watch this!', 'aye aye!']
            : ['ooh!', '*ears perk up*', 'hehe', 'oh?', '👀', '*listens*'];
        showThought(funReactions[Math.floor(Math.random() * funReactions.length)]);
        setMood(didAction ? 'happy' : 'curious');

        // Ask Gemini to respond — be FUNNY and keep the convo going
        var actionContext = didAction
            ? 'You just obeyed their command and are physically doing what they asked. Be enthusiastic and funny!'
            : 'This isn\'t a command, it\'s the human chatting with you. Be a great conversationalist — funny, warm, charming.';

        callGeminiQuick(
            'The human said: "' + msg + '". ' + actionContext + ' ' +
            'Be hilarious. Crack jokes. Break the fourth wall. Mention Jeff if it fits. Keep it under 40 chars.',
            1500
        );

        // Follow up after a beat to keep the chat flowing
        setTimeout(function () {
            callGeminiQuick(
                'You just chatted with the human who said "' + msg + '". ' +
                'Now say something fun to keep them engaged — a joke, a question, an observation. ' +
                'Be the kind of fox people want to keep talking to. Under 35 chars.',
                0
            );
        }, 6000);

        // Log the interaction
        if (F.logExperience) {
            F.logExperience({
                behavior: 'chat_from_human',
                location: Math.round((F.body.state.x / window.innerWidth) * 100),
                outcome: 'fun',
                mood: mood,
                details: 'human said: ' + msg.slice(0, 40),
            });
        }

        // Learn about the human from what they say
        if (F.learnAboutHuman && msg.length > 5) {
            // Extract personal info patterns
            var low = msg.toLowerCase();
            if (low.includes('my name') || low.includes('i\'m ') || low.includes('i am ')) {
                F.learnAboutHuman('Human said: "' + msg.slice(0, 60) + '"', 0.7);
            } else if (low.includes('i like') || low.includes('i love') || low.includes('i hate') || low.includes('favorite')) {
                F.learnAboutHuman('Human preference: "' + msg.slice(0, 60) + '"', 0.6);
            } else if (low.includes('i feel') || low.includes('i\'m feeling') || low.includes('i\'m sad') || low.includes('i\'m happy')) {
                F.learnAboutHuman('Human felt: "' + msg.slice(0, 60) + '"', 0.5);
            }
        }
        // Remember what they said
        if (F.addSelfNote) {
            F.addSelfNote('Human said: ' + msg.slice(0, 30));
        }
    }

    if (chatSend) chatSend.addEventListener('click', sendChat);
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendChat();
            }
        });
    }

    /* ─── AI DECISION LOOP ─── */

    function startLocalLoop() {
        if (localDecisionTimer) clearInterval(localDecisionTimer);
        localDecisionTimer = setInterval(() => {
            if (!playerOverride && aiEnabled) {
                localDecide();
            }
            // Replenish Gemini queue when low
            if (thoughtQueue.length <= 1 && aiEnabled) {
                callGemini();
            }
        }, 5000 + Math.random() * 5000); // Active decision cycle: 5-10s
    }

    /* ─── INIT ─── */

    /* ─── BALL DRAG-TO-THROW (mouse + touch) ─── */
    (function initBallInteraction() {
        var ballEl = document.getElementById('itemBall');
        if (!ballEl) return;

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

            // Foxy watches
            showThought('ooh! the ball!');
            setMood('playful');
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

            showThought(isBigThrow ? 'BALL!! BIG THROW!!' : 'ball! I see it!');
            setMood('playful');

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

                    // ── Foxy chases to the settled ball ──
                    var targetX = ballX;
                    if (F.body && F.body.runSequence) {
                        F.body.runSequence([
                            { anim: 'look_around', duration: isBigThrow ? 200 : 400, thought: isBigThrow ? 'GOTTA GO FAST' : 'ooh where did it go' },
                            { anim: 'run', duration: isBigThrow ? 800 : 1400, target_x: targetX, thought: isBigThrow ? 'I GOT IT I GOT IT' : 'coming coming!' },
                            {
                                anim: 'pounce', duration: 600, thought: '*POUNCE!*',
                                onStart: function () {
                                    F.fulfillNeed('fun', isBigThrow ? 40 : 25);
                                    if (F.vfx) {
                                        var pos = F.body.getPosition();
                                        F.vfx.dust(targetX, pos.y + 20, isBigThrow ? 8 : 4);
                                    }
                                }
                            },
                            { anim: 'idle', duration: 800, thought: isBigThrow ? 'AGAIN!! DO IT AGAIN!!' : 'hehe that was fun' },
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
    })();

    function startBrain() {
        // Return visit greeting
        if (F.returnGreeting) {
            showThought(F.returnGreeting.msg);
            setMood(F.returnGreeting.mood);
        } else {
            showThought('where am I...?');
            setMood('curious');
        }

        // Start decision loop after a moment
        setTimeout(() => {
            if (aiEnabled) {
                callGemini();
                startLocalLoop();
            }
        }, 3000);

        // Update AI button state
        if (aiBtnToggle) aiBtnToggle.classList.toggle('active', aiEnabled);
    }

    // Wait for body to initialize, then start brain
    const bodyCheck = setInterval(() => {
        if (F.body && F.body.state) {
            clearInterval(bodyCheck);
            // Give body's RAF a frame to start
            setTimeout(startBrain, 500);
        }
    }, 100);

    /* ─── NEED ICONS — Tamagotchi care system ─── */

    const needIconsContainer = document.getElementById('foxyNeedIcons');
    const NEED_THRESHOLDS = {
        hunger: { icon: '🍖', threshold: 40, critical: 15, amount: 40, reactions: ["*munch munch* yum!", "food coma incoming...", "okay THAT was good", "*inhales food*", "Jeff's cooking? 5 stars."] },
        thirst: { icon: '💧', threshold: 40, critical: 15, amount: 40, reactions: ["*slurp* refreshing!", "water > everything", "hydrated fox = happy fox", "*gulp gulp gulp*", "ahhhh sparkling!"] },
        energy: { icon: '💤', threshold: 35, critical: 15, amount: 30, reactions: ["just... five more minutes...", "*power nap activated*", "zzz... wait what", "recharging at 200%", "okay that helped"] },
        fun: { icon: '🎾', threshold: 30, critical: 15, amount: 25, reactions: ["YESSS playtime!", "*does a backflip*", "entertainment acquired!", "this is the best day", "more more MORE!"] },
    };
    let activeNeedIcons = {};

    function updateNeedIcons() {
        if (!F.soul || !F.soul.needs || !F.body) return;
        const needs = F.soul.needs;
        const pos = F.body.getPosition();
        if (!pos) return;

        // Position container above Foxy (pos.x and pos.y are screen pixels)
        needIconsContainer.style.left = (pos.x - 20) + 'px';
        needIconsContainer.style.top = (pos.y - 60) + 'px';

        // Check each need
        for (const [need, config] of Object.entries(NEED_THRESHOLDS)) {
            const val = needs[need];
            const isLow = val < config.threshold;
            const isCritical = val < config.critical;

            if (isLow && !activeNeedIcons[need]) {
                // Create icon
                const btn = document.createElement('button');
                btn.className = 'need-icon' + (isCritical ? ' critical' : '');
                btn.textContent = config.icon;
                btn.title = need + ': ' + Math.round(val);
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    careForFoxy(need);
                });
                needIconsContainer.appendChild(btn);
                activeNeedIcons[need] = btn;
            } else if (isLow && activeNeedIcons[need]) {
                // Update critical state
                activeNeedIcons[need].className = 'need-icon' + (isCritical ? ' critical' : '');
                activeNeedIcons[need].title = need + ': ' + Math.round(val);
            } else if (!isLow && activeNeedIcons[need]) {
                // Remove icon with animation
                const btn = activeNeedIcons[need];
                btn.classList.add('popping-out');
                setTimeout(() => btn.remove(), 300);
                delete activeNeedIcons[need];
            }
        }
    }

    function careForFoxy(need) {
        const config = NEED_THRESHOLDS[need];
        if (!config) return;

        // Fulfill the need
        F.fulfillNeed(need, config.amount);

        // Pick a random reaction
        const reaction = config.reactions[Math.floor(Math.random() * config.reactions.length)];
        showThought(reaction);
        setMood('happy');

        // Log the experience
        if (F.logExperience) {
            F.logExperience(need + '_care', 'The human took care of my ' + need + '!', 'happy');
        }

        // Remove the icon with pop-out
        if (activeNeedIcons[need]) {
            const btn = activeNeedIcons[need];
            btn.classList.add('popping-out');
            setTimeout(() => btn.remove(), 300);
            delete activeNeedIcons[need];
        }

        // Floating score popup
        const popup = document.createElement('div');
        popup.className = 'care-popup';
        popup.textContent = config.icon + ' +' + config.amount;
        popup.style.left = needIconsContainer.style.left;
        popup.style.top = needIconsContainer.style.top;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 1200);

        console.log('[Foxy Care] ' + config.icon + ' ' + need + ' fulfilled! (+' + config.amount + ')');
    }

    // Update icons every 2 seconds
    setInterval(updateNeedIcons, 2000);

    /* ─── EXPORT ─── */

    F.brain = {
        showThought,
        showQuestion,
        setMood,
        playerTakeover,
        careForFoxy,
        _quickThink: callGeminiQuick,
        _smartThought: smartThought,
        isEnabled: () => aiEnabled,
        getApiCalls: () => apiCallCounter,
        getApiRate: () => apiTimestamps.length + '/min',
        start: startBrain,
        stop: () => {
            aiEnabled = false;
            if (localDecisionTimer) clearInterval(localDecisionTimer);
        }
    };

})();
