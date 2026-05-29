/* ═══════════════════════════════════════════════════════════════
   NEREID — Centralized Alert Manager
   Threshold logic, notification system, auto-return triggers
   ═══════════════════════════════════════════════════════════════ */

const AlertManager = (function () {
    'use strict';

    /* ─── Thresholds ─────────────────────────────────────────── */
    const POWER_THRESHOLDS = {
        tier2_solar_drop: 0.40,     // Solar < 40% of 24h average → Warning
        tier3_battery_low: 0.20     // Battery < 20% → Critical + Auto-return
    };

    const WEATHER_THRESHOLDS = {
        wind_knots: 35,
        wave_height_m: 3.0,
        rain_mm_per_hr: 50
    };

    const FILTER_THRESHOLDS = {
        fair: 0.60,
        replace: 0.40
    };

    /* ─── Registered UI callbacks ────────────────────────────── */
    let _updateCallbacks = [];

    function registerUpdateCallback(fn) {
        if (typeof fn === 'function') {
            _updateCallbacks.push(fn);
        }
    }

    function _notifyUI(eventType, shipId, detail) {
        _updateCallbacks.forEach(fn => {
            try { fn(eventType, shipId, detail); }
            catch (e) { console.error('UI callback error:', e); }
        });
    }

    /* ─── Notification helpers ───────────────────────────────── */
    function _pushNotification(ship, icon, msg, severity) {
        const notification = {
            id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6),
            icon: icon,
            msg: msg,
            time: 'just now',
            read: false,
            severity: severity
        };
        ship.notifications.unshift(notification);
        return notification;
    }

    function _pushActivityLog(ship, icon, msg, type) {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        ship.activityLog.unshift({ time, icon, msg, type });
    }

    function _pushGlobalAlert(severity, shipId, msg) {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        GLOBAL_ALERTS.unshift({
            id: 'ga' + Date.now(),
            severity: severity,
            ship: shipId,
            msg: msg,
            time: time,
            acknowledged: false
        });
    }

    /* ─── Power Alert System ─────────────────────────────────── */
    function evaluatePowerState(shipId) {
        const ship = FLEET[shipId];
        if (!ship) return;

        const power = ship.power;
        const solarRatio = power.solarAverage24h > 0
            ? power.solarGenerated / power.solarAverage24h
            : 1;
        const batteryRatio = power.batteryPercent / 100;
        const previousTier = power.alertTier;

        // Tier 3: Battery critical
        if (batteryRatio < POWER_THRESHOLDS.tier3_battery_low) {
            if (previousTier < 3) {
                power.alertTier = 3;
                power.batteryModeActive = true;
                power.autoReturnActive = true;
                power.autoReturnEtaMin = power.autoReturnEtaMin || 47;
                power.ownerNotified = true;
                power.ownerNotifiedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                ship.status = 'returning';
                ship.patrol.isPaused = true;

                _pushNotification(ship, '🚨', 'Battery critical — auto-return initiated', 'critical');
                _pushActivityLog(ship, '🚨', `CRITICAL: Battery at ${power.batteryPercent}% — auto-return initiated`, 'critical');
                _pushGlobalAlert('critical', shipId, `Battery critical (${power.batteryPercent}%) — auto-return triggered`);
                _notifyUI('power_tier3', shipId, power);
            }
        }
        // Tier 2: Solar dropping
        else if (solarRatio < POWER_THRESHOLDS.tier2_solar_drop) {
            if (previousTier < 2) {
                power.alertTier = 2;
                power.batteryModeActive = true;

                _pushNotification(ship, '⚠️', 'Solar output declining — battery mode activated', 'warning');
                _pushActivityLog(ship, '⚠️', 'Solar output below 40% — battery mode ON', 'warning');
                _pushGlobalAlert('warning', shipId, 'Solar output below threshold — battery mode');
                _notifyUI('power_tier2', shipId, power);
            }
        }
        // Tier 1: Normal
        else {
            if (previousTier > 1) {
                power.alertTier = 1;
                power.batteryModeActive = false;
                power.autoReturnActive = false;
                power.ownerNotified = false;
                power.ownerNotifiedTime = null;

                if (ship.status === 'returning' && !ship.weather.autoReturnWeather) {
                    ship.status = 'active';
                    ship.patrol.isPaused = false;
                }

                _pushNotification(ship, '✅', 'Solar output restored — normal operations', 'info');
                _pushActivityLog(ship, '✅', 'Solar output restored — normal operations resumed', 'success');
                _notifyUI('power_tier1', shipId, power);
            }
        }

        return power.alertTier;
    }

    /* ─── Weather Alert System ───────────────────────────────── */
    function evaluateWeatherState(shipId) {
        const ship = FLEET[shipId];
        if (!ship) return;

        const w = ship.weather;
        const previousStatus = w.safetyStatus;

        const isReturn = w.windKnots > WEATHER_THRESHOLDS.wind_knots
            || w.waveHeightM > WEATHER_THRESHOLDS.wave_height_m
            || w.rainMmHr > WEATHER_THRESHOLDS.rain_mm_per_hr;

        const isCaution = !isReturn && (
            (w.waveHeightM >= 2.0 && w.waveHeightM <= 3.0)
            || (w.windKnots >= 25 && w.windKnots <= 35)
        );

        if (isReturn) {
            w.safetyStatus = 'return';
            if (previousStatus !== 'return') {
                w.autoReturnWeather = true;
                w.weatherReturnEtaMin = w.weatherReturnEtaMin || 62;
                ship.status = 'returning';
                ship.patrol.isPaused = true;

                ship.power.ownerNotified = true;
                ship.power.ownerNotifiedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                _pushNotification(ship, '🚨', 'Storm detected — auto-return initiated', 'critical');
                _pushActivityLog(ship, '🚨', 'STORM DETECTED — Auto-return initiated', 'critical');
                _pushGlobalAlert('critical', shipId, 'Storm detected — auto-return triggered');
                _notifyUI('weather_return', shipId, w);
            }
        } else if (isCaution) {
            w.safetyStatus = 'caution';
            if (previousStatus === 'return') {
                // Storm cleared
                w.autoReturnWeather = false;
                w.weatherReturnEtaMin = 0;
                if (!ship.power.autoReturnActive) {
                    ship.status = 'active';
                    ship.patrol.isPaused = false;
                }
                _pushActivityLog(ship, '🌤️', 'Weather improving — caution advisory', 'warning');
                _notifyUI('weather_caution', shipId, w);
            }
        } else {
            w.safetyStatus = 'safe';
            if (previousStatus !== 'safe') {
                w.autoReturnWeather = false;
                w.weatherReturnEtaMin = 0;
                if (!ship.power.autoReturnActive) {
                    ship.status = ship.status === 'docked' ? 'docked' : 'active';
                    ship.patrol.isPaused = false;
                }
                _pushActivityLog(ship, '☀️', 'Weather cleared — safe to operate', 'success');
                _notifyUI('weather_safe', shipId, w);
            }
        }

        return w.safetyStatus;
    }

    /* ─── Filter Alert System ────────────────────────────────── */
    function evaluateFilterState(shipId) {
        const ship = FLEET[shipId];
        if (!ship) return;

        ship.filters.forEach(filter => {
            const prev = filter.status;

            if (filter.health < FILTER_THRESHOLDS.replace) {
                filter.status = 'replace';
                if (prev !== 'replace') {
                    _pushNotification(ship, '🔴', `${filter.name} requires immediate replacement`, 'critical');
                    _pushActivityLog(ship, '🔴', `Filter alert — ${filter.name} (${Math.round(filter.health * 100)}%)`, 'critical');
                    _pushGlobalAlert('critical', shipId, `${filter.name} requires replacement (${Math.round(filter.health * 100)}%)`);
                    _notifyUI('filter_replace', shipId, filter);
                }
            } else if (filter.health < FILTER_THRESHOLDS.fair) {
                filter.status = 'fair';
                if (prev === 'good') {
                    _pushNotification(ship, '⚠️', `${filter.name} health declining (${Math.round(filter.health * 100)}%)`, 'warning');
                    _notifyUI('filter_fair', shipId, filter);
                }
            } else {
                filter.status = 'good';
            }
        });
    }

    /* ─── Run all evaluations for a ship ─────────────────────── */
    function evaluateAll(shipId) {
        evaluatePowerState(shipId);
        evaluateWeatherState(shipId);
        evaluateFilterState(shipId);
    }

    /* ─── Acknowledge a global alert ─────────────────────────── */
    function acknowledgeAlert(alertId) {
        const alert = GLOBAL_ALERTS.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            _notifyUI('alert_acknowledged', null, alert);
        }
    }

    /* ─── Dismiss a notification ─────────────────────────────── */
    function dismissNotification(shipId, notifId) {
        const ship = FLEET[shipId];
        if (!ship) return;
        const idx = ship.notifications.findIndex(n => n.id === notifId);
        if (idx !== -1) {
            ship.notifications[idx].read = true;
            _notifyUI('notification_dismissed', shipId, ship.notifications[idx]);
        }
    }

    function markAllRead(shipId) {
        const ship = FLEET[shipId];
        if (!ship) return;
        ship.notifications.forEach(n => { n.read = true; });
        _notifyUI('notifications_all_read', shipId, null);
    }

    /* ─── Public API ─────────────────────────────────────────── */
    return {
        POWER_THRESHOLDS,
        WEATHER_THRESHOLDS,
        FILTER_THRESHOLDS,
        registerUpdateCallback,
        evaluatePowerState,
        evaluateWeatherState,
        evaluateFilterState,
        evaluateAll,
        acknowledgeAlert,
        dismissNotification,
        markAllRead,
        pushNotification: _pushNotification,
        pushActivityLog: _pushActivityLog,
        pushGlobalAlert: _pushGlobalAlert
    };

})();
