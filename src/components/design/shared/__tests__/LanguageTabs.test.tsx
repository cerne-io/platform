import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LanguageTabs from '../LanguageTabs';

describe('LanguageTabs', () => {
  it('renders nothing when languages <= 1', () => {
    const { container } = render(
      <LanguageTabs
        enabledLanguages={['en']}
        activeLanguage="en"
        onLanguageChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders tabs when languages <= maxTabs', () => {
    render(
      <LanguageTabs
        enabledLanguages={['en', 'pt-BR']}
        activeLanguage="en"
        onLanguageChange={vi.fn()}
      />
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /English/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Portuguese/i })).toBeInTheDocument();
  });

  it('renders compact short codes in compact mode when tabs are used', () => {
    render(
      <LanguageTabs
        enabledLanguages={['en', 'pt-BR', 'fr']}
        activeLanguage="en"
        onLanguageChange={vi.fn()}
        compact
      />
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /EN/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /PT-BR/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /FR/i })).toBeInTheDocument();
  });

  it('switches to dropdown Select when enabled languages > maxTabs (adaptive Option 3)', () => {
    render(
      <LanguageTabs
        enabledLanguages={['en', 'pt-BR', 'fr', 'es']}
        activeLanguage="en"
        onLanguageChange={vi.fn()}
        maxTabs={3}
      />
    );

    // Tablist should NOT be rendered
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    // Dropdown combobox/trigger should be present
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('forces dropdown when variant="select" even with 2 languages', () => {
    render(
      <LanguageTabs
        enabledLanguages={['en', 'pt-BR']}
        activeLanguage="en"
        onLanguageChange={vi.fn()}
        variant="select"
      />
    );

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders rightElement (such as AutoTranslateButton)', () => {
    render(
      <LanguageTabs
        enabledLanguages={['en', 'pt-BR']}
        activeLanguage="en"
        onLanguageChange={vi.fn()}
        rightElement={<button>Auto-translate</button>}
      />
    );

    expect(screen.getByText('Auto-translate')).toBeInTheDocument();
  });

  it('calls onLanguageChange when a tab is selected', () => {
    const handleLanguageChange = vi.fn();
    render(
      <LanguageTabs
        enabledLanguages={['en', 'pt-BR']}
        activeLanguage="en"
        onLanguageChange={handleLanguageChange}
      />
    );

    const tab = screen.getByRole('tab', { name: /Portuguese/i });
    fireEvent.keyDown(tab, { key: 'Enter' });
    expect(handleLanguageChange).toHaveBeenCalledWith('pt-BR');
  });
});
