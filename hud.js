/* ═══════════════════════════════════════════════════════════════
   NEREID — HUD Systems Controller
   Boot sequence, bioluminescent particles, live telemetry,
   data glitch effects, and log ticker.
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ─── Boot Sequence ────────────────────────────────────── */
    const bootOverlay = document.getElementById('hud-boot');
    const bootText = document.getElementById('boot-text');
    
    if (bootOverlay && bootText) {
        const bootMessages = [
            'NEREID FLEET COMMAND v4.2.1',
            'INITIALIZING TELEMETRY SUBSYSTEMS...',
            'LOADING TACTICAL MAP...',
            'CONNECTING TO VESSEL ARRAY...',
            'ALL SYSTEMS NOMINAL — ONLINE'
        ];
        let msgIndex = 0;
        const bootInterval = setInterval(() => {
            msgIndex++;
            if (msgIndex < bootMessages.length) {
                bootText.textContent = bootMessages[msgIndex];
            } else {
                clearInterval(bootInterval);
            }
        }, 400);
    }

    /* ─── UTC Clock ─────────────────────────────────────────── */
    const clockEl = document.getElementById('hud-utc-clock');
    function updateClock() {
        if (!clockEl) return;
        const now = new Date();
        const h = String(now.getUTCHours()).padStart(2, '0');
        const m = String(now.getUTCMinutes()).padStart(2, '0');
        const s = String(now.getUTCSeconds()).padStart(2, '0');
        clockEl.textContent = `UTC ${h}:${m}:${s}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    /* ─── Live Telemetry Counters ──────────────────────────── */
    const telemetryTargets = {
        'hud-ocean-covered': { target: 1428, current: 0, suffix: '', decimals: 0 },
        'hud-hydrocarbons': { target: 14.7, current: 0, suffix: '', decimals: 1 },
        'hud-microbes': { target: 3.2, current: 0, suffix: '', decimals: 1 },
        'hud-battery-avg': { target: 87, current: 0, suffix: '', decimals: 0 }
    };

    function animateCounters() {
        // Context-aware dynamic telemetry for individual ship dashboards
        const isDashboard = window.location.pathname.includes('dashboard.html');
        if (isDashboard && typeof getShipData === 'function') {
            const currentShipId = new URLSearchParams(window.location.search).get('ship') || 'NEREID-01';
            const ship = getShipData(currentShipId);
            if (ship) {
                telemetryTargets['hud-ocean-covered'].target = ship.patrol.coveragePercent;
                telemetryTargets['hud-hydrocarbons'].target = ship.bioremediation.waterPurified;
                telemetryTargets['hud-hydrocarbons'].decimals = 0; // Display liters as integer
                telemetryTargets['hud-microbes'].target = ship.bioremediation.microbeTankPercent;
                telemetryTargets['hud-battery-avg'].target = ship.power.batteryPercent;

                // Dynamically sync HUD top bar telemetry as well
                const topBarShipId = document.getElementById('hud-top-bar-ship-id');
                if (topBarShipId) topBarShipId.textContent = `${ship.id} DIRECT UPLINK`;
                const topBarStatus = document.getElementById('hud-vessel-status');
                if (topBarStatus) topBarStatus.textContent = `STATUS: ${ship.status.toUpperCase()}`;
                const topBarCoords = document.getElementById('hud-vessel-coords');
                if (topBarCoords) topBarCoords.textContent = `COORDS: ${ship.coords}`;
            }
        }

        Object.keys(telemetryTargets).forEach(id => {
            const el = document.getElementById(id);
            const data = telemetryTargets[id];
            if (!el) return;
            
            // Slowly interpolate towards target calmly without jumpy fluctuations
            const diff = data.target - data.current;
            if (Math.abs(diff) > 0.05) {
                data.current += diff * 0.08;
            } else {
                data.current = data.target;
            }
            el.textContent = data.current.toFixed(data.decimals);
        });
    }
    setInterval(animateCounters, 100);

    /* ─── Log Ticker with Typewriter Effect ─────────────────── */
    const tickerEl = document.getElementById('hud-ticker-text');
    const logMessages = [
        '> SO-01383H — OIL_DETECT EVENT @ ' + new Date().toISOString().slice(11, 19) + ' ... BIOREMEDIATION DEPLOYED ... FILTER_STATUS: GOOD',
        '> NEREID-01 — SWEEP PATTERN ALPHA COMPLETE ... COVERAGE: 94.2% ... RETURNING TO WAYPOINT',
        '> NEREID-03 — HYDROCARBON SENSOR CALIBRATION ... OIL_INDEX: 0.74 ppm ... WITHIN THRESHOLD',
        '> BASE MUMBAI — TELEMETRY UPLINK STABLE ... BANDWIDTH: 847 kbps ... LATENCY: 23ms',
        '> NEREID-02 — MICROBE TANK REPLENISHED ... CAPACITY: 98% ... BIOREMEDIATION STANDBY',
        '> ALERT — OPS_ZONE: BENGAL — NEW SPILL SIGNATURE DETECTED ... DISPATCHING NEREID-01',
        '> NEREID-03 — FILTER MESH INTEGRITY: 96% ... NEXT MAINTENANCE: 72h ... STATUS: NOMINAL'
    ];
    let tickerIndex = 0;
    let typingInterval = null;

    function typeMessage(text) {
        if (!tickerEl) return;
        clearInterval(typingInterval);
        tickerEl.textContent = '';
        let i = 0;
        typingInterval = setInterval(() => {
            if (i < text.length) {
                tickerEl.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(typingInterval);
            }
        }, 25); // Fast, high-tech typing pace (25ms per char)
    }
    
    function rotateTicker() {
        if (!tickerEl) return;
        
        let message = '';
        const isDashboard = window.location.pathname.includes('dashboard.html');
        if (isDashboard && typeof getShipData === 'function') {
            const currentShipId = new URLSearchParams(window.location.search).get('ship') || 'NEREID-01';
            const ship = getShipData(currentShipId);
            if (ship && ship.activityLog && ship.activityLog.length > 0) {
                tickerIndex = (tickerIndex + 1) % ship.activityLog.length;
                const log = ship.activityLog[tickerIndex];
                message = `> [${log.time}] ${log.icon} ${log.msg}`;
            }
        }

        if (!message) {
            tickerIndex = (tickerIndex + 1) % logMessages.length;
            message = logMessages[tickerIndex];
        }
        
        typeMessage(message);
    }
    // Start ticker typewriter immediately and rotate every 8 seconds
    setTimeout(rotateTicker, 800);
    setInterval(rotateTicker, 8000);

    /* ─── Data Glitch Effect ───────────────────────────────── */
    function triggerRandomGlitch() {
        const glitchTargets = document.querySelectorAll('.hud-metric-readout__value');
        if (glitchTargets.length === 0) return;
        
        const randomTarget = glitchTargets[Math.floor(Math.random() * glitchTargets.length)];
        randomTarget.classList.add('data-glitch');
        setTimeout(() => randomTarget.classList.remove('data-glitch'), 200);
    }
    // Trigger a glitch every 8-12 seconds
    setInterval(triggerRandomGlitch, 8000 + Math.random() * 4000);

    /* ─── Bioluminescent Particle System ───────────────────── */
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        const PARTICLE_COUNT = 60;

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = canvas.height + Math.random() * 100;
                this.size = Math.random() * 2 + 0.5;
                this.speedY = -(Math.random() * 0.3 + 0.1);
                this.speedX = (Math.random() - 0.5) * 0.15;
                this.opacity = Math.random() * 0.4 + 0.1;
                this.hue = 170 + Math.random() * 30; // teal range
            }
            update() {
                this.y += this.speedY;
                this.x += this.speedX;
                this.opacity -= 0.0005;
                if (this.y < -10 || this.opacity <= 0) {
                    this.reset();
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${this.hue}, 80%, 65%, ${this.opacity})`;
                ctx.fill();
                // Glow effect
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${this.hue}, 80%, 65%, ${this.opacity * 0.15})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const p = new Particle();
            p.y = Math.random() * canvas.height; // Spread initially
            particles.push(p);
        }

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animateParticles);
        }
        animateParticles();
    }

})();
