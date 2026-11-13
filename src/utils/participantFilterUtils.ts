import { Story } from "@/types/story";
import { ParticipantQuestion } from "@/services/types/designTypes";
import { isPreferNotToSayValue } from "@/utils/formDefaultTranslations";

export interface ParticipantFilter {
  id: string;
  text: string;
  choices: string[];
  rawMapping?: Map<string, string[]>;
}

// Helper to map a raw string response to a base choice label
export const getBaseLabel = (
  questionId: string, 
  rawResponse: string | string[] | number | boolean | null | undefined, 
  formParticipantQuestions: ParticipantQuestion[] = [],
  cachedConfig?: ParticipantQuestion
): string => {
  if (rawResponse === null || rawResponse === undefined) return '';
  const strResponse = typeof rawResponse === 'string' 
    ? rawResponse 
    : Array.isArray(rawResponse) 
      ? rawResponse.join(', ') 
      : String(rawResponse);
  const qConfig = cachedConfig || formParticipantQuestions.find(q => String(q.id) === String(questionId));

  // Unify all "Prefer not to say" translations (old English rows + localized rows)
  if (isPreferNotToSayValue(strResponse)) {
    return qConfig?.choices?.find(c => c.id === 'prefer-not-to-say')?.label || "Prefer not to say";
  }

  if (!qConfig || !qConfig.choices) return strResponse;

  for (const choice of qConfig.choices) {
    if (choice.label === strResponse) return choice.label;
    if (choice.translations) {
      for (const [_, transValue] of Object.entries(choice.translations)) {
        if (transValue === strResponse) return choice.label;
      }
    }
  }

  return strResponse;
};

/**
 * Extracts participant questions and their possible choices from stories,
 * unifying translated choices back to their base labels.
 */
export const extractAndUnifyParticipantFilters = (
  stories: Story[],
  formParticipantQuestions: ParticipantQuestion[] = []
): ParticipantFilter[] => {
  const questionsMap = new Map<string, { id: string; text: string; unifiedChoices: Set<string>; originalFormsMap: Map<string, Set<string>> }>();
  
  // Optimization: Pre-compute a lookup map for ParticipantQuestions to avoid O(N^2) searches inside the loop
  const participantQuestionsMap = new Map<string, ParticipantQuestion>();
  for (let i = 0; i < formParticipantQuestions.length; i++) {
    participantQuestionsMap.set(String(formParticipantQuestions[i].id), formParticipantQuestions[i]);
  }

  const len = stories.length;
  for (let i = 0; i < len; i++) {
    const story = stories[i];
    if (!story.participantResponses) continue;

    for (const r of story.participantResponses) {
      const qIdStr = String(r.question_id);
      let qData = questionsMap.get(qIdStr);
      const cachedConfig = participantQuestionsMap.get(qIdStr);
      
      if (!qData) {
        qData = {
          id: qIdStr,
          text: cachedConfig?.label || r.question_text,
          unifiedChoices: new Set(),
          originalFormsMap: new Map() // Tracks unified label -> raw strings found
        };
        questionsMap.set(qIdStr, qData);
      }

      if (r.response !== null && r.response !== undefined) {
        const rawValues = Array.isArray(r.response) ? r.response : [r.response];
        for (let m = 0; m < rawValues.length; m++) {
          const rawVal = rawValues[m];
          const strVal = typeof rawVal === 'string' ? rawVal : String(rawVal);
          if (!strVal) continue;
          // Pass the cached config to bypass the .find() inside getBaseLabel as well
          const baseLabel = getBaseLabel(qIdStr, strVal, formParticipantQuestions, cachedConfig);
          qData.unifiedChoices.add(baseLabel);
          
          let formsSet = qData.originalFormsMap.get(baseLabel);
          if (!formsSet) {
            formsSet = new Set();
            qData.originalFormsMap.set(baseLabel, formsSet);
          }
          // Optimization: using a Set avoids an O(N) .includes() check on arrays that could grow large
          formsSet.add(strVal);
        }
      }
    }
  }

  return Array.from(questionsMap.values()).map(q => {
    // Convert Set back to array for rawMapping backward compatibility
    const rawMappingArray = new Map<string, string[]>();
    for (const [key, valueSet] of q.originalFormsMap.entries()) {
      rawMappingArray.set(key, Array.from(valueSet));
    }
    
    return {
      id: q.id,
      text: q.text,
      choices: Array.from(q.unifiedChoices).sort(),
      // We export originalFormsMap implicitly if components need to match raw strings when filtering
      rawMapping: rawMappingArray 
    };
  });
};
