/**
 * Design System — Color Palette
 * Child Mode: Warm, playful pastels
 * Parent Mode: Professional, calm tones
 */

const Colors = {
    // ── Child Mode ─────────────────────────────
    child: {
        primary: '#7C5CFC',       // Soft purple
        secondary: '#FF6B6B',     // Coral
        accent: '#4ECDC4',        // Sky teal
        highlight: '#FFE66D',     // Warm yellow
        background: '#F8F6FF',    // Light lavender
        surface: '#FFFFFF',
        textPrimary: '#2D2057',
        textSecondary: '#6B5B95',
        cardStory: '#E8E0FF',
        cardGame: '#FFE0E0',
        cardCreative: '#D4F5F0',
        cardVideo: '#FFE8D6',       // Warm peach
    },

    // ── Parent Mode ────────────────────────────
    parent: {
        primary: '#00B4D8',       // Teal accent
        secondary: '#0F1B2D',     // Deep navy
        accent: '#48CAE4',        // Light teal
        background: '#F0F4F8',    // Soft gray
        surface: '#FFFFFF',
        surfaceElevated: '#FAFBFC',
        textPrimary: '#0F1B2D',
        textSecondary: '#5A6B7E',
        border: '#E2E8F0',
        inputBg: '#F7F9FC',
    },

    // ── Shared / Status ────────────────────────
    shared: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        white: '#FFFFFF',
        black: '#000000',
        overlay: 'rgba(15, 27, 45, 0.6)',
        divider: '#E5E7EB',
    },

    // ── PIN Lock ───────────────────────────────
    pin: {
        background: '#0F1B2D',
        dot: '#00B4D8',
        dotEmpty: '#334155',
        keypad: '#1E293B',
        keypadText: '#FFFFFF',
        keypadPressed: '#00B4D8',
    },
};

export default Colors;
