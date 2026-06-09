import Typography from '../../constants/Typography';

/**
 * Checks if a string contains any Arabic characters.
 * Useful for dynamically applying RTL styles.
 */
export function isArabic(text: string): boolean {
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return arabicRegex.test(text);
}

/**
 * Returns the appropriate text style based on the presence of Arabic characters.
 * If Arabic is detected, it applies RTL/BiDi styles.
 */
export function getBiDiStyle(text: string) {
    if (isArabic(text)) {
        return Typography.rtl;
    }
    return {};
}

/**
 * Formats a bilingual string (Arabic and English) to ensure proper RTL layout
 * and correct rendering of English terms (such as words in parentheses) without
 * breaking the overall sentence order or directionality.
 */
export function formatBiDiText(text: string): string {
    if (!text || !isArabic(text)) {
        return text;
    }

    // Prepend RLM (Right-to-Left Mark, \u200F) to set base direction to RTL
    let formatted = '\u200F' + text;

    // Use LRI (Left-to-Right Isolate, \u2066) and PDI (Pop Directional Isolate, \u2069)
    // to isolate English words, numbers, and any surrounding punctuation (like parentheses)
    // so they are treated as unified LTR blocks within the RTL flow.
    const ltrRegex = /([(\[{]*[A-Za-z0-9]+(?:[\s\-_']+[A-Za-z0-9]+)*[)\]}]*)/g;
    formatted = formatted.replace(ltrRegex, '\u2066$1\u2069');

    return formatted;
}
