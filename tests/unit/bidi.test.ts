import { isArabic, formatBiDiText } from '../../services/utils/bidi';

describe('bidi utilities', () => {
    describe('isArabic', () => {
        it('should return true if text contains Arabic characters', () => {
            expect(isArabic('مرحبا')).toBe(true);
            expect(isArabic('This is a test مرحبا')).toBe(true);
        });

        it('should return false if text does not contain Arabic characters', () => {
            expect(isArabic('Hello')).toBe(false);
            expect(isArabic('12345')).toBe(false);
            expect(isArabic('')).toBe(false);
        });
    });

    describe('formatBiDiText', () => {
        it('should return the original text if it does not contain Arabic', () => {
            expect(formatBiDiText('Hello World')).toBe('Hello World');
            expect(formatBiDiText('')).toBe('');
        });

        it('should prepend RTL mark to Arabic strings', () => {
            const input = 'مرحبا بالعالم';
            const result = formatBiDiText(input);
            expect(result.startsWith('\u200F')).toBe(true);
        });

        it('should isolate mixed English terms using LRI and PDI', () => {
            const input = 'أرنب (rabbit) صغير في غابة (forest)';
            const result = formatBiDiText(input);
            
            // Should start with RLM (\u200F)
            expect(result.startsWith('\u200F')).toBe(true);
            
            // Should contain isolated (rabbit) and (forest)
            // LRI is \u2066 and PDI is \u2069
            expect(result).toContain('\u2066(rabbit)\u2069');
            expect(result).toContain('\u2066(forest)\u2069');
        });

        it('should isolate English words without punctuation', () => {
            const input = 'مرحبا Leo كيف حالك';
            const result = formatBiDiText(input);
            expect(result).toContain('\u2066Leo\u2069');
        });
    });
});
