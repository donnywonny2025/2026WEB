// ─── Splash Screen ───
(function () {
    const splash = document.getElementById('splash');
    if (splash) {
        const video = splash.querySelector('video');
        const dismiss = () => {
            splash.classList.add('fade-out');
            setTimeout(() => splash.remove(), 700);
        };
        if (video) {
            video.addEventListener('ended', dismiss);
            // Fallback if video fails to load/play
            setTimeout(dismiss, 5000);
        } else {
            setTimeout(dismiss, 2200);
        }
    }
})();

// ─── Hero Scroll Indicator (fade on scroll) ───
(function () {
    const indicator = document.getElementById('heroScrollIndicator');
    if (!indicator) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            indicator.classList.add('hidden');
        } else {
            indicator.classList.remove('hidden');
        }
    }, { passive: true });
})();

// ─── FAQ Accordion ───
(function () {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const wasActive = item.classList.contains('active');

            // Close all
            document.querySelectorAll('.faq-item.active').forEach(el => {
                el.classList.remove('active');
                el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });

            // Open clicked (if it wasn't already open)
            if (!wasActive) {
                item.classList.add('active');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
})();

// ─── Hero Word Typewriter ───
(function () {
    const words = ['political.', 'government.', 'digital.', 'documentary.', 'nonprofit.'];
    const el = document.querySelector('.hero-cycle-word');
    if (!el) return;

    let wordIndex = 0;
    const TYPE_SPEED = 80;
    const ERASE_SPEED = 50;
    const HOLD_TIME = 2000;

    function typeWord(word, cb) {
        let charIndex = 0;
        const timer = setInterval(() => {
            charIndex++;
            el.textContent = word.slice(0, charIndex);
            if (charIndex >= word.length) {
                clearInterval(timer);
                cb();
            }
        }, TYPE_SPEED);
    }

    function eraseWord(cb) {
        let text = el.textContent;
        const timer = setInterval(() => {
            text = text.slice(0, -1);
            el.textContent = text;
            if (text.length === 0) {
                clearInterval(timer);
                cb();
            }
        }, ERASE_SPEED);
    }

    function cycle() {
        setTimeout(() => {
            eraseWord(() => {
                wordIndex = (wordIndex + 1) % words.length;
                typeWord(words[wordIndex], cycle);
            });
        }, HOLD_TIME);
    }

    // Start the cycle after initial word is shown
    cycle();
})();

// ─── Scroll Reveal ───
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ─── Dropdown Menu ───
const menuWrapper = document.getElementById('menuWrapper');
const menuTrigger = document.getElementById('menuTrigger');
const menuDropdown = document.getElementById('menuDropdown');
const floatingLogo = document.getElementById('floatingLogo');
const menuItems = menuDropdown.querySelectorAll('.menu-item, .menu-cta');

// Toggle dropdown
menuTrigger.addEventListener('click', () => {
    const isOpen = menuDropdown.classList.contains('open');
    menuDropdown.classList.toggle('open');
    menuTrigger.classList.toggle('open');
    menuTrigger.setAttribute('aria-expanded', !isOpen);
});

// Close on click outside
document.addEventListener('click', (e) => {
    if (!menuWrapper.contains(e.target)) {
        menuDropdown.classList.remove('open');
        menuTrigger.classList.remove('open');
        menuTrigger.setAttribute('aria-expanded', 'false');
    }
});

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuDropdown.classList.contains('open')) {
        menuDropdown.classList.remove('open');
        menuTrigger.classList.remove('open');
        menuTrigger.setAttribute('aria-expanded', 'false');
    }
});

// Smooth scroll + close on menu item click
menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
        const href = item.getAttribute('href');
        if (href && href.startsWith('#')) {
            e.preventDefault();
            const target = document.getElementById(href.slice(1));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        // Close dropdown
        menuDropdown.classList.remove('open');
        menuTrigger.classList.remove('open');
        menuTrigger.setAttribute('aria-expanded', 'false');
    });
});

