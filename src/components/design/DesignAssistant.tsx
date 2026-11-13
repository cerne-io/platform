import React, { useState, useEffect } from "react";
import { debugError } from "@/utils/debugLogger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, ChevronDown, ChevronUp, ChevronLeft } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import StoryQuestionSection from "./StoryQuestionSection";
import GeneralPromptSection from "./GeneralPromptSection";
import { useProject } from "@/contexts/ProjectContext";
import { useDesignAssistant } from "@/hooks/useDesignAssistant";

import { buildProjectContext } from "@/utils/project-context/contextBuilder";
import { fetchComprehensiveProjectContext } from "@/utils/project-context/dataFetcher";
import { AssistantMode } from "@/types/chatTypes";

interface DesignAssistantProps {
  mode?: AssistantMode;
  projectContext?: string;
  defaultOpen?: boolean;
  className?: string;
  fullHeight?: boolean;
  variant?: "default" | "floating";
}

const DesignAssistant: React.FC<DesignAssistantProps> = ({
  mode = "design",
  projectContext = "",
  defaultOpen = false,
  className,
  fullHeight = false,
  variant = "default"
}) => {
  const { activeProject } = useProject();
  const projectId = activeProject?.id || "";

  // Story Question mode is always expanded, general mode is collapsible in default variant
  // If defaultOpen is true, start expanded
  const [isOpen, setIsOpen] = useState(mode === "storyQuestion" || defaultOpen ? true : false);

  // For floating mode, we track expanded state separately
  const [isExpanded, setIsExpanded] = useState(false);


  // State for the project context
  const [localProjectContext, setLocalProjectContext] = useState("");

  // Counter to trigger project context refreshes
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleActivitySaved = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Prepare the project context
  useEffect(() => {
    const prepareContext = async () => {
      // If project context is already provided, use it
      if (projectContext) {
        setLocalProjectContext(projectContext);
        return;
      }

      // Otherwise build it from the active project
      if (activeProject) {
        try {
          // Fetch comprehensive context (activity responses)
          const activityResponses = await fetchComprehensiveProjectContext(activeProject.id);

          const builtContext = buildProjectContext({
            name: activeProject.name,
            description: activeProject.description || "",
            id: activeProject.id,
            activityResponses // Pass the fetched activity responses
          });

          setLocalProjectContext(builtContext);
        } catch (error) {
          debugError("Error building project context:", error);
          setLocalProjectContext(""); // Reset on error
        }
      }
    };

    void prepareContext();
  }, [projectContext, activeProject, refreshTrigger]);

  // When mode changes, update isOpen state
  useEffect(() => {
    if (mode === "storyQuestion") {
      setIsOpen(true);
    }
  }, [mode]);

  // For general mode, use the design assistant hook
  const { prompt, setPrompt, messages, loading, handleSubmit, handleSuggestNextStep, clearChat, guidedDesign } = useDesignAssistant({
    mode,
    projectContext: localProjectContext,
    onActivitySaved: handleActivitySaved
  });

  // Whether Guided Design is actively running (wider panel) — must come after useDesignAssistant
  const isGuidedDesignActive =
    guidedDesign.guidedDesignState === "asking" ||
    guidedDesign.guidedDesignState === "awaiting_confirmation" ||
    guidedDesign.guidedDesignState === "saving" ||
    guidedDesign.guidedDesignState === "loading_questions";

  // State for explanation bubble
  const [showExplainer, setShowExplainer] = useState(true);

  // Idle timer logic
  useEffect(() => {
    let idleTimeoutId: NodeJS.Timeout;
    let debounceTimeoutId: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimeoutId);
      // If chat is closed, start 5-minute timer to show explainer
      if (!isExpanded) {
        idleTimeoutId = setTimeout(() => {
          setShowExplainer(true);
        }, 5 * 60 * 1000); // 5 minutes idle
      }
    };

    const handleActivity = () => {
      // Debounce the reset to prevent excessive calls on mousemove
      clearTimeout(debounceTimeoutId);
      debounceTimeoutId = setTimeout(resetIdleTimer, 1000);
    };

    // Attach listeners to detect activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    // Initial timer start
    resetIdleTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearTimeout(idleTimeoutId);
      clearTimeout(debounceTimeoutId);
    };
  }, [isExpanded]);

  // Auto-hide explainer after it's shown
  useEffect(() => {
    let hideTimeoutId: NodeJS.Timeout;

    if (showExplainer) {
      // Pulse for a couple of seconds (e.g. 4s) then hide
      hideTimeoutId = setTimeout(() => {
        setShowExplainer(false);
      }, 4000);
    }

    return () => clearTimeout(hideTimeoutId);
  }, [showExplainer]);

  // Hide explainer when chat expands
  useEffect(() => {
    if (isExpanded) {
      setShowExplainer(false);
    }
  }, [isExpanded]);

  // Idle timer logic
  useEffect(() => {
    const handleTrigger = () => {
      setIsExpanded(true);
      setIsOpen(true);
      void guidedDesign.startGuidedDesign();
    };

    window.addEventListener('open-guided-assistant', handleTrigger);
    return () => window.removeEventListener('open-guided-assistant', handleTrigger);
  }, [guidedDesign]);

  if (variant === "floating") {
    return (
      <div className={`relative z-50 ${className || ""}`}>
        {/* Chat Window */}
        <div
          className={`
            absolute bottom-[calc(100%+16px)] left-0 z-50
            transition-all duration-300 ease-in-out origin-bottom-left
            ${isExpanded
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-95 translate-y-4 pointer-events-none h-0 overflow-hidden"
            }
          `}
        >
          <Card
            className="shadow-[0_20px_50px_-12px_rgba(93,63,211,0.3)] border border-[#5D3FD3]/20
              dark:border-white/10 dark:shadow-[0_0_40px_rgba(157,124,255,0.15)]
              flex flex-col bg-card dark:bg-[#161B22] overflow-hidden rounded-2xl
              transition-[width,height] duration-500 ease-in-out"
            style={{
              width: isGuidedDesignActive ? "680px" : "350px",
              height: isGuidedDesignActive ? "640px" : "500px",
            }}
          >

            <CardHeader className="bg-white/95 dark:bg-[#161B22]/95 border-b border-[#5D3FD3]/10 dark:border-white/10 p-4 flex flex-row items-center justify-between shrink-0 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center">
                <CardTitle className="flex items-center gap-2 text-[#5D3FD3] dark:text-[#9D7CFF] text-lg font-serif">
                  <Sparkles className="h-5 w-5 text-[#5D3FD3] dark:text-[#9D7CFF]" />
                  Design Assistant
                </CardTitle>
              </div>
            </CardHeader>

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
              <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
                <GeneralPromptSection
                  prompt={prompt}
                  setPrompt={setPrompt}
                  messages={messages}
                  loading={loading}
                  onSubmit={(e) => void handleSubmit(e)}
                  onClearChat={clearChat}
                  onSuggestNextStep={() => void handleSuggestNextStep()}
                  onStartGuidedDesign={() => void guidedDesign.startGuidedDesign()}
                  guidedDesignState={guidedDesign.guidedDesignState}
                  onConfirmNext={() => void guidedDesign.confirmNext()}
                  onStopSession={() => void guidedDesign.stopGuidedDesign()}
                  projectContext={localProjectContext}
                  fullHeight={true}
                  autoScrollEnabled={isExpanded}
                />
              </CardContent>
            </div>
          </Card>
        </div>

        {/* FAB Trigger & Explanation Bubble */}
        <div className="flex items-center justify-start px-2">
          <div className="relative w-max">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Close design assistant" : "Open design assistant"}
              title={isExpanded ? "Close design assistant" : "Open design assistant"}
              className={`
                h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50
                hover:scale-105 active:scale-95 bg-[#5D3FD3] hover:bg-[#4B32A8] text-white shadow-[#5D3FD3]/25
              `}
            >
              {isExpanded ? (
                <ChevronDown size={28} />
              ) : (
                <Sparkles size={24} className="animate-pulse-slow" />
              )}
            </button>

            {/* Explanation CTA Bubble */}
            <div
              className={`
                absolute left-full ml-3 top-0 h-full
                w-max max-w-[200px] z-40 cursor-pointer flex items-center gap-1
                transition-all duration-500 ease-in-out origin-left
                ${showExplainer ? "animate-soft-pulse" : ""}
                ${showExplainer && !isExpanded
                  ? "opacity-100 translate-x-0 scale-100"
                  : "opacity-0 -translate-x-4 scale-95 pointer-events-none"}
              `}
              onClick={() => setIsExpanded(true)}
            >
              <ChevronLeft size={20} className="text-[#5D3FD3] dark:text-[#9D7CFF] shrink-0" />

              <div className="relative z-10">
                <h4 className="text-[#5D3FD3] dark:text-[#9D7CFF] font-serif font-semibold text-xs flex items-center gap-1 leading-none">
                  <Sparkles size={10} />
                  Design Assistant
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Here to help structure your project</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`col-span-1 lg:col-span-3 shadow-md border border-[#5D3FD3]/10 dark:border-white/10 dark:shadow-[0_0_20px_rgba(157,124,255,0.1)] mb-8 bg-card dark:bg-[#161B22] ${fullHeight ? "h-full flex flex-col mb-0" : ""} ${className || ""}`}>
      <Collapsible
        open={isOpen}
        onOpenChange={mode === "storyQuestion" ? undefined : setIsOpen}
        className={fullHeight ? "h-full flex flex-col" : ""}
      >
        <CardHeader className="bg-slate-50/50 dark:bg-transparent border-b border-[#5D3FD3]/10 dark:border-white/10 p-6">
          {mode === "storyQuestion" ? (
            <>
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-[#5D3FD3] dark:text-[#9D7CFF] text-3xl font-serif">
                  <Sparkles className="h-5 w-5 text-[#5D3FD3] dark:text-[#9D7CFF] opacity-80" />
                  Story Questions
                </CardTitle>
              </div>
              <CardDescription>Define the question that will elicit stories from participants</CardDescription>
            </>
          ) : defaultOpen ? (
            // Static header for popup mode (no collapse trigger, no chevron)
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-[#5D3FD3] dark:text-[#9D7CFF] text-3xl font-serif">
                  <Sparkles className="h-5 w-5 text-[#5D3FD3] dark:text-[#9D7CFF] opacity-80" />
                  Design Assistant
                </CardTitle>
              </div>
              <CardDescription>Use AI to help design your story collection project</CardDescription>
            </div>
          ) : (
            <CollapsibleTrigger className="w-full flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-[#5D3FD3] dark:text-[#9D7CFF] text-3xl font-serif">
                    <Sparkles className="h-5 w-5 text-[#5D3FD3] dark:text-[#9D7CFF] opacity-80" />
                    Design Assistant
                  </CardTitle>
                </div>
                <CardDescription>Use AI to help design your story collection project</CardDescription>
              </div>
              {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </CollapsibleTrigger>
          )}
        </CardHeader>

        <CollapsibleContent {...(mode === "storyQuestion" ? { forceMount: true } : {})} className={fullHeight ? "flex-1 min-h-0 flex flex-col" : ""}>
          <CardContent className={`space-y-4 pt-4 bg-transparent rounded-b-md ${fullHeight ? "flex-1 flex flex-col min-h-0" : ""}`}>
            {mode === "storyQuestion" ? (
              <StoryQuestionSection
                projectId={projectId}
              />
            ) : (
              <GeneralPromptSection
                prompt={prompt}
                setPrompt={setPrompt}
                messages={messages}
                loading={loading}
                onSubmit={(e) => void handleSubmit(e)}
                onClearChat={clearChat}
                projectContext={localProjectContext} // Pass project context
                onStartGuidedDesign={() => void guidedDesign.startGuidedDesign()}
                guidedDesignState={guidedDesign.guidedDesignState}
                onConfirmNext={() => void guidedDesign.confirmNext()}
                onStopSession={() => void guidedDesign.stopGuidedDesign()}
                fullHeight={fullHeight}
                autoScrollEnabled={isOpen}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default DesignAssistant;
