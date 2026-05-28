/**
 * Sessions Routes — Track child usage sessions
 */
const express = require('express');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');
const db = require('../db');

const router = express.Router();
router.use(authMiddleware);

/**
 * POST /api/sessions/start
 * Child starts a new session.
 * Body: { activity_type: 'stories' | 'games' | 'creative' | 'videos' }
 */
router.post('/start', (req, res) => {
    const { activity_type } = req.body;
    const childId = req.user.childId || req.body.child_id;

    if (!childId) return res.status(400).json({ error: 'child_id required' });
    if (!activity_type) return res.status(400).json({ error: 'activity_type required' });

    // Check for existing active session
    const active = db.raw.sessions.find(
        s => s.child_id === childId && !s.ended_at
    );
    if (active) {
        return res.status(409).json({ error: 'A session is already active', session: active });
    }

    const session = {
        id: crypto.randomUUID(),
        child_id: childId,
        activity_type,
        started_at: new Date().toISOString(),
        ended_at: null,
        duration_seconds: 0,
        was_paused: false,
    };
    db.raw.sessions.push(session);

    // Notify parent
    const io = req.app.get('io');
    if (io) {
        io.to(`family:${req.user.familyId}`).emit('session:started', {
            childId,
            session,
        });
    }

    res.status(201).json({ session });
});

/**
 * PUT /api/sessions/:id/end
 * End an active session.
 */
router.put('/:id/end', (req, res) => {
    const idx = db.raw.sessions.findIndex(s => s.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Session not found' });

    const session = db.raw.sessions[idx];
    const now = new Date();
    session.ended_at = now.toISOString();
    session.duration_seconds = Math.floor(
        (now.getTime() - new Date(session.started_at).getTime()) / 1000
    );

    // Update daily usage
    const dateStr = now.toISOString().split('T')[0];
    let daily = db.raw.daily_usage.find(
        d => d.child_id === session.child_id && d.usage_date === dateStr
    );

    if (!daily) {
        daily = {
            id: crypto.randomUUID(),
            child_id: session.child_id,
            usage_date: dateStr,
            total_seconds: 0,
            sessions_count: 0,
            activity_breakdown: {},
        };
        db.raw.daily_usage.push(daily);
    }

    daily.total_seconds += session.duration_seconds;
    daily.sessions_count += 1;
    daily.activity_breakdown[session.activity_type] =
        (daily.activity_breakdown[session.activity_type] || 0) + session.duration_seconds;

    // Notify parent
    const io = req.app.get('io');
    if (io) {
        io.to(`family:${req.user.familyId}`).emit('session:ended', {
            childId: session.child_id,
            session,
            daily_total: daily.total_seconds,
        });
    }

    res.json({ session, daily });
});

/**
 * PUT /api/sessions/:id/heartbeat
 * Child sends heartbeat every 30 seconds to update elapsed time.
 * Body: { elapsed_seconds }
 */
router.put('/:id/heartbeat', (req, res) => {
    const idx = db.raw.sessions.findIndex(s => s.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Session not found' });

    const { elapsed_seconds } = req.body;
    db.raw.sessions[idx].duration_seconds = elapsed_seconds || 0;

    // Notify parent of tick
    const io = req.app.get('io');
    if (io) {
        io.to(`family:${req.user.familyId}`).emit('session:tick', {
            childId: db.raw.sessions[idx].child_id,
            elapsed: elapsed_seconds,
            activity: db.raw.sessions[idx].activity_type,
        });
    }

    // Check time warnings
    const childId = db.raw.sessions[idx].child_id;
    const settings = db.raw.settings.find(s => s.child_id === childId);
    if (settings) {
        const limitSec = settings.daily_time_limit_minutes * 60;
        const remaining = limitSec - elapsed_seconds;
        if (remaining <= 300 && remaining > 270) {
            // Warning at 5 minutes remaining
            io?.to(`family:${req.user.familyId}`).emit('time:warning', {
                childId,
                remaining,
                message: '5 minutes remaining',
            });
        }
    }

    res.json({ ok: true });
});

/**
 * GET /api/sessions/:childId/active
 * Get the currently active session for a child.
 */
router.get('/:childId/active', (req, res) => {
    const session = db.raw.sessions.find(
        s => s.child_id === req.params.childId && !s.ended_at
    );
    res.json({ session: session || null });
});

/**
 * GET /api/sessions/:childId/history
 * Get recent session history for a child.
 * Query: ?limit=10
 */
router.get('/:childId/history', (req, res) => {
    const limit = parseInt(req.query.limit || '20', 10);
    const sessions = db.raw.sessions
        .filter(s => s.child_id === req.params.childId && s.ended_at)
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
        .slice(0, limit);

    res.json({ sessions });
});

module.exports = router;