// ─── Video scroll-to-play + text shimmer (IntersectionObserver) ───
const projectObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const project = entry.target;
        const video = project.querySelector('video');
        const isAlwaysLoop = !!project.querySelector('.always-loop');

        if (entry.isIntersecting) {
            // Trigger text shimmer
            project.classList.remove('in-view');
            void project.offsetWidth; // force reflow to restart animation
            project.classList.add('in-view');

            // Play video (skip always-loop — it handles itself)
            if (video && !isAlwaysLoop) {
                video.play().catch(() => { });
                video.style.opacity = '1';
            }
        } else {
            project.classList.remove('in-view');

            if (video && !isAlwaysLoop) {
                video.pause();
                video.style.opacity = '0';
            }
        }
    });
}, { threshold: 0.3 });

document.querySelectorAll('.project').forEach(project => {
    projectObserver.observe(project);
});

// ─── Stat count-up ───
const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.target);
            let current = 0;
            const increment = target / 40;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    el.textContent = target + '+';
                    clearInterval(timer);
                } else {
                    el.textContent = Math.floor(current) + '+';
                }
            }, 30);
            statObserver.unobserve(el);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(el => statObserver.observe(el));

// ─── Premium word-reveal for About paragraphs ───
document.querySelectorAll('[data-word-reveal]').forEach(el => {
    const originalHTML = el.innerHTML;
    function wrapWords(node) {
        const frag = document.createDocumentFragment();
        node.childNodes.forEach(child => {
            if (child.nodeType === 3) {
                child.textContent.split(/(\s+)/).forEach(w => {
                    if (/^\s+$/.test(w) || w === '') {
                        frag.appendChild(document.createTextNode(w));
                    } else {
                        const span = document.createElement('span');
                        span.className = 'word-reveal';
                        span.textContent = w;
                        frag.appendChild(span);
                    }
                });
            } else if (child.nodeName === 'STRONG') {
                const strong = document.createElement('strong');
                child.textContent.split(/(\s+)/).forEach(w => {
                    if (/^\s+$/.test(w) || w === '') {
                        strong.appendChild(document.createTextNode(w));
                    } else {
                        const span = document.createElement('span');
                        span.className = 'word-reveal';
                        span.textContent = w;
                        strong.appendChild(span);
                    }
                });
                frag.appendChild(strong);
            } else {
                frag.appendChild(child.cloneNode(true));
            }
        });
        return frag;
    }
    el.innerHTML = '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = originalHTML;
    el.appendChild(wrapWords(tempDiv));
});

// Orchestrate: stagger paragraphs with 1.5s gap
const wordRevealEls = Array.from(document.querySelectorAll('[data-word-reveal]'));
let aboutAnimStarted = false;

const aboutRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !aboutAnimStarted) {
            aboutAnimStarted = true;
            aboutRevealObserver.disconnect();

            wordRevealEls.forEach((el, pIdx) => {
                const words = el.querySelectorAll('.word-reveal');
                const totalDuration = 3500;
                const stagger = Math.min(totalDuration / words.length, 65);
                const paragraphDelay = pIdx * 1500; // 1.5s between paragraphs

                setTimeout(() => {
                    words.forEach((word, i) => {
                        word.style.transitionDelay = `${i * stagger}ms`;
                        word.classList.add('revealed');
                    });
                }, paragraphDelay);
            });
        }
    });
}, { threshold: 0.2 });

wordRevealEls.forEach(el => aboutRevealObserver.observe(el));

// ═══════════════════════════════════════════
// PROJECT DETAIL PAGES + PANEL WIPE TRANSITION
// ═══════════════════════════════════════════

