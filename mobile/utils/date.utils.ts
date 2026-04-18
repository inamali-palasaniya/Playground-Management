import { format, isValid, parseISO } from 'date-fns';

/**
 * Safely format a date string or object.
 * Returns a fallback string if the date is invalid or missing.
 */
export const safeFormatDate = (date: string | Date | null | undefined, formatStr: string, fallback: string = 'N/A'): string => {
    if (!date) return fallback;
    
    try {
        const d = typeof date === 'string' ? parseISO(date) : date;
        if (!isValid(d)) return fallback;
        return format(d, formatStr);
    } catch (error) {
        console.warn('Date formatting failed:', error);
        return fallback;
    }
};
