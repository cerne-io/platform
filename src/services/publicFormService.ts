import { PublicFormData } from "./publicForm/types";
import { debugError, debugLog } from "@/utils/debugLogger";
import { supabase } from "@/integrations/supabase/client";
import { extractStoryQuestion, extractTriangleQuestions, extractParticipantQuestions, extractIncludePreferNotToSay } from "./publicForm/utils";
import { Json } from "@/integrations/supabase/types";
import { TriangleQuestion } from "./types/designTypes";
import type { QuestionType } from "./formConfig/questionTypeService";
import type { ProjectLanguages } from "@/constants/languages";

// Shape of a row returned by get_public_form_config RPC
export interface ActivityResponseRow {
  id: string;
  ar_project_id: string;
  ar_phase_id: string;
  ar_step_id: string;
  ar_activity_id: string;
  ar_response: Json;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches all public form configuration rows for a given form_id via the
 * get_public_form_config SECURITY DEFINER RPC.
 *
 * This function is the single choke-point for public (anon) reads of
 * activity_responses. The RPC validates the form_id against form_identifiers
 * and returns only rows scoped to the associated project.
 *
 * @param formId - The form identifier from the URL (e.g. /submit-story/:formId)
 */
const fetchPublicFormConfigRows = async (formId: string): Promise<ActivityResponseRow[]> => {
  const { data, error } = await supabase.rpc("get_public_form_config", {
    p_form_id: formId,
  });

  if (error) {
    debugError("[publicFormService] get_public_form_config RPC error:", error);
    return [];
  }

  return (data as ActivityResponseRow[]) || [];
};

/**
 * Derives PublicFormData from a set of activity_response rows returned by
 * get_public_form_config. Applies the same precedence / fallback logic that the
 * individual per-entity services previously handled.
 */
export const parseFormConfigRows = async (
  rows: ActivityResponseRow[],
  _projectId: string
): Promise<PublicFormData | null> => {
  const { safeParseStoryQuestion } = await import("@/utils/formLocalization");

  // Helper: find the most recent row for a given activity_id
  const latestRow = (activityId: string): ActivityResponseRow | undefined =>
    rows
      .filter((r) => r.ar_activity_id === activityId)
      .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0];

  // ── Story question ────────────────────────────────────────────────────────
  const storyRow =
    latestRow("story-question") ?? rows.find((r) => r.ar_activity_id === "story-question");
  const rawStoryQuestion = storyRow?.ar_response
    ? extractStoryQuestion(storyRow.ar_response)
    : null;
  const storyQuestion = rawStoryQuestion ? safeParseStoryQuestion(rawStoryQuestion) : "";

