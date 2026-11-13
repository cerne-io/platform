import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SortableQuestionCard } from '../SortableQuestionCard';
import { CerneBuilderQuestion } from '../types';

describe('SortableQuestionCard', () => {
  const baseQuestion: CerneBuilderQuestion = {
    id: 'pq-1',
    type: 'participant-questions',
    label: 'What is your role?',
    required: false,
    includePreferNotToSay: true,
    options: [
      { id: 'opt-1', label: 'Engineer' },
      { id: 'opt-2', label: 'Designer' },
    ],
  };

  it('renders "Prefer not to say" in English when preferredLang is en', () => {
    render(
      <SortableQuestionCard
        question={baseQuestion}
        index={0}
        isActive={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        preferredLang="en"
      />
    );

    expect(screen.getByText('Prefer not to say')).toBeInTheDocument();
  });

  it('renders "Prefiro não dizer" when preferredLang is pt-BR', () => {
    render(
      <SortableQuestionCard
        question={baseQuestion}
        index={0}
        isActive={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        preferredLang="pt-BR"
      />
    );

    expect(screen.getByText('Prefiro não dizer')).toBeInTheDocument();
  });

  it('renders "Prefiero no decirlo" when preferredLang is es', () => {
    render(
      <SortableQuestionCard
        question={baseQuestion}
        index={0}
        isActive={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        preferredLang="es"
      />
    );

    expect(screen.getByText('Prefiero no decirlo')).toBeInTheDocument();
  });

  it('renders "Keine Angabe" when preferredLang is de', () => {
    render(
      <SortableQuestionCard
        question={baseQuestion}
        index={0}
        isActive={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        preferredLang="de"
      />
    );

    expect(screen.getByText('Keine Angabe')).toBeInTheDocument();
  });
});

