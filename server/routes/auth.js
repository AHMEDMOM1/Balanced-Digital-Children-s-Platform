/**
 * Auth Routes — Registration, Login, Family Joining
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { mockDB } = require('../mockDB');

const router = express.Router();
const db = require('../db');

/**
 * POST /api/auth/register
 * Register a new family + parent account.
 * Body: { name, email, pin }
 * Returns: { token, family_code, parent }
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, pin } = req.body;

        if (!name || !email || !pin) {
            return res.status(400).json({ error: 'name, email, and pin are required' });
        }

        // Check if email already exists
        const existing = db.raw.parents.find(p => p.email === email);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Create family
        const familyId = crypto.randomUUID();
        const familyCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        db.raw.families.push({
            id: familyId,
            family_code: familyCode,
            created_at: new Date().toISOString(),
        });

        // Create parent
        const parentId = crypto.randomUUID();
        const pinHash = await bcrypt.hash(pin, 10);
        const parent = {
            id: parentId,
            family_id: familyId,
            name,
            email,
            pin_hash: pinHash,
            notification_prefs: {
                session_alerts: true,
                daily_reports: true,
                time_warnings: true,
                weekly_summary: false,
            },
            language: 'en',
            created_at: new Date().toISOString(),
        };
        db.raw.parents.push(parent);

        // Generate JWT
        const token = jwt.sign(
            { id: parentId, familyId, role: 'parent' },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        res.status(201).json({
            token,
            family_code: familyCode,
            parent: { id: parentId, name, email, family_id: familyId },
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/login
 * Login parent with email + PIN.
 * Body: { email, pin }
 * Returns: { token, parent, family_code, children }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, pin } = req.body;

        if (!email || !pin) {
            return res.status(400).json({ error: 'email and pin are required' });
        }

        const parent = db.raw.parents.find(p => p.email === email);
        if (!parent) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPin = await bcrypt.compare(pin, parent.pin_hash);
        if (!validPin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const family = db.raw.families.find(f => f.id === parent.family_id);
        const children = db.raw.children.filter(c => c.family_id === parent.family_id);

        const token = jwt.sign(
            { id: parent.id, familyId: parent.family_id, role: 'parent' },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        res.json({
            token,
            parent: {
                id: parent.id,
                name: parent.name,
                email: parent.email,
                family_id: parent.family_id,
                language: parent.language,
            },
            family_code: family?.family_code,
            children: children.map(c => ({
                id: c.id, name: c.name, age: c.age,
                avatar_color: c.avatar_color, is_active: c.is_active,
            })),
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/join-family
 * Child device joins family using code.
 * Body: { family_code, child_name }
 * Returns: { token, child, family_id }
 */
router.post('/join-family', async (req, res) => {
    try {
        const { family_code, child_name } = req.body;

        if (!family_code || !child_name) {
            return res.status(400).json({ error: 'family_code and child_name are required' });
        }

        const family = db.raw.families.find(f => f.family_code === family_code.toUpperCase());
        if (!family) {
            return res.status(404).json({ error: 'Invalid family code' });
        }

        // Find or create child
        let child = db.raw.children.find(
            c => c.family_id === family.id && c.name.toLowerCase() === child_name.toLowerCase()
        );

        if (!child) {
            child = {
                id: crypto.randomUUID(),
                family_id: family.id,
                name: child_name,
                age: 0,
                avatar_color: '#E1D4FD',
                birthday: null,
                is_active: true,
                last_seen: new Date().toISOString(),
            };
            db.raw.children.push(child);

            // Create default settings
            db.raw.settings.push({
                id: crypto.randomUUID(),
                child_id: child.id,
                daily_time_limit_minutes: 60,
                sessions_per_day: 3,
                stories_enabled: true,
                games_enabled: true,
                creative_enabled: true,
                videos_enabled: false,
                updated_at: new Date().toISOString(),
            });
        }

        const token = jwt.sign(
            { id: child.id, familyId: family.id, role: 'child', childId: child.id },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        res.json({
            token,
            child: { id: child.id, name: child.name, family_id: family.id },
            family_id: family.id,
        });
    } catch (err) {
        console.error('Join family error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/verify-pin
 * Verify parent PIN (for settings access).
 * Body: { pin }
 * Requires: Bearer token
 */
router.post('/verify-pin', require('../middleware/auth'), async (req, res) => {
    try {
        const { pin } = req.body;
        const parent = db.raw.parents.find(p => p.id === req.user.id);

        if (!parent) {
            return res.status(404).json({ error: 'Parent not found' });
        }

        const valid = await bcrypt.compare(pin, parent.pin_hash);
        res.json({ valid });
    } catch (err) {
        console.error('Verify PIN error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
