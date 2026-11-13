import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InterviewerHeader from "../InterviewerHeader";
import InterviewerStartCard from "../InterviewerStartCard";
import InterviewerInputBar from "../InterviewerInputBar";
import InterviewerMessageList from "../InterviewerMessageList";

// Mock i18n translation
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

describe("Public Interviewer Sub-components", () => {
  describe("InterviewerHeader", () => {
    it("renders custom header and subheader", () => {
      render(
        <InterviewerHeader
          formHeader="Community Voices"
          formSubheader="Share what matters to you"
          effectiveLocale="en"
          enabledLanguages={["en"]}
          onLanguageChange={vi.fn()}
          messagesCount={0}
          onExport={vi.fn()}
          onReset={vi.fn()}
        />
      );

      expect(screen.getByText("Community Voices")).toBeInTheDocument();
      expect(screen.getByText("Share what matters to you")).toBeInTheDocument();
    });

    it("renders export and reset buttons when messagesCount > 0 and fires callbacks", () => {
      const handleExport = vi.fn();
      const handleReset = vi.fn();

      render(
        <InterviewerHeader
          formHeader="Community Voices"
          effectiveLocale="en"
          enabledLanguages={["en"]}
          onLanguageChange={vi.fn()}
          messagesCount={3}
          onExport={handleExport}
          onReset={handleReset}
        />
      );

      const exportBtn = screen.getByRole("button", { name: "Export" });
      const resetBtn = screen.getByRole("button", { name: "Reset" });

      expect(exportBtn).toBeInTheDocument();
      expect(resetBtn).toBeInTheDocument();

      fireEvent.click(exportBtn);
      expect(handleExport).toHaveBeenCalledTimes(1);

      fireEvent.click(resetBtn);
      expect(handleReset).toHaveBeenCalledTimes(1);
    });
  });

  describe("InterviewerStartCard", () => {
    it("renders unconfigured state when storyQuestion is empty", () => {
      render(
        <InterviewerStartCard
          storyQuestion=""
          isLoading={false}
          isThinking={false}
          onStartInterview={vi.fn()}
        />
      );

      expect(screen.getByText("This interview is not configured yet.")).toBeInTheDocument();
      expect(screen.getByText("Please contact the project owner.")).toBeInTheDocument();
    });

    it("renders prompt and calls onStartInterview on button click", () => {
      const handleStart = vi.fn();

      render(
        <InterviewerStartCard
          storyQuestion="Tell us about a time you overcame an obstacle."
          isLoading={false}
          isThinking={false}
          onStartInterview={handleStart}
        />
      );

      expect(screen.getByText("Ready to Share Your Story")).toBeInTheDocument();
      expect(screen.getByText("Tell us about a time you overcame an obstacle.")).toBeInTheDocument();

      const startBtn = screen.getByRole("button", { name: "Start Interview" });
      fireEvent.click(startBtn);
      expect(handleStart).toHaveBeenCalledTimes(1);
    });

    it("disables button and displays starting indicator when loading", () => {
      render(
        <InterviewerStartCard
          storyQuestion="Tell us about a time you overcame an obstacle."
          isLoading={true}
          isThinking={false}
          onStartInterview={vi.fn()}
        />
      );

      const startBtn = screen.getByRole("button");
      expect(startBtn).toBeDisabled();
      expect(screen.getByText("Starting...")).toBeInTheDocument();
    });
  });

  describe("InterviewerInputBar", () => {
    it("triggers onSendMessage when Send button is clicked or Enter is pressed", () => {
      const handleSend = vi.fn();
      const handleChange = vi.fn();

      const { rerender } = render(
        <InterviewerInputBar
          inputValue=""
          onInputChange={handleChange}
          onSendMessage={handleSend}
          disabled={false}
        />
      );

      const input = screen.getByPlaceholderText("Type your response here...");
      fireEvent.change(input, { target: { value: "My response" } });
      expect(handleChange).toHaveBeenCalledWith("My response");

      rerender(
        <InterviewerInputBar
          inputValue="My response"
          onInputChange={handleChange}
          onSendMessage={handleSend}
          disabled={false}
        />
      );

      const sendBtn = screen.getByRole("button");
      expect(sendBtn).not.toBeDisabled();
      fireEvent.click(sendBtn);
      expect(handleSend).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      expect(handleSend).toHaveBeenCalledTimes(2);
    });

    it("does not trigger onSendMessage on Shift+Enter", () => {
      const handleSend = vi.fn();

      render(
        <InterviewerInputBar
          inputValue="My response"
          onInputChange={vi.fn()}
          onSendMessage={handleSend}
          disabled={false}
        />
      );

      const input = screen.getByPlaceholderText("Type your response here...");
      fireEvent.keyDown(input, { key: "Enter", shiftKey: true, code: "Enter" });
      expect(handleSend).not.toHaveBeenCalled();
    });

    it("does not trigger onSendMessage while IME composition is active", () => {
      const handleSend = vi.fn();

      render(
        <InterviewerInputBar
          inputValue="にほん"
          onInputChange={vi.fn()}
          onSendMessage={handleSend}
          disabled={false}
        />
      );

      const input = screen.getByPlaceholderText("Type your response here...");
      fireEvent.keyDown(input, { key: "Enter", code: "Enter", isComposing: true });
      expect(handleSend).not.toHaveBeenCalled();
    });
  });

  describe("InterviewerMessageList", () => {
    it("disables past interactive cards once a newer message exists", () => {
      const ref = { current: null } as React.RefObject<HTMLDivElement>;
      render(
        <InterviewerMessageList
          messages={[
            {
              role: "assistant",
              content: "How did that feel?",
              timestamp: new Date(),
              messageType: "emotion_selection",
            },
            {
              role: "assistant",
              content: "Rate clarity",
              timestamp: new Date(),
              messageType: "slider",
              interactiveData: {
                questionId: 1,
                question: "Rate clarity",
                leftLabel: "Low",
                rightLabel: "High",
              },
            },
          ]}
          isLoading={false}
          isThinking={false}
          currentPhase="sliders"
          storyHasBeenSaved={false}
          saveError={null}
          isSaving={false}
          error={null}
          messagesEndRef={ref}
          onSliderSubmit={vi.fn()}
          onSliderSkip={vi.fn()}
          onTriangleSubmit={vi.fn()}
          onTriangleSkip={vi.fn()}
          onParticipantSubmit={vi.fn()}
          onParticipantSkip={vi.fn()}
          onEmotionSelect={vi.fn()}
          onRetrySave={vi.fn()}
          onClearInterview={vi.fn()}
        />
      );

      // Earlier emotion radio is disabled while current slider Skip button remains enabled
      expect(screen.getAllByRole("radio")[0]).toBeDisabled();
      expect(screen.getByRole("button", { name: /skip/i })).not.toBeDisabled();
    });
  });
});