const projectData = [
    {
        title: 'Showreel',
        embed: 'vimeo',
        videoId: '1120665473',
        description: 'A mix of motion graphics and video projects from the last few years.',
        credits: [
            ['Highlights', 'A series of work from over the years'],
            ['Published', '2025']
        ]
    },
    {
        title: 'New Balance — Rome',
        embed: 'vimeo',
        videoId: '1120683744',
        description: 'Run Rome The Marathon for New Balance. Had a great time cutting this one.',
        credits: [
            ['Client', 'New Balance'],
            ['Role', 'Director / Editor'],
            ['Deliverables', 'Social campaign, BTS, highlights'],
            ['Location', 'Rome, Italy'],
            ['Published', '2025']
        ]
    },
    {
        title: 'Danny Was Here TV',
        embed: 'youtube',
        videoId: 'I6U5zDpzLq8',
        description: 'It\'s been a pleasure working with Dan Egan to launch this new investigative channel. I\'m thrilled to be part of building Danny Was Here TV from the ground up — it\'s been really fun crafting these deep-dive financial analysis pieces. This Gemini IPO investigation required balancing complex regulatory details with engaging storytelling to keep viewers hooked throughout.',
        credits: [
            ['Platform', 'YouTube'],
            ['Host', 'Dan Egan'],
            ['Role', 'Channel Creator / Lead Editor'],
            ['Channel', 'Danny Was Here TV'],
            ['Published', 'September 2025']
        ]
    },
    {
        title: 'Council for Responsible Nutrition',
        embed: 'vimeo',
        videoId: '641502508',
        description: 'We loved building this animation-led explainer for the Council for Responsible Nutrition. Clear visuals and a tight script helped turn a complex topic into a simple, engaging story — crafted for a national release across web and social.',
        credits: [
            ['Client', 'Council for Responsible Nutrition (CRN)'],
            ['Role', 'Director / Animator'],
            ['Deliverables', 'Web and social variants'],
            ['Focus', 'Explainer'],
            ['Published', '2022']
        ]
    },
    {
        title: 'Banco Azteca — Banking Explainer',
        embed: 'youtube',
        videoId: '8yu5w5SvJp8',
        description: 'Animation-driven explainer for Banco Azteca, one of Mexico\'s largest financial institutions. Clean motion graphics breaking down banking services for a broad audience.',
        credits: [
            ['Client', 'Banco Azteca'],
            ['Role', 'Director / Animator'],
            ['Deliverables', 'Explainer video'],
            ['Focus', 'Motion graphics']
        ]
    },
    {
        title: 'FTC — LeanSpa',
        embed: 'vimeo',
        videoId: '641503564',
        description: 'National campaign series for the Federal Trade Commission addressing deceptive diet ads. This one-minute-thirty spot was one of several, supported by TV, radio, web, and social cutdowns.',
        credits: [
            ['Client', 'Federal Trade Commission (FTC)'],
            ['Role', 'Director / Editor'],
            ['Deliverables', 'National TV spots, internet ads, radio, social cutdowns'],
            ['Location', 'United States'],
            ['Published', '2023']
        ]
    },
    {
        title: 'Justice for Lai Dai Han',
        embed: 'vimeo',
        videoId: '641889858',
        description: 'A powerful documentary shedding light on the sexual violence committed during the Vietnam War and the ongoing fight for justice. This piece required extraordinary sensitivity while maintaining the urgency of the message.',
        credits: [
            ['Client', 'Justice for Lai Dai Han'],
            ['Role', 'Director / Producer'],
            ['Format', 'Documentary'],
            ['Published', '2021']
        ]
    },
    {
        title: 'Apollo 11 — 50th Anniversary',
        embed: 'vimeo',
        videoId: '641599879',
        description: 'Produced for NASA\'s 50th Anniversary of Apollo 11 in Washington, D.C. This film served as the central projection during the evening ceremony, accompanied by interactive elements and six supporting videos around the Mall. A special night shared with astronauts, delegates, and guests — an honour to help bring to life.',
        credits: [
            ['Client', 'NASA'],
            ['Role', 'Producer / Editor'],
            ['Deliverables', '6 video inserts, multiple animations'],
            ['Notes', 'Premiered during the official DC ceremony with additional interactive projections'],
            ['Published', '2019']
        ]
    }
];

