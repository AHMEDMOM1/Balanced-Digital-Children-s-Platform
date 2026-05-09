/**
 * Design System — Typography
 * Uses Inter font family (loaded via expo-google-fonts)
 */

const Typography = {
    // ── Font Families ──────────────────────────
    fonts: {
        regular: 'Inter_400Regular',
        semiBold: 'Inter_600SemiBold',
        bold: 'Inter_700Bold',
    },

    // ── Child Mode (larger, friendly) ──────────
    child: {
        hero: {
            fontSize: 32,
            fontFamily: 'Inter_700Bold',
            lineHeight: 40,
        },
        title: {
            fontSize: 24,
            fontFamily: 'Inter_700Bold',
            lineHeight: 32,
        },
        subtitle: {
            fontSize: 20,
            fontFamily: 'Inter_600SemiBold',
            lineHeight: 28,
        },
        body: {
            fontSize: 18,
            fontFamily: 'Inter_400Regular',
            lineHeight: 26,
        },
        button: {
            fontSize: 20,
            fontFamily: 'Inter_700Bold',
            lineHeight: 28,
        },
    },

    // ── Parent Mode (clean, professional) ──────
    parent: {
        title: {
            fontSize: 22,
            fontFamily: 'Inter_700Bold',
            lineHeight: 30,
        },
        subtitle: {
            fontSize: 18,
            fontFamily: 'Inter_600SemiBold',
            lineHeight: 26,
        },
        body: {
            fontSize: 15,
            fontFamily: 'Inter_400Regular',
            lineHeight: 22,
        },
        caption: {
            fontSize: 13,
            fontFamily: 'Inter_400Regular',
            lineHeight: 18,
        },
        button: {
            fontSize: 16,
            fontFamily: 'Inter_600SemiBold',
            lineHeight: 22,
        },
        label: {
            fontSize: 14,
            fontFamily: 'Inter_600SemiBold',
            lineHeight: 20,
        },
    },
};

export default Typography;
