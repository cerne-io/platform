import { debugLog, debugError } from "@/utils/debugLogger";
import { supabase } from "@/integrations/supabase/client";

export interface PhaseValidationResult {
  isValid: boolean;
  contextComplete: boolean;
  defineComplete: boolean;
  missingRequirements: string[];
  completedRequirements: string[];
  contextMissing: string[];
  defineMissing: string[];
  contextCompleted: string[];
  defineCompleted: string[];
}

export interface ValidationRequirement {
  phase: string;
  step: string;
  activity: string;
  name: string;
  description: string;
  required: boolean;
}

// Define what we consider substantial content
const isSubstantialContent = (content: unknown): boolean => {
  if (!content) return false;

  if (typeof content === 'string') {
    // Remove common default/placeholder text and check for substantial content
    const cleaned = content.toLowerCase().trim();

    // Check against specific phrases that are definitely placeholders
    // We removed 'describe', 'explain', 'example', etc. as they often appear in valid content
    const placeholderPhrases = [
      'tell us about',
      'enter your',
      'add your',
      'type here',
      'placeholder',
      'lorem ipsum',
      'todo',
      'coming soon'
    ];

    // Must be at least 20 characters
    if (cleaned.length < 20) return false;

    // Check if the content is JUST the placeholder (or mostly)
    // or contains explicit instruction phrases
    return !placeholderPhrases.some(phrase => cleaned.includes(phrase));
  }

  if (typeof content === 'object' && content !== null) {
    // For objects, check if they have meaningful content
    const values = Object.values(content);
    return values.some(value => isSubstantialContent(value));
  }

  return false;
};

// Define validation requirements for each phase
const CONTEXT_REQUIREMENTS: ValidationRequirement[] = [
  {
    phase: 'context',
    step: 'organization',
    activity: 'about',
    name: 'Organization About',
    description: 'Information about your organization',
    required: false
  },
  {
    phase: 'context',
    step: 'organization',
    activity: 'history',
    name: 'Organization History',
    description: 'Relevant organizational history',
    required: false
  },
  {
    phase: 'context',
    step: 'organization',
    activity: 'values',
    name: 'Organization Values',
    description: 'Organizational values and culture',
    required: false
  },
  {
    phase: 'context',
    step: 'project',
    activity: 'scope',
    name: 'Project Scope',
    description: 'Project scope and objectives',
    required: true
  },
  {
    phase: 'context',
    step: 'project',
    activity: 'trigger',
    name: 'Project Trigger',
    description: 'What triggered this project',
    required: true
  },
  {
    phase: 'context',
    step: 'project',
    activity: 'success',
    name: 'Success Criteria',
    description: 'What success looks like',
    required: true
  }
];

const DEFINE_REQUIREMENTS: ValidationRequirement[] = [
  {
    phase: 'define',
    step: 'topic',
    activity: 'investigate',
    name: 'Topic Investigation',
    description: 'What topic you are investigating',
    required: true
  },
  {
    phase: 'define',
    step: 'topic',
    activity: 'focus',
    name: 'Topic Focus',
    description: 'Specific focus of investigation',
    required: true
  },
  {
    phase: 'define',
    step: 'topic',
    activity: 'actors',
    name: 'Key Actors',
    description: 'Who you want to hear from',
    required: false
  },
  {
    phase: 'define',
    step: 'discover',
    activity: 'hopes',
    name: 'Discovery Hopes',
    description: 'What you hope to discover',
    required: false
  },
  {
    phase: 'define',
    step: 'discover',
    activity: 'experiences',
    name: 'Relevant Experiences',
    description: 'Experiences that reveal current state',
    required: false
  },
  {
    phase: 'define',
    step: 'discover',
    activity: 'factors',
    name: 'Influencing Factors',
    description: 'Factors that influence behavior/decisions',
    required: true // This is critical for AI generation
  }
];

/**
 * Validate if Context and Define phases have sufficient data for AI generation
 */
