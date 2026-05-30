/* ═══════════════════════════════════════════════════════════════
   NEREID — Admin Portal Controller
   Manages Fleet Overview + Alerts views, sidebar navigation,
   bell badge, and live-update integration via AlertManager.
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ─── State ──────────────────────────────────────────────── */
    let currentView = 'fleet';   // 'fleet' | 'alerts'

    let selectedShipId = null; // shipId | null (only show card when clicked on boat)

    /* ─── DOM refs (resolved after DOMContentLoaded) ─────────── */
    let $content   = null;
    let $bellBadge = null;

    /* ═════════════════════════════════════════════════════════════
       RENDER: Ship Card
       Returns the full HTML string for a single ship card.
       ═════════════════════════════════════════════════════════════ */
    function renderShipCard(shipId) {
        const ship = getShipData(shipId);
        if (!ship) return '';

        const status      = ship.status;
        const statusUpper = status.toUpperCase();
        const power       = ship.power;
        const bio         = ship.bioremediation;
        const patrol      = ship.patrol;
        const weather     = ship.weather;

        /* Count unread notifications for this ship */
        const unreadCount = ship.notifications.filter(n => !n.read).length;

        /* Weather display label */
        const weatherLabel = weather.condition || 'N/A';

        /* Build metrics HTML */
        const metricsHTML = `
            <div class="ship-metric"><span class="ship-metric__icon">⚡</span><span>Solar: <strong>${power.solarGenerated}</strong> Wh</span></div>
            <div class="ship-metric"><span class="ship-metric__icon">🔋</span><span>Battery: <strong>${power.batteryPercent}</strong>%</span></div>
            <div class="ship-metric"><span class="ship-metric__icon">🦠</span><span>Microbe: <strong>${bio.microbeTankPercent}</strong>%</span></div>
            <div class="ship-metric"><span class="ship-metric__icon">💧</span><span>Purified: <strong>${Math.round(bio.waterPurified)}</strong>L</span></div>
            <div class="ship-metric"><span class="ship-metric__icon">📍</span><span>Coverage: <strong>${Math.round(patrol.coveragePercent)}</strong>%</span></div>
            <div class="ship-metric"><span class="ship-metric__icon">🌤</span><span>Weather: <strong>${weatherLabel}</strong></span></div>
        `;

        /* Alert badge */
        const alertBadgeHTML = unreadCount > 0
            ? `<span class="ship-card__alert-badge">⚠ ${unreadCount} Alert${unreadCount > 1 ? 's' : ''}</span>`
            : '';

        return `
        <div class="card ship-card ship-card--${status} expanded" id="card-${ship.id}" style="transform: none; animation: panelFadeIn 0.5s var(--ease-out-expo) forwards;">
            <div class="ship-card__header">
                <div class="ship-card__name">
                    <span class="ship-card__name-icon">🚢</span> ${ship.id}
                </div>
                <div class="status-chip status-chip--${status}">
                    <span class="status-chip__dot"></span> ${statusUpper}
                </div>
            </div>
            <div class="ship-card__location">${ship.location} · Last sync: ${ship.lastSync}</div>
            <div class="ship-card__divider"></div>
            <div class="ship-card__metrics-container" style="display: block; overflow: hidden;">
                <div class="ship-card__metrics">
                    ${metricsHTML}
                </div>
                <div class="ship-card__divider"></div>
            </div>
            <div class="ship-card__footer">
                <a href="dashboard.html?ship=${ship.id}" class="ship-card__btn ship-card__btn--primary">View Dashboard →</a>
                ${alertBadgeHTML}
            </div>
        </div>`;
    }

    /* ═════════════════════════════════════════════════════════════
       RENDER: Fleet Overview
       ═════════════════════════════════════════════════════════════ */
    function renderFleetView() {
        if (!selectedShipId) {
            $content.innerHTML = '';
            return;
        }

        const cardHTML = renderShipCard(selectedShipId);
        $content.innerHTML = `
            <div style="max-width: 440px; margin: 40px auto 0; animation: panelFadeIn 0.5s var(--ease-out-expo) forwards;">
                <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
                    <button onclick="clearSelectedShip()" class="ship-card__btn" style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); color: var(--text-muted); border-radius: 8px; padding: 6px 16px; font-size: 11px; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 6px; letter-spacing: 0.5px; pointer-events: auto;">
                        <span>×</span> Close Card
                    </button>
                </div>
                ${cardHTML}
            </div>
        `;
    }

    function setSelectedShip(shipId) {
        selectedShipId = shipId;
        switchView('fleet');
    }

    function clearSelectedShip() {
        selectedShipId = null;
        if (currentView === 'fleet') {
            renderFleetView();
        }
    }

    /* ═════════════════════════════════════════════════════════════
       RENDER: Alerts View
       Sorts by severity (critical → warning → info) then by time.
       ═════════════════════════════════════════════════════════════ */
    function renderAlertsView() {
        /* Severity sort weight: lower = higher priority */
        const severityWeight = { critical: 0, warning: 1, info: 2 };

        /* Filter for unacknowledged alerts only */
        const activeAlerts = GLOBAL_ALERTS.filter(alert => !alert.acknowledged);

        /* Create a sorted copy of unacknowledged alerts */
        const sorted = activeAlerts.sort((a, b) => {
            const sA = severityWeight[a.severity] ?? 3;
            const sB = severityWeight[b.severity] ?? 3;
            if (sA !== sB) return sA - sB;
            /* Secondary sort: by time string (descending — newest first) */
            return b.time.localeCompare(a.time);
        });

        if (sorted.length === 0) {
            $content.innerHTML = `
                <div class="card" style="text-align:center;padding:48px;">
                    <p style="color:var(--text-muted);font-size:15px;">No alerts at this time.</p>
                </div>`;
            return;
        }

        const rowsHTML = sorted.map(alert => {
            const ackClass = alert.acknowledged ? ' acknowledged' : '';
            const ackBtnHTML = alert.acknowledged
                ? `<span style="font-size:11px;color:var(--text-muted);letter-spacing:1px;">✓ ACK</span>`
                : `<button class="alert-ack-btn" onclick="acknowledgeAlert('${alert.id}')">Acknowledge</button>`;

            return `
            <div class="alert-row${ackClass}">
                <span class="alert-severity alert-severity--${alert.severity}">${alert.severity.toUpperCase()}</span>
                <span class="alert-ship">${alert.ship}</span>
                <span class="alert-msg">${alert.msg}</span>
                <span class="alert-time">${alert.time}</span>
                ${ackBtnHTML}
            </div>`;
        }).join('');

        $content.innerHTML = `
            <div class="card" style="padding:0;overflow:hidden;">
                <div style="padding:20px 24px 16px;border-bottom:1px solid var(--glass-border);">
                    <div class="card__title">GLOBAL ALERTS</div>
                </div>
                <div class="alerts-table">
                    ${rowsHTML}
                </div>
            </div>`;
    }

    /* ═════════════════════════════════════════════════════════════
       ANALYTICS VIEW
       ═════════════════════════════════════════════════════════════ */
    function renderAnalyticsView() {
        let totalPurified = 0;
        let totalBattery = 0;
        let totalCoverage = 0;
        let totalSolar = 0;
        let activeShips = 0;
        const shipIds = getAllShipIds();
        
        shipIds.forEach(id => {
            const ship = getShipData(id);
            if (ship) {
                totalPurified += ship.bioremediation.waterPurified;
                totalBattery += ship.power.batteryPercent;
                totalCoverage += ship.patrol.coveragePercent;
                totalSolar += ship.power.solarGenerated;
                activeShips++;
            }
        });
        
        const avgBattery = activeShips ? Math.round(totalBattery / activeShips) : 0;
        const avgCoverage = activeShips ? Math.round(totalCoverage / activeShips) : 0;
        
        $content.innerHTML = `
            <div class="card" style="margin-top: 16px;">
                <div class="card__header">
                    <div class="card__title">FLEET ANALYTICS & DIAGNOSTICS</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; margin-top: 20px;">
                    <!-- Metric 1: Total Purified -->
                    <div class="card" style="background: rgba(255,255,255,0.02); border-color: rgba(0,214,255,0.1); padding: 20px;">
                        <div style="font-size: 11px; letter-spacing: 1px; color: var(--text-muted);">TOTAL WATER PURIFIED</div>
                        <div style="font-size: 32px; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-display); margin: 8px 0;">${Math.round(totalPurified)} L</div>
                        <div style="font-size: 11px; color: var(--text-body);">Aggregated across active fleet vessels</div>
                    </div>
                    <!-- Metric 2: Avg Battery -->
                    <div class="card" style="background: rgba(255,255,255,0.02); border-color: rgba(0,214,255,0.1); padding: 20px;">
                        <div style="font-size: 11px; letter-spacing: 1px; color: var(--text-muted);">AVERAGE FLEET BATTERY</div>
                        <div style="font-size: 32px; font-weight: 700; color: #FFF; font-family: var(--font-display); margin: 8px 0;">${avgBattery}%</div>
                        <div class="power-bar" style="height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; margin-top: 8px;">
                             <div class="power-bar__fill" style="width: ${avgBattery}%; height: 100%; background: var(--accent-cyan);"></div>
                        </div>
                    </div>
                    <!-- Metric 3: Total Power -->
                    <div class="card" style="background: rgba(255,255,255,0.02); border-color: rgba(30,144,255,0.15); padding: 20px;">
                        <div style="font-size: 11px; letter-spacing: 1px; color: var(--text-muted);">FLEET POWER GENERATED</div>
                        <div style="font-size: 32px; font-weight: 700; color: var(--accent-blue); font-family: var(--font-display); margin: 8px 0;">${totalSolar} Wh</div>
                        <div style="font-size: 11px; color: var(--text-body);">Active solar array generation rate</div>
                    </div>
                    <!-- Metric 4: Avg Coverage -->
                    <div class="card" style="background: rgba(255,255,255,0.02); border-color: rgba(0,214,255,0.1); padding: 20px;">
                        <div style="font-size: 11px; letter-spacing: 1px; color: var(--text-muted);">AVERAGE ZONE COVERAGE</div>
                        <div style="font-size: 32px; font-weight: 700; color: #FFF; font-family: var(--font-display); margin: 8px 0;">${avgCoverage}%</div>
                        <div class="power-bar" style="height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; margin-top: 8px;">
                             <div class="power-bar__fill" style="width: ${avgCoverage}%; height: 100%; background: var(--accent-blue);"></div>
                        </div>
                    </div>
                </div>

                <!-- Performance Chart (High-Tech SVG Curve) -->
                <div style="margin-top: 32px; border: 1px solid var(--glass-border); padding: 20px; border-radius: 12px; background: rgba(0,0,0,0.2);">
                    <div style="font-size: 12px; letter-spacing: 1px; color: var(--text-heading); margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                        <span>FLEET PERFORMANCE CYCLE (HISTORICAL LERP)</span>
                        <span style="font-size: 10px; color: var(--accent-cyan); background: rgba(0,214,255,0.05); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(0,214,255,0.15);">LIVE FEED TELEMETRY</span>
                    </div>
                    <svg viewBox="0 0 800 160" width="100%" height="160" style="display: block; overflow: visible;">
                        <!-- Grid lines -->
                        <line x1="0" y1="40" x2="800" y2="40" stroke="rgba(255,255,255,0.03)" stroke-width="0.8"/>
                        <line x1="0" y1="80" x2="800" y2="80" stroke="rgba(255,255,255,0.03)" stroke-width="0.8"/>
                        <line x1="0" y1="120" x2="800" y2="120" stroke="rgba(255,255,255,0.03)" stroke-width="0.8"/>
                        <!-- Chart Curves -->
                        <polyline points="0,120 100,110 200,95 300,105 400,80 500,65 600,75 700,55 800,${Math.max(10, 160 - (totalSolar / 25))}" 
                                  fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round"/>
                        <polyline points="0,140 100,130 200,125 300,110 400,115 500,90 600,100 700,85 800,${Math.max(20, 160 - (totalPurified / 10))}" 
                                  fill="none" stroke="var(--accent-blue)" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 2"/>
                        <!-- Pulses -->
                        <circle cx="800" cy="${Math.max(10, 160 - (totalSolar / 25))}" r="4" fill="var(--accent-cyan)" />
                        <circle cx="800" cy="${Math.max(10, 160 - (totalSolar / 25))}" r="8" fill="none" stroke="var(--accent-cyan)" stroke-width="0.5" class="node-ring" />
                    </svg>
                    <div style="display: flex; gap: 20px; font-size: 10px; margin-top: 12px; color: var(--text-muted);">
                        <div style="display: flex; align-items: center; gap: 6px;"><span style="display:inline-block; width:8px; height:8px; background: var(--accent-cyan); border-radius: 50%;"></span> Solar Array Efficiency Curve</div>
                        <div style="display: flex; align-items: center; gap: 6px;"><span style="display:inline-block; width:8px; height:8px; border:1px dashed var(--accent-blue); border-radius: 50%;"></span> Water Purification Diagnostic Yield</div>
                    </div>
                </div>
            </div>
        `;
    }

    /* ═════════════════════════════════════════════════════════════
       SETTINGS VIEW
       ═════════════════════════════════════════════════════════════ */
    function renderSettingsView() {
        $content.innerHTML = `
            <div class="card" style="margin-top: 16px; max-width: 800px;">
                <div class="card__header">
                    <div class="card__title">FLEET OPERATOR SETTINGS</div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 24px; margin-top: 24px;">
                    <!-- Section 1: Storm Failsafe -->
                    <div style="border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 20px;">
                        <h4 style="font-size: 14px; color: var(--text-heading); margin-bottom: 8px;">Automated Storm Failsafes</h4>
                        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 16px;">Configure thresholds at which ships automatically terminate patrol and return to safety.</p>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div>
                                <label style="font-size: 11px; color: var(--text-body); display: block; margin-bottom: 6px;">Wave Height Threshold: <strong>2.0 m</strong></label>
                                <input type="range" min="1.0" max="4.0" step="0.1" value="2.0" style="width: 100%; accent-color: var(--accent-cyan);">
                            </div>
                            <div>
                                <label style="font-size: 11px; color: var(--text-body); display: block; margin-bottom: 6px;">Wind Speed Threshold: <strong>25 knots</strong></label>
                                <input type="range" min="15" max="45" step="1" value="25" style="width: 100%; accent-color: var(--accent-cyan);">
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Telemetry API Sync -->
                    <div style="border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 20px;">
                        <h4 style="font-size: 14px; color: var(--text-heading); margin-bottom: 8px;">Robotic Edge Telemetry Sync</h4>
                        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">Configure synchronization rates between active vessel edge servers and the central database.</p>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <button class="ship-card__btn" style="background: rgba(0,214,255,0.08); border: 1px solid var(--accent-cyan); color: #FFF; padding: 6px 16px; border-radius: 6px; font-size: 11px;">Real-Time (2s)</button>
                            <button class="ship-card__btn" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); padding: 6px 16px; border-radius: 6px; font-size: 11px;">Optimized (10s)</button>
                            <button class="ship-card__btn" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); padding: 6px 16px; border-radius: 6px; font-size: 11px;">ECO Mode (60s)</button>
                        </div>
                    </div>

                    <!-- Section 3: Notification Alerts -->
                    <div>
                         <h4 style="font-size: 14px; color: var(--text-heading); margin-bottom: 12px;">Notification Channels</h4>
                         <div style="display: flex; flex-direction: column; gap: 10px;">
                             <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-body); cursor: pointer;">
                                 <input type="checkbox" checked style="accent-color: var(--accent-cyan);"> Enable email notifications for critical (Tier 3) alerts
                             </label>
                             <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-body); cursor: pointer;">
                                 <input type="checkbox" checked style="accent-color: var(--accent-cyan);"> Automatically dispatch shore crew notification on filter depletion
                             </label>
                         </div>
                    </div>
                </div>
            </div>
        `;
    }

    /* ═════════════════════════════════════════════════════════════
       VIEW SWITCHING
       ═════════════════════════════════════════════════════════════ */
    function switchView(viewName) {
        currentView = viewName;

        /* Update sidebar active state */
        document.querySelectorAll('.sidebar__link[data-view]').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });

        /* Render the selected view */
        if (viewName === 'alerts') {
            renderAlertsView();
        } else if (viewName === 'analytics') {
            renderAnalyticsView();
        } else if (viewName === 'settings') {
            renderSettingsView();
        } else {
            renderFleetView();
        }

        /* Update bell badge */
        updateBellBadge();
    }

    /* ═════════════════════════════════════════════════════════════
       ACKNOWLEDGE ALERT
       ═════════════════════════════════════════════════════════════ */
    function acknowledgeAlert(alertId) {
        AlertManager.acknowledgeAlert(alertId);
        /* Re-render alerts view to reflect change */
        if (currentView === 'alerts') {
            renderAlertsView();
        }
        updateBellBadge();
    }

    /* ═════════════════════════════════════════════════════════════
       BELL BADGE
       ═════════════════════════════════════════════════════════════ */
    function updateBellBadge() {
        const count = getUnacknowledgedAlertCount();
        if ($bellBadge) {
            $bellBadge.textContent = count;
            $bellBadge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    /* ═════════════════════════════════════════════════════════════
       LIVE UPDATE — called by simulation.js or AlertManager
       ═════════════════════════════════════════════════════════════ */
    function updateAdminUI() {
        if (currentView === 'fleet') {
            renderFleetView();
        } else if (currentView === 'alerts') {
            renderAlertsView();
        } else if (currentView === 'analytics') {
            renderAnalyticsView();
        }
        updateBellBadge();
    }

    /* ═════════════════════════════════════════════════════════════
       REGISTER CALLBACK with AlertManager
       ═════════════════════════════════════════════════════════════ */
    function registerUpdateCallback() {
        if (typeof AlertManager !== 'undefined' && AlertManager.registerUpdateCallback) {
            AlertManager.registerUpdateCallback(function () {
                updateAdminUI();
            });
        }
    }

    /* ═════════════════════════════════════════════════════════════
       INIT
       ═════════════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', function () {
        $content   = document.getElementById('admin-content');
        $bellBadge = document.getElementById('bell-badge');

        /* Initial render */
        renderFleetView();
        updateBellBadge();

        /* Register with AlertManager for live updates */
        registerUpdateCallback();

        // Listen for real-time simulation updates
        window.addEventListener('nereid:update', function (e) {
            updateAdminUI();
        });

        // Dismiss active vessel card when clicking outside on the empty map background
        document.addEventListener('click', function (e) {
            if (selectedShipId !== null && currentView === 'fleet') {
                const card = document.getElementById(`card-${selectedShipId}`);
                if (card) {
                    const clickInsideCard = card.contains(e.target);
                    const clickOnSailingShip = e.target.closest('.sailing-ship');
                    if (!clickInsideCard && !clickOnSailingShip) {
                        clearSelectedShip();
                    }
                }
            }
        });

        /* Auto-start Nereid Simulation */
        if (typeof NereidSimulation !== 'undefined') {
            NereidSimulation.start();
        }
    });

    /* ─── Expose public API ──────────────────────────────────── */
    window.switchView        = switchView;
    window.acknowledgeAlert  = acknowledgeAlert;
    window.updateAdminUI     = updateAdminUI;
    window.renderFleetView   = renderFleetView;
    window.renderAlertsView  = renderAlertsView;
    window.renderShipCard    = renderShipCard;
    window.setSelectedShip   = setSelectedShip;
    window.clearSelectedShip = clearSelectedShip;
    window.registerUpdateCallback = registerUpdateCallback;
})();
