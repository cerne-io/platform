
// Storage keys for consistent data storage and retrieval
export const STORAGE_KEYS = {
  STORY_QUESTION: "cerne_story_question",
  STORY_QUESTION_BY_PROJECT: (projectId?: string) =>
    projectId ? `cerne_story_question_${projectId}` : "cerne_story_question",
  STORY_QUESTION_CONTENT: (projectId?: string) =>
    projectId ? `cerne_story_question_content_${projectId}` : "cerne_story_question_content",
  STORY_QUESTION_SAVED: (projectId?: string) =>
    projectId ? `cerne_story_question_saved_${projectId}` : "cerne_story_question_saved",

  SLIDER_THEMES: (projectId?: string) =>
    projectId ? `cerne_slider_themes_${projectId}` : "cerne_slider_themes",
  SLIDER_THEMES_SAVED: (projectId?: string) =>
    projectId ? `cerne_slider_themes_saved_${projectId}` : "cerne_slider_themes_saved",

  PARTICIPANT_QUESTIONS: "cerne_participant_questions", // This seems to be a base key sometimes?
  PARTICIPANT_QUESTIONS_BY_PROJECT: (projectId?: string) =>
    projectId ? `cerne_participant_questions_${projectId}` : "cerne_participant_questions",
  PARTICIPANT_QUESTIONS_SAVED: (projectId?: string) =>
    projectId ? `cerne_participant_questions_saved_${projectId}` : "cerne_participant_questions_saved",
  PARTICIPANT_QUESTIONS_AI_NOTICE_DISMISSED: "cerne_participant_questions_ai_notice_dismissed",

  FORM_DESIGNED: "cerne_form_designed",
  FORM_DESIGNED_PROJECT: (projectId: string) => `cerne_form_designed_${projectId}`,

  SIDEBAR_STATE: "cerne_sidebar_state",
  SIDEBAR_EXPANDED_ITEMS: "cerne_sidebar_expanded_items",

  TRIANGLE_QUESTIONS: (projectId?: string) =>
    projectId ? `cerne_triangle_questions_${projectId}` : "cerne_triangle_questions",
  TRIANGLE_QUESTIONS_SAVED: (projectId?: string) =>
    projectId ? `cerne_triangle_questions_saved_${projectId}` : "cerne_triangle_questions_saved",

  RESPONSE_CONTAINER_DISPLAY_QUESTION: (projectId?: string) =>
    projectId ? `cerne_response_container_display_question_${projectId}` : "cerne_response_container_display_question",
};


