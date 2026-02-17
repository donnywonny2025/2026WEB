/* ═══════════════════════════════════════════════════════
   FOXY-BRAIN.JS — AI decision engine & core UI
   Hybrid: local behavior engine + Gemini 2.0 Flash
   Depends on: foxy-soul.js, foxy-body.js, foxy-world.js,
               foxy-config.js, foxy-behaviors.js
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const F = window.Foxy;

    /* ─── GEMINI CONFIG ─── */

    const GEMINI_KEY = F.config?.GEMINI_KEY;
    const GEMINI_URL = GEMINI_KEY
        ? 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_KEY
        : null;
    const GEMINI_COOLDOWN = 12000;

    // ── HARD RATE LIMIT ──
    const MAX_CALLS_PER_MINUTE = 12;
    var apiTimestamps = [];
    var apiCallCounter = 0;

    function canCallAPI() {
        if (!GEMINI_URL) return false;
        var now = Date.now();
        apiTimestamps = apiTimestamps.filter(t => now - t < 60000);
        return apiTimestamps.length < MAX_CALLS_PER_MINUTE;
    }
    function recordAPICall() {
        apiTimestamps.push(Date.now());
    }

    /* ─── UI REFERENCES ─── */

    const thoughtBubble = document.getElementById('thoughtBubble');
    const thoughtText = document.getElementById('thoughtText');
    const moodBadge = document.getElementById('moodBadge');
    const questionBubble = document.getElementById('questionBubble');
    const questionText = document.getElementById('questionText');
    const questionOptions = document.getElementById('questionOptions');
    const aiBtnToggle = document.querySelector('.foxy-btn[data-action="toggleAI"]');
    const aiDot = document.getElementById('aiDot');

    /* ─── BRAIN STATE ─── */

    var mood = 'curious';
    var currentThought = '';
    var thoughtTimer = null;
    var questionTimer = null;
    var pendingQuestion = null;
    var askedQuestions = [];
    var aiEnabled = true;
    var playerOverride = false;
    var playerOverrideTimer = null;
    var localDecisionTimer = null;
    var thoughtQueue = [];
    var actionHistory = [];
    var lastGeminiCall = 0;
    var geminiCallCount = 0;
    var geminiThoughtPending = false;

    const MOODS = {
        curious: '🦊', playful: '🎮', sleepy: '😴', brave: '🦁',
        scared: '😰', happy: '🥳', bored: '😑', mischievous: '😈',
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
        }, 2500);
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
        askedQuestions.push(question);
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

    // Smart thought: takes a behavior hint and asks Gemini
    var lastSmartThoughtTime = 0;
    var SMART_THOUGHT_COOLDOWN = 4000;

    function smartThought(hint) {
        if (!hint) return;
        var now = Date.now();
        if (geminiThoughtPending || (now - lastSmartThoughtTime) < SMART_THOUGHT_COOLDOWN || !canCallAPI()) {
            showThought(hint);
            return;
        }
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
            setTimeout(() => moodBadge.classList.remove('visible'), 3000);
        }
    }

    /* ─── UTILITY FUNCTIONS ─── */

    function weightedRandom(items) {
        var total = items.reduce(function (sum, item) { return sum + (item.weight || 1); }, 0);
        var r = Math.random() * total;
        var cumulative = 0;
        for (var i = 0; i < items.length; i++) {
            cumulative += items[i].weight || 1;
            if (r <= cumulative) return items[i];
        }
        return items[items.length - 1];
    }

    function applyLearnedWeights(behaviors) {
        if (!F.soul.learnedPreferences || F.soul.learnedPreferences.length === 0) return behaviors;
        var prefMap = {};
        F.soul.learnedPreferences.forEach(function (p) {
            prefMap[p.behavior] = (prefMap[p.behavior] || 0) + p.weight_modifier;
        });
        return behaviors.map(function (b) {
            if (prefMap[b.name]) {
                return Object.assign({}, b, { weight: Math.max(0.1, b.weight + prefMap[b.name]) });
            }
            return b;
        });
    }

    function logBehaviorOutcome(behaviorName) {
        var pos = F.body.getPosition();
        var nearby = F.world.getNearby();

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

        // FAST LEARNING — instant reward signal
        var REWARDS = {
            fun: 0.2, rested: 0.15, satisfied: 0.2, learned: 0.1,
            recovered: 0.05, neutral: 0, startled: -0.1, hurt: -0.3, hit_wall: -0.25,
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

        // Get all available behaviors from the behaviors module
        var behaviors = F.behaviors.get();
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
        if (!canCallAPI()) return;
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

        // Position container above Foxy
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
        _isPlayerOverride: () => playerOverride,
        isEnabled: () => aiEnabled,
        getApiCalls: () => apiCallCounter,
        getApiRate: () => apiTimestamps.length + '/min',
        start: startBrain,
        stop: () => {
            aiEnabled = false;
            if (localDecisionTimer) clearInterval(localDecisionTimer);
        }
    };

    console.log('[BRAIN] AI decision engine loaded (' +
        (GEMINI_URL ? 'Gemini connected' : 'Gemini offline — no API key') + ')');

})();
