import React from "react";
import { ChatMessage } from "@/types/chatTypes";
import { renderMarkdown, stripCitationTokens, normalizeInlineHeaders } from "@/utils/markdownUtils";
interface ChatMessageProps {
  message: ChatMessage;
  aiBubbleClassName?: string;
  aiTimestampClassName?: string;
  isSuperAdmin?: boolean;
}

const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
  aiBubbleClassName,
  isSuperAdmin = false,
}) => {
  const isUser = message.role === 'user';
  const isSuperAdminUser = isSuperAdmin;

  const displayContent = React.useMemo(() => {
    let text = message.content || "";
    if (!isUser && !isSuperAdminUser) {
      text = stripCitationTokens(text);
    } else {
      text = normalizeInlineHeaders(text);
    }
    return text;
  }, [message.content, isUser, isSuperAdminUser]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group mb-2`}>
      <div className="relative max-w-[85%]">
        <div
          className={`px-4 py-3 rounded-lg shadow-xs ${isUser
            ? 'bg-primary text-primary-foreground rounded-tr-xs font-normal'
            : message.isError
            ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-xs'
            : (aiBubbleClassName || 'bg-muted/70 text-foreground border border-border/60') + ' rounded-tl-xs'
            }`}
        >
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {renderMarkdown(displayContent)}
          </div>
        </div>

        {message.knowledgeReferences && message.knowledgeReferences.length > 0 && (
          <details className="mt-2 text-xs text-muted-foreground bg-muted/30 rounded-md p-3 border border-border/60 shadow-xs">
            <summary className="cursor-pointer font-medium hover:text-foreground select-none">
              Sources ({message.knowledgeReferences.length})
            </summary>
            <div className="mt-2 space-y-2 pt-2 border-t border-border/60">
              {message.knowledgeReferences.map((ref) => (
                <div key={ref.ref_id} className="space-y-0.5">
                  <div className="font-semibold text-foreground/90">
                    {isSuperAdminUser ? `[${ref.ref_id}] ` : ''}{ref.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {ref.source_title}{ref.source_locator ? ` • ${ref.source_locator}` : ''}
                  </div>
                  <div className="text-[11px] line-clamp-2 text-muted-foreground/80 italic">
                    "{ref.text}"
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {message.timestamp && (
          <div
            className={`
              absolute bottom-0 mb-1 text-[10px] text-muted-foreground/60 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap px-2
              ${isUser ? 'right-full' : 'left-full'}
            `}
          >
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageComponent;
