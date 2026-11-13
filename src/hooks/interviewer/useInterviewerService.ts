import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { interviewerService } from "@/services/interviewerService";
import { debugLog } from "@/utils/debugLogger";
import { UseInterviewerOptions } from './types';
import { ChatMessage } from "@/types/chatTypes";

export const useInterviewerService = (options: UseInterviewerOptions) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t, i18n } = useTranslation();

    const callInterviewer = useCallback(async (
        prompt: string,
        conversationHistory: ChatMessage[],
        prependSystemMessages: ChatMessage[] = [],
        overrides?: {
            sliderQuestions?: UseInterviewerOptions['sliderQuestions'],
            triangleQuestions?: UseInterviewerOptions['triangleQuestions'],
            participantQuestions?: UseInterviewerOptions['participantQuestions'],
        }
    ) => {
        setIsLoading(true);
        setError(null);

        try {
            // Include any system messages that need to be sent before the user message
            const currentMessages =
                (prependSystemMessages && prependSystemMessages.length > 0)
                    ? [...conversationHistory, ...prependSystemMessages]
                    : conversationHistory;

            const result = await interviewerService.callInterviewer({
                prompt: prompt,
                projectContext: options.projectContext,
                conversationHistory: currentMessages,
                projectId: options.projectId,
                formId: options.formId,
                sliderQuestions: overrides && 'sliderQuestions' in overrides ? overrides.sliderQuestions : options.sliderQuestions,
                triangleQuestions: overrides && 'triangleQuestions' in overrides ? overrides.triangleQuestions : options.triangleQuestions,
                participantQuestions: overrides && 'participantQuestions' in overrides ? overrides.participantQuestions : options.participantQuestions,
                language: options.language,
                storyQuestion: options.storyQuestion,
            });

            return result;
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
            setError(errorMessage);
            return { error: errorMessage, response: null, errorCode: null };
        } finally {
            setIsLoading(false);
        }
    }, [options]);

    // Helper to get transition message deterministically from locale files
    const getTransitionMessage = useCallback(async (
        key: string,
        defaultInstruction: string,
        fallbackText?: string
    ): Promise<string> => {
        const targetLang = options.language || i18n?.language || 'en';
        const tForm = (k: string, d?: string): string => {
            if (typeof i18n?.getFixedT === 'function') {
                return String(i18n.getFixedT(targetLang)(k, d as never));
            }
            return String(t(k, d as never));
        };
        const translationKey = `public.interview.${key}`;

        // 1. Check if translation exists in the target language
        if (typeof i18n?.exists === 'function' && i18n.exists(translationKey, { lng: targetLang })) {
            debugLog(`Using local translation for ${key} in ${targetLang}`);
            return tForm(translationKey);
        }

        // 2. Try English fallback in translations
        if (typeof i18n?.exists === 'function' && i18n.exists(translationKey, { lng: 'en' })) {
            debugLog(`Using English fallback translation for ${key}`);
            if (typeof i18n?.getFixedT === 'function') {
                return String(i18n.getFixedT('en')(translationKey));
            }
            return tForm(translationKey);
        }

        // 3. Use provided fallback text if available
        if (fallbackText) {
            debugLog(`Using provided fallback text for ${key}`);
            return fallbackText;
        }

        // 4. Default instruction as final fallback (never call AI for static transitions)
        return defaultInstruction || "";
    }, [options.language, i18n, t]);

    return {
        isLoading,
        error,
        setError,
        setIsLoading,
        callInterviewer,
        getTransitionMessage
    };
};
