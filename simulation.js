/* ═══════════════════════════════════════════════════════════════
   NEREID — Real-Time Data Simulation Engine (simulate.js / simulation.js)
   Self-running interval-based simulation with multi-ship profiles.
   Mutates FLEET data in-memory and dispatches 'nereid:update' event.
   ═══════════════════════════════════════════════════════════════ */

const NereidSimulation = (function () {
    'use strict';

    // Simulated state (mirrors FLEET)
    const SimState = FLEET;

    // Active speed multiplier
    let _multiplier = 1;

    // Keep track of timers so we can clear/restart them on speed changes
    let _intervals = {
        fast: null,
        medium: null,
        slow: null
    };

    // Keep track of per-ship counters/state variables for the simulation
    const _shipSimData = {
        "NEREID-01": {
            currentHour: 10.0, // simulated solar clock
            coveredCellsTickCounter: 0,
            weatherMinutes: 0,
            microbeLowRefillTimer: null,
            filterResetTimer: null,
            refillWarned25: false,
            refillWarned5: false
        },
        "NEREID-02": {
            currentHour: 8.0,
            coveredCellsTickCounter: 0,
            weatherMinutes: 0,
            microbeLowRefillTimer: null,
            filterResetTimer: null,
            refillWarned25: false,
            refillWarned5: false
        },
        "NEREID-03": {
            currentHour: 6.0,
            coveredCellsTickCounter: 0,
            weatherMinutes: 7, // starts at storm building (minute 7)
            microbeLowRefillTimer: null,
            filterResetTimer: null,
            refillWarned25: false,
            refillWarned5: false
        },
        "NEREID-04": {
            currentHour: 12.0,
            coveredCellsTickCounter: 0,
            weatherMinutes: 0,
            microbeLowRefillTimer: null,
            filterResetTimer: null,
            refillWarned25: false,
            refillWarned5: false
        }
    };

    // Pool of activity log templates
    const LOG_TEMPLATES = {
        power: [
            "⚡ Solar output fluctuating — cloud cover detected",
            "🔋 Battery charging at +0.3% from solar surplus",
            "⚠️ Solar output dropped — battery mode engaged"
        ],
        patrol: [
            "📍 Sector {X} sweep complete",
            "🔄 Adjusting heading by {N}° — obstacle detected",
            "📊 Coverage updated: {N}% of assigned zone complete"
        ],
        bioremediation: [
            "🦠 Microbe deploy event — Zone {X} ({N}mL deployed)",
            "💧 Water intake cycle: {N}L processed",
            "🔬 Hydrocarbon concentration: {N} ppm — within target range"
        ],
        system: [
            "🛰️ Telemetry sync — all systems nominal",
            "📡 GPS fix updated — position locked",
            "🌊 Wave height sensor: {N}m — logged"
        ]
    };

    function _getRandomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function _getRandomCoordinate() {
        const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
        const num = Math.floor(Math.random() * 10) + 1;
        return _getRandomElement(letters) + num;
    }

    function _pushNotification(ship, icon, msg, severity) {
        if (typeof AlertManager !== 'undefined') {
            AlertManager.pushNotification(ship, icon, msg, severity);
        } else {
            const notification = {
                id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6),
                icon: icon,
                msg: msg,
                time: 'just now',
                read: false,
                severity: severity
            };
            ship.notifications.unshift(notification);
        }
    }

    function _pushActivityLog(ship, icon, msg, type) {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        ship.activityLog.unshift({ time, icon, msg, type });
        if (ship.activityLog.length > 50) {
            ship.activityLog.pop();
        }
    }

    function _dispatchUpdate(shipId, changedCategories) {
        window.dispatchEvent(new CustomEvent("nereid:update", {
            detail: { ship: shipId, changed: changedCategories }
        }));
    }

    /* ─── Fast Tick (Every 2s / multiplier) ──────────────────── */
    function _tickFast() {
        Object.keys(SimState).forEach(shipId => {
            const ship = SimState[shipId];
            if (shipId === "NEREID-04") return; // Mumbai Port: Docked. Static. No fast simulation ticks.

            const sim = _shipSimData[shipId];
            const p = ship.power;

            // 1. Advance solar clock
            // 2s tick at 1x speed. Cycle 24 hours in 240 ticks (8 mins).
            sim.currentHour = (sim.currentHour + 0.1) % 24;

            // 2. Solar Generation (sine curve + noise)
            const basePeak = 850;
            let solarWh = basePeak * Math.sin((sim.currentHour / 24) * Math.PI);
            solarWh = Math.max(0, solarWh);
            // Cloud flicker (±3% noise)
            solarWh += solarWh * (Math.random() * 0.06 - 0.03);
            solarWh = Math.min(basePeak, Math.max(0, Math.round(solarWh)));
            p.solarGenerated = solarWh;

            // 3. Ship Consumption
            let baseDraw = 600;
            if (ship.patrol.pattern === "Adaptive AI") baseDraw += 40;
            if (ship.status === "returning") baseDraw += 80;

            let consumption = baseDraw + (Math.random() * 60 - 30);
            consumption = Math.round(Math.max(100, consumption));
            p.shipConsumption = consumption;

            // 4. Update 24h sparkline array
            p.history24h.shift();
            p.history24h.push([p.solarGenerated, p.shipConsumption]);

            // Track changes
            _dispatchUpdate(shipId, ["power"]);
        });
    }

    /* ─── Medium Tick (Every 10s / multiplier) ────────────────── */
    function _tickMedium() {
        Object.keys(SimState).forEach(shipId => {
            const ship = SimState[shipId];
            const sim = _shipSimData[shipId];
            const p = ship.power;
            const pat = ship.patrol;
            const bio = ship.bioremediation;

            const changed = [];

            // ── A. Battery (all except docked Mumbai port) ──
            if (shipId !== "NEREID-04") {
                const diff = p.solarGenerated - p.shipConsumption;
                let batteryPercent = p.batteryPercent;

                if (diff > 0) {
                    batteryPercent += 0.1; // charges at +0.1%
                } else {
                    batteryPercent -= 0.3; // drains at -0.3%
                }

                // NEREID-02 special profile: starts at 35% and solar declining, drain faster
                if (shipId === "NEREID-02" && p.alertTier === 2) {
                    batteryPercent -= 1.0; // fast drain for demonstration
                }

                p.batteryPercent = Math.min(100, Math.max(0, parseFloat(batteryPercent.toFixed(1))));

                // Check battery threshold
                if (p.batteryPercent < 20) {
                    if (p.alertTier < 3) {
                        if (typeof AlertManager !== 'undefined') {
                            p.alertTier = 2; // Reset so evaluation triggers transition
                            AlertManager.evaluatePowerState(shipId);
                        } else {
                            p.alertTier = 3;
                            p.batteryModeActive = true;
                            p.autoReturnActive = true;
                            ship.status = 'returning';
                            pat.isPaused = true;
                        }
                        p.autoReturnEtaMin = 47;
                    }
                } else if (p.batteryPercent >= 20 && p.alertTier === 3) {
                    // recovered
                    if (typeof AlertManager !== 'undefined') {
                        AlertManager.evaluatePowerState(shipId);
                    }
                }

                // Decrement return ETA countdown
                if (p.autoReturnActive && p.autoReturnEtaMin > 0) {
                    p.autoReturnEtaMin = Math.max(0, p.autoReturnEtaMin - 1);
                }

                changed.push("power");
            } else {
                // NEREID-04 (Mumbai Port): Docked. Charges slowly (shore power)
                if (p.batteryPercent < 100) {
                    p.batteryPercent = Math.min(100, parseFloat((p.batteryPercent + 0.5).toFixed(1)));
                    changed.push("power");
                }
            }

            // ── B. Patrol Coverage (only active non-docked) ──
            if (shipId !== "NEREID-04" && ship.status === "active" && !pat.isPaused) {
                sim.coveredCellsTickCounter++;
                if (sim.coveredCellsTickCounter >= 3) {
                    sim.coveredCellsTickCounter = 0;

                    if (pat.coveredCells < pat.totalCells) {
                        pat.coveredCells++;
                        pat.coveragePercent = Math.min(100, Math.round((pat.coveredCells / pat.totalCells) * 100));
                        changed.push("patrol");

                        if (pat.coveredCells === pat.totalCells) {
                            // Patrol mission complete!
                            _pushActivityLog(ship, '✅', 'Patrol mission complete', 'success');
                            pat.coveragePercent = 100;
                            ship.status = 'complete'; // custom MISSION COMPLETE visual state
                            _pushNotification(ship, '✅', 'Patrol mission complete — status: MISSION COMPLETE', 'info');

                            // Reset to new area after 5 seconds
                            setTimeout(() => {
                                pat.totalCells = Math.floor(Math.random() * 21) + 40; // 40-60
                                pat.coveredCells = 0;
                                pat.coveragePercent = 0;
                                ship.status = 'active';
                                pat.isPaused = false;
                                _pushActivityLog(ship, '🔄', `New patrol assignment: ${pat.totalCells} sectors`, 'info');
                                _dispatchUpdate(shipId, ["patrol", "system"]);
                            }, 5000 / _multiplier);
                        }
                    }
                }
            }

            // ── C. Microbe Tank (only active non-docked) ──
            if (shipId !== "NEREID-04" && ship.status === "active" && !pat.isPaused) {
                // Drain by 0.05% per tick
                bio.microbeTankPercent = Math.max(0, parseFloat((bio.microbeTankPercent - 0.05).toFixed(2)));
                bio.microbeTankLiters = Math.max(0, parseFloat((bio.microbeTankPercent / 100 * bio.microbeTankTotal).toFixed(2)));
                changed.push("bioremediation");

                // Warning at 25%
                if (bio.microbeTankPercent <= 25 && bio.microbeTankPercent > 5) {
                    if (!sim.refillWarned25) {
                        sim.refillWarned25 = true;
                        _pushNotification(ship, '⚠️', 'Microbe tank low — schedule refill', 'warning');
                        _pushActivityLog(ship, '⚠️', 'Microbe level below 25% — refill recommended', 'warning');
                    }
                }

                // Critical at 5%
                if (bio.microbeTankPercent <= 5 && bio.microbeTankPercent > 0) {
                    if (!sim.refillWarned5) {
                        sim.refillWarned5 = true;
                        _pushNotification(ship, '🚨', 'Microbe tank critical — Bioremediation suspended', 'critical');
                        _pushActivityLog(ship, '🚨', 'Bioremediation suspended due to low microbe level', 'critical');
                    }
                }

                // Auto-refill at 0% after 8 seconds
                if (bio.microbeTankPercent === 0 && !sim.microbeLowRefillTimer) {
                    sim.microbeLowRefillTimer = setTimeout(() => {
                        bio.microbeTankPercent = 100;
                        bio.microbeTankLiters = bio.microbeTankTotal;
                        sim.refillWarned25 = false;
                        sim.refillWarned5 = false;
                        sim.microbeLowRefillTimer = null;
                        _pushActivityLog(ship, '🔄', 'Microbe tank refilled', 'success');
                        _pushNotification(ship, '✅', 'Microbe tank refilled — systems nominal', 'info');
                        _dispatchUpdate(shipId, ["bioremediation"]);
                    }, 8000 / _multiplier);
                }
            }

            // ── D. Water Processing (only active non-docked) ──
            if (shipId !== "NEREID-04" && ship.status === "active" && !pat.isPaused) {
                const intakeInc = Math.floor(Math.random() * 8) + 8; // 8-15 L
                let efficiency = bio.purificationEfficiency + (Math.random() * 2 - 1);
                efficiency = Math.min(72, Math.max(58, efficiency));
                bio.purificationEfficiency = parseFloat(efficiency.toFixed(1));

                const purifiedInc = Math.round(intakeInc * (bio.purificationEfficiency / 100));
                const residueInc = intakeInc - purifiedInc;

                bio.waterIntake += intakeInc;
                bio.waterPurified += purifiedInc;
                bio.waterResidue += residueInc;

                changed.push("bioremediation");
            }

            // ── E. Activity Log Injection (all except docked Mumbai port) ──
            if (shipId !== "NEREID-04") {
                if (Math.random() < 0.4) {
                    const categories = ["power", "patrol", "bioremediation", "system"];
                    const cat = _getRandomElement(categories);
                    const template = _getRandomElement(LOG_TEMPLATES[cat]);

                    let msg = template;
                    if (msg.includes("{X}")) {
                        msg = msg.replace("{X}", _getRandomCoordinate());
                    }
                    if (msg.includes("{N}")) {
                        let value = 0;
                        if (template.includes("heading")) value = Math.floor(Math.random() * 41) + 5; // 5-45°
                        else if (template.includes("Coverage")) value = pat.coveragePercent;
                        else if (template.includes("deploy")) value = Math.floor(Math.random() * 151) + 150; // 150-300mL
                        else if (template.includes("processed")) value = Math.floor(Math.random() * 16) + 10; // 10-25L
                        else if (template.includes("Hydrocarbon")) value = Math.floor(Math.random() * 101) + 50; // 50-150 ppm
                        else if (template.includes("Wave")) value = ship.weather.waveHeightM.toFixed(1);
                        msg = msg.replace("{N}", value);
                    }

                    _pushActivityLog(ship, cat === 'power' ? '⚡' : cat === 'patrol' ? '📍' : cat === 'bioremediation' ? '🦠' : '🛰️', msg, 'info');
                    changed.push("activity");
                }
            }

            if (changed.length > 0) {
                _dispatchUpdate(shipId, changed);
            }
        });
    }

    /* ─── Slow Tick (Every 60s / multiplier) ─────────────────── */
    function _tickSlow() {
        Object.keys(SimState).forEach(shipId => {
            const ship = SimState[shipId];
            const sim = _shipSimData[shipId];
            const w = ship.weather;

            const changed = [];

            // ── A. Filter Health Decay (All ships) ──
            let hasDecayed = false;
            ship.filters.forEach((f, index) => {
                let decay = 0;
                if (index === 0) decay = 0.002;
                else if (index === 1) decay = 0.004;
                else if (index === 2) decay = 0.006;

                f.health = Math.max(0, parseFloat((f.health - decay).toFixed(4)));
                hasDecayed = true;
            });

            if (hasDecayed) {
                const oldReplace = ship.filters.some(f => f.status === 'replace');
                if (typeof AlertManager !== 'undefined') {
                    AlertManager.evaluateFilterState(shipId);
                } else {
                    ship.filters.forEach(f => {
                        if (f.health < 0.40) f.status = 'replace';
                        else if (f.health < 0.60) f.status = 'fair';
                        else f.status = 'good';
                    });
                }
                changed.push("filters");

                const newReplace = ship.filters.some(f => f.status === 'replace');
                if (newReplace && !oldReplace) {
                    const panel = document.getElementById("panel-filter");
                    if (panel) {
                        panel.classList.add("flash-red");
                        setTimeout(() => {
                            panel.classList.remove("flash-red");
                        }, 3000);
                    }
                }

                // Auto-reset when filters hit near-zero for demo
                const allDead = ship.filters.every(f => f.health <= 0.05);
                if (allDead && !sim.filterResetTimer) {
                    sim.filterResetTimer = setTimeout(() => {
                        ship.filters.forEach(f => {
                            f.health = 1.0;
                            f.status = 'good';
                        });
                        sim.filterResetTimer = null;
                        _pushActivityLog(ship, '🔄', 'All hydrodynamic filters replaced', 'success');
                        _pushNotification(ship, '✅', 'All filters replaced successfully', 'info');
                        _dispatchUpdate(shipId, ["filters"]);
                    }, 5000 / _multiplier);
                }
            }

            // ── B. Weather Simulation Script (All except docked Mumbai port) ──
            if (shipId !== "NEREID-04") {
                sim.weatherMinutes = (sim.weatherMinutes + 1) % 15;

                const m = sim.weatherMinutes;

                if (m >= 0 && m < 3) {
                    w.condition = "Clear";
                    w.icon = "sun";
                    w.windKnots = 12;
                    w.waveHeightM = 0.8;
                    w.rainMmHr = 0;
                } else if (m >= 3 && m < 5) {
                    w.condition = "Partly Cloudy";
                    w.icon = "partly-cloudy";
                    w.windKnots = 22;
                    w.waveHeightM = 1.4;
                    w.rainMmHr = 2;
                } else if (m >= 5 && m < 7) {
                    w.condition = "Overcast";
                    w.icon = "cloudy";
                    w.windKnots = 28;
                    w.waveHeightM = 2.1;
                    w.rainMmHr = 8;
                } else if (m >= 7 && m < 9) {
                    w.condition = "Storm";
                    w.icon = "storm";
                    w.windKnots = 38;
                    w.waveHeightM = 3.4;
                    w.rainMmHr = 62;
                } else if (m >= 9 && m < 12) {
                    w.condition = "Overcast";
                    w.icon = "cloudy";
                    w.windKnots = 20;
                    w.waveHeightM = 1.8;
                    w.rainMmHr = 15;
                } else if (m >= 12 && m < 15) {
                    w.condition = "Clear";
                    w.icon = "sun";
                    w.windKnots = 10;
                    w.waveHeightM = 0.7;
                    w.rainMmHr = 0;
                }

                if (typeof AlertManager !== 'undefined') {
                    AlertManager.evaluateWeatherState(shipId);
                } else {
                    if (w.windKnots > 35 || w.waveHeightM > 3.0) {
                        w.safetyStatus = 'return';
                        w.autoReturnWeather = true;
                        w.weatherReturnEtaMin = 62;
                        ship.status = 'returning';
                    } else if (w.waveHeightM >= 2.0 || w.windKnots >= 25) {
                        w.safetyStatus = 'caution';
                        w.autoReturnWeather = false;
                    } else {
                        w.safetyStatus = 'safe';
                        w.autoReturnWeather = false;
                        if (ship.status === 'returning') ship.status = 'active';
                    }
                }

                changed.push("weather");
                changed.push("system");
            }

            if (changed.length > 0) {
                _dispatchUpdate(shipId, changed);
            }
        });
    }

    /* ─── Start / Timer Control ────────────────────────────── */
    function start() {
        stop();
        _intervals.fast = setInterval(_tickFast, 2000 / _multiplier);
        _intervals.medium = setInterval(_tickMedium, 10000 / _multiplier);
        _intervals.slow = setInterval(_tickSlow, 60000 / _multiplier);

        // Render debug panel
        _renderDebugPanel();
    }

    function stop() {
        if (_intervals.fast) clearInterval(_intervals.fast);
        if (_intervals.medium) clearInterval(_intervals.medium);
        if (_intervals.slow) clearInterval(_intervals.slow);
    }

    function setSpeed(multiplier) {
        _multiplier = multiplier;
        start();
    }

    /* ─── Debug Panel Controls ───────────────────────────────── */
    function triggerTier2Alert(shipId) {
        const ship = SimState[shipId];
        if (!ship) return;
        ship.power.solarGenerated = 290;
        ship.power.batteryPercent = 35;
        if (typeof AlertManager !== 'undefined') {
            AlertManager.evaluatePowerState(shipId);
        }
        _dispatchUpdate(shipId, ["power", "system"]);
    }

    function triggerTier3Alert(shipId) {
        const ship = SimState[shipId];
        if (!ship) return;
        ship.power.batteryPercent = 15;
        if (typeof AlertManager !== 'undefined') {
            AlertManager.evaluatePowerState(shipId);
        }
        _dispatchUpdate(shipId, ["power", "system"]);
    }

    function triggerStorm(shipId) {
        const ship = SimState[shipId];
        if (!ship) return;
        ship.weather.condition = "Storm";
        ship.weather.icon = "storm";
        ship.weather.windKnots = 42;
        ship.weather.waveHeightM = 3.6;
        ship.weather.rainMmHr = 75;
        if (typeof AlertManager !== 'undefined') {
            AlertManager.evaluateWeatherState(shipId);
        }
        _dispatchUpdate(shipId, ["weather", "system"]);
    }

    function triggerFilterReplace(shipId) {
        const ship = SimState[shipId];
        if (!ship) return;
        ship.filters[2].health = 0.35;
        if (typeof AlertManager !== 'undefined') {
            AlertManager.evaluateFilterState(shipId);
        }
        _dispatchUpdate(shipId, ["filters"]);
    }

    function resetAllToDefaults() {
        window.location.reload();
    }

    /* ─── Create Collapsible Debug Panel ─────────────────────── */
    function _renderDebugPanel() {
        if (document.getElementById('sim-debug-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'sim-debug-panel';
        panel.className = 'sim-debug-panel';

        const style = document.createElement('style');
        style.innerHTML = `
            .sim-debug-panel {
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 10000;
                font-family: var(--font-body), 'DM Sans', sans-serif;
                background: rgba(10, 10, 10, 0.75);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                width: 250px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                color: var(--text-muted);
            }
            .sim-debug-panel.collapsed {
                width: 44px;
                height: 44px;
                border-radius: 22px;
                overflow: hidden;
            }
            .sim-debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }
            .sim-debug-panel.collapsed .sim-debug-header {
                border-bottom: none;
                padding: 10px;
                justify-content: center;
            }
            .sim-debug-title {
                font-family: var(--font-heading), 'Bebas Neue', sans-serif;
                font-size: 13px;
                letter-spacing: 1.5px;
                color: var(--text-heading);
            }
            .sim-debug-toggle-btn {
                background: none;
                border: none;
                color: var(--text-heading);
                font-size: 14px;
                cursor: pointer;
                padding: 0;
            }
            .sim-debug-content {
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .sim-debug-panel.collapsed .sim-debug-content {
                display: none;
            }
            .sim-mode-chip {
                background: rgba(255, 179, 0, 0.1);
                color: #FFB300;
                font-size: 9px;
                letter-spacing: 1px;
                font-weight: 700;
                padding: 2px 6px;
                border-radius: 4px;
                text-transform: uppercase;
                display: inline-block;
                margin-bottom: 4px;
            }
            .sim-debug-section-title {
                font-size: 9px;
                letter-spacing: 1px;
                text-transform: uppercase;
                font-weight: 700;
                color: var(--text-muted);
                margin-bottom: 6px;
            }
            .sim-speed-btn-group {
                display: flex;
                gap: 4px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 6px;
                padding: 2px;
            }
            .sim-speed-choice {
                flex: 1;
                background: none;
                border: none;
                color: var(--text-muted);
                font-size: 10px;
                font-weight: 600;
                padding: 6px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .sim-speed-choice.active {
                background: var(--gradient-accent);
                color: #050505;
                font-weight: 700;
            }
            .sim-debug-panel.collapsed .sim-speed-btn-group,
            .sim-debug-panel.collapsed .sim-action-btn {
                display: none;
            }
            .sim-action-btn {
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.06);
                color: var(--text-heading);
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 10px;
                font-weight: 600;
                letter-spacing: 0.5px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: left;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .sim-action-btn:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.12);
            }
            .sim-action-btn--reset {
                background: rgba(239, 83, 80, 0.1);
                border: 1px solid rgba(239, 83, 80, 0.2);
                color: #EF5350;
                text-align: center;
                justify-content: center;
            }
            .sim-action-btn--reset:hover {
                background: rgba(239, 83, 80, 0.18);
                border-color: #EF5350;
            }
            @keyframes pulse-red {
                0% { border-color: rgba(255, 255, 255, 0.08); }
                50% { border-color: #EF5350; box-shadow: 0 0 12px rgba(239, 83, 80, 0.4); }
                100% { border-color: rgba(255, 255, 255, 0.08); }
            }
            .flash-red {
                animation: pulse-red 1s ease infinite;
            }
        `;
        document.head.appendChild(style);

        const shipId = new URLSearchParams(window.location.search).get('ship') || 'NEREID-01';

        panel.innerHTML = `
            <div class="sim-debug-header" id="sim-debug-header">
                <span class="sim-debug-title" id="sim-debug-title">⚙️ SIMULATION CONTROLS</span>
                <button class="sim-debug-toggle-btn" id="sim-debug-toggle">▲</button>
            </div>
            <div class="sim-debug-content">
                <div>
                    <span class="sim-mode-chip">SIMULATION MODE</span>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Targeting: <strong>${shipId}</strong></div>
                </div>

                <div>
                    <div class="sim-debug-section-title">Speed Multiplier</div>
                    <div class="sim-speed-btn-group">
                        <button class="sim-speed-choice active" data-speed="1">1×</button>
                        <button class="sim-speed-choice" data-speed="5">5×</button>
                        <button class="sim-speed-choice" data-speed="10">10×</button>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <div class="sim-debug-section-title">Manual Alerts & Triggers</div>
                    <button class="sim-action-btn" onclick="NereidSimulation.triggerTier2Alert('${shipId}')">⚡ Trigger Tier 2 Alert <span>→</span></button>
                    <button class="sim-action-btn" onclick="NereidSimulation.triggerTier3Alert('${shipId}')">🚨 Trigger Tier 3 Alert <span>→</span></button>
                    <button class="sim-action-btn" onclick="NereidSimulation.triggerStorm('${shipId}')">⛈️ Trigger Storm Override <span>→</span></button>
                    <button class="sim-action-btn" onclick="NereidSimulation.triggerFilterReplace('${shipId}')">🔴 Trigger Filter REPLACE <span>→</span></button>
                </div>

                <div style="margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px;">
                    <button class="sim-action-btn sim-action-btn--reset" onclick="NereidSimulation.resetAllToDefaults()">🔄 Reset All to Defaults</button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Collapse by default
        panel.classList.add('collapsed');
        document.getElementById('sim-debug-toggle').textContent = '▲';
        document.getElementById('sim-debug-title').style.display = 'none';

        // Toggle functionality
        document.getElementById('sim-debug-header').addEventListener('click', () => {
            const isCollapsed = panel.classList.toggle('collapsed');
            document.getElementById('sim-debug-toggle').textContent = isCollapsed ? '▲' : '▼';
            document.getElementById('sim-debug-title').style.display = isCollapsed ? 'none' : 'block';
        });

        // Speed change handlers
        panel.querySelectorAll('.sim-speed-choice').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                panel.querySelectorAll('.sim-speed-choice').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const speed = parseInt(this.getAttribute('data-speed'));
                setSpeed(speed);
            });
        });
    }

    // Auto-start when script loads
    setTimeout(start, 500);

    return {
        start,
        stop,
        setSpeed,
        triggerTier2Alert,
        triggerTier3Alert,
        triggerStorm,
        triggerFilterReplace,
        resetAllToDefaults
    };

})();
