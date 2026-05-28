/**
 * Server Configuration
 * Loads environment variables and exports config object.
 */
require('dotenv').config();

module.exports = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceKey: process.env.SUPABASE_SERVICE_KEY,
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'dev-fallback-secret',
        expiresIn: '7d',
    },

    cors: {
        origin: '*', // tighten in production
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
};
