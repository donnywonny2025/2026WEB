// ─── Splash Screen ───
(function () {
    const splash = document.getElementById('splash');
    if (splash) {
        // Wait for the logo animation (1.8s) + hold briefly, then fade out
        setTimeout(() => {
            splash.classList.add('fade-out');
            // Remove from DOM after fade transition completes
            setTimeout(() => splash.remove(), 700);
        }, 2200);
    }
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

// ─── Nav scroll effect ───
const nav = document.getElementById('nav');
const heroSection = document.getElementById('hero');
const workSection = document.getElementById('work');
const aboutSection = document.getElementById('about');
const contactSection = document.getElementById('contact');

function updateNav() {
    const scrollY = window.scrollY;

    // Add/remove scrolled class
    if (scrollY > 60) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }

    // Dark/light mode based on section backgrounds
    // Hero = dark (video), Clients = cream, Work = dark, About = cream, Contact = dark
    const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
    const workTop = workSection.offsetTop - 80;
    const workBottom = workSection.offsetTop + workSection.offsetHeight;
    const aboutTop = aboutSection.offsetTop - 80;
    const aboutBottom = aboutSection.offsetTop + aboutSection.offsetHeight;
    const contactTop = contactSection.offsetTop - 80;

    // Light mode only when over cream sections (clients strip & about)
    const overCream = (scrollY >= heroBottom - 80 && scrollY < workTop) ||
        (scrollY >= aboutTop && scrollY < contactTop);

    if (overCream) {
        nav.classList.remove('dark-mode');
    } else {
        nav.classList.add('dark-mode');
    }
}

window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

// ─── Video hover-to-play ───
document.querySelectorAll('.project').forEach(project => {
    const video = project.querySelector('video');
    if (!video) return;

    project.addEventListener('mouseenter', () => {
        video.currentTime = 0;
        video.play().catch(() => { });
        video.style.opacity = '1';
    });

    project.addEventListener('mouseleave', () => {
        video.pause();
        video.style.opacity = '0';
    });
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

// ═══════════════════════════════════════════
// PROJECT DETAIL PAGES + PANEL WIPE TRANSITION
// ═══════════════════════════════════════════

const projectData = [
    {
        title: '2026 Showreel',
        embed: 'vimeo',
        videoId: '1120665473',
        description: 'A sweeping cut of work over the years across commercial, corporate, government, and documentary.',
        credits: [
            ['Highlights', 'A series of work from over the years'],
            ['Published', '2025']
        ]
    },
    {
        title: 'New Balance — Rome',
        embed: 'vimeo',
        videoId: '1120683744',
        description: 'A short showcase around Run Rome The Marathon, featuring New Balance athletes and the beauty of Rome\'s streets at dawn.',
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
        return `https://www.youtube.com/embed/${project.videoId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=0`;
    }
    return `https://player.vimeo.com/video/${project.videoId}?autoplay=0&loop=0&title=0&byline=0&portrait=0`;
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
        nav.style.display = 'none';

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
        nav.style.display = '';

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

// Wire up card clicks
document.querySelectorAll('.project').forEach((card, index) => {
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
