import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatMultipleChoice from '../ChatMultipleChoice';

describe('ChatMultipleChoice', () => {
  const choices = [
    { id: 'opt1', label: 'Option 1' },
    { id: 'opt2', label: 'Option 2' },
    { id: 'opt3', label: 'Option 3' },
  ];

  it('renders radio group for multiple-choice and submits single choice id', () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();

    render(
      <ChatMultipleChoice
        questionId="q1"
        question="What is your role?"
        choices={choices}
        questionType="multiple-choice"
        onSubmit={onSubmit}
        onSkip={onSkip}
      />
    );

    expect(screen.getByText('What is your role?')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);

    // Pick first option
    fireEvent.click(screen.getByText('Option 1'));

    // Submit
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith('q1', 'opt1');
  });

  it('renders checkboxes when questionType is "checkboxes" and submits JSON array of choice ids', () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();

    render(
      <ChatMultipleChoice
        questionId="q2"
        question="Select all that apply:"
        choices={choices}
        questionType="checkboxes"
        onSubmit={onSubmit}
        onSkip={onSkip}
      />
    );

    expect(screen.getByText('Select all that apply:')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    expect(submitBtn).toBeDisabled();

    // Select Option 1 and Option 3
    fireEvent.click(screen.getByText('Option 1'));
    expect(submitBtn).toBeEnabled();

    // Verify direct click on checkbox button works and toggles properly
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[2]); // Option 3
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith('q2', JSON.stringify(['opt1', 'opt3']));
  });

  it('allows skipping a checkbox question', () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();

    render(
      <ChatMultipleChoice
        questionId="q3"
        question="Select all that apply:"
        choices={choices}
        questionType="checkboxes"
        onSubmit={onSubmit}
        onSkip={onSkip}
      />
    );

    const skipBtn = screen.getByRole('button', { name: /skip/i });
    fireEvent.click(skipBtn);

    expect(onSkip).toHaveBeenCalledWith('q3');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
