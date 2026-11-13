import { prepareProjectContext } from "@/utils/project-context/prepareProjectContext";
import { aiAssistantService } from "@/services/aiAssistantService";
import { MultipleChoiceQuestion } from "@/components/design/multiple-choice/types";
import { Project } from "@/types/project";
import { debugLog, debugError } from "@/utils/debugLogger";
import { nanoid } from "nanoid";

interface RawGeneratedQuestion {
  label?: string;
  choices?: Array<string | { label?: string }>;
}

/**
 * Generates 2-3 participant demographic/background questions with choices
 * based on the project context and Cerne narrative inquiry guidelines.
 */
export async function generateParticipantQuestionsWithAI(
  activeProject: Project | null,
  _options?: { isDemo?: boolean }
): Promise<MultipleChoiceQuestion[] | null> {
  if (!activeProject?.id) {
    debugError("No active project provided for participant questions generation");
    return null;
  }

  try {
    debugLog("Generating participant questions for project:", activeProject.name);

    // 1. Gather comprehensive project context
    const contextData = await prepareProjectContext(activeProject);
    if (!contextData || !contextData.context) {
      debugError("Failed to prepare project context for participant questions");
      return null;
    }

    // 2. Prompt incorporating Cerne narrative inquiry rules
    const prompt = `You are an expert narrative inquiry methodologist specializing in the Cerne methodology.
Design participant background / demographic questions for a story collection project called "${activeProject.name}".

CERNE METHODOLOGY GUIDELINES:
1. Interpretive Lenses: Participant questions must serve as meaningful comparison dimensions to contrast experiences during narrative sensemaking (e.g., Role / Function, Tenure / Experience bracket, Work Setting / Department).
2. Protect Anonymity: Keep categories broad so individual participants cannot be identified. Never ask for names, exact job titles, or micro-teams.
3. Quantity: Generate strictly 2 or 3 questions.
4. Choices: Each question MUST include 4 to 5 mutually exclusive, comprehensive choices. Keep choice labels concise (1 to 4 words). Do NOT include "Prefer not to say" (this is handled separately by the system).

FORMAT YOUR RESPONSE STRICTLY AS VALID JSON (an array of objects) with NO markdown formatting, NO backticks, and NO extra text:
[
  {
    "label": "Role / Functional Area",
    "choices": ["Frontline Staff", "Team Lead / Supervisor", "Department Management", "Support / Administration"]
  },
  {
    "label": "Years in Organization",
    "choices": ["Less than 1 year", "1 to 3 years", "3 to 7 years", "More than 7 years"]
  }
]`;

    // 3. Dispatch to AI service
    const result = await aiAssistantService.callAssistant({
      prompt,
      projectContext: contextData.context,
      mode: 'design',
    });

    if (!result.response) {
      debugError("No response received from AI service:", result.error);
      return null;
    }

    // 4. Parse JSON safely (stripping code blocks or surrounding text if present)
    let jsonText = result.response.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    } else {
      const firstBracket = jsonText.indexOf('[');
      const lastBracket = jsonText.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        jsonText = jsonText.substring(firstBracket, lastBracket + 1);
      }
    }

    const parsed: RawGeneratedQuestion[] = JSON.parse(jsonText);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      debugError("Parsed AI response is not a non-empty array:", parsed);
      return null;
    }

    // 5. Transform into MultipleChoiceQuestion format (strictly 2 to 3 questions)
    const questions: MultipleChoiceQuestion[] = parsed.slice(0, 3).map((item, qIdx) => {
      const qId = `pq-${nanoid(6)}`;
      const label = item.label?.trim() || `Question ${qIdx + 1}`;
      const rawChoices = Array.isArray(item.choices) ? item.choices : [];

      const choices = rawChoices.map((choice, cIdx) => {
        const choiceText = typeof choice === 'string'
          ? choice.trim()
          : (choice?.label?.trim() || `Option ${cIdx + 1}`);
        return {
          id: `c-${nanoid(6)}`,
          label: choiceText
        };
      });

      return {
        id: qId,
        label,
        choices
      };
    });

    debugLog("Successfully generated participant questions:", questions);
    return questions;
  } catch (err) {
    debugError("Error in generateParticipantQuestionsWithAI:", err);
    return null;
  }
}
