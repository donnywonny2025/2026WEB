/* ═══════════════════════════════════════════════════════
   CAT-SOUL.JS — Persistent memory & session tracking
   Creates window.Cat namespace. Must load FIRST.
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.Cat = {};

    /* ─── THE SOUL — persistent memory (localStorage) ─── */

    const SOUL_KEY = 'jk_cat_soul';

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
        xp: 0,
        bond: 0,
        visits: 0,
        totalPets: 0,
        totalFeeds: 0,
        totalCatches: 0,
        totalClicks: 0,
        discoveries: [],
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        longestSession: 0,
        secretsFound: 0,
        totalPlaytime: 0,
        cardsRevealed: 0,
        pageRendered: false,
    };

    const soul = Object.assign({}, defaults, loadSoul() || {});
    soul.visits++;
    const previousVisitTime = soul.lastVisit;
    soul.lastVisit = Date.now();
    saveSoul();

    function getBondLevel() {
        if (soul.bond >= 75) return 'soulmate';
        if (soul.bond >= 50) return 'bestfriend';
        if (soul.bond >= 25) return 'friend';
        if (soul.bond >= 10) return 'acquaintance';
        return 'stranger';
    }

    function addXP(amount) {
        soul.xp += amount;
        const bondGain = amount * 0.1 * (1 - soul.bond / 120);
        soul.bond = Math.min(100, soul.bond + Math.max(0.01, bondGain));
        checkRevealThresholds();
    }

    function discover(what) {
        if (soul.discoveries.includes(what)) return false;
        soul.discoveries.push(what);
        soul.secretsFound++;
        addXP(15);
        return true;
    }

    /* ─── SESSION ENGAGEMENT ─── */

    const session = {
        engagement: 0,
        maxEngagement: 0,
        lastInteraction: Date.now(),
        startTime: Date.now(),
        clickBurst: [],
        totalClicks: 0,
        spawnItems: [],
    };

    function addEngagement(amount) {
        session.engagement = Math.min(100, session.engagement + amount);
        session.maxEngagement = Math.max(session.maxEngagement, session.engagement);
        session.lastInteraction = Date.now();
        addXP(amount * 0.5);
    }

    function decayEngagement() {
        const idle = (Date.now() - session.lastInteraction) / 1000;
        if (idle > 30) {
            session.engagement = Math.max(0, session.engagement - 0.05);
        } else if (idle > 15) {
            session.engagement = Math.max(0, session.engagement - 0.02);
        }
    }

    function checkRevealThresholds() {
        // Future: cards/page transforms at engagement milestones
    }

    /* ─── RETURN VISIT RECOGNITION ─── */

    function getReturnGreeting() {
        const gap = Date.now() - (previousVisitTime || Date.now());
        const hours = gap / (1000 * 60 * 60);

        if (soul.visits <= 1) return null;

        if (hours > 168) return { msg: 'you came back!!', dur: 3000, hearts: 4, startAsleep: true };
        if (hours > 24) return { msg: '...missed you', dur: 2500, hearts: 2, startAsleep: true };
        if (hours > 1) return { msg: 'oh hey!', dur: 2000, hearts: 1, startAsleep: false };
        if (hours > 0.08) return { msg: 'back already?', dur: 1800, hearts: 0, startAsleep: false };
        return null;
    }

    /* ─── SOUL-AWARE THOUGHTS ─── */

    function soulThought() {
        const level = getBondLevel();
        const hour = new Date().getHours();
        const thoughts = [];

        thoughts.push('...', '*yawn*', 'mew?', '*sparkle*', '*blinks*');

        if (level === 'acquaintance' || level === 'friend' || level === 'bestfriend' || level === 'soulmate') {
            thoughts.push("you're back!", 'remember me?', '*happy tail*');
        }

        if (level === 'friend' || level === 'bestfriend' || level === 'soulmate') {
            if (hour >= 6 && hour < 12) thoughts.push('good morning', 'nice morning...');
            else if (hour >= 12 && hour < 17) thoughts.push('afternoon...', 'nice day');
            else if (hour >= 17 && hour < 22) thoughts.push('nice evening...');
            else thoughts.push('up late?', 'night owl...');
            thoughts.push('glad you\'re here', '*purrs softly*', 'try clicking around...', '*winks*');
        }

        if (level === 'bestfriend' || level === 'soulmate') {
            thoughts.push('you\'re my favorite', '*shows belly*', 'play with me?', 'I found something!');
            if (soul.totalCatches > 5) thoughts.push('I\'m getting good at catching!');
            if (soul.totalPets > 20) thoughts.push('I love pats');
        }

        if (level === 'soulmate') {
            thoughts.push('hi :)', 'best friends forever', '*doing a little dance*');
            if (soul.visits > 50) thoughts.push('visit #' + soul.visits + '!');
        }

        return thoughts[Math.floor(Math.random() * thoughts.length)];
    }

    /* ─── GIFT SYSTEM ─── */

    const giftPool = ['*flower*', '*clover*', '*feather*', '*shell*', '*moon*', '*star*'];
    const rareGiftPool = ['*gem*', '*key*', '*scroll*', '*note*'];

    function catBringsGift() {
        if (soul.bond < 20) return false;
        if (Math.random() > 0.08) return false;
        const pool = soul.bond > 60 ? giftPool.concat(rareGiftPool) : giftPool;
        const gift = pool[Math.floor(Math.random() * pool.length)];
        if (discover('gift_' + gift)) {
            return { gift, isNew: true };
        }
        return { gift, isNew: false };
    }

    /* ─── AUTO-SAVE LOOP ─── */

    setInterval(() => {
        soul.totalPlaytime += 5;
        const sessionLen = (Date.now() - session.startTime) / 1000;
        soul.longestSession = Math.max(soul.longestSession, sessionLen);
        decayEngagement();
        saveSoul();
    }, 5000);

    /* ─── EXPORT TO NAMESPACE ─── */

    Cat.soul = soul;
    Cat.session = session;
    Cat.saveSoul = saveSoul;
    Cat.getBondLevel = getBondLevel;
    Cat.addXP = addXP;
    Cat.discover = discover;
    Cat.addEngagement = addEngagement;
    Cat.decayEngagement = decayEngagement;
    Cat.checkRevealThresholds = checkRevealThresholds;
    Cat.returnGreeting = getReturnGreeting();
    Cat.soulThought = soulThought;
    Cat.catBringsGift = catBringsGift;

})();
