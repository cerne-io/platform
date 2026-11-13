import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormHandlers } from "../useFormHandlers";
import { CerneBuilderQuestion } from "@/components/design/form-builder/types";

// Mock toast
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("useFormHandlers emotion resolution", () => {
  const createBaseProps = (overrides = {}) => ({
    storyText: "My meaningful story",
    storyTitle: "A Title",
    feeling: "enthusiastic",
    otherFeeling: "",
    additionalComments: "",
    touchedSliders: new Set<number>(),
    sliderValues: {},
    sliderQuestions: [],
    participantQuestions: [],
    participantAnswers: {},
    triangleQuestions: [],
    triangleValues: {},
    touchedTriangles: new Set<number>(),
    isSubmitting: false,
    setIsSubmitting: vi.fn(),
    setStoryText: vi.fn(),
    setStoryTitle: vi.fn(),
    setFeeling: vi.fn(),
    setOtherFeeling: vi.fn(),
    setAdditionalComments: vi.fn(),
    setSliderValues: vi.fn(),
    setTouchedSliders: vi.fn(),
    setTriangleValues: vi.fn(),
    setTouchedTriangles: vi.fn(),
    setParticipantAnswers: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(true),
    ...overrides,
  });

  it("submits default feeling when no custom question is present", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const props = createBaseProps({
      feeling: "enthusiastic",
      onSubmit,
    });

    const { result } = renderHook(() => useFormHandlers(props));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>);
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        emotionalResponse: "enthusiastic",
      })
    );
  });

  it("submits otherFeeling when feeling is 'other'", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const props = createBaseProps({
      feeling: "other",
      otherFeeling: "Nostalgic and bittersweet",
      onSubmit,
    });

    const { result } = renderHook(() => useFormHandlers(props));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>);
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        emotionalResponse: "Nostalgic and bittersweet",
      })
    );
  });

  it("resolves UUID option ID to custom emotion label", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const customQuestion: CerneBuilderQuestion = {
      id: "emotion-q-1",
      type: "emotional-response",
      label: "How do you feel?",
      required: true,
      options: [
        { id: "uuid-1234-abcd", label: "Hopeful" },
        { id: "uuid-5678-efgh", label: "Skeptical" },
      ],
    };

    const props = createBaseProps({
      feeling: "uuid-1234-abcd",
      emotionalResponseQuestion: customQuestion,
      onSubmit,
    });

    const { result } = renderHook(() => useFormHandlers(props));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>);
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        emotionalResponse: "Hopeful",
      })
    );
  });

  it("resolves custom 'Other' option with UUID ID to otherFeeling", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const customQuestion: CerneBuilderQuestion = {
      id: "emotion-q-1",
      type: "emotional-response",
      label: "How do you feel?",
      required: true,
      options: [
        { id: "uuid-other-9999", label: "Other" },
      ],
    };

    const props = createBaseProps({
      feeling: "uuid-other-9999",
      otherFeeling: "Overwhelmed with joy",
      emotionalResponseQuestion: customQuestion,
      onSubmit,
    });

    const { result } = renderHook(() => useFormHandlers(props));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>);
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        emotionalResponse: "Overwhelmed with joy",
      })
    );
  });
});