// DOM refs
const transitionPanel = document.getElementById('pageTransition');
const detailOverlay = document.getElementById('projectDetailOverlay');
let detailIframe = document.getElementById('detailIframe');
const detailTitle = document.getElementById('detailTitle');
const detailDesc = document.getElementById('detailDescription');
const detailCredits = document.getElementById('detailCredits');
const detailBack = document.getElementById('detailBack');
const mainContent = document.querySelectorAll('body > :not(.page-transition):not(.project-detail-overlay):not(script)');

let isTransitioning = false;
let savedScrollY = 0;

function getEmbedUrl(project) {
    if (project.embed === 'youtube') {
        return `https://www.youtube-nocookie.com/embed/${project.videoId}?rel=0&modestbranding=1&playsinline=1&vq=hd1080`;
    }
    return `https://player.vimeo.com/video/${project.videoId}?autoplay=0&loop=0&title=0&byline=0&portrait=0&quality=1080p`;
}

function populateDetail(index) {
    const p = projectData[index];

    // Recreate iframe to avoid adding browser history entries
    const container = document.getElementById('detailVideo');
    if (detailIframe) detailIframe.remove();
    const newIframe = document.createElement('iframe');
    newIframe.id = 'detailIframe';
    newIframe.allow = 'autoplay; fullscreen; picture-in-picture';
    newIframe.allowFullscreen = true;
    newIframe.src = getEmbedUrl(p);
    container.appendChild(newIframe);
    detailIframe = newIframe;

    detailTitle.textContent = p.title;
    detailDesc.textContent = p.description;
    detailCredits.innerHTML = p.credits.map(([label, value]) =>
        `<div class="detail-credit-row">
            <span class="detail-credit-label">${label}</span>
            <span class="detail-credit-value">${value}</span>
        </div>`
    ).join('');
}

function animateDetailContent() {
    const fadeEls = detailOverlay.querySelectorAll('.detail-fade-in');
    fadeEls.forEach(el => el.classList.remove('animate'));
    // Stagger the entrance
    fadeEls.forEach((el, i) => {
        setTimeout(() => el.classList.add('animate'), 80 * i);
    });
}

const WIPE_MS = 500; // matches CSS transition duration

// Scroll lock — use position:fixed so scrollbar NEVER toggles
function lockScroll() {
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
}
function unlockScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
}

function openProject(index) {
    if (isTransitioning) return;
    isTransitioning = true;
    savedScrollY = window.scrollY;
    lockScroll();

    // Phase 1: Slide panel up to cover screen
    transitionPanel.style.transform = 'translateY(0%)';

    setTimeout(() => {
        // Panel is fully covering — swap content behind it
        mainContent.forEach(el => el.style.display = 'none');
        populateDetail(index);
        detailOverlay.classList.add('visible');
        detailOverlay.scrollTop = 0;
        menuWrapper.style.display = 'none';
        floatingLogo.style.display = 'none';

        // Start content animations NOW while panel still covers
        // (they'll be fully visible by the time the panel clears)
        animateDetailContent();

        // Force layout so content is rendered before reveal
        void detailOverlay.offsetHeight;

        // Phase 2: Slide panel up and away, revealing detail
        transitionPanel.style.transform = 'translateY(-100%)';

        setTimeout(() => {
            // Transition done — park panel off-screen below
            transitionPanel.style.transition = 'none';
            transitionPanel.style.transform = 'translateY(100%)';
            // Force the style, then restore transitions
            void transitionPanel.offsetHeight;
            transitionPanel.style.transition = '';

            // Only NOW unlock scrolling — panel is gone
            unlockScroll();
            isTransitioning = false;
        }, WIPE_MS);
    }, WIPE_MS);
}

let isClosing = false;

