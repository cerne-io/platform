
// Helper to safely escape special regex characters
export const escapeRegExp = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper to strip duplicate question text from AI responses
export const stripQuestionFromText = (text: string, question: string): string => {
    if (!text || !question) return text;

    let cleaned = text;

    // Remove trailing punctuation and quotes from the question for matching
    const baseQuestion = question.trim()
        .replace(/["""']/g, '')
        .replace(/[?.!]+$/, '');

    // Try multiple patterns to catch various forms
    const patterns = [
        // Exact match with optional punctuation/quotes
        new RegExp(escapeRegExp(question.trim()) + '[?.!"\']*', 'gi'),
        // Base question without trailing punctuation
        new RegExp('\\b' + escapeRegExp(baseQuestion) + '[?.!"\']*\\b', 'gi')
    ];

    patterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '').trim();
    });

    // Clean up leftover punctuation at start/end
    cleaned = cleaned
        .replace(/^[?!.,"'\\s]+/, '')
        .replace(/[?!.,"'\\s]+$/, '')
        .replace(/\\s+/g, ' ')
        .trim();

    // Clean up trailing connector words that might be left hanging 
    // e.g. "Could you share your " -> "Could you share"
    cleaned = cleaned
        .replace(/\b(your|my|the|a|an|about|of|for|to|regarding|concerning)\s*$/i, '')
        .replace(/[?!.,"'\\s]+$/, '') // Clean up punctuation again after removing connectors
        .trim();

    return cleaned;
};

// Helper to clean AI response of interactive tokens and premature transition text
export const cleanAIResponse = (text: string): string => {
    if (!text) return text;

    return text
        .replace(/\[SLIDER:\d+\]/g, '')
        .replace(/\[TRIANGLE:\d+\]/g, '')
        .replace(/Now I'd like to understand your experience on a few scales\.?/gi, '')
        .replace(/Now I have a few positioning questions\.?/gi, '')
        // Remove "Options: ..." lists (case insensitive, handles " - Options:", "Options:", etc.)
        .replace(/-?\s*Options:.*$/i, '')
        .trim();
};

/**
 * Normalizes raw technical error strings (e.g. "Failed to fetch", "net::ERR_INTERNET_DISCONNECTED")
 * into user-friendly messages for participants and admins.
 */
export const formatSaveErrorMessage = (
    err: unknown,
    fallbackMessage: string = "Your story could not be saved automatically."
): string => {
    if (!err) return fallbackMessage;

    const rawMessage = typeof err === 'string'
        ? err
        : (err instanceof Error
            ? err.message
            : (typeof (err as { message?: unknown })?.message === 'string'
                ? String((err as { message: unknown }).message)
                : ''));

    const lower = rawMessage.toLowerCase();

    // Network / Offline errors
    if (
        lower.includes('failed to fetch') ||
        lower.includes('networkerror') ||
        lower.includes('network error') ||
        lower.includes('err_internet_disconnected') ||
        lower.includes('load failed') ||
        lower.includes('timeout') ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
    ) {
        return "Unable to connect to the server. Please check your internet connection and try again.";
    }

    // Account limit reached
    if (lower.includes('account limit reached') || lower.includes('limit reached')) {
        return "Account limit reached";
    }

    // Auth / session expiration
    if (
        lower.includes('jwt') ||
        lower.includes('unauthorized') ||
        lower.includes('not authenticated') ||
        lower.includes('token')
    ) {
        return "You must be logged in to save stories.";
    }

    // If already clean and user-friendly, preserve it (discard stack dumps or HTML)
    if (rawMessage && !lower.includes('typeerror') && !lower.includes('<html') && !lower.includes('object [object]')) {
        return rawMessage;
    }

    return fallbackMessage;
};