export const validateDesignPhasePrerequisites = async (
  projectId: string
): Promise<PhaseValidationResult> => {
  debugLog('Validating design phase prerequisites for project:', projectId);

  if (!projectId) {
    return {
      isValid: false,
      contextComplete: false,
      defineComplete: false,
      missingRequirements: ['Project ID is required'],
      completedRequirements: [],
      contextMissing: ['Project ID'],
      defineMissing: [],
      contextCompleted: [],
      defineCompleted: []
    };
  }

  try {
    // Fetch all activity responses for the project in a single query
    const { data: dbResponses, error: dbError } = await supabase
      .from('activity_responses')
      .select('ar_phase_id, ar_step_id, ar_activity_id, ar_response')
      .eq('ar_project_id', projectId);

    if (dbError) {
      debugError('Error bulk fetching activity responses:', dbError);
      throw dbError;
    }

    let responses = dbResponses || [];

    // Fallback to template table if this is a template project and no responses found
    if (responses.length === 0) {
      const { data: templateResponses, error: templateError } = await supabase
        .from('template_activity_responses')
        .select('ar_phase_id, ar_step_id, ar_activity_id, ar_response')
        .eq('ar_project_id', projectId);

      if (templateError) {
        debugError('Error fetching template activity responses:', templateError);
        throw templateError;
      }

      if (templateResponses && templateResponses.length > 0) {
        responses = templateResponses;
      }
    }

    // Index responses into lookup map using composite key
    const responseMap = new Map<string, unknown>();
    for (const row of responses) {
      if (row.ar_response !== null && row.ar_response !== undefined) {
        responseMap.set(`${row.ar_phase_id}:${row.ar_step_id}:${row.ar_activity_id}`, row.ar_response);
      }
    }

    const evaluateRequirement = (req: ValidationRequirement) => {
      const content = responseMap.get(`${req.phase}:${req.step}:${req.activity}`) ?? null;
      const hasContent = isSubstantialContent(content);
      debugLog(`Validation - ${req.name}:`, { hasContent, content });
      return {
        ...req,
        hasContent,
        content
      };
    };

    // Check Context and Define Phase requirements in-memory
    const contextResults = CONTEXT_REQUIREMENTS.map(evaluateRequirement);
    const defineResults = DEFINE_REQUIREMENTS.map(evaluateRequirement);

    // Analyze Context Phase completion
    const contextCompleted = contextResults.filter(r => r.hasContent);
    const contextMissing = contextResults.filter(r => !r.hasContent);
    const contextRequiredMissing = contextMissing.filter(r => r.required);

    // Context is complete if: at least 1 organization item AND at least 2 project items (including all required ones)
    const orgCompleted = contextCompleted.filter(r => r.step === 'organization').length >= 1;
    const projectCompleted = contextCompleted.filter(r => r.step === 'project').length >= 2;
    const contextRequiredComplete = contextRequiredMissing.length === 0;
    const contextComplete = orgCompleted && projectCompleted && contextRequiredComplete;

    // Analyze Define Phase completion
    const defineCompleted = defineResults.filter(r => r.hasContent);
    const defineMissing = defineResults.filter(r => !r.hasContent);
    const defineRequiredMissing = defineMissing.filter(r => r.required);

    // Define is complete if: at least 2 topic items AND factors is completed AND at least 1 discover item
    const topicCompleted = defineCompleted.filter(r => r.step === 'topic').length >= 2;
    const factorsCompleted = defineCompleted.some(r => r.activity === 'factors');
    const discoverCompleted = defineCompleted.filter(r => r.step === 'discover').length >= 1;
    const defineRequiredComplete = defineRequiredMissing.length === 0;
    const defineComplete = topicCompleted && factorsCompleted && discoverCompleted && defineRequiredComplete;

    // Overall validation
    const isValid = contextComplete && defineComplete;

    const missingRequirements = [
      ...contextMissing.map(r => r.name),
      ...defineMissing.map(r => r.name)
    ];

    const completedRequirements = [
      ...contextCompleted.map(r => r.name),
      ...defineCompleted.map(r => r.name)
    ];

    const result: PhaseValidationResult = {
      isValid,
      contextComplete,
      defineComplete,
      missingRequirements,
      completedRequirements,
      contextMissing: contextMissing.map(r => r.name),
      defineMissing: defineMissing.map(r => r.name),
      contextCompleted: contextCompleted.map(r => r.name),
      defineCompleted: defineCompleted.map(r => r.name)
    };

    debugLog('Phase validation result:', result);
    return result;

  } catch (error) {
    debugError('Error during phase validation:', error);
    return {
      isValid: false,
      contextComplete: false,
      defineComplete: false,
      missingRequirements: ['Error validating prerequisites'],
      completedRequirements: [],
      contextMissing: ['Validation error'],
      defineMissing: ['Validation error'],
      contextCompleted: [],
      defineCompleted: []
    };
  }
};

/**
 * Get navigation information for incomplete phases
 */
export const getPhaseNavigationInfo = () => {
  return {
    context: {
      route: '/design?step=organization',
      title: 'Context Phase',
      description: 'Define the context, needs and hopes'
    },
    define: {
      route: '/design?step=topic',
      title: 'Define Phase',
      description: 'Define the topic, focus and factors'
    }
  };
};