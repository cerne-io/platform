import React from "react";
import { ChatMessage, SliderMessageData, MultipleChoiceMessageData, TriangleMessageData } from "@/types/chatTypes";
import ChatSlider from "./ChatSlider";
import ChatMultipleChoice from "./ChatMultipleChoice";
import ChatTriangle from "./ChatTriangle";
import EmotionSelection from "@/components/interviewer/EmotionSelection";
import { Bot, User } from "lucide-react";
import { renderMarkdown } from "@/utils/markdownUtils";

interface InteractiveMessageProps {
  message: ChatMessage;
  onSliderSubmit: (questionId: number, value: number) => void;
  onSliderSkip: (questionId: number) => void;
  onTriangleSubmit: (questionId: number, x: number, y: number) => void;
  onTriangleSkip: (questionId: number) => void;
  onParticipantSubmit: (questionId: string, choiceId: string) => void;
  onParticipantSkip: (questionId: string) => void;
  onEmotionSelect?: (feeling: string, otherFeeling?: string) => void;
  disabled?: boolean;
}

const InteractiveMessage: React.FC<InteractiveMessageProps> = ({
  message,
  onSliderSubmit,
  onSliderSkip,
  onTriangleSubmit,
  onTriangleSkip,
  onParticipantSubmit,
  onParticipantSkip,
  onEmotionSelect,
  disabled = false
}) => {
  // Filter out internal system messages and markers
  const shouldHideMessage = (msg: ChatMessage): boolean => {
    // Hide system messages
    if (msg.role === 'system') return true;

    // Hide verbose slider submission messages
    if (msg.role === 'user' && msg.content.includes('[SLIDER_ANSWER:')) return true;

    // Hide verbose slider skip messages
    if (msg.role === 'user' && msg.content.includes('[SLIDER_SKIP:')) return true;

    // Hide verbose triangle submission messages
    if (msg.role === 'user' && msg.content.includes('[TRIANGLE_ANSWER:')) return true;

    // Hide verbose triangle skip messages
    if (msg.role === 'user' && msg.content.includes('[TRIANGLE_SKIP:')) return true;

    // Hide verbose participant question answer messages
    if (msg.role === 'user' && msg.content.match(/^For ".*", I selected:/)) return true;

    // Hide verbose participant question skip messages
    if (msg.role === 'user' && msg.content.includes('[PARTICIPANT_SKIP:')) return true;

    // Hide phase markers
    if (msg.content.startsWith('PHASE:')) return true;

    return false;
  };

  // Don't render hidden messages
  if (shouldHideMessage(message)) {
    return null;
  }

  if (message.messageType === 'emotion_selection') {
    return (
      <div className="flex items-start md:gap-3 w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-smooth">
        <div className="hidden md:flex h-7 w-7 text-primary/80 items-center justify-center shrink-0">
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1 w-full">
          <div className="text-sm mb-4 leading-relaxed [text-wrap:pretty]">{renderMarkdown(message.content)}</div>
          {onEmotionSelect && (
            <EmotionSelection
              onSelect={onEmotionSelect}
              disabled={disabled}
            />
          )}
        </div>
      </div>
    );
  }

  if (message.messageType === 'slider' && message.interactiveData && 'questionId' in message.interactiveData && typeof message.interactiveData.questionId === 'number') {
    const sliderData = message.interactiveData as SliderMessageData;
    return (
      <div className="flex items-start md:gap-3 w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-smooth">
        <div className="hidden md:flex h-7 w-7 text-primary/80 items-center justify-center shrink-0">
          <Bot className="h-4 w-4" />
        </div>

        <div className="flex-1 w-full">
          <ChatSlider
            questionId={sliderData.questionId}
            question={sliderData.question}
            leftLabel={sliderData.leftLabel}
            rightLabel={sliderData.rightLabel}
            theme={sliderData.theme}
            onSubmit={onSliderSubmit}
            onSkip={onSliderSkip}
            disabled={disabled}
          />
          {message.timestamp && (
            <span className="text-xs text-muted-foreground mt-1 block tabular-nums">
              {message.timestamp.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (message.messageType === 'triangle' && message.interactiveData && 'topLabel' in message.interactiveData) {
    const triangleData = message.interactiveData as TriangleMessageData;
    return (
      <div className="flex items-start md:gap-3 w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-smooth">
        <div className="hidden md:flex h-7 w-7 text-primary/80 items-center justify-center shrink-0">
          <Bot className="h-4 w-4" />
        </div>

        <div className="flex-1 w-full">
          <ChatTriangle
            questionId={triangleData.questionId}
            question={triangleData.question}
            topLabel={triangleData.topLabel}
            bottomLeftLabel={triangleData.bottomLeftLabel}
            bottomRightLabel={triangleData.bottomRightLabel}
            onSubmit={onTriangleSubmit}
            onSkip={onTriangleSkip}
            disabled={disabled}
          />
          {message.timestamp && (
            <span className="text-xs text-muted-foreground mt-1 block tabular-nums">
              {message.timestamp.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (message.messageType === 'multiple_choice' && message.interactiveData && 'choices' in message.interactiveData) {
    const multipleChoiceData = message.interactiveData as MultipleChoiceMessageData;
    return (
      <div className="flex items-start md:gap-3 w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-smooth">
        <div className="hidden md:flex h-7 w-7 text-primary/80 items-center justify-center shrink-0">
          <Bot className="h-4 w-4" />
        </div>

        <div className="flex-1 w-full">
          <ChatMultipleChoice
            questionId={multipleChoiceData.questionId}
            question={multipleChoiceData.question}
            choices={multipleChoiceData.choices}
            questionType={multipleChoiceData.questionType}
            onSubmit={onParticipantSubmit}
            onSkip={onParticipantSkip}
            disabled={disabled}
          />
          {message.timestamp && (
            <span className="text-xs text-muted-foreground mt-1 block tabular-nums">
              {message.timestamp.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Regular text message
  return (
    <div
      className={`flex items-end md:gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-smooth ${
        message.role === 'assistant' ? 'justify-start' : 'justify-end'
      }`}
    >
      {message.role === 'assistant' && (
        <div className="hidden md:flex h-7 w-7 text-primary/80 items-center justify-center shrink-0">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className="flex flex-col max-w-[85%] md:max-w-[70%]">
        <div
          className={`px-4 py-3 rounded-2xl shadow-xs ${
            message.isError
              ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-sm'
              : message.role === 'assistant'
              ? 'bg-card border border-border/80 text-foreground rounded-bl-sm'
              : 'bg-primary text-primary-foreground rounded-br-sm'
          }`}
        >
          <div className="text-sm leading-relaxed [text-wrap:pretty]">{renderMarkdown(message.content)}</div>
        </div>
        {message.timestamp && (
          <span
            className={`text-xs text-muted-foreground mt-1 tabular-nums ${
              message.role === 'assistant' ? 'text-left' : 'text-right'
            }`}
          >
            {message.timestamp.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </span>
        )}
      </div>

      {message.role === 'user' && (
        <div className="hidden md:flex h-7 w-7 text-muted-foreground items-center justify-center shrink-0">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};

export default InteractiveMessage;
