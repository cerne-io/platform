import React, { useEffect, useState } from "react";
import { KeyRound, CheckCircle2, AlertCircle, RotateCcw, Lock, Plus, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/localClient";
import { aiPromptService, type AIPrompt } from "@/services/aiPromptService";
import { toast } from "@/hooks/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

interface LlmSettingsResponse {
  hasApiKey: boolean;
  maskedApiKey: string;
  baseUrl: string;
  model: string;
  keySource: "database" | "env" | "none";
  publicInterviewerAiEnabled: boolean;
}

const PROVIDER_PRESETS = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
  { label: "Ollama (Local)", baseUrl: "http://localhost:11434/v1", model: "llama3.2" },
];

const Settings: React.FC = () => {
  const { passwordRequired, unconfigured, signOut } = useAuth();

  // LLM config state
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState("");
  const [keySource, setKeySource] = useState<"database" | "env" | "none">("none");
  const [publicInterviewerAiEnabled, setPublicInterviewerAiEnabled] = useState(false);
  const [savingPublicAi, setSavingPublicAi] = useState(false);
  const [loadingLlm, setLoadingLlm] = useState(true);
  const [savingLlm, setSavingLlm] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Prompts state
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [resettingPrompts, setResettingPrompts] = useState(false);
  const [showNewPrompt, setShowNewPrompt] = useState(false);
  const [newPromptKey, setNewPromptKey] = useState("");
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptCategory, setNewPromptCategory] = useState("Design");
  const [newPromptContent, setNewPromptContent] = useState("");

  const applyLlmSettings = (data: Partial<LlmSettingsResponse>) => {
    if (data.baseUrl !== undefined) setBaseUrl(data.baseUrl);
    if (data.model !== undefined) setModel(data.model);
    setHasApiKey(Boolean(data.hasApiKey));
    setMaskedApiKey(data.maskedApiKey || "");
    setKeySource(data.keySource || "none");
    if (data.publicInterviewerAiEnabled !== undefined) {
      setPublicInterviewerAiEnabled(Boolean(data.publicInterviewerAiEnabled));
    }
  };

  const loadPrompts = async () => {
    setLoadingPrompts(true);
    try {
      const list = await aiPromptService.getPrompts();
      setPrompts(list);
      setSelectedPrompt((prev) =>
        prev ? list.find((p) => p.id === prev.id) ?? list[0] ?? null : list[0] ?? null
      );
    } finally {
      setLoadingPrompts(false);
    }
  };

  useEffect(() => {
    const fetchInitialLlm = async () => {
      setLoadingLlm(true);
      try {
        const res = await apiFetch("/api/settings/llm");
        if (!res.ok) return;
        const data = (await res.json()) as LlmSettingsResponse;
        applyLlmSettings(data);
      } catch {
        toast({ title: "Failed to load LLM settings", variant: "destructive" });
      } finally {
        setLoadingLlm(false);
      }
    };

    void fetchInitialLlm();
    void loadPrompts();
  }, []);

  const handleSaveLlm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLlm(true);
    setTestResult(null);
    try {
      const res = await apiFetch("/api/settings/llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          model,
          ...(apiKeyInput.trim() ? { apiKey: apiKeyInput.trim() } : {}),
        }),
      });
      const json = (await res.json()) as Partial<LlmSettingsResponse> & { error?: string };
      if (!res.ok) {
        toast({
          title: "Failed to save settings",
          description: json.error || "Check your Base URL and model name.",
          variant: "destructive",
        });
        return;
      }
      applyLlmSettings(json);
      setApiKeyInput("");
      toast({ title: "LLM settings saved" });
    } catch {
      toast({
        title: "Failed to save settings",
        description: "Network error saving LLM settings.",
        variant: "destructive",
      });
    } finally {
      setSavingLlm(false);
    }
  };

  const handleClearKey = async () => {
    setSavingLlm(true);
    setTestResult(null);
    try {
      const res = await apiFetch("/api/settings/llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, model, clearApiKey: true }),
      });
      const json = (await res.json()) as Partial<LlmSettingsResponse> & { error?: string };
      if (!res.ok) {
        toast({
          title: "Failed to clear API key",
          description: json.error || "Check your Base URL and model name.",
          variant: "destructive",
        });
        return;
      }
      applyLlmSettings(json);
      setApiKeyInput("");
      toast({ title: "Saved API key cleared" });
    } catch {
      toast({
        title: "Failed to clear API key",
        description: "Network error clearing API key.",
        variant: "destructive",
      });
    } finally {
      setSavingLlm(false);
    }
  };

  const handleTogglePublicAi = async (enabled: boolean) => {
    const previous = publicInterviewerAiEnabled;
    setPublicInterviewerAiEnabled(enabled);
    setSavingPublicAi(true);
    try {
      const res = await apiFetch("/api/settings/llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicInterviewerAiEnabled: enabled }),
      });
      const json = (await res.json()) as Partial<LlmSettingsResponse> & { error?: string };
      if (!res.ok) {
        setPublicInterviewerAiEnabled(previous);
        toast({
          title: "Failed to update setting",
          description: json.error || "Could not update public interviewer AI setting.",
          variant: "destructive",
        });
        return;
      }
      setPublicInterviewerAiEnabled(Boolean(json.publicInterviewerAiEnabled));
      toast({
        title: enabled
          ? "Public interviewer AI follow-ups enabled"
          : "Public interviewer AI follow-ups disabled",
      });
    } catch {
      setPublicInterviewerAiEnabled(previous);
      toast({
        title: "Failed to update setting",
        description: "Network error updating public interviewer AI setting.",
        variant: "destructive",
      });
    } finally {
      setSavingPublicAi(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingLlm(true);
    setTestResult(null);
    try {
      const res = await apiFetch("/api/settings/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          model,
          ...(apiKeyInput.trim() ? { apiKey: apiKeyInput.trim() } : {}),
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        latencyMs?: number;
        model?: string;
        error?: string;
      };
      if (res.ok && json.ok) {
        setTestResult({
          ok: true,
          message: `Connected to ${json.model || model} in ${json.latencyMs ?? 0}ms.`,
        });
      } else {
        setTestResult({
          ok: false,
          message: json.error || "Connection test failed.",
        });
      }
    } catch {
      setTestResult({ ok: false, message: "Network error testing connection." });
    } finally {
      setTestingLlm(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!selectedPrompt) return;
    setSavingPrompt(true);
    try {
      await aiPromptService.updatePrompt(selectedPrompt);
      await loadPrompts();
      toast({ title: "Prompt updated", description: selectedPrompt.title });
    } catch {
      toast({ title: "Failed to save prompt", variant: "destructive" });
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptKey.trim() || !newPromptTitle.trim() || !newPromptContent.trim()) return;
    setSavingPrompt(true);
    try {
      const created = await aiPromptService.createPrompt({
        prompt_key: newPromptKey.trim(),
        title: newPromptTitle.trim(),
        category: newPromptCategory.trim() || "Design",
        description: null,
        content: newPromptContent,
      });
      setShowNewPrompt(false);
      setNewPromptKey("");
      setNewPromptTitle("");
      setNewPromptContent("");
      await loadPrompts();
      if (created) setSelectedPrompt(created);
      toast({ title: "Prompt created" });
    } catch {
      toast({ title: "Failed to create prompt", variant: "destructive" });
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleResetPrompts = async () => {
    setResettingPrompts(true);
    try {
      const res = await apiFetch("/api/settings/prompts/reset", { method: "POST" });
      if (!res.ok) {
        toast({ title: "Failed to reset prompts", variant: "destructive" });
        return;
      }
      await loadPrompts();
      toast({ title: "Default prompts restored" });
    } catch {
      toast({ title: "Failed to reset prompts", variant: "destructive" });
    } finally {
      setResettingPrompts(false);
    }
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspace Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your OpenAI-compatible AI provider, customize Design Assistant prompts, and manage workspace security.
          </p>
        </div>

        <Tabs defaultValue="llm" className="space-y-4">
          <TabsList>
            <TabsTrigger value="llm">LLM Provider</TabsTrigger>
            <TabsTrigger value="prompts">Design Assistant Prompts</TabsTrigger>
            <TabsTrigger value="security">Workspace Security</TabsTrigger>
          </TabsList>

          <TabsContent value="llm">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <KeyRound className="h-4 w-4" />
                      OpenAI-Compatible Provider
                    </CardTitle>
                    <CardDescription>
                      Use OpenAI, OpenRouter, Ollama, or any OpenAI-compatible `/chat/completions` endpoint.
                    </CardDescription>
                  </div>
                  <Badge variant={hasApiKey ? "default" : "secondary"}>
                    {hasApiKey
                      ? `Key saved (${keySource === "database" ? "workspace" : "env"}: ${maskedApiKey})`
                      : "No key configured"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLlm ? (
                  <p className="text-sm text-muted-foreground">Loading LLM settings...</p>
                ) : (
                  <form
                    onSubmit={(e) => {
                      void handleSaveLlm(e);
                    }}
                    className="space-y-4"
                  >
                    <div className="flex flex-wrap gap-2">
                      {PROVIDER_PRESETS.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBaseUrl(preset.baseUrl);
                            setModel(preset.model);
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="llm-base-url">Base URL</Label>
                        <Input
                          id="llm-base-url"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                          placeholder="https://api.openai.com/v1"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="llm-model">Model</Label>
                        <Input
                          id="llm-model"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="gpt-4o-mini"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="llm-api-key">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="llm-api-key"
                          type="password"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder={
                            hasApiKey
                              ? `Saved (${maskedApiKey}) — leave blank to keep existing key`
                              : "sk-... (optional for local Ollama)"
                          }
                          autoComplete="off"
                        />
                        {keySource === "database" && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              void handleClearKey();
                            }}
                            disabled={savingLlm}
                          >
                            Clear Key
                          </Button>
                        )}
                      </div>
                    </div>

                    {testResult && (
                      <Alert variant={testResult.ok ? "default" : "destructive"}>
                        {testResult.ok ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertDescription>{testResult.message}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={savingLlm}>
                        {savingLlm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Settings
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={testingLlm}
                        onClick={() => {
                          void handleTestConnection();
                        }}
                      >
                        {testingLlm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Test Connection
                      </Button>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-lg border p-4 mt-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="public-interviewer-ai-toggle" className="text-sm font-medium">
                          Enable AI follow-ups on public interviews
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Off by default so paid API keys used in Design Assistant stay private to your workspace. Enable to allow one AI follow-up probe per anonymous respondent on <code>/interview/:formId</code>.
                        </p>
                      </div>
                      <Switch
                        id="public-interviewer-ai-toggle"
                        checked={publicInterviewerAiEnabled}
                        disabled={savingPublicAi}
                        onCheckedChange={(checked) => {
                          void handleTogglePublicAi(checked);
                        }}
                      />
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prompts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="h-4 w-4" />
                      Design Assistant Prompts
                    </CardTitle>
                    <CardDescription>
                      Customize the system prompts stored in PGlite or restore defaults.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewPrompt((v) => !v)}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      New Prompt
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={resettingPrompts}
                      onClick={() => {
                        void handleResetPrompts();
                      }}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Reset Defaults
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <details className="group rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-foreground">
                    <span>About AI prompts</span>
                    <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
                    <span className="hidden text-xs text-muted-foreground group-open:inline">Hide</span>
                  </summary>
                  <div className="mt-3 space-y-2.5 text-muted-foreground leading-relaxed">
                    <p>
                      These prompts guide Cerne’s AI-assisted project design, question generation,
                      translation, and conversational story collection. They define the assistant’s
                      behavior, methodological guidance, and response formats.
                    </p>
                    <p>
                      You can edit them to adapt the language, tone, and guidance to your context.
                      Some prompts work together: one may define the assistant’s role, while others
                      supply project context, question-design principles, or task-specific instructions.
                    </p>
                    <p>
                      When editing, preserve placeholders such as <code>{"{projectName}"}</code> and{" "}
                      <code>{"{context}"}</code>, along with any required JSON keys and output-format
                      instructions. These connect the prompts to application features.
                    </p>
                    <p>
                      The defaults reflect Cerne’s approach to participatory narrative inquiry. Review
                      generated questions and guidance before using them with participants.
                    </p>
                  </div>
                </details>

                {showNewPrompt && (
                  <form
                    onSubmit={(e) => {
                      void handleCreatePrompt(e);
                    }}
                    className="rounded-lg border p-4 space-y-3 bg-muted/30"
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input
                        placeholder="prompt_key (e.g. custom_probe)"
                        value={newPromptKey}
                        onChange={(e) => setNewPromptKey(e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Display title"
                        value={newPromptTitle}
                        onChange={(e) => setNewPromptTitle(e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Category"
                        value={newPromptCategory}
                        onChange={(e) => setNewPromptCategory(e.target.value)}
                      />
                    </div>
                    <Textarea
                      rows={4}
                      placeholder="Prompt template content..."
                      value={newPromptContent}
                      onChange={(e) => setNewPromptContent(e.target.value)}
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={savingPrompt}>
                        Create Prompt
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowNewPrompt(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {loadingPrompts ? (
                  <p className="text-sm text-muted-foreground">Loading prompts...</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
                      {prompts.map((prompt) => (
                        <button
                          key={prompt.id}
                          type="button"
                          onClick={() => setSelectedPrompt(prompt)}
                          className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                            selectedPrompt?.id === prompt.id
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="truncate">{prompt.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {prompt.prompt_key}
                          </div>
                        </button>
                      ))}
                    </div>

                    {selectedPrompt && (
                      <div className="md:col-span-2 space-y-3">
                        {selectedPrompt.description && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">Purpose</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedPrompt.description}
                            </p>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label htmlFor="prompt-title">Title</Label>
                          <Input
                            id="prompt-title"
                            value={selectedPrompt.title}
                            onChange={(e) =>
                              setSelectedPrompt({ ...selectedPrompt, title: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="prompt-content">
                            Template Content ({selectedPrompt.prompt_key})
                          </Label>
                          <Textarea
                            id="prompt-content"
                            rows={11}
                            className="font-mono text-xs"
                            value={selectedPrompt.content}
                            onChange={(e) =>
                              setSelectedPrompt({ ...selectedPrompt, content: e.target.value })
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          disabled={savingPrompt}
                          onClick={() => {
                            void handleSavePrompt();
                          }}
                        >
                          {savingPrompt && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Prompt
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-4 w-4" />
                  Workspace Access Control
                </CardTitle>
                <CardDescription>
                  Password protection is controlled via the <code>ADMIN_PASSWORD</code> environment variable.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <div className="font-medium text-sm">
                      {passwordRequired
                        ? "Workspace password gate is active"
                        : "Passwordless local mode"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {unconfigured
                        ? "Production fail-closed mode is active without ADMIN_PASSWORD."
                        : passwordRequired
                          ? "Sessions are protected with an HttpOnly signed cookie."
                          : "Set ADMIN_PASSWORD in your environment to require a password."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void signOut();
                    }}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Lock Workspace
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default Settings;

