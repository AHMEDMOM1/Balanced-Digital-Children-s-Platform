/**
 * Data Access Layer — abstracts database operations.
 * Uses Supabase when configured, falls back to mockDB for development.
 */
const supabase = require('./supabaseClient');
const { mockDB } = require('./mockDB');

const db = supabase || mockDB;

module.exports = db;
