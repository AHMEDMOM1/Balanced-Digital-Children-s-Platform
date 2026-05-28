/**
 * SafePlay Timer — API Server
 * Express + Socket.IO server providing REST API and real-time communication.
 *
 * Endpoints:
 *   /api/auth/*       — Registration, Login, Family joining
 *   /api/children/*   — Child profile CRUD
 *   /api/settings/*   — Time limits & content permissions
 *   /api/sessions/*   — Session tracking & heartbeat
 *   /api/reports/*    — Usage analytics
 *
 * WebSocket events flow between parent ⇔ server ⇔ child devices.
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const config = require('./config');
const { seed } = require('./mockDB');
const { initSocketHandlers } = require('./socket/handlers');

// ── Routes ──────────────────────────────────────────
const authRoutes = require('./routes/auth');
const childrenRoutes = require('./routes/children');
const settingsRoutes = require('./routes/settings');
const sessionsRoutes = require('./routes/sessions');
const reportsRoutes = require('./routes/reports');

// ── Initialize ──────────────────────────────────────
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: config.cors,
    pingInterval: 25000,
    pingTimeout: 60000,
});

// Share io instance with routes (for emitting events)
app.set('io', io);

// ── Middleware ───────────────────────────────────────
app.use(cors(config.cors));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
    if (config.nodeEnv === 'development') {
        console.log(`${req.method} ${req.url}`);
    }
    next();
});

// ── Routes ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        mode: config.supabase.url?.includes('your-project') ? 'mock' : 'supabase',
        connections: io.engine?.clientsCount || 0,
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/reports', reportsRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

// Error handler
app.use((err, req, res, _next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ── WebSocket ───────────────────────────────────────
initSocketHandlers(io);

// ── Start ───────────────────────────────────────────
async function start() {
    // Seed mock data if not using Supabase
    if (!config.supabase.url || config.supabase.url.includes('your-project')) {
        await seed();
    }

    server.listen(config.port, '0.0.0.0', () => {
        // Detect LAN IP for mobile access
        const os = require('os');
        const nets = os.networkInterfaces();
        let lanIP = 'localhost';
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    lanIP = net.address;
                    break;
                }
            }
        }
        console.log('\n' +
            '╔══════════════════════════════════════════════════════╗\n' +
            '║       🛡️  SafePlay Timer — API Server               ║\n' +
            '╠══════════════════════════════════════════════════════╣\n' +
            `║  REST API:   http://${lanIP}:${config.port}/api\n` +
            `║  WebSocket:  ws://${lanIP}:${config.port}\n` +
            `║  Health:     http://${lanIP}:${config.port}/api/health\n` +
            `║  Mode:       ${(config.supabase.url?.includes('your-project') ? 'MOCK (in-memory)' : 'Supabase')}\n` +
            '╚══════════════════════════════════════════════════════╝\n' +
            `\n  📱 Use this URL in your app: http://${lanIP}:${config.port}/api\n`
        );
    });
}

start().catch(console.error);
