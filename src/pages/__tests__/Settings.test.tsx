import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Settings from "../Settings";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, LOCAL_ADMIN_USER } from "@/lib/localClient";
import { aiPromptService } from "@/services/aiPromptService";
import { toast } from "@/hooks/toast";

vi.mock("@/hooks/toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/ProjectContext", () => ({
  useProject: () => ({ activeProject: null, setActiveProject: vi.fn() }),
}));

vi.mock("@/lib/localClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/localClient")>();
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

vi.mock("@/services/aiPromptService", () => ({
  aiPromptService: {
    getPrompts: vi.fn(),
    updatePrompt: vi.fn(),
    createPrompt: vi.fn(),
  },
}));

describe("Settings Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      user: LOCAL_ADMIN_USER,
      loading: false,
      passwordRequired: true,
      unconfigured: false,
      serverUnavailable: false,
      unlock: vi.fn(),
      signOut: vi.fn(),
      isPublicRoute: () => false,
    });
    vi.mocked(aiPromptService.getPrompts).mockResolvedValue([
      {
        id: "prompt-1",
        prompt_key: "design_assistant_system",
        title: "Design Assistant - System Persona",
        category: "Design",
        description: "System persona prompt",
        content: "You are a helpful designer.",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        created_by: null,
        version: 1,
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads LLM config, saves updates, and runs test connection", async () => {
    const mockApiFetch = vi.mocked(apiFetch);
    mockApiFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            hasApiKey: false,
            maskedApiKey: "",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4o-mini",
            keySource: "none",
            publicInterviewerAiEnabled: false,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            hasApiKey: false,
            maskedApiKey: "",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4o-mini",
            keySource: "none",
            publicInterviewerAiEnabled: true,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, model: "llama3.2", latencyMs: 42 }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            hasApiKey: true,
            maskedApiKey: "sk-t••••1234",
            baseUrl: "http://localhost:11434/v1",
            model: "llama3.2",
            keySource: "database",
            publicInterviewerAiEnabled: true,
          }),
          { status: 200 }
        )
      );

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Base URL")).toHaveValue("https://api.openai.com/v1");
    });

    const publicAiToggle = screen.getByRole("switch", {
      name: /Enable AI follow-ups on public interviews/i,
    });
    expect(publicAiToggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(publicAiToggle);
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/settings/llm",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ publicInterviewerAiEnabled: true }),
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Ollama (Local)" }));
    expect(screen.getByLabelText("Base URL")).toHaveValue("http://localhost:11434/v1");
    expect(screen.getByLabelText("Model")).toHaveValue("llama3.2");

    fireEvent.click(screen.getByRole("button", { name: "Test Connection" }));
    await waitFor(() => {
      expect(screen.getByText(/Connected to llama3.2 in 42ms/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/settings/llm",
        expect.objectContaining({ method: "PUT" })
      );
    });

    // Clear Key shows error toast if server rejects
    mockApiFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Base URL is required" }), { status: 400 })
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear Key" }));
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to clear API key",
          variant: "destructive",
        })
      );
    });
  });

  it("loads, edits, and resets Design Assistant prompts and locks workspace", async () => {
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      user: LOCAL_ADMIN_USER,
      loading: false,
      passwordRequired: true,
      unconfigured: false,
      serverUnavailable: false,
      unlock: vi.fn(),
      signOut: signOutMock,
      isPublicRoute: () => false,
    });

    vi.mocked(apiFetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            hasApiKey: false,
            maskedApiKey: "",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4o-mini",
            keySource: "none",
            publicInterviewerAiEnabled: false,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, count: 15 }), { status: 200 }));

    vi.mocked(aiPromptService.updatePrompt).mockResolvedValue(true);

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Design Assistant Prompts")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Design Assistant Prompts" }));
    fireEvent.click(screen.getByRole("tab", { name: "Design Assistant Prompts" }));

    fireEvent.click(screen.getByText("About AI prompts"));
    expect(screen.getByText(/preserve placeholders/i)).toBeVisible();

    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveValue("Design Assistant - System Persona");
      expect(screen.getByText("Purpose")).toBeInTheDocument();
      expect(screen.getByText("System persona prompt")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Template Content/i), {
      target: { value: "Updated prompt body" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Prompt" }));
    await waitFor(() => {
      expect(aiPromptService.updatePrompt).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Updated prompt body" })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /Reset Defaults/i }));
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/settings/prompts/reset", { method: "POST" });
    });

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Workspace Security" }));
    fireEvent.click(screen.getByRole("tab", { name: "Workspace Security" }));
    fireEvent.click(await screen.findByRole("button", { name: /Lock Workspace/i }));
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});

