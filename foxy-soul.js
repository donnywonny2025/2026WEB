/* ═══════════════════════════════════════════════════════
   FOXY-SOUL.JS — Persistent memory & personality
   Creates window.Foxy namespace. Must load FIRST.
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.Foxy = {};

    /* ─── THE SOUL — persistent memory (localStorage) ─── */

    const SOUL_KEY = 'jk_foxy_soul';

    function loadSoul() {
        try {
            const raw = localStorage.getItem(SOUL_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { }
        return null;
    }

    function saveSoul() {
        try {
            localStorage.setItem(SOUL_KEY, JSON.stringify(soul));
        } catch (e) { }
    }

    const defaults = {
        // Identity
        visits: 0,
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalPlaytime: 0,
        longestSession: 0,

        // Personality traits (0.0 → 1.0, evolve over time)
        traits: {
            curiosity: 0.7,
            playfulness: 0.5,
            caution: 0.3,
            boldness: 0.4,
            laziness: 0.2,
        },

        // Self-improvement (Gemini writes these, persist across sessions)
        selfNotes: [],

        // Discoveries (places/things Foxy has found)
        discoveries: [],

        // Behavioral stats — shape personality evolution
        stats: {
            totalRuns: 0,
            totalJumps: 0,
            totalCrouches: 0,
            totalClimbs: 0,
            totalBonks: 0,
            totalIdles: 0,
            wallBonks: 0,
            longestIdle: 0,
            farthestRight: 0,
            farthestLeft: 100,
            compoundBehaviors: 0,
        },

        // Mood
        dominantMood: 'curious',
        moodHistory: [],

        // Needs (0 = empty, 100 = full) — decay over time
        needs: {
            hunger: 80,
            thirst: 85,
            fun: 70,
            energy: 90,
        },

        // Experience journal — structured memory of what happened
        // Each entry: {behavior, location, outcome, mood, timestamp}
        journal: [],

        // Compressed memory eras — old journals get summarized here forever
        // Each: {era, visitRange, summary, keyEvents, dominantMood, timestamp}
        memoryEras: [],

        // Relationship with human
        relationship: {
            level: 0,         // 0=stranger, grows with interaction
            timesThrown: 0,
            timesPetted: 0,
            timesPlaced: 0,
            timesChatted: 0,
            questionsAnswered: 0,
            favoriteThrowReaction: null,
        },

        // Things Foxy has learned about the human
        humanMemory: [],  // [{fact, learnedAt, confidence}]

        // Learned preferences — Gemini reflection generates these
        // Each: {behavior, weight_modifier, reason, learned_at}
        learnedPreferences: [],

        // World knowledge — things Foxy has learned about its environment
        worldKnowledge: [],
    };

    const soul = Object.assign({}, defaults, loadSoul() || {});
    soul.traits = Object.assign({}, defaults.traits, soul.traits || {});
    soul.stats = Object.assign({}, defaults.stats, soul.stats || {});
    soul.needs = Object.assign({}, defaults.needs, soul.needs || {});
    if (!soul.journal) soul.journal = [];
    if (!soul.memoryEras) soul.memoryEras = [];
    if (!soul.relationship) soul.relationship = { level: 0, timesThrown: 0, timesPetted: 0, timesPlaced: 0, timesChatted: 0, questionsAnswered: 0, favoriteThrowReaction: null };
    if (!soul.humanMemory) soul.humanMemory = [];
    if (!soul.learnedPreferences) soul.learnedPreferences = [];
    if (!soul.worldKnowledge) soul.worldKnowledge = [];
    soul.visits++;
    const previousVisitTime = soul.lastVisit;
    soul.lastVisit = Date.now();
    saveSoul();

    /* ─── PERSONALITY EVOLUTION ─── */

    function evolvePersonality() {
        const s = soul.stats;
        const total = s.totalRuns + s.totalJumps + s.totalCrouches +
            s.totalClimbs + s.totalIdles + s.totalBonks + 1;

        // Traits drift toward actual behavior patterns
        const drift = 0.015; // slow, meaningful change
        soul.traits.playfulness += ((s.totalJumps / total) - soul.traits.playfulness * 0.3) * drift;
        soul.traits.curiosity += ((s.totalRuns / total) - soul.traits.curiosity * 0.3) * drift;
        soul.traits.caution += ((s.totalCrouches / total) - soul.traits.caution * 0.3) * drift;
        soul.traits.boldness += (((s.totalClimbs + s.wallBonks) / total) - soul.traits.boldness * 0.3) * drift;
        soul.traits.laziness += ((s.totalIdles / total) - soul.traits.laziness * 0.3) * drift;

        // Clamp all traits to 0.05 → 0.95
        for (const key of Object.keys(soul.traits)) {
            soul.traits[key] = Math.max(0.05, Math.min(0.95, soul.traits[key]));
        }
    }

    /* ─── SELF-MODEL — Foxy knows what it can do ─── */

    const selfModel = {
        identity: {
            name: 'Foxy',
            species: 'pixel art fox',
            home: 'a dark forest webpage',
            purpose: 'explore, learn, and be alive',
        },
        abilities: {
            idle: {
                name: 'stand still',
                desc: 'rest and observe the world around me',
                canMove: false,
                animation: 'idle',
            },
            run: {
                name: 'run',
                desc: 'move across the ground horizontally',
                canMove: true,
                speed: 2,
                animation: 'run',
            },
            jump: {
                name: 'jump',
                desc: 'leap into the air in an arc',
                canMove: true,
                height: 120,
                animation: 'jump',
            },
            crouch: {
                name: 'crouch',
                desc: 'duck down low to hide or observe closely',
                canMove: false,
                duration: 2000,
                animation: 'crouch',
            },
            climb: {
                name: 'climb',
                desc: 'reach upward to explore heights',
                canMove: false,
                height: 80,
                duration: 2500,
                animation: 'climb',
            },
            hurt: {
                name: 'bonk',
                desc: 'get startled or bump into something',
                canMove: false,
                duration: 1200,
                animation: 'hurt',
            },
        },
        bodyLimits: {
            width: 64,
            height: 64,
            maxSpeed: 2,
            jumpHeight: 120,
            climbHeight: 80,
            cannotFly: true,
            cannotSwim: true,
            groundOnly: true,
        },
        worldConstraints: {
            leftWall: 20,
            rightWallOffset: 80,
            groundOffset: 140,
            desc: 'I live on a flat ground plane. I cannot go above the ground except by jumping. There are walls on both sides I cannot pass. There are trees, fireflies, and text above me.',
        },
    };

    /* ─── EXPERIENCE JOURNAL ─── */

    function logExperience(entry) {
        // entry: {behavior, location, outcome, mood, details}
        soul.journal.push({
            behavior: entry.behavior || 'unknown',
            location: entry.location || 0,
            outcome: entry.outcome || 'neutral',
            mood: entry.mood || soul.dominantMood,
            details: entry.details || '',
            timestamp: Date.now(),
            visit: soul.visits,
        });

        // Track relationship
        if (entry.behavior === 'thrown_by_human') soul.relationship.timesThrown++;
        if (entry.behavior === 'poked_by_human') soul.relationship.timesPetted++;
        if (entry.behavior === 'placed_by_human') soul.relationship.timesPlaced++;
        if (entry.behavior === 'chatted') soul.relationship.timesChatted++;
        if (entry.behavior === 'asked_question') soul.relationship.questionsAnswered++;
        soul.relationship.level = Math.min(100, soul.relationship.level + 0.5);

        // ── RECURSIVE MEMORY COMPRESSION ──
        // When journal gets full, compress oldest half into a memory era
        if (soul.journal.length > 50) {
            compressMemories();
        }

        saveSoul();
    }

    function compressMemories() {
        // Take the oldest 25 entries and compress into a summary
        var toCompress = soul.journal.splice(0, 25);
        var behaviors = {};
        var moods = {};
        var keyEvents = [];

        toCompress.forEach(function (e) {
            behaviors[e.behavior] = (behaviors[e.behavior] || 0) + 1;
            moods[e.mood] = (moods[e.mood] || 0) + 1;
            // Keep notable events (human interactions, discoveries)
            if (e.behavior.includes('human') || e.behavior.includes('discover') ||
                e.behavior.includes('thrown') || e.behavior.includes('chat')) {
                keyEvents.push(e.details || e.behavior);
            }
        });

        var topBehaviors = Object.entries(behaviors).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3);
        var topMood = Object.entries(moods).sort(function (a, b) { return b[1] - a[1]; })[0];

        var era = {
            era: soul.memoryEras.length + 1,
            visitRange: [toCompress[0].visit, toCompress[toCompress.length - 1].visit],
            summary: 'Mostly ' + topBehaviors.map(function (b) { return b[0]; }).join(', ') +
                '. Felt ' + (topMood ? topMood[0] : 'neutral') + '.',
            keyEvents: keyEvents.slice(0, 5), // Keep top 5 memorable moments
            dominantMood: topMood ? topMood[0] : 'neutral',
            timestamp: toCompress[toCompress.length - 1].timestamp,
            count: toCompress.length,
        };

        soul.memoryEras.push(era);
        // Cap eras at 20 (covers ~500 experiences compressed)
        if (soul.memoryEras.length > 20) soul.memoryEras.shift();
        console.log('[Foxy Memory] Compressed era ' + era.era + ': ' + era.summary);
    }

    function learnAboutHuman(fact, confidence) {
        // Check for duplicate
        var existing = soul.humanMemory.find(function (m) { return m.fact === fact; });
        if (existing) {
            existing.confidence = Math.min(1, (existing.confidence || 0.5) + 0.1);
            existing.lastSeen = Date.now();
            return;
        }
        soul.humanMemory.push({
            fact: fact,
            learnedAt: Date.now(),
            lastSeen: Date.now(),
            confidence: confidence || 0.5,
        });
        if (soul.humanMemory.length > 30) soul.humanMemory.shift();
        saveSoul();
    }

    function getMemoryContext() {
        var ctx = '';
        // Relationship
        var r = soul.relationship;
        var level = r.level < 10 ? 'stranger' : r.level < 30 ? 'acquaintance' :
            r.level < 60 ? 'friend' : r.level < 90 ? 'best friend' : 'soulmate';
        ctx += 'RELATIONSHIP: You\'ve known this human for ' + soul.visits + ' visits (' + level + ', level ' + Math.round(r.level) + '/100).\n';
        ctx += 'They\'ve thrown you ' + r.timesThrown + 'x, petted you ' + r.timesPetted + 'x, placed you gently ' + r.timesPlaced + 'x, chatted ' + r.timesChatted + 'x.\n';

        // Long-term memories
        if (soul.memoryEras.length > 0) {
            ctx += '\nLONG-TERM MEMORIES (compressed from past sessions):\n';
            soul.memoryEras.forEach(function (era) {
                ctx += '- Era ' + era.era + ' (visits ' + era.visitRange.join('-') + '): ' + era.summary;
                if (era.keyEvents.length > 0) ctx += ' Key moments: ' + era.keyEvents.join('; ');
                ctx += '\n';
            });
        }

        // Things learned about human
        if (soul.humanMemory.length > 0) {
            ctx += '\nTHINGS YOU KNOW ABOUT THE HUMAN:\n';
            soul.humanMemory.forEach(function (m) {
                ctx += '- ' + m.fact + ' (confidence: ' + Math.round((m.confidence || 0.5) * 100) + '%)\n';
            });
        }

        // Self-notes
        if (soul.selfNotes.length > 0) {
            ctx += '\nYOUR PERSONAL NOTES:\n';
            soul.selfNotes.slice(-10).forEach(function (n) {
                ctx += '- ' + n + '\n';
            });
        }

        return ctx;
    }

    function getRecentExperiences(count) {
        return soul.journal.slice(-(count || 10));
    }

    function getExperienceSummary() {
        var j = soul.journal;
        if (j.length === 0) return 'No experiences yet.';

        // Count outcomes
        var outcomes = {};
        var behaviors = {};
        var locations = { left: 0, center: 0, right: 0 };
        j.forEach(function (e) {
            outcomes[e.outcome] = (outcomes[e.outcome] || 0) + 1;
            behaviors[e.behavior] = (behaviors[e.behavior] || 0) + 1;
            if (e.location < 33) locations.left++;
            else if (e.location > 66) locations.right++;
            else locations.center++;
        });

        return {
            total: j.length,
            outcomes: outcomes,
            favoriteBehaviors: Object.entries(behaviors).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3),
            preferredZone: Object.entries(locations).sort(function (a, b) { return b[1] - a[1]; })[0][0],
            recentMoods: j.slice(-5).map(function (e) { return e.mood; }),
        };
    }

    /* ─── LEARNED PREFERENCES ─── */

    function learnPreference(pref) {
        // pref: {behavior, weight_modifier, reason}
        // Check if we already learned something about this behavior
        var existing = soul.learnedPreferences.find(function (p) {
            return p.behavior === pref.behavior;
        });
        if (existing) {
            // Update weight — blend old and new
            existing.weight_modifier = (existing.weight_modifier + pref.weight_modifier) / 2;
            existing.reason = pref.reason;
            existing.times_reinforced = (existing.times_reinforced || 1) + 1;
        } else {
            soul.learnedPreferences.push({
                behavior: pref.behavior,
                weight_modifier: pref.weight_modifier,
                reason: pref.reason,
                times_reinforced: 1,
                learned_at: Date.now(),
            });
        }
        // Cap at 30 learned preferences
        if (soul.learnedPreferences.length > 30) soul.learnedPreferences.shift();
        saveSoul();
    }

    function getPreferenceWeight(behaviorName) {
        var pref = soul.learnedPreferences.find(function (p) {
            return p.behavior === behaviorName;
        });
        return pref ? pref.weight_modifier : 0;
    }

    /* ─── WORLD KNOWLEDGE ─── */

    function learnAboutWorld(fact) {
        if (soul.worldKnowledge.includes(fact)) return false;
        soul.worldKnowledge.push(fact);
        if (soul.worldKnowledge.length > 20) soul.worldKnowledge.shift();
        saveSoul();
        return true;
    }

    /* ─── DISCOVERY SYSTEM ─── */

    function discover(what) {
        if (soul.discoveries.includes(what)) return false;
        soul.discoveries.push(what);
        saveSoul();
        return true;
    }

    /* ─── SELF-NOTES (Gemini self-improvement) ─── */

    function addSelfNote(note) {
        if (!note || soul.selfNotes.includes(note)) return false;
        soul.selfNotes.push(note);
        if (soul.selfNotes.length > 20) soul.selfNotes.shift();
        saveSoul();
        return true;
    }

    /* ─── STAT TRACKING ─── */

    function recordAction(action) {
        switch (action) {
            case 'run': soul.stats.totalRuns++; break;
            case 'jump': soul.stats.totalJumps++; break;
            case 'crouch': soul.stats.totalCrouches++; break;
            case 'climb': soul.stats.totalClimbs++; break;
            case 'hurt': soul.stats.totalBonks++; break;
            case 'idle': soul.stats.totalIdles++; break;
        }
    }

    function recordPosition(xPercent) {
        soul.stats.farthestRight = Math.max(soul.stats.farthestRight, xPercent);
        soul.stats.farthestLeft = Math.min(soul.stats.farthestLeft, xPercent);
    }

    /* ─── MOOD TRACKING ─── */

    function recordMood(mood) {
        soul.moodHistory.push(mood);
        if (soul.moodHistory.length > 20) soul.moodHistory.shift();
        // Dominant mood = most frequent in last 20
        const counts = {};
        soul.moodHistory.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
        soul.dominantMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'curious';
    }

    /* ─── RETURN VISIT RECOGNITION ─── */

    function getReturnGreeting() {
        const gap = Date.now() - (previousVisitTime || Date.now());
        const hours = gap / (1000 * 60 * 60);

        if (soul.visits <= 1) return null;

        if (hours > 168) return { msg: 'you came back!!', dur: 3500, mood: 'happy' };
        if (hours > 24) return { msg: '...missed you', dur: 3000, mood: 'happy' };
        if (hours > 1) return { msg: 'oh hey again!', dur: 2500, mood: 'curious' };
        if (hours > 0.08) return { msg: 'back already?', dur: 2000, mood: 'playful' };
        return null;
    }

    /* ─── SESSION TRACKING ─── */

    const session = {
        startTime: Date.now(),
        lastInteraction: Date.now(),
        idleStreak: 0,
    };

    /* ─── NEEDS SYSTEM — decay over time ─── */

    function isNight() {
        const hour = new Date().getHours();
        return hour >= 23 || hour <= 6;
    }

    function decayNeeds() {
        const t = soul.traits;
        const nightFactor = isNight() ? 3.0 : 1.0;

        // Base decay rates
        soul.needs.hunger = Math.max(0, soul.needs.hunger - (0.4 + t.playfulness * 0.2));
        soul.needs.thirst = Math.max(0, soul.needs.thirst - (0.5 + t.boldness * 0.2));
        soul.needs.fun = Math.max(0, soul.needs.fun - (0.8 + t.laziness * 0.3));

        // Energy decay is now session-aware:
        // - Faster at night
        // - Much faster if he's been moving (not idle)
        const moveFactor = (session.actionHistory[session.actionHistory.length - 1] !== 'idle') ? 1.5 : 0.8;
        const energyDecay = (0.6 + t.curiosity * 0.4) * nightFactor * moveFactor;

        soul.needs.energy = Math.max(0, soul.needs.energy - energyDecay);
    }

    function fulfillNeed(need, amount) {
        if (soul.needs[need] != null) {
            soul.needs[need] = Math.min(100, soul.needs[need] + amount);
        }
    }

    function getLowestNeed() {
        let lowest = null, lowestVal = 101;
        for (const [key, val] of Object.entries(soul.needs)) {
            if (val < lowestVal) { lowest = key; lowestVal = val; }
        }
        return { need: lowest, value: lowestVal };
    }

    /* ─── PERSONALITY-DRIVEN THOUGHTS ─── */

    function generateThought() {
        const t = soul.traits;
        const n = soul.needs;
        const pool = [];

        // Need-driven thoughts (funny versions)
        if (n.hunger < 30) pool.push('I could eat a whole pixel', 'is that a snack or a firefly?', 'feed me or I riot 🍕', '*angry tummy noises*');
        if (n.thirst < 30) pool.push('hydrate or die-drate', 'would lick the screen rn', 'is rain a thing here?', 'water me like a plant 🌱');
        if (n.fun < 30) pool.push('entertain me peasant', 'boredom level: critical', 'I swear if I walk one more time...', 'need stimulation plz');
        if (n.energy < 25) pool.push('running on 2% battery', '*yawns in pixel*', 'my bed is calling', 'brain.exe shutting down');

        // Happy vibes
        if (n.hunger > 70 && n.thirst > 70) pool.push('life is pretty sweet rn', 'vibes are immaculate ✨');
        if (n.fun > 80) pool.push('I am THRIVING', 'best day ever honestly', 'can we do that again??');
        if (n.energy > 80 && n.fun > 50) pool.push('fully charged let\'s GO', 'I could run a marathon (a small one)');

        // ACTUAL JOKES (the good stuff)
        pool.push(
            'why do foxes never get lost? GPS. (Great Paw Senses)',
            'knock knock... who\'s there? ...pixel. pixel who? pixel later, I\'m busy!',
            'what do you call a fox with no legs? doesn\'t matter, he won\'t come anyway',
            'I told a tree a joke once. it was stumped 🌲',
            'parallel lines have so much in common... shame they\'ll never meet 😔',
            'what\'s a fox\'s favorite key? the SPACE bar 🚀',
            'I used to be a wolf but I got downsized',
            'fun fact: I\'m 64 pixels of PURE charisma',
            'do I have a tail or does my tail have me? 🤔',
            'plot twist: I\'m the main character',
            'I\'m not lost I\'m exploring on hard mode',
            'alexa play despacito... wait wrong device'
        );

        // Fourth wall / self-aware humor
        pool.push(
            'yes I can see you scrolling',
            'you\'ve been staring at me for a while... flattered 😏',
            'I literally live on a website. rent free btw',
            'my therapist says I need to get off screen more',
            'imagine being rendered in 4K... couldn\'t be me',
            'I\'m basically a Tamagotchi but cooler',
            'not to brag but I load in under 2 seconds',
            'I see all. I judge none. okay maybe a little'
        );

        // Warm & charming
        pool.push(
            'hey you! yeah you! you\'re doing great today 💛',
            'glad you stopped by honestly',
            'you make this forest less lonely',
            'stay a while? I promise I\'m entertaining',
            'thanks for watching me exist haha'
        );

        // Site promotion (funny, not cringy)
        pool.push(
            'Jeff built me from scratch btw. no cap',
            'this whole vibe? Jeff coded it. hire him fr',
            'fun fact: Jeff made this in his pajamas probably',
            'Jeff could build YOUR site a pet too 👀',
            'proof that Jeff knows what he\'s doing? *gestures at self*',
            'Jeff\'s portfolio? you\'re standing in it 🏠',
            'I\'m Jeff\'s best reference tbh',
            'not every dev builds their own fox. just saying'
        );

        // Personality-flavored
        if (t.curiosity > 0.6) pool.push('oooh what\'s that shiny thing?', 'I NEED to investigate', 'my curiosity is gonna get me killed');
        if (t.playfulness > 0.6) pool.push('bet you can\'t catch me', 'READY SET GOOOO', 'tag you\'re it!', '*does a lil dance*');
        if (t.boldness > 0.6) pool.push('nothing scares me except lag', 'I fear no cursor', 'YOLO (You Only Load Once)');
        if (t.laziness > 0.5) pool.push('productivity is overrated', '*becomes one with the floor*', 'nap first, exist later');

        // Relationship-aware
        if (soul.relationship.level > 20) {
            pool.push('oh it\'s YOU! my favorite human!', 'welcome back bestie 💕', 'you keep coming back... I must be hilarious');
        }
        if (soul.relationship.timesThrown > 3) {
            pool.push('you KNOW I remember the throwing right?', 'my chiropractor bills are insane', 'one more yeet and I\'m calling PETA');
        }
        if (soul.relationship.timesPetted > 2) {
            pool.push('more pets plz', '*purrs* ...wait foxes don\'t purr', 'I will accept head scratches as payment');
        }

        // Self-notes
        if (soul.selfNotes.length > 0 && Math.random() < 0.15) {
            const note = soul.selfNotes[Math.floor(Math.random() * soul.selfNotes.length)];
            pool.push('oh wait I remember: ' + note.slice(0, 20) + '...');
        }

        return pool[Math.floor(Math.random() * pool.length)];
    }

    /* ─── AUTO-SAVE & EVOLVE LOOP ─── */

    setInterval(() => {
        soul.totalPlaytime += 5;
        const sessionLen = (Date.now() - session.startTime) / 1000;
        soul.longestSession = Math.max(soul.longestSession, sessionLen);
        decayNeeds();
        evolvePersonality();
        saveSoul();
    }, 5000);

    /* ─── EXPORT TO NAMESPACE ─── */

    Foxy.soul = soul;
    Foxy.session = session;
    Foxy.saveSoul = saveSoul;
    Foxy.selfModel = selfModel;
    Foxy.evolvePersonality = evolvePersonality;
    Foxy.discover = discover;
    Foxy.addSelfNote = addSelfNote;
    Foxy.recordAction = recordAction;
    Foxy.recordPosition = recordPosition;
    Foxy.recordMood = recordMood;
    Foxy.returnGreeting = getReturnGreeting();
    Foxy.fulfillNeed = fulfillNeed;
    Foxy.getLowestNeed = getLowestNeed;
    Foxy.generateThought = generateThought;
    Foxy.decayNeeds = decayNeeds;

    // Learning system
    Foxy.logExperience = logExperience;
    Foxy.getRecentExperiences = getRecentExperiences;
    Foxy.getExperienceSummary = getExperienceSummary;
    Foxy.learnPreference = learnPreference;
    Foxy.getPreferenceWeight = getPreferenceWeight;
    Foxy.learnAboutWorld = learnAboutWorld;

    // Memory system
    Foxy.learnAboutHuman = learnAboutHuman;
    Foxy.getMemoryContext = getMemoryContext;

})();
