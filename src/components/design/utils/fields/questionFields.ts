
import { FormField } from "./types";
import { normalizePhaseId } from "./phaseUtils";
import { debugLog } from "@/utils/debugLogger";

/**
 * Get the form fields for a specific activity based on phase, step, and activity ID
 */
export const getQuestionFields = (phaseId: string, stepId: string, activityId: string): FormField[] => {
  // Normalize the phase ID to handle any legacy phase names
  const normalizedPhaseId = normalizePhaseId(phaseId);

  debugLog(`Getting fields for ${normalizedPhaseId}/${stepId}/${activityId}`);

  // Define form fields based on the activity
  const fieldMappings: Record<string, FormField[]> = {
    // Context phase fields
    'context_target-audience': [
      { id: 'audience_description', label: 'Target Audience Description', isTextarea: true },
    ],
    'context_organization-goals': [
      { id: 'goals_description', label: 'Organization Goals', isTextarea: true },
    ],
    'context_problem-statement': [
      { id: 'problem_statement', label: 'Problem Statement', isTextarea: true },
    ],
    'context_about': [
      { id: 'organization_description', label: 'Organization Description', isTextarea: true },
    ],
    'context_history': [
      { id: 'organization_history', label: 'Organization History', isTextarea: true },
    ],
    'context_values': [
      { id: 'organization_values', label: 'Organization Values', isTextarea: true },
    ],

    // Project step activities
    'context_scope': [
      { id: 'project_scope', label: 'Project Scope', isTextarea: true },
    ],
    'context_trigger': [
      { id: 'project_trigger', label: 'Project Trigger', isTextarea: true },
    ],
    'context_success': [
      { id: 'project_success', label: 'Project Success', isTextarea: true },
    ],

    // Define phase fields
    'define_research-objectives': [
      { id: 'research_objectives', label: 'Research Objectives', isTextarea: true },
    ],
    'define_key-topics': [
      { id: 'key_topics', label: 'Key Topics', isTextarea: true },
    ],
    // Define phase - Topic step
    'define_investigate': [
      { id: 'investigate_topic', label: 'Response', isTextarea: true },
    ],
    'define_focus': [
      { id: 'focus_description', label: 'Response', isTextarea: true },
    ],
    'define_actors': [
      { id: 'actors_description', label: 'Response', isList: true },
    ],

    // Define phase - Discover step
    'define_hopes': [
      { id: 'hopes_description', label: 'Response', isTextarea: true },
    ],
    'define_experiences': [
      { id: 'experiences_description', label: 'Response', isTextarea: true },
    ],
    'define_factors': [
      { id: 'factors_description', label: 'Response', isList: true },
    ],

    // Design phase fields
    'design_story-questions': [
      { id: 'story_question_draft', label: 'Story Question Draft', isTextarea: true },
    ],
    'design_slider-questions': [
      { id: 'slider_questions_draft', label: 'Slider Questions Draft', isTextarea: true },
    ],
    'design_participant-questions': [
      { id: 'participant_questions_draft', label: 'Participant Questions Draft', isTextarea: true },
    ],
    'design_prompts': [
      { id: 'story_prompt', label: 'Story Prompt', isTextarea: true },
    ],

    // Build phase fields
    'build_review': [
      { id: 'design_review', label: 'Design Review', isTextarea: true },
    ],
    'build_form-appearance': [
      { id: 'form_appearance_notes', label: 'Form Appearance Notes', isTextarea: true },
    ],
  };

  // Generate a key to look up in our mapping
  const lookupKey = `${normalizedPhaseId}_${activityId}`;

  // Return the fields for this activity or an empty array if not found
  return fieldMappings[lookupKey] || [];
};
