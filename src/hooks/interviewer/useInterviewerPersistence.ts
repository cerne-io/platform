import { useState, useRef, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";


import { saveExtractedStory, type ExtractedStoryData } from "@/services/interviewer/storySaveService";
import { debugLog, debugError } from "@/utils/debugLogger";
import { UseInterviewerOptions } from './types';
import { ChatMessage } from "@/types/chatTypes";
import { formatSaveErrorMessage } from './utils';

export const useInterviewerPersistence = (options: UseInterviewerOptions) => {
    const [storyHasBeenSaved, setStoryHasBeenSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);
    const { toast } = useToast();

    const clearPersistenceState = useCallback(() => {
        setStoryHasBeenSaved(false);
        setSaveError(null);
        setIsSaving(false);
        isSavingRef.current = false;
    }, []);

    const retrySave = useCallback(() => {
        isSavingRef.current = false;
        setIsSaving(false);
        setSaveError(null);
    }, []);

    const exportConversation = useCallback((messages: ChatMessage[]) => {
        const conversationText = messages.map(msg =>
            `${msg.role === 'user' ? 'Participant' : 'Interviewer'}: ${msg.content}`
        ).join('\n\n');

        const blob = new Blob([conversationText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
            title: "Interview exported",
            description: "The conversation has been saved as a text file."
        });
    }, [toast]);

    const saveConversationAsStory = useCallback(async (
        messages: ChatMessage[],
        storyTitle: string,
        emotionalResponse: string,
        otherFeeling: string,
        additionalComments: string,
        userId: string | null,
        explicitResponses?: {
            sliderResponses?: Map<number, number>;
            triangleResponses?: Map<number | string, { x: number; y: number }>;
            participantResponses?: Map<string, string>;
        }
    ): Promise<boolean> => {
        // Prevent concurrent or duplicate saves
        if (isSavingRef.current || storyHasBeenSaved) {
            debugLog('saveConversationAsStory already in progress or already saved, skipping duplicate call.');
            return false;
        }

        isSavingRef.current = true;
        setIsSaving(true);

        // Validate captured metadata first
        if (!storyTitle || storyTitle.trim().length === 0) {
            isSavingRef.current = false;
            setIsSaving(false);
            toast({
                title: "Missing title",
                description: "Please provide a story title before saving.",
                variant: "destructive"
            });
            return false;
        }

        if (!emotionalResponse) {
            isSavingRef.current = false;
            setIsSaving(false);
            toast({
                title: "Missing emotion",
                description: "Please select how you feel about the experience before saving.",
                variant: "destructive"
            });
            return false;
        }

        if (!options.projectId) {
            isSavingRef.current = false;
            setIsSaving(false);
            toast({
                title: "No project selected",
                description: "Please select a project before saving.",
                variant: "destructive"
            });
            return false;
        }

        try {
            // Build the story text strictly from user messages in the narrative/story phase
            // Priority 1: User messages explicitly tagged with phase === 'story'
            const taggedStoryMessages = messages.filter(m => m.role === 'user' && m.phase === 'story');

            let storyText = '';

            if (taggedStoryMessages.length > 0) {
                storyText = taggedStoryMessages.map(m => m.content.trim()).filter(Boolean).join(' ');
            } else {
                // Priority 2: Fallback for in-flight sessions or mocks without phase tags.
                // Find where the metadata collection started:
                // Check for metadata phase tags, questionnaire interactive message types,
                // or assistant prompt keywords across supported languages.
                const metadataStartIndex = messages.findIndex((m, idx) =>
                    idx > 0 && (
                        (m.phase && m.phase !== 'story') ||
                        m.messageType === 'emotion_selection' ||
                        m.messageType === 'slider' ||
                        m.messageType === 'triangle' ||
                        m.messageType === 'multiple_choice' ||
                        (m.role === 'assistant' && (
                            m.content.includes('give your story a short title') ||
                            m.content.includes('short title') ||
                            m.content.includes('hashtag') ||
                            m.content.includes('título') ||
                            m.content.includes('titre') ||
                            m.content.includes('Titel')
                        ))
                    )
                );

                const candidateMessages = (metadataStartIndex > 0 ? messages.slice(0, metadataStartIndex) : messages)
                    .filter(m => {
                        if (m.role !== 'user') return false;
                        const trimmed = m.content.trim();
                        // Defensively exclude title or additional comments if they leaked into the slice
                        if (storyTitle && trimmed === storyTitle.trim()) return false;
                        if (additionalComments && trimmed === additionalComments.trim()) return false;
                        return true;
                    });

                if (candidateMessages.length > 0) {
                    storyText = candidateMessages.map(m => m.content.trim()).filter(Boolean).join(' ');
                } else {
                    // Absolute fallback: retain all user messages rather than dropping input
                    const allUserMessages = messages.filter(m => m.role === 'user');
                    storyText = allUserMessages.map(m => m.content.trim()).filter(Boolean).join(' ');
                }
            }
            const conversationTranscript = messages
                .map(m => `[${m.role}]: ${m.content}`)
                .join('\n\n');

            // Build ExtractedStoryData directly from state — no AI needed
            const extractedData: ExtractedStoryData = {
                storyText,
                storyTitle,
                emotionalResponse: emotionalResponse === 'other' ? otherFeeling : emotionalResponse,
                additionalComments,
                sliderResponses: explicitResponses?.sliderResponses || new Map(),
                triangleResponses: explicitResponses?.triangleResponses || new Map(),
                participantResponses: explicitResponses?.participantResponses || new Map(),
                conversationTranscript,
                confidence: 1.0 // Deterministic — no AI guessing
            };

            debugLog('Saving story directly from state (no AI extraction)...', {
                title: storyTitle,
                emotion: emotionalResponse,
                sliderCount: extractedData.sliderResponses.size,
                triangleCount: extractedData.triangleResponses.size,
                participantCount: extractedData.participantResponses.size,
            });

            // Save the extracted data as a story with captured metadata
            const saveResult = await saveExtractedStory(
                extractedData,
                options.projectId,
                userId,
                {
                    sliderQuestions: options.sliderQuestions,
                    triangleQuestions: options.triangleQuestions,
                    participantQuestions: options.participantQuestions
                },
                {
                    title: storyTitle,
                    emotion: emotionalResponse,
                    otherEmotion: otherFeeling,
                    additionalComments: additionalComments
                },
                options.isPublic || false,
                options.formId
            );

            if (!saveResult.success) {
                const errorMessage = formatSaveErrorMessage(saveResult.error, "Failed to save the story. Please try again.");
                setSaveError(errorMessage);
                toast({
                    title: "Save failed",
                    description: errorMessage,
                    variant: "destructive"
                });
                return false;
            }

            setStoryHasBeenSaved(true);
            toast({
                title: "Story saved",
                description: "The interview has been saved."
            });

            return true;

        } catch (error) {
            debugError('Error saving conversation as story:', error);
            const errorMessage = formatSaveErrorMessage(error, "An unexpected error occurred while saving.");
            setSaveError(errorMessage);
            toast({
                title: "Save failed",
                description: errorMessage,
                variant: "destructive"
            });
            return false;
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [options, storyHasBeenSaved, toast]);

    return {
        storyHasBeenSaved,
        saveError,
        isSaving,
        retrySave,
        setStoryHasBeenSaved,
        setSaveError,
        clearPersistenceState,
        exportConversation,
        saveConversationAsStory
    };
};