  // ── Slider questions ──────────────────────────────────────────────────────
  // Precedence: collection/public-form/slider-questions → collection/questions/slider-questions
  const { extractSliderQuestions: extract } = await import("./publicForm/utils");
  const sliderRows = rows.filter((r) => r.ar_activity_id === "slider-questions");
  const sliderRowPublicForm = sliderRows
    .filter((r) => r.ar_phase_id === "collection" && r.ar_step_id === "public-form")
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0];
  const sliderRowCanonical = sliderRows
    .filter((r) => r.ar_phase_id === "collection" && r.ar_step_id === "questions")
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0];

  const sliderQuestions =
    (sliderRowPublicForm && extract(sliderRowPublicForm.ar_response)) ||
    (sliderRowCanonical && extract(sliderRowCanonical.ar_response)) ||
    [];

  // ── Triangle questions ────────────────────────────────────────────────────
  const triangleRows = rows.filter((r) => r.ar_activity_id === "triangle-questions");
  const triangleRowPublicForm = triangleRows
    .filter((r) => r.ar_phase_id === "collection" && r.ar_step_id === "public-form")
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0];
  const triangleRowCanonical = triangleRows
    .filter((r) => r.ar_phase_id === "collection" && r.ar_step_id === "questions")
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0];

  const rawTriangleQuestions =
    (triangleRowPublicForm && extractTriangleQuestions(triangleRowPublicForm.ar_response)) ||
    (triangleRowCanonical && extractTriangleQuestions(triangleRowCanonical.ar_response)) ||
    [];
  // Patch legacy defaultY
  const triangleQuestions: TriangleQuestion[] = rawTriangleQuestions.map((q: TriangleQuestion) =>
    q.defaultX === 50 && q.defaultY === 50 ? { ...q, defaultY: 66.67 } : q
  );

  // ── Participant questions ─────────────────────────────────────────────────
  const participantRows = rows.filter((r) => r.ar_activity_id === "participant-questions");
  const participantRow = participantRows
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0];
  const participantQuestions = participantRow
    ? (extractParticipantQuestions(participantRow.ar_response) ?? [])
    : [];
  const includePreferNotToSay = participantRow
    ? (extractIncludePreferNotToSay(participantRow.ar_response) ?? true)
    : true;

  // ── Question type & languages ─────────────────────────────────────────────
  const questionTypeRowCanonical = rows.find(
    (r) => r.ar_phase_id === "design" && r.ar_step_id === "questions" && r.ar_activity_id === "question-type"
  );
  const questionTypeRowPublic = rows.find(
    (r) => r.ar_phase_id === "collection" && r.ar_step_id === "public-form" && r.ar_activity_id === "question-type"
  );
  const questionType =
    (questionTypeRowCanonical?.ar_response as { questionType?: QuestionType })?.questionType ||
    (questionTypeRowPublic?.ar_response as { questionType?: QuestionType })?.questionType ||
    "slider";

  const languagesRow = rows.find(
    (r) => r.ar_phase_id === "build" && r.ar_step_id === "form-appearance" && r.ar_activity_id === "form-languages"
  );
  const languages =
    languagesRow?.ar_response &&
    typeof languagesRow.ar_response === "object" &&
    Array.isArray((languagesRow.ar_response as Record<string, unknown>).enabledLanguages)
      ? (languagesRow.ar_response as unknown as ProjectLanguages)
      : undefined;

  const builderRow = rows.find((r) => r.ar_activity_id === "form-builder-questions");
  const rawBuilder = builderRow?.ar_response;
  const formBuilderQuestions = Array.isArray(rawBuilder)
    ? (rawBuilder as unknown as import("@/components/design/form-builder/types").CerneBuilderQuestion[])
    : Array.isArray((rawBuilder as Record<string, unknown>)?.questions)
    ? ((rawBuilder as Record<string, unknown>).questions as unknown as import("@/components/design/form-builder/types").CerneBuilderQuestion[])
    : Array.isArray((rawBuilder as Record<string, unknown>)?.formBuilderQuestions)
    ? ((rawBuilder as Record<string, unknown>).formBuilderQuestions as unknown as import("@/components/design/form-builder/types").CerneBuilderQuestion[])
    : undefined;
  const emotionalResponseQuestion = formBuilderQuestions?.find(
    (q) => q.type === "emotional-response"
  ) || null;

  const appearanceRow = rows
    .filter((r) => r.ar_step_id === "form-appearance" && r.ar_activity_id === "form-appearance-editor")
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0];
  const appearanceObj =
    appearanceRow?.ar_response && typeof appearanceRow.ar_response === "object"
      ? (appearanceRow.ar_response as Record<string, unknown>)
      : undefined;
  const headerText = appearanceObj?.headerText as string | Record<string, string> | undefined;
  const subheaderText = appearanceObj?.subheaderText as string | Record<string, string> | undefined;

  debugLog("[publicFormService] parseFormConfigRows summary:", {
    rowCount: rows.length,
    hasStoryQuestion: !!storyQuestion,
    sliderCount: sliderQuestions.length,
    triangleCount: triangleQuestions.length,
    participantCount: participantQuestions.length,
    hasEmotionalResponse: !!emotionalResponseQuestion,
    questionType,
  });

  return {
    storyQuestion: typeof storyQuestion === "string" ? storyQuestion : "",
    sliderQuestions: sliderQuestions || [],
    participantQuestions: participantQuestions || [],
    triangleQuestions: triangleQuestions || [],
    questionType: questionType || "slider",
    includePreferNotToSay,
    languages: languages || undefined,
    formBuilderQuestions,
    emotionalResponseQuestion,
    headerText,
    subheaderText,
  };
};

/**
 * Gets the complete form configuration for a public form.
 *
 * When a `formId` is provided (normal public form path), fetches via the
 * SECURITY DEFINER RPC `get_public_form_config` which scopes reads to only the
 * project associated with that form_id.
 *
 * When no `formId` is available (e.g. authenticated owner preview path), falls
 * back to the individual per-entity services that use normal RLS (project owner
 * policies will grant access).
 *
 * @param projectId - Project ID (always required)
 * @param formId    - Form identifier from the URL (required for public/anon access)
 */
