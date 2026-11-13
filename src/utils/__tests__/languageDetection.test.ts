import { describe, it, expect } from 'vitest';
import { detectSupportedLanguage } from '../languageDetection';

describe('detectSupportedLanguage', () => {
  it('detects Brazilian Portuguese (pt-BR) correctly', () => {
    const text = 'Conte-nos sobre uma experiência recente com a sua equipe onde você sentiu que o trabalho foi produtivo.';
    expect(detectSupportedLanguage(text)).toBe('pt-BR');
  });

  it('detects Spanish (es) correctly', () => {
    const text = 'Cuéntenos sobre una experiencia reciente con su equipo donde usted sintió que el trabajo fue productivo.';
    expect(detectSupportedLanguage(text)).toBe('es');
  });

  it('detects French (fr) correctly', () => {
    const text = 'Partagez avec nous une histoire sur votre projet et le travail avec votre équipe.';
    expect(detectSupportedLanguage(text)).toBe('fr');
  });

  it('detects German (de) correctly', () => {
    const text = 'Erzählen Sie uns eine Geschichte über Ihre Erfahrung mit diesem Projekt für die Arbeit.';
    expect(detectSupportedLanguage(text)).toBe('de');
  });

  it('detects Italian (it) correctly', () => {
    const text = 'Racconta una storia su questa esperienza con il tuo team per questo progetto di lavoro.';
    expect(detectSupportedLanguage(text)).toBe('it');
  });

  it('detects Dutch (nl) correctly', () => {
    const text = 'Deel een verhaal over uw ervaring met dit project en het werk voor het team.';
    expect(detectSupportedLanguage(text)).toBe('nl');
  });

  it('defaults to English (en) when given English text', () => {
    const text = 'Please share a story about a time when you felt supported by your leadership team.';
    expect(detectSupportedLanguage(text)).toBe('en');
  });

  it('defaults to English (en) for unsupported languages', () => {
    // Polish
    expect(detectSupportedLanguage('Celem tego projektu jest zrozumienie, jak pracownicy postrzegają przywództwo.')).toBe('en');
    // Japanese
    expect(detectSupportedLanguage('このプロジェクトの目的は、従業員がリーダーシップについてどのように感じているかを理解することです。')).toBe('en');
    // Russian
    expect(detectSupportedLanguage('Цель этого проекта - понять, как сотрудники воспринимают лидерство.')).toBe('en');
  });

  it('defaults to English (en) for empty or null input', () => {
    expect(detectSupportedLanguage('')).toBe('en');
    expect(detectSupportedLanguage(null)).toBe('en');
    expect(detectSupportedLanguage(undefined)).toBe('en');
    expect(detectSupportedLanguage('123 456')).toBe('en');
  });
});

