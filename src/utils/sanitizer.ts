import DOMPurify from 'dompurify';

/**
 * Sanitizes input text by strictly removing ALL HTML tags.
 * Preserves text content but removes scripts, styles, and markup.
 * 
 * Example:
 * Input: "Hello <script>alert(1)</script><b>World</b>"
 * Output: "Hello World"
 */
export const sanitizeInput = (text: string | null | undefined): string => {
    if (!text) return '';

    return DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [], // Strip all tags
        ALLOWED_ATTR: [], // Strip all attributes
        KEEP_CONTENT: true, // Keep text content
    }).trim();
};
