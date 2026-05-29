/* ═══════════════════════════════════════════════════════════════
   NEREID — Operator Command Dashboard Controller
   Manages single-ship real-time telemetry rendering, manual parameters,
   bioremediation zone editing, notifications, weather forecast, 
   and live simulation integration.
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ─── State ──────────────────────────────────────────────── */
    const shipId = new URLSearchParams(window.location.search).get('ship') || 'NEREID-01';
    let patrolMode = null; // 'assign' | 'clear' | 'nogo' | null

    /* ─── DOM refs (resolved after DOMContentLoaded) ─────────── */
    let $topbarShipName  = null;
    let $topbarStatusChip = null;
    let $bellBadge        = null;

    let $panelPower       = null;
    let $panelPatrol      = null;
    let $panelBio         = null;
    let $panelFilter      = null;
    let $panelWeather     = null;
    let $panelActivity    = null;

    /* ═════════════════════════════════════════════════════════════
       HELPER: Weather Emoji Mapping
       ═════════════════════════════════════════════════════════════ */
    function getWeatherEmoji(iconName) {
        const map = {
            sun: '☀️',
            'partly-cloudy': '⛅',
            cloudy: '☁️',
            rain: '🌧️',
            storm: '⛈️'
        };
        return map[iconName] || '☀️';
    }

    /* ═════════════════════════════════════════════════════════════
       PANEL 1: RENDER POWER SYSTEM
       ═════════════════════════════════════════════════════════════ */
    function renderPowerPanel(ship) {
        const p = ship.power;
        const netValue = p.solarGenerated - p.shipConsumption;
        const isSurplus = netValue >= 0;
        
        const solarPct = (p.solarGenerated / p.solarCapacity) * 100;
        const consumptionPct = (p.shipConsumption / p.solarCapacity) * 100;

        const sparklineSVG = buildSparklineSVG(p.history24h);

        $panelPower.innerHTML = `
            <div class="card__title">POWER SYSTEM STATUS</div>
            <div class="power-layout">
                
                <!-- Left 60%: Metrics, Net, Sparkline -->
                <div class="power-left">
                    <div class="power-metrics">
                        <div class="power-metric">
                            <div class="power-metric__icon">⚡</div>
                            <div class="power-metric__label">SOLAR GENERATION</div>
                            <div class="power-metric__value">${p.solarGenerated}<span class="power-metric__unit">Wh</span></div>
                            <div class="power-bar"><div class="power-bar__fill power-bar__fill--solar" style="width: ${solarPct}%"></div></div>
                        </div>
                        <div class="power-metric">
                            <div class="power-metric__icon">🔌</div>
                            <div class="power-metric__label">SHIP CONSUMPTION</div>
                            <div class="power-metric__value">${p.shipConsumption}<span class="power-metric__unit">Wh</span></div>
                            <div class="power-bar"><div class="power-bar__fill power-bar__fill--consumption" style="width: ${consumptionPct}%"></div></div>
                        </div>
                    </div>
                    
                    <div class="power-surplus power-surplus--${isSurplus ? 'positive' : 'negative'}">
                        <span>${isSurplus ? '⚡ SURPLUS' : '⚠️ DEFICIT'}: <strong>${isSurplus ? '+' : ''}${netValue} Wh</strong></span>
                    </div>

                    <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">24h SOLAR vs CONSUMPTION PROFILE</div>
                    <div class="sparkline-chart">
                        ${sparklineSVG}
                    </div>
                </div>

                <!-- Right 40%: Tiers & Action Logs -->
                <div class="power-right">
                    <div style="font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px;">ALERT TIER ASSESSMENT</div>
                    <div class="power-tiers">
                        <div class="tier-indicator">
                            
                            <div class="tier-step ${p.alertTier === 1 ? 'active--tier1' : ''}">
                                <div class="tier-dot ${p.alertTier === 1 ? 'active--tier1' : ''}"></div>
                                <div>
                                    <div class="tier-label" style="${p.alertTier === 1 ? 'color: var(--text-heading); font-weight: 600;' : ''}">TIER 1 — NOMINAL</div>
                                    <div class="tier-desc">Solar and Battery values operating within bounds</div>
                                </div>
                            </div>
                            
                            <div class="tier-step ${p.alertTier === 2 ? 'active--tier2' : ''}">
                                <div class="tier-dot ${p.alertTier === 2 ? 'active--tier2' : ''}"></div>
                                <div>
                                    <div class="tier-label" style="${p.alertTier === 2 ? 'color: var(--text-heading); font-weight: 600;' : ''}">TIER 2 — SOLAR WARNING</div>
                                    <div class="tier-desc">Solar below 40% average. Aux battery active.</div>
                                </div>
                            </div>
                            
                            <div class="tier-step ${p.alertTier === 3 ? 'active--tier3' : ''}">
                                <div class="tier-dot ${p.alertTier === 3 ? 'active--tier3' : ''}"></div>
                                <div>
                                    <div class="tier-label" style="${p.alertTier === 3 ? 'color: var(--text-heading); font-weight: 600;' : ''}">TIER 3 — BATTERY CRITICAL</div>
                                    <div class="tier-desc">Battery < 20%. Automatic shoreline return.</div>
                                </div>
                            </div>
                            
                        </div>
                    </div>

                    <!-- Active Mode Status details -->
                    ${p.alertTier === 1 ? `
                        <div class="tier-active-msg">
                            Solar output is nominal. Reserves stabilized. Battery at <strong>${p.batteryPercent}%</strong>.
                        </div>
                    ` : p.alertTier === 2 ? `
                        <div class="tier-active-msg tier-active-msg--warning">
                            ⚠️ Warning: Low solar generation. Battery mode automatically engaged to conserve operational capacity.
                            <div class="toggle-row">
                                <span class="toggle-label">Auxiliary Battery Mode</span>
                                <button class="toggle ${p.batteryModeActive ? 'on' : ''}" onclick="toggleBatteryMode()">
                                    <span class="toggle__knob"></span>
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div class="tier-active-msg tier-active-msg--critical">
                            🚨 CRITICAL: Battery reserve depleted below safety margins. Smart Autonomous Shoreline Return triggered.
                        </div>
                        <div class="auto-return-display">
                            <div class="auto-return-display__title">Emergency Return In Progress</div>
                            <div class="auto-return-display__eta">${p.autoReturnEtaMin} MIN ETA</div>
                        </div>
                        ${p.ownerNotified ? `
                            <div class="owner-notified-chip">
                                <span>✓ HARBOR CONTROLS NOTIFIED (${p.ownerNotifiedTime || '10:15 AM'})</span>
                            </div>
                        ` : ''}
                    `}

                </div>
            </div>
        `;
    }

    /* ═════════════════════════════════════════════════════════════
       PANEL 2: RENDER PATROL & MISSION AREA
       ═════════════════════════════════════════════════════════════ */
    function renderPatrolPanel(ship) {
        const pat = ship.patrol;

        // Render 100 zone-cells
        let gridHTML = '';
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 10; c++) {
                let cellClass = 'zone-cell';
                if (hasZone(pat.noGoZones, r, c)) cellClass += ' no-go';
                else if (hasZone(pat.coveredZones, r, c)) cellClass += ' covered';
                else if (hasZone(pat.assignedZones, r, c)) cellClass += ' assigned';

                gridHTML += `<div class="${cellClass}" data-row="${r}" data-col="${c}" onclick="handleCellClick(this, ${r}, ${c})"></div>`;
            }
        }

        const sweepRingHTML = buildCoverageRingSVG(pat.coveragePercent);

        $panelPatrol.innerHTML = `
            <div class="card__title">MISSION AREA & PATROL CONTROLS</div>
            <div style="display: flex; gap: 24px;">
                
                <!-- Left 55%: Interactive Grid & Select Tool -->
                <div style="flex: 0 0 55%;">
                    <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">INTERACTIVE SECTOR ASSIGNMENT GRID (10x10)</div>
                    <div class="zone-grid">
                        ${gridHTML}
                    </div>
                    <div class="zone-controls">
                        <button class="zone-btn ${patrolMode === 'assign' ? 'active' : ''}" onclick="setPatrolMode('assign')">Assign Zone</button>
                        <button class="zone-btn ${patrolMode === 'nogo' ? 'active' : ''}" onclick="setPatrolMode('nogo')">Set No-Go</button>
                        <button class="zone-btn ${patrolMode === 'clear' ? 'active' : ''}" onclick="setPatrolMode('clear')">Clear Cell</button>
                    </div>
                    
                    <div class="patrol-params">
                        <div class="param-row">
                            <span class="param-label">Patrol Speed</span>
                            <input type="range" class="param-slider" min="0.5" max="3.0" step="0.1" value="${pat.speed}" oninput="updatePatrolParam('speed', parseFloat(this.value))">
                            <span class="param-value" id="val-speed">${pat.speed.toFixed(1)} kn</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Sweep Width</span>
                            <input type="range" class="param-slider" min="5" max="50" step="5" value="${pat.sweepWidth}" oninput="updatePatrolParam('sweepWidth', parseInt(this.value))">
                            <span class="param-value" id="val-sweepWidth">${pat.sweepWidth} m</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Sweep Overlap</span>
                            <input type="range" class="param-slider" min="0" max="50" step="5" value="${pat.overlap}" oninput="updatePatrolParam('overlap', parseInt(this.value))">
                            <span class="param-value" id="val-overlap">${pat.overlap}%</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Patrol Pattern</span>
                            <select class="param-select" onchange="updatePatrolParam('pattern', this.value)">
                                <option value="Lawnmower" ${pat.pattern === 'Lawnmower' ? 'selected' : ''}>Lawnmower (Grid Sweep)</option>
                                <option value="Spiral" ${pat.pattern === 'Spiral' ? 'selected' : ''}>Spiral Outward</option>
                                <option value="Adaptive AI" ${pat.pattern === 'Adaptive AI' ? 'selected' : ''}>Adaptive AI Spill-Targeted</option>
                                <option value="—" ${pat.pattern === '—' ? 'selected' : ''}>None (Station Keeping)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Right 45%: Circular Coverage Graphic & Telemetry -->
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">PATROL COVERAGE METRICS</div>
                    ${sweepRingHTML}
                </div>
            </div>
        `;

        // Setup local vector map background (wrapped in try-catch to never block other panels)
        try {
            const container = $panelPatrol.querySelector('.zone-grid');
            const bgMap = document.querySelector('.background-map-svg');
            if (container && bgMap) {
                const mapWrapper = document.createElement('div');
                mapWrapper.id = 'local-map-container';
                mapWrapper.className = 'zone-grid-svg-map-container';

                const localMap = bgMap.cloneNode(true);
                localMap.setAttribute('class', 'zone-grid-svg-map');
                localMap.removeAttribute('id');

                // Remove <defs> to prevent duplicate IDs in the DOM
                const defs = localMap.querySelector('defs');
                if (defs) defs.remove();

                // Remove background grid pattern rect to avoid line doubling
                const gridRect = localMap.querySelector('rect[fill="url(#grid-pattern-dash)"]');
                if (gridRect) gridRect.remove();

                // Remove mask filters so cloned map elements are visible
                localMap.querySelectorAll('[mask]').forEach(el => el.removeAttribute('mask'));

                // Set viewBox based on ship.id
                let localViewBox = '575 115 260 260'; // Default NEREID-01 (Bay of Bengal)
                let shipX = 705, shipY = 245;

                if (ship.id === 'NEREID-02') {
                    localViewBox = '400 90 260 260'; // Arabian Sea
                    shipX = 530; shipY = 220;
                } else if (ship.id === 'NEREID-03') {
                    localViewBox = '670 140 260 260'; // Pacific Zone
                    shipX = 800; shipY = 270;
                } else if (ship.id === 'NEREID-04') {
                    localViewBox = '535 105 260 260'; // Mumbai Port
                    shipX = 665; shipY = 235;
                }

                localMap.setAttribute('viewBox', localViewBox);

                // Build ship marker using DOMParser for cross-browser SVG support
                const markerSVG = `<svg xmlns="http://www.w3.org/2000/svg"><g class="local-ship-marker">
                    <circle cx="${shipX}" cy="${shipY}" r="12" fill="none" class="ship-pulse-ring" />
                    <circle cx="${shipX}" cy="${shipY}" r="3.5" class="ship-pulse-core" />
                    <path d="M ${shipX-5} ${shipY+2.5} L ${shipX+5} ${shipY+2.5} L ${shipX+3.5} ${shipY-2} L ${shipX-3.5} ${shipY-2} Z" />
                    <text x="${shipX + 8}" y="${shipY + 3.5}">${ship.id}</text>
                </g></svg>`;
                const parsed = new DOMParser().parseFromString(markerSVG, 'image/svg+xml');
                const shipMarker = parsed.querySelector('g');
                if (shipMarker) {
                    localMap.appendChild(document.importNode(shipMarker, true));
                }

                mapWrapper.appendChild(localMap);
                container.insertBefore(mapWrapper, container.firstChild);
            }
        } catch (e) {
            console.warn('Local map overlay failed:', e);
        }
    }

    /* ═════════════════════════════════════════════════════════════
       PANEL 3: RENDER BIOREMEDIATION SYSTEM
       ═════════════════════════════════════════════════════════════ */
    function renderBioPanel(ship) {
        const bio = ship.bioremediation;
        const refillWarning = bio.microbeTankPercent < 25;

        // Calculate purified/residue percentages
        const purifiedPct = bio.waterIntake > 0 ? (bio.waterPurified / bio.waterIntake * 100) : 0;
        const residuePct = bio.waterIntake > 0 ? (bio.waterResidue / bio.waterIntake * 100) : 0;

        $panelBio.innerHTML = `
            <div class="card__title">BIOREMEDIATION SYSTEM</div>
            
            <!-- Tank Level Visual -->
            <div class="tank-container">
                <div class="tank-visual">
                    <div class="tank-fill" style="height: ${bio.microbeTankPercent}%"></div>
                </div>
                <div class="tank-info">
                    <div class="tank-level">${bio.microbeTankPercent}<span>%</span></div>
                    <div class="tank-detail">Microbial Agent Tank (${bio.microbeTankLiters.toFixed(2)}L / ${bio.microbeTankTotal.toFixed(1)}L)</div>
                    <div class="tank-depletion">Active depletion rate: <strong>${bio.depletionRateHours > 0 ? bio.depletionRateHours.toFixed(2) + ' hrs remaining' : 'System Idle'}</strong></div>
                    ${refillWarning ? `
                        <div class="tank-refill-warning">
                            ⚠️ REFILL OVERDUE — Microbial Agent Below Safe Limit
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Water processing bar logs -->
            <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; margin-top: 16px;">WATER PROCESSING METRICS</div>
            <div class="water-metrics">
                <div class="water-metric">
                    <div class="water-metric__label">INTAKE</div>
                    <div class="water-metric__value">${bio.waterIntake}<span class="water-metric__unit">L</span></div>
                    <div class="water-bar"><div class="water-bar__fill water-bar__fill--intake" style="width: 100%"></div></div>
                    <div class="water-metric__pct">100%</div>
                </div>
                <div class="water-metric">
                    <div class="water-metric__label">PURIFIED</div>
                    <div class="water-metric__value">${bio.waterPurified}<span class="water-metric__unit">L</span></div>
                    <div class="water-bar"><div class="water-bar__fill water-bar__fill--purified" style="width: ${purifiedPct}%"></div></div>
                    <div class="water-metric__pct">${purifiedPct.toFixed(1)}%</div>
                </div>
                <div class="water-metric">
                    <div class="water-metric__label">OIL RESIDUE</div>
                    <div class="water-metric__value">${bio.waterResidue}<span class="water-metric__unit">L</span></div>
                    <div class="water-bar"><div class="water-bar__fill water-bar__fill--residue" style="width: ${residuePct}%"></div></div>
                    <div class="water-metric__pct">${residuePct.toFixed(1)}%</div>
                </div>
            </div>

            <div class="purification-score">
                <span>Hydrocarbon Neutralization Index: <strong>${bio.purificationEfficiency.toFixed(1)}%</strong></span>
            </div>

            <div style="font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">ACTIVE METABOLIC BACTERIA MIXTURE</div>
            <div class="microbe-chips">
                ${bio.microbesDeployed.map(m => `<span class="microbe-chip">${m}</span>`).join('')}
            </div>
        `;
    }

    /* ═════════════════════════════════════════════════════════════
       PANEL 4: RENDER FILTER HEALTH
       ═════════════════════════════════════════════════════════════ */
    function renderFilterPanel(ship) {
        const hasReplace = ship.filters.some(f => f.status === 'replace');

        const filtersHTML = ship.filters.map(f => {
            let barStyle = 'background: var(--accent-cyan);';
            if (f.status === 'replace') {
                barStyle = 'background: var(--color-critical);';
            } else if (f.status === 'fair') {
                barStyle = 'background: var(--color-warning);';
            }

            return `
                <div class="filter-item">
                    <span class="filter-name">${f.name}</span>
                    <div class="filter-bar">
                        <div class="filter-bar__fill" style="width: ${f.health * 100}%; ${barStyle}"></div>
                    </div>
                    <span class="filter-pct">${Math.round(f.health * 100)}%</span>
                    <span class="filter-status filter-status--${f.status}">${f.status.toUpperCase()}</span>
                </div>
            `;
        }).join('');

        $panelFilter.innerHTML = `
            <div class="card__title">HYDRODYNAMIC FILTER HEALTH</div>
            <div class="filter-list">
                ${filtersHTML}
            </div>

            ${hasReplace ? `
                <div class="filter-replace-banner">
                    ⚠️ BIO-MEMBRANE BLOCKAGE: Hydrocarbon filtration capacity is severely restricted. Dock and replace filter immediately.
                </div>
            ` : ''}

            <div class="filter-maintenance">
                <div class="filter-maintenance__next">Next Maintenance Cycle: <strong>${ship.nextMaintenance}</strong> (${ship.maintenanceDaysAway} days remaining)</div>
                <button class="reminder-btn" onclick="setMaintenanceReminder()">Schedule Maintenance Session</button>
                
                <div class="maintenance-history">
                    <div class="maintenance-history__title">PAST COMPLETED SERVICES</div>
                    ${ship.maintenanceHistory.map(h => `
                        <div class="maintenance-entry">
                            <strong>${h.date}</strong>
                            <span>${h.note}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /* ═════════════════════════════════════════════════════════════
       PANEL 5: RENDER WEATHER INTELLIGENCE
       ═════════════════════════════════════════════════════════════ */
    function renderWeatherPanel(ship) {
        const w = ship.weather;

        const forecastHTML = w.forecast7d.map(day => `
            <div class="forecast-day">
                <div class="forecast-day__name">${day.day}</div>
                <div class="forecast-day__icon">${getWeatherEmoji(day.icon)}</div>
                <div class="forecast-day__temp">${day.tempC}°C</div>
                <div class="forecast-day__wave">${day.waveM}m</div>
            </div>
        `).join('');

        $panelWeather.innerHTML = `
            <div class="card__title">WEATHER INTELLIGENCE & SAFETY FEED</div>
            
            <div class="weather-current">
                <div class="weather-icon">${getWeatherEmoji(w.icon)}</div>
                <div class="weather-details">
                    <div class="weather-condition">${w.condition} Conditions</div>
                    <div class="weather-stats">
                        Temp: <strong>${w.tempC}°C</strong> · 
                        Wind: <strong>${w.windKnots} kn</strong> · 
                        Waves: <strong>${w.waveHeightM}m</strong> · 
                        Rain: <strong>${w.rainMmHr} mm/hr</strong>
                    </div>
                    <div class="weather-location">Location: ${ship.coords} (${ship.location})</div>
                </div>
            </div>

            <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">7-DAY DEPLOYMENT ZONE OUTLOOK</div>
            <div class="weather-forecast">
                ${forecastHTML}
            </div>

            <div class="weather-safety weather-safety--${w.safetyStatus}">
                <div class="weather-safety__dot"></div>
                <div class="weather-safety__text">
                    ${w.safetyStatus === 'safe' ? 'WEATHER CONDITIONS NOMINAL — FULL AUTONOMY ENABLED' :
                      w.safetyStatus === 'caution' ? 'WEATHER CAUTION ADVISORY — STABILIZER THRUSTERS ACTIVE' :
                      'WEATHER SAFETY RETURN ACTIVE — EXCEEDS WAVE/WIND DESIGN LIMITS'}
                </div>
            </div>

            ${w.autoReturnWeather ? `
                <div class="weather-return-banner">
                    <div class="weather-return-banner__title">⚠️ AUTOMATIC WEATHER RETURN OVERRIDE ACTIVE</div>
                    <div class="weather-return-banner__eta">${w.weatherReturnEtaMin} MIN ETA TO NEAREST HARBOR</div>
                </div>
            ` : ''}
        `;
    }

    /* ═════════════════════════════════════════════════════════════
       PANEL 6: RENDER LIVE ACTIVITY & NOTIFICATIONS
       ═════════════════════════════════════════════════════════════ */
    function renderActivityPanel(ship) {
        const logs = ship.activityLog;
        const notifs = ship.notifications;

        const logsHTML = logs.map(log => `
            <div class="activity-entry activity-entry--${log.type}">
                <span class="activity-entry__time">${log.time}</span>
                <span class="activity-entry__icon">${log.icon}</span>
                <span class="activity-entry__msg">${log.msg}</span>
            </div>
        `).join('');

        const notifsHTML = notifs.map(n => `
            <div class="notification-card ${n.read ? 'read' : 'unread'}">
                <span class="notification-card__icon">${n.icon}</span>
                <div class="notification-card__content">
                    <div class="notification-card__msg">${n.msg}</div>
                    <div class="notification-card__time">${n.time}</div>
                </div>
                ${!n.read ? `<button class="notification-card__dismiss" onclick="dismissNotification('${n.id}')">Dismiss</button>` : ''}
            </div>
        `).join('');

        $panelActivity.innerHTML = `
            <div class="activity-layout">
                
                <!-- Live Activity Feed -->
                <div class="activity-feed">
                    <div class="card__title card__title--sm">ROBOTIC LOG & LIVE ACTIVITY FEED</div>
                    <div class="activity-feed__list">
                        ${logsHTML.length > 0 ? logsHTML : '<div style="color:var(--text-muted);padding:20px;text-align:center;">No recent logs.</div>'}
                    </div>
                </div>

                <!-- Notifications -->
                <div class="notification-center">
                    <div class="notification-header">
                        <div class="card__title card__title--sm" style="margin-bottom: 0;">UNRESOLVED OPERATIONAL NOTIFICATIONS</div>
                        <button class="mark-all-read" onclick="markAllNotificationsRead()">Mark all resolved</button>
                    </div>
                    <div class="notification-list">
                        ${notifsHTML.length > 0 ? notifsHTML : '<div style="color:var(--text-muted);padding:20px;text-align:center;">All notifications resolved.</div>'}
                    </div>
                </div>

            </div>
        `;
    }

    /* ═════════════════════════════════════════════════════════════
       SVG BUILDER: SPARKLINE PROFILE CHART (400x120)
       ═════════════════════════════════════════════════════════════ */
    function buildSparklineSVG(history24h) {
        if (!history24h || history24h.length === 0) return '';

        // Find min and max across both solar and consumption values for scaling
        let maxVal = -Infinity;
        let minVal = Infinity;
        history24h.forEach(pair => {
            const [solar, cons] = pair;
            if (solar > maxVal) maxVal = solar;
            if (cons > maxVal) maxVal = cons;
            if (solar < minVal) minVal = solar;
            if (cons < minVal) minVal = cons;
        });

        // Add visual cushion margins
        if (maxVal === minVal) maxVal = minVal + 1;
        const diff = maxVal - minVal;
        minVal = Math.max(0, minVal - diff * 0.05);
        maxVal = maxVal + diff * 0.05;
        const range = maxVal - minVal;

        // Build polyline point coordinates
        const solarPoints = [];
        const consPoints = [];

        history24h.forEach((pair, index) => {
            const [solar, cons] = pair;
            const x = (index / (history24h.length - 1)) * 400;
            
            // Inverted height coordinate mapping (0 is at top in SVG)
            const solarY = 110 - ((solar - minVal) / range) * 100;
            const consY = 110 - ((cons - minVal) / range) * 100;

            solarPoints.push(`${x.toFixed(1)},${solarY.toFixed(1)}`);
            consPoints.push(`${x.toFixed(1)},${consY.toFixed(1)}`);
        });

        // Sparkline Grid Guides (Dashed line references for premium aesthetic)
        const midpointY = 60;
        const upperY = 20;
        const lowerY = 100;

        return `
            <svg viewBox="0 0 400 120" preserveAspectRatio="none">
                <!-- Reference Grid Guides -->
                <line x1="0" y1="${upperY}" x2="400" y2="${upperY}" stroke="rgba(255,255,255,0.03)" stroke-dasharray="4,4" />
                <line x1="0" y1="${midpointY}" x2="400" y2="${midpointY}" stroke="rgba(255,255,255,0.03)" stroke-dasharray="4,4" />
                <line x1="0" y1="${lowerY}" x2="400" y2="${lowerY}" stroke="rgba(255,255,255,0.03)" stroke-dasharray="4,4" />

                <!-- Polylines -->
                <polyline points="${solarPoints.join(' ')}" fill="none" stroke="#00D6FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <polyline points="${consPoints.join(' ')}" fill="none" stroke="#1e90ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-muted);margin-top:4px;">
                <span>24h Ago</span>
                <span style="display:flex;gap:12px;">
                    <span style="color:#00D6FF;">■ SOLAR</span>
                    <span style="color:#1e90ff;">■ CONSUMPTION</span>
                </span>
                <span>Live Feed</span>
            </div>
        `;
    }

    /* ═════════════════════════════════════════════════════════════
       SVG BUILDER: CIRCULAR PATROL COVERAGE RING
       ═════════════════════════════════════════════════════════════ */
    function buildCoverageRingSVG(percent) {
        const r = 56;
        const circ = 2 * Math.PI * r; // ~351.86
        const offset = circ * (1 - percent / 100);

        return `
            <div class="coverage-ring-container">
                <div class="coverage-ring">
                    <svg viewBox="0 0 140 140">
                        <defs>
                            <linearGradient id="coverageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#1e90ff" />
                                <stop offset="100%" stop-color="#00D6FF" />
                            </linearGradient>
                        </defs>
                        <circle class="coverage-ring__bg" cx="70" cy="70" r="56" />
                        <circle class="coverage-ring__fill" cx="70" cy="70" r="56" 
                                stroke-dasharray="${circ}" 
                                stroke-dashoffset="${offset}" />
                    </svg>
                    <div class="coverage-ring__text">
                        <div class="coverage-ring__percent">${percent}%</div>
                        <div class="coverage-ring__label">Area Covered</div>
                    </div>
                </div>
            </div>
        `;
    }

    /* ═════════════════════════════════════════════════════════════
       HELPER: Zone grid coordinate searching
       ═════════════════════════════════════════════════════════════ */
    function hasZone(arr, r, c) {
        if (!arr) return false;
        return arr.some(z => z[0] === r && z[1] === c);
    }

    /* ═════════════════════════════════════════════════════════════
       INTERACTIVE CELL EDITING
       ═════════════════════════════════════════════════════════════ */
    function handleCellClick(el, row, col) {
        const ship = getShipData(shipId);
        if (!ship || !patrolMode) return;

        const pat = ship.patrol;

        if (patrolMode === 'assign') {
            // Remove from no-go
            pat.noGoZones = pat.noGoZones.filter(z => !(z[0] === row && z[1] === col));
            // Add to assigned if not present
            if (!hasZone(pat.assignedZones, row, col)) {
                pat.assignedZones.push([row, col]);
                // Log activity
                AlertManager.pushActivityLog(ship, '🔄', `Assigned patrol coordinates [${row},${col}]`, 'info');
            }
        } else if (patrolMode === 'nogo') {
            // Remove from assigned and covered
            pat.assignedZones = pat.assignedZones.filter(z => !(z[0] === row && z[1] === col));
            pat.coveredZones = pat.coveredZones.filter(z => !(z[0] === row && z[1] === col));
            // Add to no-go if not present
            if (!hasZone(pat.noGoZones, row, col)) {
                pat.noGoZones.push([row, col]);
                AlertManager.pushActivityLog(ship, '⚠️', `No-Go restriction applied at [${row},${col}]`, 'warning');
            }
        } else if (patrolMode === 'clear') {
            // Remove from all
            pat.assignedZones = pat.assignedZones.filter(z => !(z[0] === row && z[1] === col));
            pat.noGoZones = pat.noGoZones.filter(z => !(z[0] === row && z[1] === col));
            pat.coveredZones = pat.coveredZones.filter(z => !(z[0] === row && z[1] === col));
            AlertManager.pushActivityLog(ship, '🔄', `Cleared coordinates [${row},${col}]`, 'info');
        }

        // Dynamically recalculate totals
        pat.totalCells = pat.assignedZones.length;
        pat.coveredCells = pat.assignedZones.filter(az => hasZone(pat.coveredZones, az[0], az[1])).length;
        pat.coveragePercent = pat.totalCells > 0 ? Math.round((pat.coveredCells / pat.totalCells) * 100) : 0;

        // Re-render Patrol area
        renderPatrolPanel(ship);
    }

    function setPatrolMode(mode) {
        patrolMode = (patrolMode === mode) ? null : mode;
        const ship = getShipData(shipId);
        if (ship) renderPatrolPanel(ship);
    }

    /* ═════════════════════════════════════════════════════════════
       MANUAL PARAMETERS EDITORS
       ═════════════════════════════════════════════════════════════ */
    function updatePatrolParam(key, value) {
        const ship = getShipData(shipId);
        if (!ship) return;

        ship.patrol[key] = value;
        
        // Immediate value text update
        const displayEl = document.getElementById(`val-${key}`);
        if (displayEl) {
            if (key === 'speed') displayEl.textContent = `${value.toFixed(1)} kn`;
            else if (key === 'sweepWidth') displayEl.textContent = `${value} m`;
            else if (key === 'overlap') displayEl.textContent = `${value}%`;
        }

        // If sweep parameters changed, recalculate coverage speed rate in log
        if (key === 'speed') {
            AlertManager.pushActivityLog(ship, '🔄', `Speed set to ${value} knots by operator`, 'info');
            ship.patrol.etaMinutes = value > 0 ? Math.round(390 / value) : 0;
            
            // Re-render only stats
            const statsEl = document.querySelector('.coverage-stats');
            if (statsEl) {
                statsEl.innerHTML = `
                    <div>Cells: <strong>${ship.patrol.coveredCells}</strong> / ${ship.patrol.totalCells}</div>
                    <div class="coverage-eta">ETA to Complete: <strong>${ship.patrol.etaMinutes ? ship.patrol.etaMinutes + 'm' : 'N/A'}</strong></div>
                `;
            }
        }
    }

    /* ═════════════════════════════════════════════════════════════
       BATTERY TOGGLE MODE
       ═════════════════════════════════════════════════════════════ */
    function toggleBatteryMode() {
        const ship = getShipData(shipId);
        if (!ship) return;

        ship.power.batteryModeActive = !ship.power.batteryModeActive;
        
        if (ship.power.batteryModeActive) {
            AlertManager.pushActivityLog(ship, '🔋', 'Battery mode manually enabled by operator', 'warning');
            AlertManager.pushNotification(ship, '⚠️', 'Battery mode engaged', 'warning');
        } else {
            AlertManager.pushActivityLog(ship, '⚡', 'Battery mode manually disabled by operator', 'info');
        }

        renderPowerPanel(ship);
    }

    /* ═════════════════════════════════════════════════════════════
       NOTIFICATIONS DISMISS / MARK READ
       ═════════════════════════════════════════════════════════════ */
    function dismissNotification(notifId) {
        if (typeof AlertManager !== 'undefined') {
            AlertManager.dismissNotification(shipId, notifId);
        }
        updateDashboardUI();
    }

    function markAllNotificationsRead() {
        if (typeof AlertManager !== 'undefined') {
            AlertManager.markAllRead(shipId);
        }
        updateDashboardUI();
    }

    /* ═════════════════════════════════════════════════════════════
       MAINTENANCE REMINDER TRIGGER
       ═════════════════════════════════════════════════════════════ */
    function setMaintenanceReminder() {
        const ship = getShipData(shipId);
        if (!ship) return;
        
        alert(`Reminder Scheduled: A service alert has been scheduled for NEREID Maintenance Team on ${ship.nextMaintenance}.`);
        AlertManager.pushActivityLog(ship, '📅', 'Service reminder set by operator', 'success');
        updateDashboardUI();
    }

    /* ═════════════════════════════════════════════════════════════
       LIVE DATA UPDATE PIPELINE — called in real-time by simulation
       ═════════════════════════════════════════════════════════════ */
    function updateDashboardUI() {
        const ship = getShipData(shipId);
        if (!ship) return;

        const statusUpper = ship.status.toUpperCase();

        // 1. Topbar Telemetry
        if ($topbarShipName) $topbarShipName.textContent = ship.id;
        if ($topbarStatusChip) {
            $topbarStatusChip.className = `status-chip status-chip--${ship.status}`;
            $topbarStatusChip.innerHTML = `<span class="status-chip__dot"></span> ${statusUpper}`;
        }

        // 2. Bell Badge count
        const unreadCount = ship.notifications.filter(n => !n.read).length;
        if ($bellBadge) {
            $bellBadge.textContent = unreadCount;
            $bellBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }

        // 3. Render 6 modules
        renderPowerPanel(ship);
        renderPatrolPanel(ship);
        renderBioPanel(ship);
        renderFilterPanel(ship);
        renderWeatherPanel(ship);
        renderActivityPanel(ship);

        // Recalculate background map mask coordinates
        updateMapMask();
    }

    /* ═════════════════════════════════════════════════════════════
       SIDEBAR HIGH-END ACTIVE SCROLL BINDING
       ═════════════════════════════════════════════════════════════ */
    window.scrollToPanel = function (id) {
        if (id === 'dashboard') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            const el = document.getElementById(id);
            if (el) {
                const top = el.offsetTop - 80;
                window.scrollTo({ top: top, behavior: 'smooth' });
            }
        }
    };

    window.addEventListener('scroll', function () { // POLISH: passive for perf
        const scrollPos = window.scrollY || document.documentElement.scrollTop;
        const panels = ['panel-power', 'panel-patrol', 'panel-bio', 'panel-filter', 'panel-weather', 'panel-activity'];
        
        let activePanel = 'dashboard';
        
        for (const id of panels) {
            const el = document.getElementById(id);
            if (el) {
                const top = el.offsetTop - 120;
                if (scrollPos >= top) {
                    activePanel = id;
                }
            }
        }
        
        document.querySelectorAll('.sidebar__link[data-target]').forEach(link => {
            link.classList.toggle('active', link.dataset.target === activePanel);
        });
    }, { passive: true });

    /* ═════════════════════════════════════════════════════════════
       MAGIC BENTO INTERACTIVE CONTROLLER
       ═════════════════════════════════════════════════════════════ */
    function initMagicBento() {
        const panels = [
            document.getElementById('panel-power'),
            document.getElementById('panel-patrol'),
            document.getElementById('panel-bio'),
            document.getElementById('panel-filter'),
            document.getElementById('panel-weather'),
            document.getElementById('panel-activity')
        ].filter(Boolean);

        if (panels.length === 0) return;

        const spotlightRadius = 350;
        const glowColor = '0, 214, 255'; // Neon Cyan matching Nereid primary active state

        // Create Global Spotlight Overlay
        const spotlight = document.createElement('div');
        spotlight.className = 'global-spotlight';
        document.body.appendChild(spotlight);

        // Track global spotlight mouse moves
        document.addEventListener('mousemove', function (e) {
            const grid = document.querySelector('.dashboard-grid');
            if (!grid) return;

            const rect = grid.getBoundingClientRect();
            const mouseInside = (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            );

            if (!mouseInside) {
                gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
                panels.forEach(card => {
                    card.style.setProperty('--glow-intensity', '0');
                });
                return;
            }

            const proximity = spotlightRadius * 0.5;
            const fadeDistance = spotlightRadius * 0.75;
            let minDistance = Infinity;

            panels.forEach(card => {
                const cardRect = card.getBoundingClientRect();
                const centerX = cardRect.left + cardRect.width / 2;
                const centerY = cardRect.top + cardRect.height / 2;
                const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
                const effectiveDistance = Math.max(0, distance);

                minDistance = Math.min(minDistance, effectiveDistance);

                let glowIntensity = 0;
                if (effectiveDistance <= proximity) {
                    glowIntensity = 1;
                } else if (effectiveDistance <= fadeDistance) {
                    glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
                }

                const relX = ((e.clientX - cardRect.left) / cardRect.width) * 100;
                const relY = ((e.clientY - cardRect.top) / cardRect.height) * 100;
                card.style.setProperty('--glow-x', `${relX}%`);
                card.style.setProperty('--glow-y', `${relY}%`);
                card.style.setProperty('--glow-intensity', glowIntensity.toString());
                card.style.setProperty('--glow-radius', `${spotlightRadius}px`);
            });

            gsap.to(spotlight, {
                left: e.clientX,
                top: e.clientY,
                duration: 0.1,
                ease: 'power2.out'
            });

            const targetOpacity = minDistance <= proximity
                ? 0.8
                : minDistance <= fadeDistance
                    ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
                    : 0;

            gsap.to(spotlight, {
                opacity: targetOpacity,
                duration: targetOpacity > 0 ? 0.2 : 0.5,
                ease: 'power2.out'
            });
        });

        document.addEventListener('mouseleave', function () {
            panels.forEach(card => {
                card.style.setProperty('--glow-intensity', '0');
            });
            gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
        });

        // Setup individual card interactive listeners
        panels.forEach(card => {
            let isHovered = false;
            let particles = [];
            let timeouts = [];
            let memoizedParticles = [];
            let particlesInitialized = false;
            let magnetismAnim = null;
            const particleCount = 12;

            const initializeParticles = () => {
                if (particlesInitialized) return;
                const { width, height } = card.getBoundingClientRect();
                
                memoizedParticles = Array.from({ length: particleCount }, () => {
                    const el = document.createElement('div');
                    el.className = 'particle';
                    el.style.left = `${Math.random() * width}px`;
                    el.style.top = `${Math.random() * height}px`;
                    return el;
                });
                particlesInitialized = true;
            };

            const clearParticles = () => {
                timeouts.forEach(clearTimeout);
                timeouts = [];
                if (magnetismAnim) magnetismAnim.kill();

                particles.forEach(p => {
                    gsap.to(p, {
                        scale: 0,
                        opacity: 0,
                        duration: 0.3,
                        ease: 'back.in(1.7)',
                        onComplete: () => p.remove()
                    });
                });
                particles = [];
            };

            const animateParticles = () => {
                if (!isHovered) return;
                if (!particlesInitialized) initializeParticles();

                memoizedParticles.forEach((p, idx) => {
                    const tId = setTimeout(() => {
                        if (!isHovered) return;
                        const clone = p.cloneNode(true);
                        card.appendChild(clone);
                        particles.push(clone);

                        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });

                        gsap.to(clone, {
                            x: (Math.random() - 0.5) * 80,
                            y: (Math.random() - 0.5) * 80,
                            rotation: Math.random() * 360,
                            duration: 2 + Math.random() * 2,
                            ease: 'none',
                            repeat: -1,
                            yoyo: true
                        });

                        gsap.to(clone, {
                            opacity: 0.3,
                            duration: 1.5,
                            ease: 'power2.inOut',
                            repeat: -1,
                            yoyo: true
                        });
                    }, idx * 100);
                    timeouts.push(tId);
                });
            };

            card.addEventListener('mouseenter', function () {
                isHovered = true;
                animateParticles();

                gsap.to(card, {
                    rotateX: 4,
                    rotateY: 4,
                    duration: 0.3,
                    ease: 'power2.out',
                    transformPerspective: 1000
                });
            });

            card.addEventListener('mouseleave', function () {
                isHovered = false;
                clearParticles();

                gsap.to(card, {
                    rotateX: 0,
                    rotateY: 0,
                    x: 0,
                    y: 0,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            card.addEventListener('mousemove', function (e) {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -8;
                const rotateY = ((x - centerX) / centerX) * 8;

                gsap.to(card, {
                    rotateX,
                    rotateY,
                    duration: 0.1,
                    ease: 'power2.out',
                    transformPerspective: 1000
                });

                const magnetX = (x - centerX) * 0.04;
                const magnetY = (y - centerY) * 0.04;

                magnetismAnim = gsap.to(card, {
                    x: magnetX,
                    y: magnetY,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            card.addEventListener('click', function (e) {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const maxDistance = Math.max(
                    Math.hypot(x, y),
                    Math.hypot(x - rect.width, y),
                    Math.hypot(x, y - rect.height),
                    Math.hypot(x - rect.width, y - rect.height)
                );

                const ripple = document.createElement('div');
                ripple.style.cssText = `
                    position: absolute;
                    width: ${maxDistance * 2}px;
                    height: ${maxDistance * 2}px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(0, 214, 255, 0.3) 0%, rgba(0, 214, 255, 0.1) 30%, transparent 70%);
                    left: ${x - maxDistance}px;
                    top: ${y - maxDistance}px;
                    pointer-events: none;
                    z-index: 15;
                `;

                card.appendChild(ripple);

                gsap.fromTo(ripple,
                    { scale: 0, opacity: 1 },
                    {
                        scale: 1,
                        opacity: 0,
                        duration: 0.8,
                        ease: 'power2.out',
                        onComplete: () => ripple.remove()
                    }
                );
            });
        });
    }

    function updateMapMask() {
        const card = document.getElementById('panel-patrol');
        const svg = document.querySelector('.background-map-svg');
        const cutout = document.getElementById('map-mask-cutout');
        if (!card || !svg || !cutout) return;

        const cardRect = card.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();

        // Convert card screen coords to SVG viewBox space (0 to 1000, 0 to 500)
        const scaleX = 1000 / svgRect.width;
        const scaleY = 500 / svgRect.height;

        const left = (cardRect.left - svgRect.left) * scaleX;
        const top = (cardRect.top - svgRect.top) * scaleY;
        const width = cardRect.width * scaleX;
        const height = cardRect.height * scaleY;

        cutout.setAttribute('x', left);
        cutout.setAttribute('y', top);
        cutout.setAttribute('width', width);
        cutout.setAttribute('height', height);
    }

    /* ═════════════════════════════════════════════════════════════
       INITIALIZATION
       ═════════════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', function () {
        $topbarShipName   = document.getElementById('topbar-ship-name');
        $topbarStatusChip = document.getElementById('topbar-status-chip');
        $bellBadge        = document.getElementById('bell-badge');

        $panelPower       = document.getElementById('panel-power');
        $panelPatrol      = document.getElementById('panel-patrol');
        $panelBio         = document.getElementById('panel-bio');
        $panelFilter      = document.getElementById('panel-filter');
        $panelWeather     = document.getElementById('panel-weather');
        $panelActivity    = document.getElementById('panel-activity');

        // Setup MagicBento innerHTML wrapper interceptors to protect hover animations
        [$panelPower, $panelPatrol, $panelBio, $panelFilter, $panelWeather, $panelActivity].forEach($panel => {
            if (!$panel) return;
            let wrapper = null;
            Object.defineProperty($panel, 'innerHTML', {
                get() {
                    return wrapper ? wrapper.innerHTML : '';
                },
                set(html) {
                    if (!wrapper) {
                        while ($panel.firstChild) {
                            $panel.removeChild($panel.firstChild);
                        }
                        wrapper = document.createElement('div');
                        wrapper.className = 'card-content-wrapper';
                        $panel.appendChild(wrapper);
                    }
                    wrapper.innerHTML = html;
                },
                configurable: true
            });
        });

        // Initial render
        updateDashboardUI();
        initMagicBento();
        updateMapMask();

        // Bind resize and scroll to recalculate the map cutout mask position
        window.addEventListener('resize', updateMapMask);
        window.addEventListener('scroll', updateMapMask, { passive: true }); // POLISH: passive

        // Register callbacks with AlertManager
        if (typeof AlertManager !== 'undefined' && AlertManager.registerUpdateCallback) {
            AlertManager.registerUpdateCallback(function () {
                updateDashboardUI();
            });
        }

        // Listen for real-time simulation updates (Targeted panel rendering)
        window.addEventListener('nereid:update', function (e) {
            if (e.detail && e.detail.ship === shipId) {
                const ship = getShipData(shipId);
                if (!ship) return;

                // Update topbar status
                const statusUpper = ship.status.toUpperCase();
                if ($topbarShipName) $topbarShipName.textContent = ship.id;
                if ($topbarStatusChip) {
                    $topbarStatusChip.className = `status-chip status-chip--${ship.status}`;
                    $topbarStatusChip.innerHTML = `<span class="status-chip__dot"></span> ${statusUpper}`;
                }

                // Bell Badge count
                const unreadCount = ship.notifications.filter(n => !n.read).length;
                if ($bellBadge) {
                    $bellBadge.textContent = unreadCount;
                    $bellBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
                }

                if (e.detail.changed && e.detail.changed.length > 0) {
                    e.detail.changed.forEach(c => {
                        if (c === 'power') renderPowerPanel(ship);
                        if (c === 'patrol') renderPatrolPanel(ship);
                        if (c === 'bioremediation' || c === 'water') renderBioPanel(ship);
                        if (c === 'filters' || c === 'filter') renderFilterPanel(ship);
                        if (c === 'weather') renderWeatherPanel(ship);
                        if (c === 'activity' || c === 'notifications') renderActivityPanel(ship);
                    });
                } else {
                    updateDashboardUI();
                }
            }
        });

        // Auto-start Nereid Simulation
        if (typeof NereidSimulation !== 'undefined') {
            NereidSimulation.start();
        }
    });

    /* ─── Expose operator handlers ───────────────────────────── */
    window.updateDashboardUI        = updateDashboardUI;
    window.toggleBatteryMode        = toggleBatteryMode;
    window.setPatrolMode            = setPatrolMode;
    window.handleCellClick          = handleCellClick;
    window.updatePatrolParam        = updatePatrolParam;
    window.dismissNotification      = dismissNotification;
    window.markAllNotificationsRead = markAllNotificationsRead;
    window.setMaintenanceReminder   = setMaintenanceReminder;
    window.updateMapMask            = updateMapMask;

})();
