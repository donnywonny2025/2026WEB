/* ═══════════════════════════════════════════
   MEADOW AMBIENT v4 — Real audio + synth backup
   Proper leveling through Web Audio API
   ═══════════════════════════════════════════ */
(function () {
    'use strict';

    let ctx = null;
    let masterGain = null;
    let playing = false;
    let activeNodes = [];

    const SRC_CRICKETS = './sounds/crickets1.mp3';
    const SRC_WIND = './sounds/wind-nature2.mp3'; // 6.2MB long nature ambient
    const DOG_FILES = [
        './sounds/dog1.mp3',
        './sounds/dog2.mp3',
        './sounds/dog3.mp3',
        './sounds/dog4.mp3',
    ];

    let windAudio = null;
    let windSource = null;
    let windGain = null;

    let cricketAudio = null;
    let cricketSource = null;
    let cricketGain = null;

    let dogTimeout = null;

    function init() {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(ctx.destination);
    }

    /* ─── WIND (real sample, looped) ─── */
    function startWind() {
        windAudio = new Audio(SRC_WIND);
        windAudio.crossOrigin = 'anonymous';
        windAudio.loop = true;

        windSource = ctx.createMediaElementSource(windAudio);
        windGain = ctx.createGain();
        windGain.gain.value = 0.20; // Gentle base layer

        windSource.connect(windGain);
        windGain.connect(masterGain);
        windAudio.play().catch(() => { });
        console.log('[meadow] 💨 wind: real sample, vol=0.20');
    }

    /* ─── CRICKETS (real sample, looped) ─── */
    function startCrickets() {
        cricketAudio = new Audio(SRC_CRICKETS);
        cricketAudio.crossOrigin = 'anonymous';
        cricketAudio.loop = true;

        cricketSource = ctx.createMediaElementSource(cricketAudio);
        cricketGain = ctx.createGain();
        cricketGain.gain.value = 0.30; // Main ambient bed

        cricketSource.connect(cricketGain);
        cricketGain.connect(masterGain);
        cricketAudio.play().catch(() => { });
        console.log('[meadow] 🦗 crickets: real sample, vol=0.30');
    }

    /* ─── DOG BARKS (random, distant) ─── */
    function playDog() {
        if (!playing || !ctx) return;

        const file = DOG_FILES[Math.floor(Math.random() * DOG_FILES.length)];
        const audio = new Audio(file);
        audio.volume = 0.08 + Math.random() * 0.12; // 0.08-0.20
        audio.playbackRate = 0.75 + Math.random() * 0.5;

        console.log(`[meadow] 🐕 dog: ${file.split('/').pop()}, vol=${audio.volume.toFixed(2)}, rate=${audio.playbackRate.toFixed(2)}`);
        audio.play().catch(() => { });

        const nextDelay = 15000 + Math.random() * 30000;
        dogTimeout = setTimeout(playDog, nextDelay);
    }

    /* ─── START ─── */
    function start() {
        if (playing) return;
        if (!ctx) init();
        if (ctx.state === 'suspended') ctx.resume();
        playing = true;

        // Smooth fade in
        masterGain.gain.setValueAtTime(0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);

        startWind();
        startCrickets();

        // First dog after 10s
        dogTimeout = setTimeout(playDog, 10000);

        console.log('[meadow] ▶ ambient started');
    }

    /* ─── STOP ─── */
    function stop() {
        if (!playing) return;
        playing = false;

        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);

        setTimeout(() => {
            if (windAudio) { windAudio.pause(); windAudio = null; }
            if (cricketAudio) { cricketAudio.pause(); cricketAudio = null; }
            windSource = null; windGain = null;
            cricketSource = null; cricketGain = null;
        }, 2500);

        if (dogTimeout) { clearTimeout(dogTimeout); dogTimeout = null; }
        console.log('[meadow] ⏹ stopped');
    }

    function toggle() {
        if (playing) stop();
        else start();
        return playing;
    }

    // Wire up button
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('btnMusic');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isPlaying = toggle();
                btn.style.background = isPlaying ? 'rgba(100,180,120,0.2)' : '';
                btn.style.borderColor = isPlaying ? 'rgba(100,180,120,0.3)' : '';
                btn.textContent = isPlaying ? '🔊' : '🔇';
            });
        }
    });

    window.MeadowAmbient = { toggle, start, stop };
})();
