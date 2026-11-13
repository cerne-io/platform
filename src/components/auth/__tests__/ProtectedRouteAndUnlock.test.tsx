import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { LOCAL_ADMIN_USER } from "@/lib/localClient";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("ProtectedRoute & UnlockWorkspaceCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderAtRoute(path: string) {
    window.history.pushState({}, "", path);
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/submit-story/:formId" element={<div>Public Form View</div>} />
          <Route path="/public-dashboard/:token" element={<div>Public Dashboard View</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/projects" element={<div>Projects Workspace</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  }

  it("renders UnlockWorkspaceCard when locked and submits password", async () => {
    const unlockMock = vi.fn().mockResolvedValue({
      error: new Error("Invalid workspace password"),
      data: null,
    });
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      user: null,
      loading: false,
      passwordRequired: true,
      unconfigured: false,
      unlock: unlockMock,
      signOut: vi.fn(),
      isPublicRoute: () => false,
    });

    renderAtRoute("/projects");
    expect(screen.getByRole("heading", { name: "Unlock Workspace" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Workspace password"), {
      target: { value: "wrong-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unlock Workspace" }));

    await waitFor(() => {
      expect(unlockMock).toHaveBeenCalledWith("wrong-pass");
      expect(screen.getByText("Invalid workspace password")).toBeInTheDocument();
    });
  });

  it("shows unconfigured warning in production when ADMIN_PASSWORD is omitted", () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      user: null,
      loading: false,
      passwordRequired: true,
      unconfigured: true,
      unlock: vi.fn(),
      signOut: vi.fn(),
      isPublicRoute: () => false,
    });

    renderAtRoute("/projects");
    expect(screen.getByText(/Production security lock active/i)).toBeInTheDocument();
    expect(screen.getByText(/ALLOW_UNAUTHENTICATED_ADMIN=true/i)).toBeInTheDocument();
  });

  it("shows unreachable server guidance and retries connection when serverUnavailable is true", () => {
    const refreshStatus = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      user: null,
      loading: false,
      passwordRequired: true,
      unconfigured: false,
      serverUnavailable: true,
      refreshStatus,
      unlock: vi.fn(),
      signOut: vi.fn(),
      isPublicRoute: () => false,
    });

    renderAtRoute("/projects");
    expect(screen.getByText("Backend Server Unreachable")).toBeInTheDocument();
    expect(screen.getByText(/npm run dev:server/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry Connection" }));
    expect(refreshStatus).toHaveBeenCalledTimes(1);
  });

  it("renders workspace routes when unlocked and allows public routes when locked", () => {
    vi.mocked(useAuth).mockReturnValue({
      session: { access_token: "c", token_type: "cookie", user: LOCAL_ADMIN_USER },
      user: LOCAL_ADMIN_USER,
      loading: false,
      passwordRequired: false,
      unconfigured: false,
      unlock: vi.fn(),
      signOut: vi.fn(),
      isPublicRoute: () => false,
    });

    renderAtRoute("/projects");
    expect(screen.getByText("Projects Workspace")).toBeInTheDocument();

    vi.mocked(useAuth).mockReturnValue({
      session: null,
      user: null,
      loading: false,
      passwordRequired: true,
      unconfigured: false,
      unlock: vi.fn(),
      signOut: vi.fn(),
      isPublicRoute: () => true,
    });
    renderAtRoute("/submit-story/demo-form");
    expect(screen.getByText("Public Form View")).toBeInTheDocument();
  });

  it("requires trailing slashes on public route prefixes so /interviewer/:projectId is protected", async () => {
    const { isPublicPathname } = await vi.importActual<typeof import("@/contexts/AuthContext")>(
      "@/contexts/AuthContext"
    );

    expect(isPublicPathname("/submit-story/demo-form")).toBe(true);
    expect(isPublicPathname("/interview/demo-form")).toBe(true);
    expect(isPublicPathname("/public-dashboard/token-123")).toBe(true);

    expect(isPublicPathname("/interviewer/project-123")).toBe(false);
    expect(isPublicPathname("/projects")).toBe(false);
    expect(isPublicPathname("/interview")).toBe(false);
  });
});

