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
