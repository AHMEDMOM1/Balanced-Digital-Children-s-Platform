/**
 * Reports Routes — Usage analytics for parent dashboard
 */
const express = require('express');
const authMiddleware = require('../middleware/auth');
const db = require('../db');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/reports/:childId/daily?date=2026-05-10
 * Get daily usage report for a specific date.
 */
router.get('/:childId/daily', (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const usage = db.raw.daily_usage.find(
        d => d.child_id === req.params.childId && d.usage_date === targetDate
    );

    const sessions = db.raw.sessions.filter(
        s => s.child_id === req.params.childId &&
            s.started_at && s.started_at.startsWith(targetDate)
    );

    res.json({
        date: targetDate,
        usage: usage || {
            total_seconds: 0,
            sessions_count: 0,
            activity_breakdown: {},
        },
        sessions,
    });
});

/**
 * GET /api/reports/:childId/weekly?start=2026-05-04
 * Get weekly usage report (7 days from start).
 */
router.get('/:childId/weekly', (req, res) => {
    const startDate = req.query.start
        ? new Date(req.query.start)
        : (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d; })();

    const days = [];
    let totalSeconds = 0;
    let totalSessions = 0;
    const activityTotals = {};

    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const usage = db.raw.daily_usage.find(
            u => u.child_id === req.params.childId && u.usage_date === dateStr
        );

        const dayData = {
            date: dateStr,
            day: dayNames[d.getDay()],
            total_seconds: usage?.total_seconds || 0,
            sessions_count: usage?.sessions_count || 0,
            activity_breakdown: usage?.activity_breakdown || {},
        };

        totalSeconds += dayData.total_seconds;
        totalSessions += dayData.sessions_count;

        // Aggregate activities
        for (const [activity, secs] of Object.entries(dayData.activity_breakdown)) {
            activityTotals[activity] = (activityTotals[activity] || 0) + secs;
        }

        days.push(dayData);
    }

    const dailyAvgSeconds = Math.floor(totalSeconds / 7);

    res.json({
        start: startDate.toISOString().split('T')[0],
        end: days[6]?.date,
        total_seconds: totalSeconds,
        total_sessions: totalSessions,
        daily_avg_seconds: dailyAvgSeconds,
        activity_breakdown: activityTotals,
        days,
    });
});

/**
 * GET /api/reports/:childId/activity-breakdown?days=7
 * Get activity breakdown for the last N days.
 */
router.get('/:childId/activity-breakdown', (req, res) => {
    const numDays = parseInt(req.query.days || '7', 10);
    const today = new Date();
    const breakdown = {};

    for (let i = 0; i < numDays; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const usage = db.raw.daily_usage.find(
            u => u.child_id === req.params.childId && u.usage_date === dateStr
        );

        if (usage?.activity_breakdown) {
            for (const [activity, secs] of Object.entries(usage.activity_breakdown)) {
                breakdown[activity] = (breakdown[activity] || 0) + secs;
            }
        }
    }

    // Convert to sorted array
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const activities = Object.entries(breakdown)
        .map(([name, seconds]) => ({
            name,
            seconds,
            formatted: formatDuration(seconds),
            percent: total > 0 ? Math.round((seconds / total) * 100) : 0,
        }))
        .sort((a, b) => b.seconds - a.seconds);

    res.json({ period_days: numDays, total_seconds: total, activities });
});

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

module.exports = router;
