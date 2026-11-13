import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import type { LocalUser } from '@/lib/localClient';
import ProjectCard from '../ProjectCard';
import { Project } from '@/types/project';

const mockProject: Project = {
  id: 'proj-1',
  name: 'Narrative Discovery Project',
  description: 'Exploring customer sentiment and narrative patterns',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-10-20T00:00:00Z',
  is_active: false,
  is_template: false,
  is_event_mode: false,
  activated_at: null,
  user_id: 'user-1',
  user_role: 'owner',
  stories_count: 5,
};

describe('ProjectCard Interactive Behavior', () => {
  const onOpen = vi.fn();
  const onEdit = vi.fn();
  const setProjectToDelete = vi.fn();
  const handleProjectHover = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCard = (projectOverrides: Partial<Project> = {}) => {
    const project = { ...mockProject, ...projectOverrides };
    return render(
      <BrowserRouter>
        <ProjectCard
          project={project}
          user={{ id: 'user-1' } as unknown as LocalUser}
          canEditProject={() => true}
          canDeleteProject={() => true}
          handleProjectHover={handleProjectHover}
          onEdit={onEdit}
          onOpen={onOpen}
          setProjectToDelete={setProjectToDelete}
        />
      </BrowserRouter>
    );
  };

  it('makes the whole card clickable and triggers onOpen', () => {
    renderCard();

    const card = screen.getByRole('button', { name: /open project: narrative discovery project/i });
    expect(card).toBeInTheDocument();

    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'proj-1' }));
  });

  it('does NOT have an "Open Project" button', () => {
    renderCard();
    expect(screen.queryByRole('button', { name: /^open project$/i })).not.toBeInTheDocument();
  });

  it('handles keyboard navigation on card', () => {
    renderCard();

    const card = screen.getByRole('button', { name: /open project: narrative discovery project/i });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('displays unlimited entry count without SaaS cap limits and omits empty description', () => {
    renderCard({ is_active: true, description: '   ', lifetime_stories_collected: 210 });
    expect(screen.getByText('210 Entries')).toBeInTheDocument();
    expect(screen.queryByText(/collection paused/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no description provided/i)).not.toBeInTheDocument();
  });

  it('displays archived entry count when project is archived', () => {
    renderCard({ is_archived: true, lifetime_stories_collected: 1 });
    expect(screen.getByText('Archived (1 Entry)')).toBeInTheDocument();
  });
});
