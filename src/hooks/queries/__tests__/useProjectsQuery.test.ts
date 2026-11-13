import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProjectsQuery } from "../useProjectsQuery";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LOCAL_ADMIN_USER } from "@/lib/localClient";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("useProjectsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads projects, story stats, and form identifiers without embedded joins", async () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      user: LOCAL_ADMIN_USER,
      loading: false,
      passwordRequired: false,
      unconfigured: false,
      unlock: vi.fn(),
      signOut: vi.fn(),
      isPublicRoute: () => false,
    });

    const projectRow = {
      id: "proj-1",
      name: "Sample Project",
      description: "Desc",
      is_template: false,
      created_at: "2026-11-11T00:00:00Z",
    };

    const mockFrom = vi.mocked(supabase.from);
    mockFrom.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [projectRow], error: null }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === "project_story_stats") {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [{ project_id: "proj-1", stories_count: 5, last_story_at: "2026-11-11T01:00:00Z" }],
                error: null,
              }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === "form_identifiers") {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [{ id: "fi-1", fi_project_id: "proj-1", start_date: null, end_date: null }],
                error: null,
              }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useProjectsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      expect.objectContaining({
        id: "proj-1",
        user_role: "owner",
        stories_count: 5,
        has_active_link: true,
      }),
    ]);
  });
});
