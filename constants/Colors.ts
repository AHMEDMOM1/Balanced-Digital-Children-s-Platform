/**
 * Design System — SafePlay Timer Color Palette
 * Based on "Dual-Horizon" design: deep purple for child, professional purple for parent.
 */

const Colors = {
    // ── Child Mode ─────────────────────────────
    child: {
        primary: '#4f378a',           // Deep purple
        primaryContainer: '#6750a4',  // Medium purple
        onPrimary: '#ffffff',
        onPrimaryContainer: '#e0d2ff',
        secondary: '#63597c',
        secondaryContainer: '#e1d4fd',
        tertiary: '#765b00',          // Gold/amber accent
        tertiaryContainer: '#c9a74d', // Gold container
        tertiaryFixedDim: '#e7c365',
        background: '#fdf7ff',        // Light lavender
        surface: '#ffffff',
        surfaceContainer: '#f2ecf4',
        surfaceContainerHigh: '#ece6ee',
        surfaceContainerLowest: '#ffffff',
        surfaceVariant: '#e6e0e9',
        textPrimary: '#1d1b20',
        textSecondary: '#494551',
        outline: '#7a7582',
        outlineVariant: '#cbc4d2',
        accent: '#cfbcff',            // Light purple accent
        primaryFixed: '#e9ddff',
        primaryFixedDim: '#cfbcff',
        // Activity card colors
        cardStory: '#e9ddff',         // Light purple (E8E0FF in Stitch)
        cardGame: '#ffe0e0',          // Soft pink
        cardCreative: '#c9a74d',      // Gold
        cardVideo: '#e6e0e9',         // Soft gray
        cardVideoBackground: '#FFE8D6', // Warm peach for video screen
        // Status
        starFilled: '#c9a74d',
        starEmpty: '#cbc4d2',
        error: '#ba1a1a',
        errorContainer: '#ffdad6',
    },

    // ── Parent Mode ────────────────────────────
    parent: {
        primary: '#4f378a',           // Deep purple (same brand)
        primaryContainer: '#6750a4',
        onPrimary: '#ffffff',
        accent: '#cfbcff',            // Light purple accent
        background: '#fdf7ff',
        surface: '#ffffff',
        surfaceContainer: '#f2ecf4',
        surfaceContainerHigh: '#ece6ee',
        textPrimary: '#1d1b20',
        textSecondary: '#494551',
        border: '#cbc4d2',
        outline: '#7a7582',
        inputBg: '#f8f2fa',
    },

    // ── Shared / Status ────────────────────────
    shared: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#ba1a1a',
        errorContainer: '#ffdad6',
        info: '#6750a4',
        white: '#ffffff',
        black: '#000000',
        overlay: 'rgba(29, 27, 32, 0.6)',
        divider: '#cbc4d2',
    },

    // ── PIN Lock ───────────────────────────────
    pin: {
        background: '#fdf7ff',
        dot: '#4f378a',
        dotEmpty: '#cbc4d2',
        keypad: '#ffffff',
        keypadText: '#1d1b20',
        keypadPressed: '#e9ddff',
        cardBg: '#ffffff',
        cardBorder: '#cbc4d2',
    },

    // ── Header Bar ─────────────────────────────
    header: {
        background: '#4f378a',
        text: '#ffffff',
        icon: '#ffffff',
    },

    // ── Bottom Tab Bar ─────────────────────────
    tab: {
        active: '#4f378a',
        inactive: '#7a7582',
        background: '#ffffff',
        border: '#cbc4d2',
    },
};

export default Colors;
