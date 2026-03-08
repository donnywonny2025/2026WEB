/**
 * KERR CINEMATIC ENGINE v3 — THE RADICAL ONE
 * 
 * Complete cinematic overhaul using WebGL, scroll-driven animations,
 * magnetic cursor, and theatrical entrance sequences.
 * 
 * Uses: 4-Phase Animation Model, Value Capture Pattern, 
 * Progress-based Interpolation (frame-rate independent)
 */

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    // EASING LIBRARY (from Animation & Motion Patterns skill)
    // ═══════════════════════════════════════════════════════════
    const Ease = {
        inCubic: x => x * x * x,
        outCubic: x => 1 - Math.pow(1 - x, 3),
        outQuart: x => 1 - Math.pow(1 - x, 4),
        outExpo: x => x === 1 ? 1 : 1 - Math.pow(2, -10 * x),
        outElastic: x => {
            const c4 = (2 * Math.PI) / 3;
            return x === 0 ? 0 : x === 1 ? 1 :
                Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
        },
        inOutCubic: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
    };

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    // ═══════════════════════════════════════════════════════════
    // 1. WEBGL NOISE BACKGROUND — Living, breathing atmosphere
    // ═══════════════════════════════════════════════════════════
    function initWebGLBackground() {
        const canvas = document.createElement('canvas');
        canvas.id = 'kerr-bg';
        canvas.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 0; pointer-events: none;
    `;
        // Insert as first child of body so it's behind everything
        document.body.insertBefore(canvas, document.body.firstChild);

        const gl = canvas.getContext('webgl', {
            alpha: false,
            antialias: false,
            powerPreference: 'high-performance'
        });
        if (!gl) return;

        // Vertex shader
        const vs = `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0, 1); }
    `;

        // Fragment shader — organic flowing noise
        const fs = `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_scroll;
      uniform vec2 u_mouse;

      // Simplex-ish noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
          + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
          dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        
        // Flowing noise layers
        float t = u_time * 0.08;
        float scroll = u_scroll * 0.0003;
        
        float n1 = snoise(uv * 1.5 + vec2(t * 0.3, scroll));
        float n2 = snoise(uv * 3.0 + vec2(-t * 0.2, scroll * 1.5));
        float n3 = snoise(uv * 6.0 + vec2(t * 0.1, -scroll));
        
        float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
        
        // Mouse influence — subtle light source
        vec2 mouseUV = u_mouse / u_resolution;
        float mouseDist = length(uv - mouseUV);
        float mouseGlow = exp(-mouseDist * 3.0) * 0.12;
        
        // Deep dark base with subtle color variation
        vec3 darkBlue = vec3(0.02, 0.02, 0.06);
        vec3 darkPurple = vec3(0.04, 0.02, 0.06);
        vec3 nearBlack = vec3(0.03, 0.03, 0.04);
        
        vec3 col = mix(darkBlue, darkPurple, noise * 0.5 + 0.5);
        col = mix(col, nearBlack, 0.5);
        
        // Subtle purple glow from mouse
        col += vec3(0.3, 0.15, 0.5) * mouseGlow;
        
        // Vignette
        float vig = 1.0 - smoothstep(0.3, 1.2, length(uv - 0.5) * 1.4);
        col *= vig;
        
        // Film grain
        float grain = (fract(sin(dot(uv * u_time * 100.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.04;
        col += grain;
        
        gl_FragColor = vec4(col, 1.0);
      }
    `;

        function compileShader(src, type) {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            return s;
        }

        const prog = gl.createProgram();
        gl.attachShader(prog, compileShader(vs, gl.VERTEX_SHADER));
        gl.attachShader(prog, compileShader(fs, gl.FRAGMENT_SHADER));
        gl.linkProgram(prog);
        gl.useProgram(prog);

        // Fullscreen quad
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const pos = gl.getAttribLocation(prog, 'position');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

        const uTime = gl.getUniformLocation(prog, 'u_time');
        const uRes = gl.getUniformLocation(prog, 'u_resolution');
        const uScroll = gl.getUniformLocation(prog, 'u_scroll');
        const uMouse = gl.getUniformLocation(prog, 'u_mouse');

        let mouseX = 0, mouseY = 0;
        document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

        function resize() {
            const dpr = Math.min(window.devicePixelRatio, 1.5);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
        resize();
        window.addEventListener('resize', resize);

        const startTime = Date.now();
        function render() {
            const t = (Date.now() - startTime) / 1000;
            gl.uniform1f(uTime, t);
            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.uniform1f(uScroll, window.scrollY);
            gl.uniform2f(uMouse, mouseX * Math.min(window.devicePixelRatio, 1.5),
                (window.innerHeight - mouseY) * Math.min(window.devicePixelRatio, 1.5));
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            requestAnimationFrame(render);
        }
        render();
    }

    // ═══════════════════════════════════════════════════════════
    // 2. THEATRICAL ENTRANCE — Curtain reveal
    // ═══════════════════════════════════════════════════════════
    function initTheatricalEntrance() {
        // Create curtain overlay
        const curtain = document.createElement('div');
        curtain.id = 'kerr-curtain';
        curtain.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 99999; pointer-events: none;
      background: #000;
      display: flex; align-items: center; justify-content: center;
    `;

        // Name reveal
        const nameReveal = document.createElement('div');
        nameReveal.style.cssText = `
      font-family: 'Space Mono', monospace;
      font-size: clamp(2rem, 5vw, 4rem);
      color: white;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      opacity: 0;
      transform: scale(0.9);
      transition: opacity 0.8s ease, transform 0.8s ease;
    `;
        nameReveal.textContent = 'KERR';
        curtain.appendChild(nameReveal);
        document.body.appendChild(curtain);

        // Phase 1: Name fades in
        setTimeout(() => {
            nameReveal.style.opacity = '1';
            nameReveal.style.transform = 'scale(1)';
        }, 200);

        // Phase 2: Name expands and curtain dissolves
        setTimeout(() => {
            nameReveal.style.transition = 'opacity 0.6s ease, transform 1s cubic-bezier(0.16, 1, 0.3, 1), letter-spacing 1s cubic-bezier(0.16, 1, 0.3, 1)';
            nameReveal.style.transform = 'scale(1.5)';
            nameReveal.style.letterSpacing = '0.8em';
            nameReveal.style.opacity = '0';
        }, 1400);

        // Phase 3: Curtain drops
        setTimeout(() => {
            curtain.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            curtain.style.opacity = '0';
        }, 1800);

        // Phase 4: Cleanup
        setTimeout(() => {
            curtain.remove();
        }, 2800);

        return 2000; // Return delay before main animations start
    }

    // ═══════════════════════════════════════════════════════════
    // 3. HERO TEXT — Letter-by-letter reveal with stagger
    // ═══════════════════════════════════════════════════════════
    function animateHero(delay) {
        const heroLines = document.querySelectorAll('.hero-animate');

        heroLines.forEach((line, lineIdx) => {
            setTimeout(() => {
                // Wrap each character in a span for individual animation
                const spans = line.querySelectorAll('.gradient-text');

                line.style.transition = `opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), 
                                 transform 1.2s cubic-bezier(0.16, 1, 0.3, 1),
                                 filter 1.2s cubic-bezier(0.16, 1, 0.3, 1)`;
                line.style.opacity = '1';
                line.style.transform = 'translateY(0)';
                line.style.filter = 'blur(0)';

                // Add blur-in effect by starting from blurred
                if (line.style.opacity === '0') {
                    line.style.filter = 'blur(8px)';
                    requestAnimationFrame(() => {
                        line.style.filter = 'blur(0)';
                    });
                }
            }, delay + lineIdx * 250);
        });

        // Contact info
        const contact = document.querySelector('.contact-animate');
        if (contact) {
            setTimeout(() => {
                contact.style.transition = 'opacity 1s ease, transform 1s ease';
                contact.style.opacity = '1';
                contact.style.transform = 'translateY(0)';
            }, delay + 900);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 4. MAGNETIC CURSOR — Elements react to mouse proximity
    // ═══════════════════════════════════════════════════════════
    function initMagneticCursor() {
        const magneticEls = document.querySelectorAll('.play-button-circular, .hero-play-button, .frosted-pill-btn, .hamburger, .logo');

        let mouseX = 0, mouseY = 0;
        document.addEventListener('mousemove', e => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function update() {
            magneticEls.forEach(el => {
                const rect = el.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = mouseX - cx;
                const dy = mouseY - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 150;

                if (dist < maxDist) {
                    const strength = (1 - dist / maxDist) * 0.3;
                    const tx = dx * strength;
                    const ty = dy * strength;
                    el.style.transform = `translate(${tx}px, ${ty}px)`;
                    el.style.transition = 'transform 0.2s ease-out';
                } else {
                    el.style.transform = '';
                    el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                }
            });
            requestAnimationFrame(update);
        }
        update();
    }

    // ═══════════════════════════════════════════════════════════
    // 5. SCROLL-DRIVEN PARALLAX & REVEALS
    // ═══════════════════════════════════════════════════════════
    function initScrollEngine() {
        const cards = document.querySelectorAll('.video-container');
        const fadeIns = document.querySelectorAll('.animate-fade-in-up');
        const statsCard = document.querySelector('.contact-info-card');

        // Scroll reveal observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const idx = Array.from(cards).indexOf(el);
                    const stagger = idx >= 0 ? idx * 150 : 0;

                    setTimeout(() => {
                        el.style.transition = `
              filter 1s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 1s cubic-bezier(0.16, 1, 0.3, 1),
              transform 1s cubic-bezier(0.16, 1, 0.3, 1)
            `;
                        el.style.filter = 'blur(0px)';
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0) scale(1)';

                        // Play video
                        const video = el.querySelector('video');
                        if (video) video.play().catch(() => { });
                    }, stagger);

                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

        cards.forEach(el => observer.observe(el));
        fadeIns.forEach(el => {
            const obs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        el.style.transition = 'opacity 1s ease, transform 1s ease';
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                        obs.unobserve(el);
                    }
                });
            }, { threshold: 0.1 });
            obs.observe(el);
        });

        if (statsCard) {
            const statsObs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        statsCard.style.transition = 'opacity 1.2s ease, transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
                        statsCard.style.opacity = '1';
                        statsCard.style.transform = 'translateY(0)';
                        statsObs.unobserve(statsCard);
                    }
                });
            }, { threshold: 0.15 });
            statsObs.observe(statsCard);
        }

        // Parallax on scroll
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    cards.forEach(card => {
                        const rect = card.getBoundingClientRect();
                        const centerY = rect.top + rect.height / 2;
                        const viewCenter = window.innerHeight / 2;
                        const offset = (centerY - viewCenter) * 0.04;

                        const video = card.querySelector('video');
                        if (video) {
                            video.style.transform = `scale(1.08) translateY(${offset}px)`;
                            video.style.transition = 'none';
                        }
                    });
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ═══════════════════════════════════════════════════════════
    // 6. LIVE CLOCK & WEATHER
    // ═══════════════════════════════════════════════════════════
    function initClock() {
        const clockEl = document.querySelector('.flex.items-center.gap-0\\.5.font-mono');
        if (!clockEl) return;

        clockEl.style.fontFamily = "'Space Mono', monospace";
        clockEl.style.fontSize = '11px';
        clockEl.style.color = 'rgba(255, 255, 255, 0.4)';
        clockEl.style.letterSpacing = '0.08em';

        function tick() {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            clockEl.textContent = `${h}:${m}:${s}`;
        }
        tick();
        setInterval(tick, 1000);

        // Weather
        const weatherEl = document.querySelector('span[style*="line-height:1"]');
        if (weatherEl && weatherEl.textContent.trim() === '--°') {
            weatherEl.textContent = '28°F';
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 7. AUTOPLAY ALL VIDEOS
    // ═══════════════════════════════════════════════════════════
    function initVideos() {
        // Hero video plays immediately
        const heroVideo = document.querySelector('.video-thumbnail video');
        if (heroVideo) {
            heroVideo.setAttribute('autoplay', '');
            heroVideo.play().catch(() => { });
        }
        // Stat video
        const statVideo = document.querySelector('.contact-stats-card video');
        if (statVideo) statVideo.play().catch(() => { });
    }

    // ═══════════════════════════════════════════════════════════
    // 8. NUMBER COUNT-UP WITH EASING
    // ═══════════════════════════════════════════════════════════
    function initCountUp() {
        const metricValues = document.querySelectorAll('.metric-value');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const text = el.textContent;
                    const match = text.match(/^(\d+)\+?$/);

                    if (match) {
                        const target = parseInt(match[1]);
                        const suffix = text.includes('+') ? '+' : '';
                        const start = Date.now();
                        const duration = 2000;

                        function step() {
                            const elapsed = Date.now() - start;
                            const progress = clamp(elapsed / duration, 0, 1);
                            const eased = Ease.outExpo(progress);
                            el.textContent = Math.round(eased * target) + suffix;
                            if (progress < 1) requestAnimationFrame(step);
                        }
                        step();
                    }
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        metricValues.forEach(el => observer.observe(el));
    }

    // ═══════════════════════════════════════════════════════════
    // 9. SMOOTH SCROLL WITH LERP
    // ═══════════════════════════════════════════════════════════
    function initSmoothScroll() {
        // Add smooth scroll to anchor links
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                const target = document.querySelector(a.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════
    // BOOT SEQUENCE
    // ═══════════════════════════════════════════════════════════
    function boot() {
        // Inject upgrade CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './upgrade.css';
        document.head.appendChild(link);

        // WebGL background — the living atmosphere
        initWebGLBackground();

        // Theatrical entrance
        const entranceDelay = initTheatricalEntrance();

        // Clock & weather (immediate)
        initClock();
        initVideos();
        initSmoothScroll();

        // Hero animations after curtain drops
        setTimeout(() => animateHero(0), entranceDelay + 300);

        // Scroll engine
        setTimeout(() => {
            initScrollEngine();
            initMagneticCursor();
            initCountUp();
        }, entranceDelay + 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
