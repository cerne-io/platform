
import React, { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import type { ChatMessage } from "@/types/chatTypes";
import type { GuidedDesignState } from "@/hooks/useGuidedDesign";
import ChatMessageComponent from "@/components/chat/ChatMessage";

interface GeneralPromptSectionProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  messages: ChatMessage[];
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClearChat?: () => void;
  onSuggestNextStep?: () => void;
  onStartGuidedDesign?: () => void;
  guidedDesignState?: GuidedDesignState;
  onConfirmNext?: () => void;
  onStopSession?: () => void;
  fullHeight?: boolean;
  projectContext?: string;
  autoScrollEnabled?: boolean;
}

const GeneralPromptSection: React.FC<GeneralPromptSectionProps> = ({
  prompt,
  setPrompt,
  messages,
  loading,
  onSubmit,
  onSuggestNextStep,
  onStartGuidedDesign,
  guidedDesignState,
  onConfirmNext,
  onStopSession,
  fullHeight = false,
  autoScrollEnabled = true
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const isGuidedDesignActive = guidedDesignState && guidedDesignState !== 'idle' && guidedDesignState !== 'complete' && guidedDesignState !== 'paused';

  // Auto-scroll logic
  useEffect(() => {
    if (!autoScrollEnabled) return;
    if (messages.length === 0) return;

    const scrollToBottom = () => {
      const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      }
    };
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages.length, loading, autoScrollEnabled]);

  return (
    <div className={`space-y-4 relative ${fullHeight ? "h-full flex flex-col space-y-0 gap-4" : ""}`}>
      <div className={`flex flex-col h-full rounded-md relative ${fullHeight ? "flex-1 min-h-0" : ""}`}>
        <ScrollArea className={`${fullHeight ? "flex-1" : "h-[500px]"} w-full`} ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <div className="mb-4 rounded-full bg-slate-50 p-4 dark:bg-slate-900/50">
                  <Sparkles className="h-6 w-6 text-[#5D3FD3] dark:text-[#9D7CFF] opacity-50" />
                </div>
                <p>Start a conversation with the Design Assistant</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} ref={index === messages.length - 1 ? lastMessageRef : null}>
                  <ChatMessageComponent
                    message={message}
                    aiBubbleClassName="bg-[#5D3FD3]/10 text-[#5D3FD3] dark:text-[#9D7CFF] dark:bg-[#9D7CFF]/10"
                    aiTimestampClassName="text-slate-400"
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-slate-100 dark:border-white/10 p-4 bg-white dark:bg-transparent/5 relative space-y-3">
          {/* Toolbar buttons */}
          <div className="flex justify-start gap-2 flex-wrap items-center">
            {/* Hide "Suggest next step" while Guided Design is active */}
            {onSuggestNextStep && !isGuidedDesignActive && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full shadow-sm bg-background hover:bg-muted text-xs font-medium text-[#5D3FD3] dark:text-[#9D7CFF] border-[#5D3FD3]/20 dark:border-[#9D7CFF]/20"
                onClick={(e) => {
                  e.preventDefault();
                  if (!loading) onSuggestNextStep();
                }}
                disabled={loading}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Suggest next step
              </Button>
            )}

            {onStartGuidedDesign && (
              <button
                id="start-guided-design-btn"
                type="button"
                disabled={loading}
                onClick={(e) => {
                  e.preventDefault();
                  if (loading) return;
                  if (isGuidedDesignActive) {
                    onStopSession?.();
                  } else {
                    onStartGuidedDesign();
                  }
                }}
                className={`
                  group relative h-8 rounded-full shadow-sm text-xs font-medium px-3
                  flex items-center gap-1.5 border transition-all duration-200 overflow-hidden
                  ${isGuidedDesignActive
                    ? 'border-[#5D3FD3]/40 bg-[#5D3FD3]/8 text-[#5D3FD3] dark:text-[#9D7CFF] hover:border-red-400/50 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400'
                    : 'bg-background border-[#5D3FD3]/20 dark:border-[#9D7CFF]/20 text-[#5D3FD3] dark:text-[#9D7CFF] hover:bg-muted'
                  }
                `}
              >
                {isGuidedDesignActive ? (
                  <>
                    {/* Default state */}
                    <span className="flex items-center gap-1.5 group-hover:opacity-0 group-hover:scale-95 transition-all duration-150">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5D3FD3] dark:bg-[#9D7CFF] opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5D3FD3] dark:bg-[#9D7CFF]" />
                      </span>
                      Guided Design in progress…
                    </span>
                    {/* Hover state */}
                    <span className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 scale-105 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150">
                      <XCircle className="w-3.5 h-3.5" />
                      Pause design
                    </span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3.5 h-3.5" />
                    {guidedDesignState === 'paused' ? "Resume design" : "Fill in with chat"}
                  </>
                )}
              </button>
            )}

            {/* "Proceed to next" — inline, only when awaiting confirmation */}
            {guidedDesignState === 'awaiting_confirmation' && (
              <Button
                size="sm"
                id="confirm-next-btn"
                className="h-8 rounded-full bg-[#5D3FD3] hover:bg-[#4B32A8] text-white text-xs"
                onClick={onConfirmNext}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Save and proceed to next
              </Button>
            )}
          </div>

          <form onSubmit={onSubmit} className="relative">
            <Textarea
              placeholder={'Talk to the design assistant...'}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (prompt.trim() && !loading && guidedDesignState !== 'saving') {
                    onSubmit(e);
                  }
                }
              }}
              className="w-full min-h-0 h-auto resize-none border-0 shadow-none focus-visible:ring-0 ring-0 focus:ring-0 pl-0 pr-12 py-3 dark:bg-transparent dark:text-white dark:placeholder:text-slate-500 max-h-[150px] overflow-y-auto"
              disabled={loading || guidedDesignState === 'saving' || guidedDesignState === 'loading_questions'}
              rows={1}
            />
            <div className="absolute bottom-2 right-0 flex items-center gap-1 pr-2">
              <Button
                type="submit"
                disabled={loading || !prompt.trim() || guidedDesignState === 'saving'}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-[#5D3FD3] hover:text-[#4B32A8] hover:bg-transparent dark:text-[#9D7CFF] dark:hover:text-[#9D7CFF]/90 dark:hover:bg-transparent transition-all"
                aria-label="Send message"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M8 4l10 8-10 8V4z" />
                  </svg>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GeneralPromptSection;
