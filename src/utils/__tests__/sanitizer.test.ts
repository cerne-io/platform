import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '../sanitizer';

describe('sanitizeInput', () => {
    it('strips script tags', () => {
        const input = 'Hello <script>alert(1)</script>World';
        expect(sanitizeInput(input)).toBe('Hello World');
    });

    it('strips event handlers', () => {
        const input = '<div onclick="alert(1)">Click me</div>';
        expect(sanitizeInput(input)).toBe('Click me');
    });

    it('strips javascript: protocol', () => {
        const input = '<a href="javascript:alert(1)">Link</a>';
        expect(sanitizeInput(input)).toBe('Link');
    });

    it('strips img parsing vectors', () => {
        const input = '<img src=x onerror=alert(1)>';
        expect(sanitizeInput(input)).toBe('');
    });

    it('protects against nested obfuscation', () => {
        const input = '<scr<script>ipt>alert(1)</script>';
        // DOMPurify is strict, it might return "ipt>alert(1)" or empty depending on parser.
        // Ideally it breaks the script execution.
        const result = sanitizeInput(input);
        expect(result).not.toContain('<script>');
    });

    it('strips standard HTML tags (Strict Plain Text)', () => {
        const input = '<b>Bold</b> and <i>Italic</i>';
        expect(sanitizeInput(input)).toBe('Bold and Italic');
    });
});