function closeProject() {
    if (isClosing) return; // prevent double-close from popstate
    isClosing = true;

    // If already mid-transition, force-reset before starting
    if (isTransitioning) {
        transitionPanel.style.transition = 'none';
        transitionPanel.style.transform = 'translateY(100%)';
        void transitionPanel.offsetHeight;
        transitionPanel.style.transition = '';
    }
    isTransitioning = true;
    lockScroll();

    // Kill the iframe immediately to stop playback
    if (detailIframe) {
        detailIframe.remove();
        detailIframe = null;
    }

    // Phase 1: Slide panel up to cover screen
    transitionPanel.style.transform = 'translateY(0%)';

    setTimeout(() => {
        // Panel is fully covering — swap content behind it
        detailOverlay.classList.remove('visible');
        mainContent.forEach(el => el.style.display = '');
        menuWrapper.style.display = '';
        floatingLogo.style.display = '';

        // Restore scroll position instantly behind the panel
        unlockScroll();
        window.scrollTo({ top: savedScrollY, behavior: 'instant' });

        // Force layout so everything settles before reveal
        void document.body.offsetHeight;

        // Phase 2: Slide panel down and away, revealing main
        transitionPanel.style.transform = 'translateY(100%)';

        setTimeout(() => {
            // Panel gone — fully done
            isTransitioning = false;
            isClosing = false;
        }, WIPE_MS);
    }, WIPE_MS);
}

// Disable browser's automatic scroll restoration (we handle it ourselves)
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// Wire up card clicks — ONLY main projects (not political section)
document.querySelectorAll('.project:not([data-pol-project])').forEach((card, index) => {
    card.addEventListener('click', (e) => {
        // Don't interfere with video hover (already handled by mouseenter/leave)
        history.pushState({ project: index }, '');
        openProject(index);
    });
});

// Wire up site BACK button — close directly, then clean up history
detailBack.addEventListener('click', () => {
    closeProject();
    history.back(); // clean up the pushState entry
});

// Browser back button support
window.addEventListener('popstate', (e) => {
    if (detailOverlay.classList.contains('visible')) {
        closeProject();
    }
});

// ESC key closes detail
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailOverlay.classList.contains('visible')) {
        closeProject();
        history.back(); // clean up the pushState entry
    }
});

// ═══════════════════════════════════════════
// AJAX FORM SUBMISSION — Shows popup instead of redirect
// ═══════════════════════════════════════════
(function () {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'thank-you-modal';
    modal.innerHTML = `
        <div class="thank-you-inner">
            <div class="thank-you-icon">✓</div>
            <h2>Thank You</h2>
            <p>Your message has been sent.<br>I'll be in touch soon.</p>
            <button class="thank-you-close">Got it</button>
        </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => {
        modal.classList.remove('visible');
        setTimeout(() => modal.style.display = 'none', 400);
    };

    modal.querySelector('.thank-you-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('visible')) closeModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('.form-submit');
        const originalText = btn.textContent;
        btn.textContent = 'Sending…';
        btn.disabled = true;

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                form.reset();
                modal.style.display = 'flex';
                requestAnimationFrame(() => modal.classList.add('visible'));
            } else {
                alert('Oops — something went wrong. Please try again.');
            }
        } catch (err) {
            alert('Network error. Please check your connection and try again.');
        }

        btn.textContent = originalText;
        btn.disabled = false;
    });
})();

// ═══════════════════════════════════════════
// MOBILE VIDEO AUTOPLAY FIX
// ═══════════════════════════════════════════
(function () {
    // On mobile, attempt to play all muted inline videos when they enter viewport
    // Uses a lower threshold and handles play promise rejections
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    const mobileVideoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(() => {
                    // Some mobile browsers need a user gesture — add a one-time touch handler
                    const playOnTouch = () => {
                        video.play().catch(() => { });
                        document.removeEventListener('touchstart', playOnTouch);
                    };
                    document.addEventListener('touchstart', playOnTouch, { once: true });
                });
                video.style.opacity = '1';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.project-media video').forEach(video => {
        mobileVideoObserver.observe(video);
    });
})();
