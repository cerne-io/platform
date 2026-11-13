
import { prepareProjectContext } from '@/hooks/slider-questions/modules/contextPreparation';
import { aiAssistantService } from '@/services/aiAssistantService';
import { TriangleQuestion } from '@/services/types/designTypes';
import { Project } from '@/types/project';
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Generates triangle questions using AI
 */
export const generateTriangleQuestionsWithAI = async (
    activeProject: Project | null,
    _options?: { isDemo?: boolean }
): Promise<TriangleQuestion[] | null> => {
    if (!activeProject || !activeProject.id) {
        debugError("No active project provided for triangle question generation");
        return null;
    }

    try {
        debugLog("Generating triangle questions for project:", activeProject.name);

        // Get comprehensive project context
        const contextData = await prepareProjectContext(activeProject);

        if (!contextData || !contextData.context) {
            debugError("Failed to prepare project context");
            return null;
        }

        // Call the AI service with the prompt and context
        const result = await aiAssistantService.callAssistant({
            prompt: "Please generate triangle questions using the criteria and context provided in your system instructions.", // Generic prompt since actual prompt is built server-side
            promptKey: "triangle_questions_prompt",
            promptVariables: {
                projectName: activeProject.name
            },
            projectContext: contextData.context,
        });

        if (!result.response) {
            debugError("No response received from AI:", result.error);
            return null;
        }

        // Try to parse the response as JSON
        let parsedQuestions: unknown[];

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
            debugLog("Successfully parsed triangle questions:", parsedQuestions);
        } catch (parseError) {
            debugError("Failed to parse AI response as JSON:", parseError);
            debugLog("Raw AI response:", result.response);
            return null;
        }

        // Process the parsed questions to ensure all fields are present
        const processedQuestions: TriangleQuestion[] = parsedQuestions.map((item, index) => {
            const q = item as Record<string, unknown>;
            return {
                id: index + 1,
                theme: (q.theme as string) || `Theme ${index + 1}`,
                question: (q.question as string) || `Question ${index + 1}`,
                topLabel: (q.topLabel as string) || 'Top',
                bottomLeftLabel: (q.bottomLeftLabel as string) || 'Left',
                bottomRightLabel: (q.bottomRightLabel as string) || 'Right',
                defaultX: 50,
                defaultY: 66.67 // Centroid
            };
        });

        return processedQuestions;
    } catch (error) {
        debugError("Error generating triangle questions with AI:", error);
        return null;
    }
};
