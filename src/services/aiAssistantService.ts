
import { postAiEndpoint } from "@/lib/localClient";
import { AIAssistantRequest, AIAssistantResponse } from "@/types/chatTypes";
import { debugLog, debugError } from "@/utils/debugLogger";
import { parseEdgeFunctionError, getFriendlyErrorMessage, resolveErrorCode } from "@/services/utils/edgeFunctionErrorParser";

/**
 * Service for interacting with the single OpenAI-compatible AI Assistant backend
 */
export const aiAssistantService = {
  /**
   * Call the AI assistant with a prompt and context
   */
  async callAssistant({
    prompt,
    projectContext = '',
    mode = 'general',
    model,
    content,
    targetLanguage,
    targetLanguages,
    promptKey,
    promptVariables,
    sessionToken
  }: AIAssistantRequest & { model?: string }): Promise<AIAssistantResponse> {
    try {
      debugLog(`[aiAssistantService] callAssistant called with mode=${mode}, prompt length=${prompt?.length}`);

      const finalPrompt = prompt;
      const endpoint = mode === "translate" ? "/api/ai/translate" : "/api/ai/assistant";

      const { data, error } = await postAiEndpoint(endpoint, {
        prompt: finalPrompt,
        projectContext,
        requestType: mode === 'suggestNextStep' ? 'suggestNextStep' :
                    (mode === 'improve' ? 'improve' :
                    (mode === 'storyQuestion' ? 'storyQuestion' :
                    (mode === 'translate' ? 'translate' : 'general'))),
        mode,
        model,
        content,
        targetLanguage,
        targetLanguages,
        promptKey,
        promptVariables,
        sessionToken,
      });

      if (error) {
        const parsed = await parseEdgeFunctionError(error);
        debugError('Supabase function error:', parsed.diagnostic);
        return {
          response: null,
          error: parsed.userFacingMessage,
          errorCode: parsed.errorCode
        };
      }

      if (data && data.error) {
        debugError('Edge function returned error:', data);
        const errorCode = resolveErrorCode(undefined, data.errorCode);
        return {
          response: null,
          error: getFriendlyErrorMessage(errorCode, undefined, data.error),
          errorCode
        };
      }



      if (!data || !data.response) {
        debugError('Invalid response from AI assistant:', data);
        return {
          response: null,
          error: getFriendlyErrorMessage('invalid_response'),
          errorCode: 'invalid_response'
        };
      }

      const responseText = data.response || "";


      return {
        response: responseText,
        error: null,
        errorCode: null
      };
    } catch (error: unknown) {
      const parsed = await parseEdgeFunctionError(error);
      debugError("Error calling AI assistant:", parsed.diagnostic);
      return {
        response: null,
        error: parsed.userFacingMessage,
        errorCode: parsed.errorCode
      };
    }
  }
};