export const getPublicForm = async (
  projectId: string,
  formId?: string | null
): Promise<PublicFormData | null> => {
  try {
    // ── Path 1: Public/anon — use the scoped RPC ───────────────────────────
    if (formId) {
      debugLog("[publicFormService] Fetching via get_public_form_config RPC, formId:", formId);
      const rows = await fetchPublicFormConfigRows(formId);

      if (rows.length > 0) {
        return await parseFormConfigRows(rows, projectId);
      }

      // RPC returned 0 rows — form_id may be expired or invalid.
      // Return a safe empty state rather than falling through to direct table
      // queries (which would bypass the scoping guarantee).
      debugLog("[publicFormService] RPC returned 0 rows for formId:", formId);
      return null;
    }

    // ── Path 2: Authenticated / no formId — use per-entity services ────────
    // These services rely on normal authenticated RLS (project owner grants).
    debugLog("[publicFormService] No formId provided, using per-entity services for projectId:", projectId);

    const { getStoryQuestion } = await import("./publicForm/storyQuestionService");
    const { getSliderQuestions } = await import("./publicForm/sliderQuestionsService");
    const { getParticipantQuestions } = await import("./publicForm/participantQuestionsService");
    const { getTriangleQuestions } = await import("./publicForm/triangleQuestionsService");
    const { getQuestionType } = await import("./formConfig/questionTypeService");
    const { getProjectLanguages } = await import("./formLanguageService");

    const [questionType, languages] = await Promise.all([
      getQuestionType(projectId),
      getProjectLanguages(projectId),
    ]);

    const [storyQuestion, participantQuestionsData] = await Promise.all([
      getStoryQuestion(projectId),
      getParticipantQuestions(projectId),
    ]);

    const participantQuestions = participantQuestionsData?.questions || [];
    const includePreferNotToSay = participantQuestionsData?.includePreferNotToSay ?? true;

    const sliderQuestions = await getSliderQuestions(projectId);
    const triangleQuestions = await getTriangleQuestions(projectId);

    // Fetch form builder questions for custom emotional-response options
    const { supabase: authenticatedClient } = await import('@/integrations/supabase/client');
    const { data: builderRow } = await authenticatedClient
      .from("activity_responses")
      .select("ar_response")
      .eq("ar_project_id", projectId)
      .eq("ar_activity_id", "form-builder-questions")
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1);

    const rawBuilder = builderRow?.[0]?.ar_response;
    const formBuilderQuestions = Array.isArray(rawBuilder)
      ? (rawBuilder as unknown as import("@/components/design/form-builder/types").CerneBuilderQuestion[])
      : Array.isArray((rawBuilder as Record<string, unknown>)?.questions)
      ? ((rawBuilder as Record<string, unknown>).questions as unknown as import("@/components/design/form-builder/types").CerneBuilderQuestion[])
      : undefined;
    const emotionalResponseQuestion = formBuilderQuestions?.find(
      (q) => q.type === "emotional-response"
    ) || null;

    return {
      storyQuestion: storyQuestion || "",
      sliderQuestions: sliderQuestions || [],
      participantQuestions: participantQuestions || [],
      triangleQuestions: triangleQuestions || [],
      questionType: questionType || "slider",
      includePreferNotToSay,
      languages: languages || undefined,
      formBuilderQuestions,
      emotionalResponseQuestion,
    };
  } catch (error) {
    debugError("[publicFormService] Error getting public form:", error);
    return null;
  }
};

/**
 * Saves a public form (authenticated project-owner path only).
 */
export const savePublicForm = async (projectId: string, formData: PublicFormData): Promise<boolean> => {
  try {
    const { saveStoryQuestion, getStoryQuestion } = await import("./publicForm/storyQuestionService");
    const { saveSliderQuestions } = await import("./publicForm/sliderQuestionsService");
    const { saveParticipantQuestions } = await import("./publicForm/participantQuestionsService");
    const { saveTriangleQuestions } = await import("./publicForm/triangleQuestionsService");

    const promises = [];

    const existingStoryQuestion = await getStoryQuestion(projectId);
    if (formData.storyQuestion && existingStoryQuestion !== formData.storyQuestion) {
      promises.push(saveStoryQuestion(projectId, formData.storyQuestion));
    }

    promises.push(saveSliderQuestions(projectId, formData.sliderQuestions || []));
    promises.push(saveParticipantQuestions(projectId, formData.participantQuestions || [], formData.includePreferNotToSay ?? true));
    promises.push(saveTriangleQuestions(projectId, formData.triangleQuestions || []));

    await Promise.all(promises);
    return true;
  } catch (error) {
    debugError("[publicFormService] Error saving public form:", error);
    return false;
  }
};
