/* ═══════════════════════════════════════════════════════════════
   NEREID — Cinematic Scroll-Linked Canvas Animation Engine
   Hardware-accelerated, buttery-smooth image sequence scrubbing
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ─── Configuration ──────────────────────────────────────────
    const CONFIG = {
        totalFrames: 280,
        imagePrefix: 'ezgif-frame-',
        imageExtension: '.png',
        scrollMultiplier: 1,

        // Section boundaries mapped to frame ranges
        sections: {
            hero:           { scrollStart: 0,    scrollEnd: 0.15,  frameStart: 1,   frameEnd: 42  },
            technology:     { scrollStart: 0.15,  scrollEnd: 0.40,  frameStart: 42,  frameEnd: 112 },
            bioremediation: { scrollStart: 0.40,  scrollEnd: 0.65,  frameStart: 112, frameEnd: 182 },
            intelligence:   { scrollStart: 0.65,  scrollEnd: 0.85,  frameStart: 182, frameEnd: 238 },
            cta:            { scrollStart: 0.85,  scrollEnd: 1.00,  frameStart: 238, frameEnd: 280 }
        }
    };

    // ─── State ──────────────────────────────────────────────────
    const state = {
        images: [],
        loadedCount: 0,
        currentFrame: 0,
        targetFrame: 0,
        isReady: false,
        scrollY: 0,
        maxScroll: 0,
        rafId: null,
        canvas: null,
        ctx: null,
        preloaderEl: null,
        preloaderFill: null,
        preloaderPercent: null
    };


    // ─── DOM References ─────────────────────────────────────────
    const elements = {};

    function cacheDOMElements() {
        elements.canvas = document.getElementById('hero-canvas');
        elements.ctx = elements.canvas.getContext('2d');
        elements.nav = document.getElementById('main-nav');
        elements.progressFill = document.getElementById('progress-fill');
        elements.sectionDots = document.getElementById('section-dots');
        elements.scrollIndicator = document.getElementById('scroll-indicator');

        // All animatable elements
        elements.labels = document.querySelectorAll('.section__label');
        elements.headings = document.querySelectorAll('.section__heading');
        elements.featureItems = document.querySelectorAll('.feature-item');
        elements.stats = document.querySelectorAll('.section__stats');
        elements.chips = document.querySelectorAll('.feature-chip');
        elements.ctaTitle = document.querySelector('.cta-title');
        elements.ctaSubtitle = document.querySelector('.cta-subtitle');
        elements.ctaButtons = document.querySelector('.cta-buttons');

        // Dot navigation buttons
        elements.dots = document.querySelectorAll('.section-dot');

        state.canvas = elements.canvas;
        state.ctx = elements.ctx;
    }


    // ─── Preloader ──────────────────────────────────────────────
    function createPreloader() {
        const preloader = document.createElement('div');
        preloader.className = 'preloader';
        preloader.id = 'preloader';
        preloader.innerHTML = `
            <div class="preloader__logo">NEREID</div>
            <div class="preloader__bar-track">
                <div class="preloader__bar-fill" id="preloader-fill"></div>
            </div>
            <div class="preloader__percent" id="preloader-percent">0%</div>
        `;
        document.body.prepend(preloader);

        state.preloaderEl = preloader;
        state.preloaderFill = document.getElementById('preloader-fill');
        state.preloaderPercent = document.getElementById('preloader-percent');
    }

    function updatePreloader(loaded, total) {
        const pct = Math.round((loaded / total) * 100);
        if (state.preloaderFill) {
            state.preloaderFill.style.width = pct + '%';
        }
        if (state.preloaderPercent) {
            state.preloaderPercent.textContent = pct + '%';
        }
    }

    function hidePreloader() {
        if (state.preloaderEl) {
            state.preloaderEl.classList.add('hidden');
            setTimeout(() => {
                if (state.preloaderEl.parentNode) {
                    state.preloaderEl.parentNode.removeChild(state.preloaderEl);
                }
            }, 1000);
        }
    }


    // ─── Image Preloading ───────────────────────────────────────
    function padNumber(num, size) {
        let s = num.toString();
        while (s.length < size) s = '0' + s;
        return s;
    }

    function getImagePath(frameIndex) {
        return CONFIG.imagePrefix + padNumber(frameIndex, 3) + CONFIG.imageExtension;
    }

    function preloadImages() {
        return new Promise((resolve) => {
            const total = CONFIG.totalFrames;
            let loaded = 0;
            state.images = new Array(total);

            // Load critical first frames immediately
            const priorityFrames = [1, 2, 3, 4, 5];

            function loadFrame(index) {
                return new Promise((res) => {
                    const img = new Image();
                    img.onload = () => {
                        state.images[index - 1] = img;
                        loaded++;
                        updatePreloader(loaded, total);

                        if (loaded === total) {
                            resolve();
                        }
                        res();
                    };
                    img.onerror = () => {
                        loaded++;
                        updatePreloader(loaded, total);
                        if (loaded === total) {
                            resolve();
                        }
                        res();
                    };
                    img.src = getImagePath(index);
                });
            }

            // Load priority frames first, then rest
            Promise.all(priorityFrames.map(loadFrame)).then(() => {
                // Draw first frame immediately
                if (state.images[0]) {
                    drawFrame(0);
                }

                // Load remaining frames
                const remaining = [];
                for (let i = 1; i <= total; i++) {
                    if (!priorityFrames.includes(i)) {
                        remaining.push(i);
                    }
                }

                // Batch load for performance
                let idx = 0;
                const batchSize = 8;

                function loadBatch() {
                    const batch = remaining.slice(idx, idx + batchSize);
                    idx += batchSize;

                    Promise.all(batch.map(loadFrame)).then(() => {
                        if (idx < remaining.length) {
                            // Use requestIdleCallback if available for non-blocking load
                            if (window.requestIdleCallback) {
                                requestIdleCallback(loadBatch);
                            } else {
                                setTimeout(loadBatch, 0);
                            }
                        }
                    });
                }

                loadBatch();
            });
        });
    }


    // ─── Canvas Rendering ───────────────────────────────────────
    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = window.innerWidth;
        const h = window.innerHeight;

        state.canvas.width = w * dpr;
        state.canvas.height = h * dpr;
        state.canvas.style.width = w + 'px';
        state.canvas.style.height = h + 'px';
        state.ctx.scale(dpr, dpr);

        // Redraw current frame
        drawFrame(state.currentFrame);
    }

    function drawFrame(frameIndex) {
        const img = state.images[frameIndex];
        if (!img || !state.ctx) return;

        const canvas = state.canvas;
        const ctx = state.ctx;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;

        ctx.clearRect(0, 0, cw, ch);

        // Cover fit (like CSS object-fit: cover)
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const canvasRatio = cw / ch;

        let drawW, drawH, drawX, drawY;

        if (canvasRatio > imgRatio) {
            drawW = cw;
            drawH = cw / imgRatio;
            drawX = 0;
            drawY = (ch - drawH) / 2;
        } else {
            drawH = ch;
            drawW = ch * imgRatio;
            drawX = (cw - drawW) / 2;
            drawY = 0;
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }


    // ─── Scroll Calculation ─────────────────────────────────────
    function getScrollProgress() {
        const scrollTop = window.scrollY || window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        return Math.max(0, Math.min(1, scrollTop / docHeight));
    }

    function getFrameForProgress(progress) {
        // Map overall scroll progress to frame number through sections
        for (const [, section] of Object.entries(CONFIG.sections)) {
            if (progress >= section.scrollStart && progress <= section.scrollEnd) {
                const sectionProgress = (progress - section.scrollStart) / (section.scrollEnd - section.scrollStart);
                const frame = Math.round(
                    section.frameStart + sectionProgress * (section.frameEnd - section.frameStart)
                );
                return Math.max(0, Math.min(CONFIG.totalFrames - 1, frame - 1));
            }
        }
        return CONFIG.totalFrames - 1;
    }

    function getCurrentSection(progress) {
        for (const [name, section] of Object.entries(CONFIG.sections)) {
            if (progress >= section.scrollStart && progress <= section.scrollEnd) {
                return name;
            }
        }
        return 'cta';
    }


    // ─── Animation Loop ────────────────────────────────────────
    function animationLoop() {
        // Smooth interpolation toward target frame
        const diff = state.targetFrame - state.currentFrame;

        if (Math.abs(diff) > 0.5) {
            state.currentFrame += diff * 0.15; // Smooth easing
            drawFrame(Math.round(state.currentFrame));
        } else {
            state.currentFrame = state.targetFrame;
        }

        state.rafId = requestAnimationFrame(animationLoop);
    }


    // ─── Scroll Handler ─────────────────────────────────────────
    function onScroll() {
        const progress = getScrollProgress();
        const frameIndex = getFrameForProgress(progress);
        state.targetFrame = frameIndex;

        // Update progress bar
        elements.progressFill.style.width = (progress * 100) + '%';

        // Nav visibility
        if (progress > 0.02) {
            elements.nav.classList.add('visible', 'scrolled');
        } else {
            elements.nav.classList.remove('visible', 'scrolled');
        }

        // Scroll indicator fade
        if (elements.scrollIndicator) {
            const opacity = Math.max(0, 1 - progress * 15);
            elements.scrollIndicator.style.opacity = opacity;
        }

        // Section dots visibility
        if (progress > 0.05) {
            elements.sectionDots.classList.add('visible');
        } else {
            elements.sectionDots.classList.remove('visible');
        }

        // Update active section dot
        const currentSection = getCurrentSection(progress);
        updateActiveDot(currentSection);

        // Update active nav link
        updateActiveNavLink(currentSection);

        // Trigger section animations
        updateSectionAnimations(progress);
    }


    // ─── Section Animation Triggers ─────────────────────────────
    function updateSectionAnimations(progress) {
        // Technology section (15–40%)
        if (progress >= 0.16 && progress <= 0.50) {
            const sectionProgress = (progress - 0.16) / 0.14; // ramp up over first 14% of section
            triggerAnimations('technology', Math.min(1, sectionProgress));
        }

        // Bioremediation section (40–65%)
        if (progress >= 0.42 && progress <= 0.72) {
            const sectionProgress = (progress - 0.42) / 0.14;
            triggerAnimations('bioremediation', Math.min(1, sectionProgress));
        }

        // Intelligence section (65–85%)
        if (progress >= 0.67 && progress <= 0.90) {
            const sectionProgress = (progress - 0.67) / 0.12;
            triggerAnimations('intelligence', Math.min(1, sectionProgress));
        }

        // CTA section (85–100%)
        if (progress >= 0.87) {
            const sectionProgress = (progress - 0.87) / 0.08;
            triggerAnimations('cta', Math.min(1, sectionProgress));
        }
    }

    function triggerAnimations(sectionName, intensity) {
        if (intensity <= 0) return;

        switch (sectionName) {
            case 'technology': {
                const label = document.getElementById('tech-label');
                const heading = document.getElementById('tech-heading');
                const features = document.querySelectorAll('#tech-features .feature-item');

                if (intensity > 0.1) addClass(label, 'in-view');
                if (intensity > 0.2) addClass(heading, 'in-view');
                features.forEach((f, i) => {
                    if (intensity > 0.3 + i * 0.15) addClass(f, 'in-view');
                });
                break;
            }

            case 'bioremediation': {
                const label = document.getElementById('bio-label');
                const heading = document.getElementById('bio-heading');
                const features = document.querySelectorAll('#bio-features .feature-item');

                if (intensity > 0.1) addClass(label, 'in-view');
                if (intensity > 0.2) addClass(heading, 'in-view');
                features.forEach((f, i) => {
                    if (intensity > 0.3 + i * 0.15) addClass(f, 'in-view');
                });
                break;
            }

            case 'intelligence': {
                const label = document.getElementById('intel-label');
                const heading = document.getElementById('intel-heading');
                const stats = document.getElementById('intel-stats');
                const chips = document.querySelectorAll('#intel-features .feature-chip');

                if (intensity > 0.1) addClass(label, 'in-view');
                if (intensity > 0.2) addClass(heading, 'in-view');
                if (intensity > 0.3) addClass(stats, 'in-view');
                chips.forEach((c, i) => {
                    if (intensity > 0.4 + i * 0.1) addClass(c, 'in-view');
                });
                break;
            }

            case 'cta': {
                const title = document.querySelector('.cta-title');
                const subtitle = document.querySelector('.cta-subtitle');
                const buttons = document.querySelector('.cta-buttons');

                if (intensity > 0.1) addClass(title, 'in-view');
                if (intensity > 0.3) addClass(subtitle, 'in-view');
                if (intensity > 0.5) addClass(buttons, 'in-view');
                break;
            }
        }
    }

    function addClass(el, cls) {
        if (el && !el.classList.contains(cls)) {
            el.classList.add(cls);
        }
    }


    // ─── Navigation ─────────────────────────────────────────────
    function updateActiveDot(sectionName) {
        const sectionMap = {
            hero: 'overview',
            technology: 'technology',
            bioremediation: 'detection',
            intelligence: 'bioremediation',
            cta: 'impact'
        };

        const targetId = sectionMap[sectionName];

        elements.dots.forEach(dot => {
            if (dot.dataset.target === targetId) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    function updateActiveNavLink(sectionName) {
        const links = document.querySelectorAll('.nav__link');
        const nameToId = {
            hero: 'nav-overview',
            technology: 'nav-technology',
            bioremediation: 'nav-detection',
            intelligence: 'nav-bioremediation',
            cta: 'nav-impact'
        };

        const activeId = nameToId[sectionName];

        links.forEach(link => {
            if (link.id === activeId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    function setupDotNavigation() {
        elements.dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const target = document.getElementById(dot.dataset.target);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    function setupSmoothScrollLinks() {
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href === '#') return;
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }


    // ─── Initialization ─────────────────────────────────────────
    async function init() {
        document.body.classList.add('loading');

        cacheDOMElements();
        createPreloader();
        resizeCanvas();

        // Set up event listeners
        window.addEventListener('resize', debounce(resizeCanvas, 200));
        window.addEventListener('scroll', onScroll, { passive: true });

        setupDotNavigation();
        setupSmoothScrollLinks();

        // Preload all images
        await preloadImages();

        // Ready
        state.isReady = true;
        document.body.classList.remove('loading');
        hidePreloader();

        // Start animation loop
        animationLoop();

        // Trigger initial scroll state
        onScroll();

        // Initial draw
        drawFrame(0);
    }


    // ─── Utilities ──────────────────────────────────────────────
    function debounce(fn, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), wait);
        };
    }


    // ─── Boot ───────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
