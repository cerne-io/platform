import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StoryCard from '../StoryCard';
import { useProject } from '@/contexts/ProjectContext';
import { Story } from '@/types/story';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
  }),
}));

vi.mock('@/hooks/toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const mockStory: Story = {
  id: 42,
  title: 'Clickable Story Card',
  text: 'Full narrative text content for verification',
  feeling: 'Delighted',
  feelingSentiment: 'positive',
  date: '2026-10-27',
  isPublic: false,
};

describe('StoryCard Clickable Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProject).mockReturnValue({
      activeProject: { id: 'p1', name: 'Project 1', is_template: false },
      currentUserProjectRole: 'owner',
    } as unknown as ReturnType<typeof useProject>);
  });

  it('makes the card interactive with role="button" and opens dialog on card click', () => {
    renderWithQueryClient(<StoryCard story={mockStory} view="grid" />);

    const cardButton = screen.getByRole('button', { name: /view story: clickable story card/i });
    expect(cardButton).toBeInTheDocument();

    // Clicking the card triggers URL update with storyId and opens dialog
    fireEvent.click(cardButton);
    expect(window.location.search).toContain('storyId=42');

    // Dialog header content should be rendered
    expect(screen.getByRole('heading', { level: 2, name: /clickable story card/i })).toBeInTheDocument();
  });

  it('opens dialog on keyboard Enter or Space on the card', () => {
    renderWithQueryClient(<StoryCard story={mockStory} view="grid" />);

    const cardButton = screen.getByRole('button', { name: /view story: clickable story card/i });
    fireEvent.keyDown(cardButton, { key: 'Enter' });

    expect(window.location.search).toContain('storyId=42');
  });

  it('clicking save button triggers toggleSave without bubbling to card click or reopening dialog anew', () => {
    const onToggleSave = vi.fn();
    renderWithQueryClient(<StoryCard story={mockStory} view="grid" onToggleSave={onToggleSave} />);

    const saveButton = screen.getByRole('button', { name: /save story/i });
    fireEvent.click(saveButton);

    expect(onToggleSave).toHaveBeenCalledTimes(1);
  });

  it('pressing Enter on inner action buttons does not trigger card dialog', () => {
    window.history.pushState({}, '', '/explore');
    renderWithQueryClient(<StoryCard story={mockStory} view="grid" />);

    const saveButton = screen.getByRole('button', { name: /save story/i });
    fireEvent.keyDown(saveButton, { key: 'Enter' });

    expect(window.location.search).not.toContain('storyId=42');
  });
});
