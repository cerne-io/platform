
import { prepareProjectContext } from '../modules/contextPreparation';
import { aiAssistantService } from '@/services/aiAssistantService';
import { SliderQuestion } from '@/services/types/designTypes';
import { Project } from '@/types/project';
import { updateDebugInfoField } from './debugInfo';
import { debugLog, debugError } from '@/utils/debugLogger';

/**
 * Generates slider questions using AI based on factors
 */
export const generateWithAI = async (
  factors: string[],
  activeProject: Project | null,
  _options?: { isDemo?: boolean }
): Promise<SliderQuestion[] | null> => {
  if (!factors || factors.length === 0) {
    debugError("No factors provided for slider question generation");
    return null;
  }

  if (!activeProject || !activeProject.id) {
    debugError("No active project provided for context building");
    return null;
  }

  try {
    debugLog("Generating slider questions for factors:", factors);

    // Get comprehensive project context including all phases
    const contextData = await prepareProjectContext(activeProject);

    if (!contextData || !contextData.context) {
      debugError("Failed to prepare project context");
      updateDebugInfoField('context', "ERROR: Failed to build project context");
      return null;
    }

    // Store the context in debug info
    updateDebugInfoField('context', contextData.context);

    // The prompt template will be resolved server-side
    updateDebugInfoField('prompt', 'Using server-side template: slider_question_prompt');

    // Call the AI service with the prompt and context
    const result = await aiAssistantService.callAssistant({
      prompt: "Please generate slider questions.", // Generic prompt since actual prompt is built server-side
      promptKey: "slider_question_prompt",
      promptVariables: {
        factors: factors.slice(0, 5).join(", "),
        projectName: activeProject.name
      },
      projectContext: contextData.context,
    });

    if (!result.response) {
      debugError("No response received from AI:", result.error);
      updateDebugInfoField('response', `ERROR: ${result.error}`);
      return null;
    }

    // Store the raw response
    updateDebugInfoField('response', result.response);

    // Try to parse the response as JSON
    let parsedQuestions: SliderQuestion[];

    try {
      // Trim any non-JSON content from the beginning or end
      let jsonText = result.response.trim();

      // If the response starts with ``` or ```json (code block), extract only the JSON part
      if (jsonText.startsWith('```')) {
        const endIndex = jsonText.lastIndexOf('```');
        if (endIndex > 3) {
          // Extract content between first ``` and last ```
          jsonText = jsonText.substring(jsonText.indexOf('\n') + 1, endIndex).trim();
        }
      }

      parsedQuestions = JSON.parse(jsonText);
      debugLog("Successfully parsed questions:", parsedQuestions);
    } catch (parseError) {
      debugError("Failed to parse AI response as JSON:", parseError);
      debugLog("Raw AI response:", result.response);
      updateDebugInfoField('response', `PARSE ERROR: ${parseError}\n\nRaw: ${result.response}`);
      return null;
    }

    // Process the parsed questions to ensure all fields are present
    const processedQuestions = parsedQuestions.map((q, index) => ({
      id: index + 1,
      theme: q.theme || `Theme ${index + 1}`,
      question: q.question || `Question ${index + 1}`,
      leftLabel: q.leftLabel || 'Low',
      rightLabel: q.rightLabel || 'High',
      sliderValue: 50 // Default slider position
    }));

    return processedQuestions;
  } catch (error) {
    debugError("Error generating slider questions with AI:", error);
    updateDebugInfoField('error', error instanceof Error ? error.message : String(error));
    return null;
  }
};
