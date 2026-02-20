/* ==============================================
   MAIN.JS — Paul Ingles DMD Landing Page
   
   All interactive behavior lives here.
   Each feature is a small, self-contained function.
   
   FEATURES:
   1. Sticky Navigation (scroll shadow)
   2. Scroll Reveal (data-reveal elements)
   3. Mobile Menu Toggle
   4. Hero Parallax (subtle, opt-in)
   ============================================== */

(function () {
    'use strict';

    /* -----------------------------------------------
       1. STICKY NAVIGATION
       Adds .scrolled class when user scrolls past 20px
       ----------------------------------------------- */
    function initStickyNav() {
        const nav = document.getElementById('nav');
        if (!nav) return;

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    nav.classList.toggle('scrolled', window.scrollY > 20);
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    /* -----------------------------------------------
       2. SCROLL REVEAL
       Fades in elements with [data-reveal] attribute.
       
       Usage in HTML:
         <div data-reveal>         → fade up (default)
         <div data-reveal="fade">  → fade only
         <div data-reveal="scale"> → scale up
         <div data-reveal="left">  → slide from left
         <div data-reveal="right"> → slide from right
       
       Optional delay: data-reveal-delay="100" (ms)
       ----------------------------------------------- */
    function initScrollReveal() {
        const reveals = document.querySelectorAll('[data-reveal]');
        if (!reveals.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = entry.target.dataset.revealDelay || 0;
                    setTimeout(() => {
                        entry.target.classList.add('revealed');
                    }, parseInt(delay));
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.05,
            rootMargin: '0px 0px -20px 0px'
        });

        reveals.forEach(el => observer.observe(el));
    }

    /* -----------------------------------------------
       3. MOBILE MENU TOGGLE
       Opens/closes nav links on small screens
       ----------------------------------------------- */
    function initMobileMenu() {
        const toggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        if (!toggle || !navLinks) return;

        toggle.addEventListener('click', () => {
            const open = navLinks.classList.toggle('open');
            toggle.setAttribute('aria-expanded', open);
            toggle.classList.toggle('active');
        });

        // Close on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                toggle.classList.remove('active');
                toggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    /* -----------------------------------------------
       4. HERO PARALLAX (subtle)
       Moves hero background image slightly on scroll.
       Only active on desktop (>900px) for performance.
       ----------------------------------------------- */
    function initHeroParallax() {
        const heroBg = document.querySelector('.hero-bg');
        if (!heroBg || window.innerWidth < 900) return;

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrolled = window.scrollY;
                    const heroHeight = heroBg.parentElement.offsetHeight;
                    if (scrolled < heroHeight) {
                        heroBg.style.transform = `translateY(${scrolled * 0.15}px) scale(1.05)`;
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    /* -----------------------------------------------
       5. HERO ENTRANCE
       Triggers the staggered fade+slide-up animation
       on hero elements by adding body.hero-loaded
       ----------------------------------------------- */
    function initHeroEntrance() {
        // Small delay so the browser paints the initial state first
        requestAnimationFrame(() => {
            document.body.classList.add('hero-loaded');
        });
    }

    /* -----------------------------------------------
       6. BUILDING ZOOM ON SCROLL
       Scales the building banner photo as user scrolls
       toward the location section for a cinematic feel.
       ----------------------------------------------- */
    function initBuildingZoom() {
        const buildingImg = document.getElementById('building-img');
        if (!buildingImg || window.innerWidth < 900) return;

        const banner = buildingImg.parentElement;
        let ticking = false;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    window.addEventListener('scroll', onScroll, { passive: true });
                } else {
                    window.removeEventListener('scroll', onScroll);
                }
            });
        }, { threshold: 0 });

        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const rect = banner.getBoundingClientRect();
                    const vh = window.innerHeight;
                    // Progress from 0 (entering viewport) to 1 (fully in view)
                    const progress = Math.max(0, Math.min(1, 1 - rect.top / vh));
                    const scale = 1 + progress * 0.08; // max 1.08x zoom
                    buildingImg.style.transform = `scale(${scale})`;
                    ticking = false;
                });
                ticking = true;
            }
        }

        observer.observe(banner);
    }

    /* -----------------------------------------------
       7. SERVICE LIST — Looping highlight cycle
       Cycles through each service item with a calm
       highlight animation. Pauses on hover.
       ----------------------------------------------- */
    function initServiceCycle() {
        const items = document.querySelectorAll('.service-item');
        if (!items.length) return;

        let current = -1;
        let interval = null;
        let paused = false;

        function highlightNext() {
            if (paused) return;
            // Remove active from previous
            items.forEach(item => item.classList.remove('service-active'));
            // Move to next (wrap around)
            current = (current + 1) % items.length;
            items[current].classList.add('service-active');
        }

        function startCycle() {
            if (interval) return;
            highlightNext(); // Start immediately
            interval = setInterval(highlightNext, 2500);
        }

        // Pause cycle on hover
        items.forEach(item => {
            item.addEventListener('mouseenter', () => {
                paused = true;
                items.forEach(i => i.classList.remove('service-active'));
                item.classList.add('service-active');
            });
            item.addEventListener('mouseleave', () => {
                paused = false;
            });
        });

        // Start when section comes into view
        const section = document.querySelector('.services');
        if (!section) { startCycle(); return; }

        const obs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                startCycle();
                obs.disconnect();
            }
        }, { threshold: 0.05 });

        obs.observe(section);
    }

    /* -----------------------------------------------
       INIT — Run everything on DOM ready
       ----------------------------------------------- */
    document.addEventListener('DOMContentLoaded', () => {
        initStickyNav();
        initScrollReveal();
        initMobileMenu();
        initHeroParallax();
        initHeroEntrance();
        initBuildingZoom();
        initServiceCycle();
    });

})();
