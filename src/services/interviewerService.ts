import { postAiEndpoint } from "@/lib/localClient";

import { ChatMessage, AIAssistantResponse } from "@/types/chatTypes";
import { debugLog, debugError } from "@/utils/debugLogger";

export interface InterviewerRequest {
  prompt?: string;
  projectContext?: string;
  conversationHistory?: ChatMessage[];
  storyQuestion?: string;
  projectId?: string;
  formId?: string;
  sliderQuestions?: Array<{
    id: number;
    theme?: string;
    question: string;
    leftLabel: string;
    rightLabel: string;
  }>;
  triangleQuestions?: Array<{
    id: number;
    question: string;
    topLabel: string;
    bottomLeftLabel: string;
    bottomRightLabel: string;
  }>;
  participantQuestions?: Array<{
    id: string;
    label: string;
    choices?: Array<{ id: string; label: string }>;
  }>;
  language?: string;
}

import { parseEdgeFunctionError } from "./utils/edgeFunctionErrorParser";

/**
 * Service for interacting with the Interviewer via /api/ai/interviewer
 */
export const interviewerService = {
  /**
   * Start or continue an interview conversation
   */
  async callInterviewer({
    prompt = '',
    projectContext = '',
    conversationHistory = [],
    storyQuestion = '',
    projectId,
    formId,
    sliderQuestions,
    triangleQuestions,
    participantQuestions,
    language,
  }: InterviewerRequest): Promise<AIAssistantResponse> {
    try {
      debugLog('Calling interviewer AI with:', {
        prompt,
        projectContext: projectContext ? 'provided' : 'none',
        conversationHistory: conversationHistory.length,
        storyQuestion,
        hasFormId: Boolean(formId),
      });

      // Preserve 'system' role for phase markers, and exclude messages marked with isError
      const historyForAPI = conversationHistory
        .filter(msg => !(msg as { isError?: boolean }).isError)
        .map(msg => ({
          role: msg.role === 'system' ? 'system' : (msg.role === 'user' ? 'user' : 'assistant'),
          content: msg.content
        }));

      const requestBody = {
        prompt,
        projectContext,
        conversationHistory: historyForAPI,
        storyQuestion,
        projectId,
        ...(formId ? { formId } : {}),
        sliderQuestions,
        triangleQuestions,
        participantQuestions,
        language,
      };

      const { data, error } = await postAiEndpoint<{
        response?: string | null;
        skipped?: boolean;
        error?: string;
        errorCode?: string;
      }>('/api/ai/interviewer', requestBody, {
        skipUnauthorizedLock: Boolean(formId),
      });

      if (error) {
        debugError('Interviewer AI endpoint error:', error);

        const parsed = await parseEdgeFunctionError(error);

        return {
          response: null,
          error: parsed.userFacingMessage,
          errorCode: parsed.appCode || (parsed.statusCode ? parsed.errorCode : null),
        };
      }

      if (data?.skipped) {
        debugLog('Interviewer AI probe skipped by server policy');
        return {
          response: null,
          skipped: true,
          error: null,
          errorCode: null,
        };
      }

      if (data && data.error) {
        debugError('Interviewer endpoint returned error:', data);
        return {
          response: null,
          error: data.error,
          errorCode: data.errorCode || null
        };
      }

      debugLog('Response from interviewer:', data);

      if (!data || !data.response) {
        debugError('Invalid response from interviewer AI:', data);
        return {
          response: null,
          error: 'Received invalid response from interviewer AI',
          errorCode: null
        };
      }

      const responseText = data.response || "";
      debugLog('Interviewer response received:', responseText.substring(0, 100) + '...');

      return {
        response: responseText,
        error: null,
        errorCode: null
      };
    } catch (error: unknown) {
      debugError("Error calling interviewer AI:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        response: null,
        error: errorMessage || "Failed to get response from interviewer AI",
        errorCode: null
      };
    }
  }
};