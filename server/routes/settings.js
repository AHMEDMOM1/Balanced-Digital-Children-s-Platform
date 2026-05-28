/**
 * Settings Routes — Child time/content settings (Parent → Server → Child)
 */
const express = require('express');
const authMiddleware = require('../middleware/auth');
const db = require('../db');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/settings/:childId
 * Get settings for a specific child.
 */
router.get('/:childId', (req, res) => {
    const child = db.raw.children.find(
        c => c.id === req.params.childId && c.family_id === req.user.familyId
    );
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const settings = db.raw.settings.find(s => s.child_id === req.params.childId);
    if (!settings) return res.status(404).json({ error: 'Settings not found' });

    res.json({ settings });
});

/**
 * PUT /api/settings/:childId
 * Update settings (time limits, content toggles).
 * Body: { daily_time_limit_minutes?, sessions_per_day?, stories_enabled?, ... }
 * Emits WebSocket event to child device.
 */
router.put('/:childId', (req, res) => {
    if (req.user.role !== 'parent') {
        return res.status(403).json({ error: 'Only parents can change settings' });
    }

    const idx = db.raw.settings.findIndex(s => s.child_id === req.params.childId);
    if (idx < 0) return res.status(404).json({ error: 'Settings not found' });

    const allowed = [
        'daily_time_limit_minutes', 'sessions_per_day',
        'stories_enabled', 'games_enabled', 'creative_enabled', 'videos_enabled',
    ];

    for (const key of allowed) {
        if (req.body[key] !== undefined) {
            db.raw.settings[idx][key] = req.body[key];
        }
    }
    db.raw.settings[idx].updated_at = new Date().toISOString();

    // Emit WebSocket event to child (via io attached to app)
    const io = req.app.get('io');
    if (io) {
        io.to(`family:${req.user.familyId}`).emit('settings:updated', {
            childId: req.params.childId,
            settings: db.raw.settings[idx],
        });
    }

    res.json({ settings: db.raw.settings[idx] });
});

/**
 * PUT /api/settings/:childId/pause
 * Pause or resume the child's current session.
 * Body: { paused: true/false }
 */
router.put('/:childId/pause', (req, res) => {
    if (req.user.role !== 'parent') {
        return res.status(403).json({ error: 'Only parents can pause sessions' });
    }

    const { paused } = req.body;
    if (paused === undefined) {
        return res.status(400).json({ error: 'paused field is required' });
    }

    // Emit to child device
    const io = req.app.get('io');
    if (io) {
        io.to(`family:${req.user.familyId}`).emit('session:pause', {
            childId: req.params.childId,
            paused,
        });
    }

    res.json({ childId: req.params.childId, paused });
});

module.exports = router;
