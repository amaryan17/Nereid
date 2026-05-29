/* ═══════════════════════════════════════════════════════════════
   NEREID — Mock Fleet Data System
   Single source of truth for all portal data.
   Mutated in-memory by simulation.js for live demo.
   ═══════════════════════════════════════════════════════════════ */

const FLEET = {
    "NEREID-01": {
        id: "NEREID-01",
        status: "active",       // active | returning | docked | alert
        location: "Bay of Bengal",
        coords: "12.4°N 82.1°E",
        lastSync: "2m ago",
        assignedOperator: "user@nereid.ai",

        power: {
            solarGenerated: 847,
            solarCapacity: 1000,
            shipConsumption: 612,
            batteryPercent: 87,
            batteryCapacityWh: 2400,
            alertTier: 1,
            batteryModeActive: false,
            autoReturnActive: false,
            autoReturnEtaMin: 0,
            ownerNotified: false,
            ownerNotifiedTime: null,
            solarAverage24h: 820,
            history24h: [
                [620, 580], [590, 560], [540, 520], [480, 500], [420, 480],
                [380, 460], [350, 440], [500, 450], [620, 470], [710, 490],
                [780, 520], [830, 540], [870, 560], [890, 580], [880, 600],
                [860, 610], [840, 620], [810, 610], [770, 590], [720, 570],
                [680, 550], [650, 530], [630, 510], [847, 612]
            ]
        },

        patrol: {
            speed: 1.5,
            sweepWidth: 20,
            pattern: "Lawnmower",
            overlap: 10,
            coveragePercent: 67,
            totalCells: 51,
            coveredCells: 34,
            distanceTraveled: 12.4,
            etaMinutes: 263,
            assignedZones: [
                [2,3],[2,4],[2,5],[3,3],[3,4],[3,5],[3,6],
                [4,3],[4,4],[4,5],[4,6],[4,7],[5,3],[5,4],
                [5,5],[5,6],[5,7],[6,4],[6,5],[6,6],[6,7],
                [7,4],[7,5],[7,6],[7,7],[8,5],[8,6],[8,7],
                [2,6],[3,7],[5,8],[6,8],[7,8],[8,8],
                [9,5],[9,6],[9,7],[9,8],
                [3,2],[4,2],[5,2],[6,3],
                [1,3],[1,4],[1,5],[1,6],
                [0,4],[0,5],[0,6],[0,7],[0,8]
            ],
            noGoZones: [[5,1],[6,1],[6,2]],
            coveredZones: [
                [2,3],[2,4],[2,5],[3,3],[3,4],[3,5],[3,6],
                [4,3],[4,4],[4,5],[4,6],[4,7],[5,3],[5,4],
                [5,5],[5,6],[5,7],[6,4],[6,5],[6,6],[6,7],
                [7,4],[7,5],[7,6],[7,7],[8,5],[8,6],[8,7],
                [2,6],[3,7],[5,8],[6,8],[7,8],[8,8]
            ],
            isPaused: false
        },

        bioremediation: {
            microbeTankPercent: 78,
            microbeTankLiters: 3.9,
            microbeTankTotal: 5.0,
            depletionRateHours: 6.33,
            waterIntake: 520,
            waterPurified: 340,
            waterResidue: 180,
            purificationEfficiency: 65.4,
            microbesDeployed: ["Alcanivorax", "Pseudomonas", "Bacillus", "Rhodococcus"]
        },

        filters: [
            { name: "Pre-filter Mesh",    health: 0.82, status: "good" },
            { name: "Hydrocarbon Filter", health: 0.58, status: "fair" },
            { name: "Bio-membrane",       health: 0.41, status: "replace" }
        ],
        nextMaintenance: "Jun 15, 2026",
        maintenanceDaysAway: 18,
        maintenanceHistory: [
            { date: "May 10, 2026", note: "Full filter replacement + hull inspection" },
            { date: "Apr 22, 2026", note: "Hydrocarbon filter swap" },
            { date: "Mar 30, 2026", note: "Quarterly service — all filters + microbe refill" }
        ],

        weather: {
            condition: "Clear",
            icon: "sun",
            tempC: 24,
            windKnots: 12,
            waveHeightM: 0.8,
            rainMmHr: 0,
            humidity: 72,
            safetyStatus: "safe",   // safe | caution | return
            autoReturnWeather: false,
            weatherReturnEtaMin: 0,
            forecast7d: [
                { day: "Mon", icon: "sun",          tempC: 24, waveM: 0.8 },
                { day: "Tue", icon: "partly-cloudy", tempC: 25, waveM: 0.9 },
                { day: "Wed", icon: "partly-cloudy", tempC: 23, waveM: 1.1 },
                { day: "Thu", icon: "cloudy",        tempC: 22, waveM: 1.4 },
                { day: "Fri", icon: "rain",          tempC: 21, waveM: 1.8 },
                { day: "Sat", icon: "partly-cloudy", tempC: 23, waveM: 1.2 },
                { day: "Sun", icon: "sun",           tempC: 25, waveM: 0.7 }
            ]
        },

        activityLog: [
            { time: "10:42", icon: "✅", msg: "Patrol sector 7 completed", type: "success" },
            { time: "10:31", icon: "⚠️", msg: "Solar output dropped 18% — monitoring", type: "warning" },
            { time: "10:15", icon: "🦠", msg: "Microbe deploy event — Zone C4 (240mL)", type: "info" },
            { time: "09:58", icon: "💧", msg: "Water intake cycle started", type: "info" },
            { time: "09:30", icon: "🔄", msg: "Area assignment updated by admin", type: "info" },
            { time: "09:12", icon: "✅", msg: "Patrol sector 6 completed", type: "success" },
            { time: "08:45", icon: "⚡", msg: "Solar generation peak — 890 Wh", type: "success" },
            { time: "08:20", icon: "🦠", msg: "Microbe deploy event — Zone B3 (180mL)", type: "info" },
            { time: "07:55", icon: "🌅", msg: "Morning startup sequence initiated", type: "info" }
        ],

        notifications: [
            { id: "n1", icon: "⚠️", msg: "Hydrocarbon filter health at 58%", time: "14m ago", read: false, severity: "warning" },
            { id: "n2", icon: "🔴", msg: "Bio-membrane filter due for replacement", time: "32m ago", read: false, severity: "critical" },
            { id: "n3", icon: "✅", msg: "Sector 5 patrol complete", time: "1h ago", read: true, severity: "info" },
            { id: "n4", icon: "🦠", msg: "Microbe deployment successful — Zone B3", time: "2h ago", read: true, severity: "info" }
        ]
    },

    "NEREID-02": {
        id: "NEREID-02",
        status: "alert",
        location: "Arabian Sea",
        coords: "15.8°N 69.2°E",
        lastSync: "5m ago",
        assignedOperator: "ops2@nereid.ai",

        power: {
            solarGenerated: 312,
            solarCapacity: 1000,
            shipConsumption: 580,
            batteryPercent: 34,
            batteryCapacityWh: 2400,
            alertTier: 2,
            batteryModeActive: true,
            autoReturnActive: false,
            autoReturnEtaMin: 0,
            ownerNotified: false,
            ownerNotifiedTime: null,
            solarAverage24h: 780,
            history24h: [
                [700, 560], [680, 540], [650, 530], [600, 520], [520, 510],
                [460, 500], [400, 490], [380, 500], [420, 510], [480, 530],
                [520, 550], [540, 560], [500, 570], [460, 580], [400, 590],
                [380, 580], [360, 570], [340, 560], [330, 550], [320, 540],
                [310, 530], [305, 520], [308, 510], [312, 580]
            ]
        },

        patrol: {
            speed: 1.2,
            sweepWidth: 15,
            pattern: "Spiral",
            overlap: 15,
            coveragePercent: 43,
            totalCells: 40,
            coveredCells: 17,
            distanceTraveled: 8.1,
            etaMinutes: 380,
            assignedZones: [],
            noGoZones: [],
            coveredZones: [],
            isPaused: false
        },

        bioremediation: {
            microbeTankPercent: 62,
            microbeTankLiters: 3.1,
            microbeTankTotal: 5.0,
            depletionRateHours: 8.2,
            waterIntake: 410,
            waterPurified: 275,
            waterResidue: 135,
            purificationEfficiency: 67.1,
            microbesDeployed: ["Alcanivorax", "Pseudomonas", "Marinobacter"]
        },

        filters: [
            { name: "Pre-filter Mesh",    health: 0.74, status: "good" },
            { name: "Hydrocarbon Filter", health: 0.65, status: "good" },
            { name: "Bio-membrane",       health: 0.52, status: "fair" }
        ],
        nextMaintenance: "Jun 8, 2026",
        maintenanceDaysAway: 11,
        maintenanceHistory: [
            { date: "May 5, 2026", note: "Pre-filter mesh replaced" },
            { date: "Apr 18, 2026", note: "Full service — all systems" }
        ],

        weather: {
            condition: "Overcast",
            icon: "cloudy",
            tempC: 28,
            windKnots: 18,
            waveHeightM: 1.6,
            rainMmHr: 2,
            humidity: 85,
            safetyStatus: "safe",
            autoReturnWeather: false,
            weatherReturnEtaMin: 0,
            forecast7d: [
                { day: "Mon", icon: "cloudy",        tempC: 28, waveM: 1.6 },
                { day: "Tue", icon: "rain",          tempC: 27, waveM: 2.0 },
                { day: "Wed", icon: "storm",         tempC: 25, waveM: 2.8 },
                { day: "Thu", icon: "rain",          tempC: 26, waveM: 2.2 },
                { day: "Fri", icon: "partly-cloudy", tempC: 28, waveM: 1.5 },
                { day: "Sat", icon: "sun",           tempC: 30, waveM: 1.0 },
                { day: "Sun", icon: "sun",           tempC: 31, waveM: 0.8 }
            ]
        },

        activityLog: [
            { time: "10:38", icon: "⚠️", msg: "Solar output below 40% — battery mode ON", type: "warning" },
            { time: "10:20", icon: "🔋", msg: "Battery mode activated automatically", type: "warning" },
            { time: "09:50", icon: "🦠", msg: "Microbe deploy — Zone A2 (200mL)", type: "info" },
            { time: "09:15", icon: "✅", msg: "Patrol sector 3 completed", type: "success" }
        ],

        notifications: [
            { id: "n1", icon: "⚠️", msg: "Solar output critically low — battery mode active", time: "8m ago", read: false, severity: "warning" },
            { id: "n2", icon: "⚠️", msg: "Battery reserves declining — monitor closely", time: "25m ago", read: false, severity: "warning" }
        ]
    },

    "NEREID-03": {
        id: "NEREID-03",
        status: "returning",
        location: "Pacific Zone",
        coords: "8.2°N 134.6°E",
        lastSync: "1m ago",
        assignedOperator: "ops3@nereid.ai",

        power: {
            solarGenerated: 180,
            solarCapacity: 1000,
            shipConsumption: 420,
            batteryPercent: 56,
            batteryCapacityWh: 2400,
            alertTier: 1,
            batteryModeActive: true,
            autoReturnActive: true,
            autoReturnEtaMin: 62,
            ownerNotified: true,
            ownerNotifiedTime: "10:15 AM",
            solarAverage24h: 600,
            history24h: [
                [580, 400], [560, 390], [540, 380], [500, 400], [460, 410],
                [420, 420], [380, 430], [350, 440], [300, 430], [280, 420],
                [260, 410], [240, 400], [220, 410], [200, 420], [190, 430],
                [185, 425], [182, 420], [180, 418], [180, 420], [180, 422],
                [180, 420], [180, 418], [180, 420], [180, 420]
            ]
        },

        patrol: {
            speed: 0,
            sweepWidth: 20,
            pattern: "Adaptive AI",
            overlap: 20,
            coveragePercent: 51,
            totalCells: 45,
            coveredCells: 23,
            distanceTraveled: 9.7,
            etaMinutes: 0,
            assignedZones: [],
            noGoZones: [],
            coveredZones: [],
            isPaused: true
        },

        bioremediation: {
            microbeTankPercent: 45,
            microbeTankLiters: 2.25,
            microbeTankTotal: 5.0,
            depletionRateHours: 0,
            waterIntake: 380,
            waterPurified: 260,
            waterResidue: 120,
            purificationEfficiency: 68.4,
            microbesDeployed: ["Alcanivorax", "Cycloclasticus", "Rhodococcus"]
        },

        filters: [
            { name: "Pre-filter Mesh",    health: 0.71, status: "good" },
            { name: "Hydrocarbon Filter", health: 0.63, status: "good" },
            { name: "Bio-membrane",       health: 0.55, status: "fair" }
        ],
        nextMaintenance: "Jun 20, 2026",
        maintenanceDaysAway: 23,
        maintenanceHistory: [
            { date: "May 1, 2026", note: "Quarterly service — Pacific deployment" },
            { date: "Mar 15, 2026", note: "Emergency filter swap — high sediment" }
        ],

        weather: {
            condition: "Storm",
            icon: "storm",
            tempC: 20,
            windKnots: 38,
            waveHeightM: 3.4,
            rainMmHr: 62,
            humidity: 94,
            safetyStatus: "return",
            autoReturnWeather: true,
            weatherReturnEtaMin: 62,
            forecast7d: [
                { day: "Mon", icon: "storm",         tempC: 20, waveM: 3.4 },
                { day: "Tue", icon: "storm",         tempC: 19, waveM: 3.8 },
                { day: "Wed", icon: "rain",          tempC: 21, waveM: 2.6 },
                { day: "Thu", icon: "cloudy",        tempC: 22, waveM: 1.8 },
                { day: "Fri", icon: "partly-cloudy", tempC: 24, waveM: 1.2 },
                { day: "Sat", icon: "sun",           tempC: 26, waveM: 0.9 },
                { day: "Sun", icon: "sun",           tempC: 27, waveM: 0.7 }
            ]
        },

        activityLog: [
            { time: "10:15", icon: "🚨", msg: "STORM DETECTED — Auto-return initiated", type: "critical" },
            { time: "10:14", icon: "🌊", msg: "Wave height exceeded 3m threshold", type: "critical" },
            { time: "10:14", icon: "💨", msg: "Wind speed 38kn — exceeds 35kn limit", type: "critical" },
            { time: "10:10", icon: "⚠️", msg: "Weather advisory — storm approaching", type: "warning" },
            { time: "09:45", icon: "✅", msg: "Patrol sector 4 completed", type: "success" }
        ],

        notifications: [
            { id: "n1", icon: "🚨", msg: "Storm detected — auto-return in progress", time: "3m ago", read: false, severity: "critical" },
            { id: "n2", icon: "📧", msg: "Owner notified of emergency return", time: "3m ago", read: false, severity: "critical" }
        ]
    },

    "NEREID-04": {
        id: "NEREID-04",
        status: "docked",
        location: "Mumbai Port",
        coords: "18.9°N 72.8°E",
        lastSync: "30s ago",
        assignedOperator: "ops4@nereid.ai",

        power: {
            solarGenerated: 920,
            solarCapacity: 1000,
            shipConsumption: 120,
            batteryPercent: 98,
            batteryCapacityWh: 2400,
            alertTier: 1,
            batteryModeActive: false,
            autoReturnActive: false,
            autoReturnEtaMin: 0,
            ownerNotified: false,
            ownerNotifiedTime: null,
            solarAverage24h: 860,
            history24h: [
                [800, 110], [790, 105], [780, 100], [770, 100], [760, 100],
                [780, 100], [800, 105], [830, 110], [860, 115], [880, 118],
                [900, 120], [910, 120], [920, 120], [920, 118], [910, 115],
                [900, 112], [880, 110], [860, 108], [840, 105], [820, 102],
                [800, 100], [790, 100], [810, 105], [920, 120]
            ]
        },

        patrol: {
            speed: 0,
            sweepWidth: 0,
            pattern: "—",
            overlap: 0,
            coveragePercent: 0,
            totalCells: 0,
            coveredCells: 0,
            distanceTraveled: 0,
            etaMinutes: 0,
            assignedZones: [],
            noGoZones: [],
            coveredZones: [],
            isPaused: true
        },

        bioremediation: {
            microbeTankPercent: 95,
            microbeTankLiters: 4.75,
            microbeTankTotal: 5.0,
            depletionRateHours: 0,
            waterIntake: 0,
            waterPurified: 0,
            waterResidue: 0,
            purificationEfficiency: 0,
            microbesDeployed: ["Alcanivorax", "Pseudomonas", "Bacillus", "Rhodococcus"]
        },

        filters: [
            { name: "Pre-filter Mesh",    health: 0.95, status: "good" },
            { name: "Hydrocarbon Filter", health: 0.91, status: "good" },
            { name: "Bio-membrane",       health: 0.88, status: "good" }
        ],
        nextMaintenance: "Jul 1, 2026",
        maintenanceDaysAway: 34,
        maintenanceHistory: [
            { date: "May 25, 2026", note: "Full service + microbe tank refill" },
            { date: "May 2, 2026", note: "Pre-deployment inspection" }
        ],

        weather: {
            condition: "Partly Cloudy",
            icon: "partly-cloudy",
            tempC: 32,
            windKnots: 8,
            waveHeightM: 0.4,
            rainMmHr: 0,
            humidity: 68,
            safetyStatus: "safe",
            autoReturnWeather: false,
            weatherReturnEtaMin: 0,
            forecast7d: [
                { day: "Mon", icon: "partly-cloudy", tempC: 32, waveM: 0.4 },
                { day: "Tue", icon: "sun",           tempC: 33, waveM: 0.3 },
                { day: "Wed", icon: "sun",           tempC: 34, waveM: 0.3 },
                { day: "Thu", icon: "partly-cloudy", tempC: 32, waveM: 0.5 },
                { day: "Fri", icon: "cloudy",        tempC: 30, waveM: 0.8 },
                { day: "Sat", icon: "rain",          tempC: 28, waveM: 1.2 },
                { day: "Sun", icon: "partly-cloudy", tempC: 30, waveM: 0.9 }
            ]
        },

        activityLog: [
            { time: "08:00", icon: "🔌", msg: "Shore charging connected — full charge", type: "info" },
            { time: "07:45", icon: "🦠", msg: "Microbe tank refilled to 95%", type: "success" },
            { time: "07:30", icon: "🔧", msg: "Maintenance complete — all systems green", type: "success" }
        ],

        notifications: [
            { id: "n1", icon: "✅", msg: "All systems nominal — ready for deployment", time: "2h ago", read: true, severity: "info" }
        ]
    }
};

