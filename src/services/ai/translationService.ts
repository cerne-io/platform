import { postAiEndpoint } from "@/lib/localClient";
import { parseEdgeFunctionError } from "@/services/utils/edgeFunctionErrorParser";
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Service for translating form content (story questions, sliders, etc.) using AI
 */
export const translationService = {
  /**
   * Translates content from a source language to multiple target languages
   */
  async translateContent<T>(
    content: T,
    targetLanguages: string[],
    sourceLanguage: string = "en"
  ): Promise<Record<string, T>> {
    if (!content || !targetLanguages || targetLanguages.length === 0) {
      return {};
    }

    const targets = targetLanguages.filter((lang) => lang !== sourceLanguage);
    if (targets.length === 0) return {};

    debugLog(`[translationService] Translating content to: ${targets.join(", ")}`);

    try {
      const { data, error } = await postAiEndpoint("/api/ai/translate", {
        prompt: `Translate to: ${targets.join(", ")}`,
        content,
        targetLanguages: targets,
      });

      if (error) {
        const parsed = await parseEdgeFunctionError(error);
        throw new Error(parsed.userFacingMessage);
      }

      if (data?.response && typeof data.response === "string") {
        let jsonStr = data.response.trim();
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }

        try {
          const translations = JSON.parse(jsonStr);
          debugLog("[translationService] Successfully parsed AI translations");
          return translations as Record<string, T>;
        } catch {
          if (targets.length === 1) {
            debugLog(
              "[translationService] AI returned raw text instead of JSON, wrapping for single language."
            );
            return { [targets[0]]: data.response as unknown as T } as Record<string, T>;
          }

          debugError("[translationService] Failed to parse AI response as JSON:", jsonStr);
          throw new Error("AI returned invalid JSON format for translations");
        }
      }
    } catch (error) {
      debugError("[translationService] Error in translateContent:", error);
      throw error;
    }

    return {};
  },
};
