/* ═══════════════════════════════════════════════════════
   FOXY-CHAT.JS — Chat system & user conversation
   Handles chat input, command detection, and Gemini conversation.
   Depends on: foxy-soul.js, foxy-body.js, foxy-brain.js
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const F = window.Foxy;

    const chatInput = document.getElementById('foxyChatInput');
    const chatSend = document.getElementById('foxyChatSend');

    if (!chatInput) {
        console.log('[CHAT] No chat input found, skipping chat module');
        return;
    }

    function sendChat() {
        var msg = chatInput.value.trim();
        if (!msg) return;
        chatInput.value = '';

        // Stop Foxy so he pays attention
        if (F.brain) F.brain.playerTakeover();
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
        } else if (low.includes('shhh') || low.includes('bedtime')) {
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
        if (F.brain) {
            F.brain.showThought(funReactions[Math.floor(Math.random() * funReactions.length)]);
            F.brain.setMood(didAction ? 'happy' : 'curious');
        }

        // Ask Gemini to respond
        var actionContext = didAction
            ? 'You just obeyed their command and are physically doing what they asked. Be enthusiastic and funny!'
            : 'This isn\'t a command, it\'s the human chatting with you. Be a great conversationalist — funny, warm, charming.';

        if (F.brain && F.brain._quickThink) {
            F.brain._quickThink(
                'The human said: "' + msg + '". ' + actionContext + ' ' +
                'Be hilarious. Crack jokes. Break the fourth wall. Mention Jeff if it fits. Keep it under 40 chars.',
                1500
            );

            // Follow up after a beat
            setTimeout(function () {
                F.brain._quickThink(
                    'You just chatted with the human who said "' + msg + '". ' +
                    'Now say something fun to keep them engaged — a joke, a question, an observation. ' +
                    'Be the kind of fox people want to keep talking to. Under 35 chars.',
                    0
                );
            }, 6000);
        }

        // Log the interaction
        if (F.logExperience) {
            F.logExperience({
                behavior: 'chat_from_human',
                location: Math.round((F.body.state.x / window.innerWidth) * 100),
                outcome: 'fun',
                mood: F.soul.dominantMood || 'curious',
                details: 'human said: ' + msg.slice(0, 40),
            });
        }

        // Learn about the human from what they say
        if (F.learnAboutHuman && msg.length > 5) {
            var lowMsg = msg.toLowerCase();
            if (lowMsg.includes('my name') || lowMsg.includes('i\'m ') || lowMsg.includes('i am ')) {
                F.learnAboutHuman('Human said: "' + msg.slice(0, 60) + '"', 0.7);
            } else if (lowMsg.includes('i like') || lowMsg.includes('i love') || lowMsg.includes('i hate') || lowMsg.includes('favorite')) {
                F.learnAboutHuman('Human preference: "' + msg.slice(0, 60) + '"', 0.6);
            } else if (lowMsg.includes('i feel') || lowMsg.includes('i\'m feeling') || lowMsg.includes('i\'m sad') || lowMsg.includes('i\'m happy')) {
                F.learnAboutHuman('Human felt: "' + msg.slice(0, 60) + '"', 0.5);
            }
        }

        // Remember what they said
        if (F.addSelfNote) {
            F.addSelfNote('Human said: ' + msg.slice(0, 30));
        }
    }

    // ── Event Listeners ──
    chatSend.addEventListener('click', sendChat);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendChat();
        }
    });

    /* ─── EXPORT ─── */

    F.chat = {
        send: sendChat,
    };

    console.log('[CHAT] Chat module ready');

})();