/* ─── Global Alerts (fleet-wide, for admin view) ──────────── */
const GLOBAL_ALERTS = [
    { id: "ga1", severity: "critical", ship: "NEREID-03", msg: "Storm detected — auto-return initiated", time: "10:15 AM", acknowledged: false },
    { id: "ga2", severity: "warning",  ship: "NEREID-02", msg: "Solar output below threshold — battery mode", time: "10:38 AM", acknowledged: false },
    { id: "ga3", severity: "critical", ship: "NEREID-01", msg: "Bio-membrane filter requires replacement", time: "09:20 AM", acknowledged: false },
    { id: "ga4", severity: "warning",  ship: "NEREID-01", msg: "Hydrocarbon filter health declining (58%)", time: "09:00 AM", acknowledged: true },
    { id: "ga5", severity: "info",     ship: "NEREID-04", msg: "Maintenance complete — all systems nominal", time: "07:30 AM", acknowledged: true },
    { id: "ga6", severity: "info",     ship: "NEREID-01", msg: "Patrol coverage milestone 67%", time: "10:42 AM", acknowledged: true }
];

/* ─── Auth credentials (demo only) ────────────────────────── */
const AUTH_CREDENTIALS = {
    admin: { email: "admin@nereid.ai", password: "nereid2024", redirect: "admin.html" },
    user:  { email: "user@nereid.ai",  password: "nereid2024", redirect: "dashboard.html?ship=NEREID-01" }
};

/* ─── Helper: get ship data by ID ──────────────────────────── */
function getShipData(shipId) {
    return FLEET[shipId] || null;
}

/* ─── Helper: get all ship IDs ─────────────────────────────── */
function getAllShipIds() {
    return Object.keys(FLEET);
}

/* ─── Helper: count unacknowledged alerts ──────────────────── */
function getUnacknowledgedAlertCount() {
    return GLOBAL_ALERTS.filter(a => !a.acknowledged).length;
}

/* ─── Helper: get fleet summary stats ──────────────────────── */
function getFleetSummary() {
    const ships = Object.values(FLEET);
    return {
        total: ships.length,
        active: ships.filter(s => s.status === 'active').length,
        returning: ships.filter(s => s.status === 'returning').length,
        docked: ships.filter(s => s.status === 'docked').length,
        alert: ships.filter(s => s.status === 'alert').length,
        totalAlerts: getUnacknowledgedAlertCount()
    };
}
