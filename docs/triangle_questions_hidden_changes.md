# Hiding Triangle Questions: Documentation

This document records the exact changes made to temporarily hide "Triangle Questions" from the Cerne UI and force the platform to default to "Slider Questions".

If you ever wish to re-enable Triangle Questions, you will need to revert or modify the changes outlined below.

## 1. UI Phase Configuration (`src/data/phases/designPhase.tsx`)

We removed the step that asks users to choose between Sliders and Triangles, and hardcoded the design phase to only show the Slider editor.

**To bring Triangles back:**
- Add the `question-type` activity back into the `questions` step array:
  ```tsx
  {
    id: "question-type",
    title: "Choose Question Format",
    description: "Select between slider or triangle questions",
    component: <QuestionTypeSelector />,
    hideActivityContent: true
  }
  ```
- Change the `form-questions` activity component from `<SliderQuestionSuggestions />` back to `<ConditionalQuestionRenderer />`.

## 2. Defaulting Frontend State (`src/hooks/queries/useFormDataQuery.ts`)

Since we stopped saving a `questionType` for new forms, the backend returns `null`. We added fallback logic to automatically treat `null` as `'slider'` so the public forms and dashboard don't break.

**To bring Triangles back:**
- Revert the `questionType` assignment in `fetchProjectFormData` and `fetchPublicFormData` from:
  ```ts
  questionType: questionType || 'slider',
  // and
  questionType: cachedQuestionType || 'slider',
  ```
  Back to:
  ```ts
  questionType: questionType || null,
  // and
  questionType: cachedQuestionType,
  ```

## 3. Defaulting Public Form Service (`src/services/publicFormService.ts`)

Similar to the React Query hooks, we forced the public form data fetcher to default to sliders.

**To bring Triangles back:**
- In `getPublicForm`, revert the return statement from:
  ```ts
  questionType: questionType || 'slider',
  ```
  Back to:
  ```ts
  questionType: questionType || null,
  ```

## 4. Landing Page Copy (`src/components/landing/ToolkitSection.tsx`)

We updated the marketing copy to remove the mention of triangle questions.

**To bring Triangles back:**
- Change the description of the "Dynamic Survey Engine" feature back to include "triangle questions" instead of "participant questions."
