/* ═══════════════════════════════════════════════════════════════
   POLISH.JS — Final UI polish micro-interactions
   Additive only. No functional changes.
   ═══════════════════════════════════════════════════════════════ */

(function polishInit() {
    'use strict';

    // POLISH: Scroll progress indicator bar
    const progressBar = document.createElement('div');
    progressBar.id = 'polish-scroll-progress';
    document.body.prepend(progressBar);

    function updateScrollProgress() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = progress + '%';
    }

    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress();


    // POLISH: IntersectionObserver for staggered fade-in entrance animations
    const animateTargets = document.querySelectorAll(
        '.card, .alert-row, .ship-card, .stat-item, .popover-metric'
    );

    if (animateTargets.length > 0 && 'IntersectionObserver' in window) {
        const entranceObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    // POLISH: Stagger based on sibling index
                    const parent = el.parentElement;
                    const siblings = parent ? Array.from(parent.children) : [];
                    const index = siblings.indexOf(el);
                    const staggerDelay = Math.min(index * 60, 400); // max 400ms stagger

                    el.style.transitionDelay = staggerDelay + 'ms';
                    el.classList.add('polish-visible');

                    // POLISH: Clean up will-change after entrance animation completes
                    setTimeout(function() {
                        el.style.willChange = 'auto';
                        el.style.transitionDelay = '';
                    }, staggerDelay + 600);

                    entranceObserver.unobserve(el);
                }
            });
        }, {
            threshold: 0.05,
            rootMargin: '0px 0px -40px 0px'
        });

        animateTargets.forEach(function(el) {
            entranceObserver.observe(el);
        });
    }


    // POLISH: Dashboard scroll listeners → passive for performance
    // Patch existing scroll listeners to be passive where possible
    var origAdd = EventTarget.prototype.addEventListener;
    var scrollPatched = false;
    if (!scrollPatched) {
        // We don't override addEventListener globally — that's too risky.
        // Instead, we just ensure our new listeners are passive.
        scrollPatched = true;
    }


    // POLISH: Keyboard focus-visible ring for accessibility
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('polish-keyboard-nav');
        }
    });

    document.addEventListener('mousedown', function() {
        document.body.classList.remove('polish-keyboard-nav');
    });


    // POLISH: Smooth hover feedback on interactive elements
    document.addEventListener('mousedown', function(e) {
        var btn = e.target.closest('button, .btn, [role="button"], .ship-card__btn--primary');
        if (btn) {
            btn.style.transform = 'scale(0.97)';
            btn.style.transitionDuration = '0.1s';

            function releasePress() {
                btn.style.transform = '';
                btn.style.transitionDuration = '';
                document.removeEventListener('mouseup', releasePress);
                document.removeEventListener('mouseleave', releasePress);
            }

            document.addEventListener('mouseup', releasePress);
            document.addEventListener('mouseleave', releasePress);
        }
    });

})();
