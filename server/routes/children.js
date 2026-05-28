/**
 * Children Routes — CRUD for child profiles
 */
const express = require('express');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');
const db = require('../db');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/children
 * List all children for the authenticated family.
 */
router.get('/', (req, res) => {
    const children = db.raw.children.filter(c => c.family_id === req.user.familyId);
    const withSettings = children.map(child => {
        const settings = db.raw.settings.find(s => s.child_id === child.id);
        return { ...child, settings };
    });
    res.json({ children: withSettings });
});

/**
 * GET /api/children/:id
 * Get a specific child with settings.
 */
router.get('/:id', (req, res) => {
    const child = db.raw.children.find(
        c => c.id === req.params.id && c.family_id === req.user.familyId
    );
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const settings = db.raw.settings.find(s => s.child_id === child.id);
    res.json({ child: { ...child, settings } });
});

/**
 * POST /api/children
 * Create a new child profile.
 * Body: { name, age, birthday?, avatar_color? }
 */
router.post('/', (req, res) => {
    if (req.user.role !== 'parent') {
        return res.status(403).json({ error: 'Only parents can add children' });
    }

    const { name, age, birthday, avatar_color } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const child = {
        id: crypto.randomUUID(),
        family_id: req.user.familyId,
        name,
        age: age || 0,
        avatar_color: avatar_color || '#E1D4FD',
        birthday: birthday || null,
        is_active: false,
        last_seen: null,
    };
    db.raw.children.push(child);

    // Create default settings
    const settings = {
        id: crypto.randomUUID(),
        child_id: child.id,
        daily_time_limit_minutes: 60,
        sessions_per_day: 3,
        stories_enabled: true,
        games_enabled: true,
        creative_enabled: true,
        videos_enabled: false,
        updated_at: new Date().toISOString(),
    };
    db.raw.settings.push(settings);

    res.status(201).json({ child: { ...child, settings } });
});

/**
 * PUT /api/children/:id
 * Update child profile.
 * Body: { name?, age?, birthday?, avatar_color? }
 */
router.put('/:id', (req, res) => {
    if (req.user.role !== 'parent') {
        return res.status(403).json({ error: 'Only parents can edit children' });
    }

    const idx = db.raw.children.findIndex(
        c => c.id === req.params.id && c.family_id === req.user.familyId
    );
    if (idx < 0) return res.status(404).json({ error: 'Child not found' });

    const { name, age, birthday, avatar_color } = req.body;
    if (name !== undefined) db.raw.children[idx].name = name;
    if (age !== undefined) db.raw.children[idx].age = age;
    if (birthday !== undefined) db.raw.children[idx].birthday = birthday;
    if (avatar_color !== undefined) db.raw.children[idx].avatar_color = avatar_color;

    res.json({ child: db.raw.children[idx] });
});

/**
 * DELETE /api/children/:id
 * Remove a child profile and all related data.
 */
router.delete('/:id', (req, res) => {
    if (req.user.role !== 'parent') {
        return res.status(403).json({ error: 'Only parents can delete children' });
    }

    const idx = db.raw.children.findIndex(
        c => c.id === req.params.id && c.family_id === req.user.familyId
    );
    if (idx < 0) return res.status(404).json({ error: 'Child not found' });

    const childId = db.raw.children[idx].id;
    db.raw.children.splice(idx, 1);

    // Cascade delete
    db.raw.settings = db.raw.settings.filter(s => s.child_id !== childId);
    db.raw.sessions = db.raw.sessions.filter(s => s.child_id !== childId);
    db.raw.daily_usage = db.raw.daily_usage.filter(u => u.child_id !== childId);

    res.json({ deleted: true });
});

module.exports = router;
