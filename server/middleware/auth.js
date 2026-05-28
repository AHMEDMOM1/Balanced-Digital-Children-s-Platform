/**
 * JWT Authentication Middleware
 * Verifies Bearer tokens on protected routes.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded; // { id, familyId, role: 'parent' | 'child', childId? }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = authMiddleware;
