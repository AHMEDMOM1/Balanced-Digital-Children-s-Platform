/**
 * WebSocket Event Handlers — Real-time communication layer
 * Manages rooms, device status, and bidirectional events.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

/**
 * Initialize Socket.IO event handlers.
 * @param {import('socket.io').Server} io
 */
function initSocketHandlers(io) {
    // ── Authentication middleware ────────────────────
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            socket.user = decoded; // { id, familyId, role, childId? }
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    // ── Connection handler ──────────────────────────
    io.on('connection', (socket) => {
        const { user } = socket;
        const room = `family:${user.familyId}`;

        // Join family room
        socket.join(room);

        console.log(
            `🔌 ${user.role.toUpperCase()} connected — ` +
            `family: ${user.familyId.slice(0, 8)}... | socket: ${socket.id}`
        );

        // ── Child-specific events ───────────────────
        if (user.role === 'child') {
            // Mark child as active
            const child = db.raw.children.find(c => c.id === user.childId);
            if (child) {
                child.is_active = true;
                child.last_seen = new Date().toISOString();
            }

            // Notify parent that child connected
            socket.to(room).emit('child:connected', {
                childId: user.childId,
                name: child?.name,
                timestamp: new Date().toISOString(),
            });

            // ── Listen for child events ─────────────
            socket.on('session:started', (data) => {
                socket.to(room).emit('session:started', {
                    childId: user.childId,
                    ...data,
                });
            });

            socket.on('session:tick', (data) => {
                socket.to(room).emit('session:tick', {
                    childId: user.childId,
                    ...data,
                });
            });

            socket.on('session:ended', (data) => {
                socket.to(room).emit('session:ended', {
                    childId: user.childId,
                    ...data,
                });
            });

            socket.on('activity:opened', (data) => {
                socket.to(room).emit('activity:opened', {
                    childId: user.childId,
                    ...data,
                });
            });

            // ── Disconnection ──────────────────────
            socket.on('disconnect', () => {
                if (child) {
                    child.is_active = false;
                    child.last_seen = new Date().toISOString();
                }
                socket.to(room).emit('child:disconnected', {
                    childId: user.childId,
                    name: child?.name,
                    timestamp: new Date().toISOString(),
                });
                console.log(`🔌 CHILD disconnected — ${child?.name}`);
            });
        }

        // ── Parent-specific events ──────────────────
        if (user.role === 'parent') {
            socket.on('session:pause', (data) => {
                socket.to(room).emit('session:pause', data);
            });

            socket.on('session:force-end', (data) => {
                socket.to(room).emit('session:force-end', data);
            });

            socket.on('settings:updated', (data) => {
                socket.to(room).emit('settings:updated', data);
            });

            socket.on('content:toggle', (data) => {
                socket.to(room).emit('content:toggle', data);
            });

            socket.on('disconnect', () => {
                console.log(`🔌 PARENT disconnected`);
            });
        }

        // ── Common: Request current status ──────────
        socket.on('status:request', () => {
            const children = db.raw.children.filter(c => c.family_id === user.familyId);
            const statuses = children.map(c => ({
                id: c.id,
                name: c.name,
                is_active: c.is_active,
                last_seen: c.last_seen,
            }));
            socket.emit('status:response', { children: statuses });
        });
    });
}

module.exports = { initSocketHandlers };
