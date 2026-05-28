/**
 * Mock Database — In-memory store for development without Supabase.
 * Provides the same interface as Supabase queries so switching is seamless.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ── In-memory tables ────────────────────────────────────────────
const db = {
    families: [],
    parents: [],
    children: [],
    settings: [],
    sessions: [],
    daily_usage: [],
};

const uuid = () => crypto.randomUUID();
const familyCode = () => crypto.randomBytes(3).toString('hex').toUpperCase(); // 6-char code

// ── Seed demo data ──────────────────────────────────────────────
async function seed() {
    const familyId = uuid();
    const parentId = uuid();
    const childLeoId = uuid();
    const childMiaId = uuid();
    const pinHash = await bcrypt.hash('1234', 10);

    db.families.push({
        id: familyId,
        family_code: 'ABC123',
        created_at: new Date().toISOString(),
    });

    db.parents.push({
        id: parentId,
        family_id: familyId,
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@example.com',
        pin_hash: pinHash,
        notification_prefs: {
            session_alerts: true,
            daily_reports: true,
            time_warnings: true,
            weekly_summary: false,
        },
        language: 'en',
        created_at: new Date().toISOString(),
    });

    db.children.push(
        {
            id: childLeoId,
            family_id: familyId,
            name: 'Leo Jenkins',
            age: 8,
            avatar_color: '#C9A74D',
            birthday: '2018-03-15',
            is_active: false,
            last_seen: null,
        },
        {
            id: childMiaId,
            family_id: familyId,
            name: 'Mia Jenkins',
            age: 5,
            avatar_color: '#E1D4FD',
            birthday: '2021-07-22',
            is_active: false,
            last_seen: null,
        }
    );

    db.settings.push(
        {
            id: uuid(),
            child_id: childLeoId,
            daily_time_limit_minutes: 60,
            sessions_per_day: 3,
            stories_enabled: true,
            games_enabled: true,
            creative_enabled: true,
            videos_enabled: true,
            updated_at: new Date().toISOString(),
        },
        {
            id: uuid(),
            child_id: childMiaId,
            daily_time_limit_minutes: 45,
            sessions_per_day: 2,
            stories_enabled: true,
            games_enabled: true,
            creative_enabled: true,
            videos_enabled: false,
            updated_at: new Date().toISOString(),
        }
    );

    // Seed some usage data for reports
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        db.daily_usage.push({
            id: uuid(),
            child_id: childLeoId,
            usage_date: dateStr,
            total_seconds: Math.floor(Math.random() * 5400) + 1800, // 30m–2h
            sessions_count: Math.floor(Math.random() * 3) + 1,
            activity_breakdown: {
                stories: Math.floor(Math.random() * 1200),
                games: Math.floor(Math.random() * 1800),
                creative: Math.floor(Math.random() * 900),
                videos: Math.floor(Math.random() * 600),
            },
        });
    }

    console.log('🌱 Mock database seeded with demo data');
    console.log(`   Family code: ABC123`);
    console.log(`   Parent email: sarah.jenkins@example.com / PIN: 1234`);
    console.log(`   Children: Leo (${childLeoId}), Mia (${childMiaId})`);
}

// ── Query helpers (mimic Supabase interface) ────────────────────
const mockDB = {
    /** Get all data from a table, optionally filtered */
    from(table) {
        const data = db[table] || [];
        return {
            select: (cols = '*') => ({
                eq: (field, value) => ({
                    single: () => ({ data: data.find(r => r[field] === value) || null, error: null }),
                    then: (resolve) => resolve({ data: data.filter(r => r[field] === value), error: null }),
                    data: data.filter(r => r[field] === value),
                    error: null,
                }),
                data,
                error: null,
            }),
            insert: (rows) => {
                const arr = Array.isArray(rows) ? rows : [rows];
                const withIds = arr.map(r => ({ id: uuid(), ...r, created_at: new Date().toISOString() }));
                db[table].push(...withIds);
                return { data: withIds, error: null };
            },
            update: (updates) => ({
                eq: (field, value) => {
                    const idx = db[table].findIndex(r => r[field] === value);
                    if (idx >= 0) {
                        db[table][idx] = { ...db[table][idx], ...updates, updated_at: new Date().toISOString() };
                        return { data: db[table][idx], error: null };
                    }
                    return { data: null, error: { message: 'Not found' } };
                },
            }),
            delete: () => ({
                eq: (field, value) => {
                    const idx = db[table].findIndex(r => r[field] === value);
                    if (idx >= 0) {
                        const removed = db[table].splice(idx, 1);
                        return { data: removed[0], error: null };
                    }
                    return { data: null, error: { message: 'Not found' } };
                },
            }),
        };
    },

    /** Direct access to raw tables (for custom queries) */
    raw: db,
};

module.exports = { mockDB, seed };
