import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmotionalResponse from "../EmotionalResponse";
import { CerneBuilderQuestion } from "@/components/design/form-builder/types";

// Mock i18n translation
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        "form.emotional_response.question": "How do you feel about this experience?",
        "form.emotional_response.options.enthusiastic": "Enthusiastic",
        "form.emotional_response.options.confused": "Confused",
        "form.emotional_response.options.frustrated": "Frustrated",
        "form.emotional_response.options.engaged": "Engaged",
        "form.emotional_response.options.other": "Other",
        "form.emotional_response.other_placeholder": "Please describe your feeling...",
      };
      return translations[key] || fallback || key;
    },
  }),
}));

describe("EmotionalResponse", () => {
  it("renders default fallback question and options when customQuestion is not provided", () => {
    const handleFeelingChange = vi.fn();
    const handleOtherChange = vi.fn();

    render(
      <EmotionalResponse
        feeling=""
        otherFeeling=""
        onFeelingChange={handleFeelingChange}
        onOtherFeelingChange={handleOtherChange}
      />
    );

    expect(screen.getByText("How do you feel about this experience?")).toBeInTheDocument();
    expect(screen.getByText("Enthusiastic")).toBeInTheDocument();
    expect(screen.getByText("Confused")).toBeInTheDocument();
    expect(screen.getByText("Frustrated")).toBeInTheDocument();
    expect(screen.getByText("Engaged")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Please describe your feeling...")).not.toBeInTheDocument();

    // Verify option labels do not include emoji or icon SVGs
    expect(screen.getByText("Enthusiastic").closest("label")?.querySelector("svg")).toBeNull();
  });

  it("renders custom question prompt and custom options when provided", () => {
    const customQuestion: CerneBuilderQuestion = {
      id: "custom-emotion",
      type: "emotional-response",
      label: "What emotion best matches your story?",
      required: true,
      options: [
        { id: "hopeful", label: "Hopeful" },
        { id: "skeptical", label: "Skeptical" },
        { id: "other", label: "Something else" },
      ],
    };

    render(
      <EmotionalResponse
        feeling="hopeful"
        otherFeeling=""
        onFeelingChange={vi.fn()}
        onOtherFeelingChange={vi.fn()}
        customQuestion={customQuestion}
      />
    );

    expect(screen.getByText("What emotion best matches your story?")).toBeInTheDocument();
    expect(screen.getByText("Hopeful")).toBeInTheDocument();
    expect(screen.getByText("Skeptical")).toBeInTheDocument();
    expect(screen.getByText("Something else")).toBeInTheDocument();
  });

  it("translates question prompt and options when activeLang is provided", () => {
    const customQuestion: CerneBuilderQuestion = {
      id: "custom-emotion",
      type: "emotional-response",
      label: "What emotion best matches your story?",
      translations: {
        es: {
          label: "¿Qué emoción describe mejor tu historia?",
        },
      },
      required: true,
      options: [
        {
          id: "opt-1",
          label: "Hopeful",
          translations: { es: "Esperanzado" },
        },
        {
          id: "opt-2",
          label: "Skeptical",
          translations: { es: "Escéptico" },
        },
      ],
    };

    render(
      <EmotionalResponse
        feeling=""
        otherFeeling=""
        onFeelingChange={vi.fn()}
        onOtherFeelingChange={vi.fn()}
        customQuestion={customQuestion}
        activeLang="es"
      />
    );

    expect(screen.getByText("¿Qué emoción describe mejor tu historia?")).toBeInTheDocument();
    expect(screen.getByText("Esperanzado")).toBeInTheDocument();
    expect(screen.getByText("Escéptico")).toBeInTheDocument();
  });

  it("shows otherFeeling input when 'other' is selected and triggers change handler", () => {
    const handleOtherChange = vi.fn();

    render(
      <EmotionalResponse
        feeling="other"
        otherFeeling="Surprised"
        onFeelingChange={vi.fn()}
        onOtherFeelingChange={handleOtherChange}
      />
    );

    const input = screen.getByPlaceholderText("Please describe your feeling...") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("Surprised");

    fireEvent.change(input, { target: { value: "Amazed" } });
    expect(handleOtherChange).toHaveBeenCalledWith("Amazed");
  });
});
