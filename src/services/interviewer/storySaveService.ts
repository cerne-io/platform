/**
 * Story Save Service for Interviewer
 * Converts extracted interview data to StoryData format and saves to database
 */

import { StoryData, SliderResponseStruct, TriangleResponseStruct, ParticipantResponseStruct } from '@/hooks/collect/form-submission/types';
import { submitAuthenticatedStory } from '@/hooks/collect/form-submission/storyOperations';
import { submitPublicForm } from '@/hooks/collect/form-submission/publicSubmissionHandler';
import { debugLog, debugError } from '@/utils/debugLogger';

export interface ExtractedStoryData {
  storyText: string;
  storyTitle: string;
  emotionalResponse?: string;
  additionalComments?: string;
  sliderResponses: Map<number, number>;
  triangleResponses: Map<number | string, { x: number; y: number }>;
  participantResponses: Map<string, string>;
  conversationTranscript: string;
  confidence: number;
}

interface SaveResult {
  success: boolean;
  storyId?: string;
  error?: string;
}


/**
 * Convert ExtractedStoryData to StoryData format
 */
function convertToStoryData(
  extractedData: ExtractedStoryData,
  projectId: string,
  context: {
    sliderQuestions?: Array<{
      id: number;
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
  },
  capturedMetadata?: {
    title?: string;
    emotion?: string;
    otherEmotion?: string;
    additionalComments?: string;
  }
): StoryData {
  // Convert slider responses from Map to array format expected by saveSliderResponses
  const sliderResponses: SliderResponseStruct[] = [];

  if (context.sliderQuestions) {
    context.sliderQuestions.forEach(question => {
      const value = extractedData.sliderResponses.get(question.id);
      // Handle -1 as skipped (convert to null for database)
      const actualValue = value === -1 ? null : value;
      const wasSkipped = value === -1;

      sliderResponses.push({
        questionId: question.id,
        questionText: question.question,
        value: actualValue !== undefined ? actualValue : null,
        responseType: wasSkipped ? 'skipped' : (value !== undefined ? 'answered' : 'skipped'),
        leftLabel: question.leftLabel,
        rightLabel: question.rightLabel
      });
    });
  }

  // Convert triangle responses from Map to array format expected by saveTriangleResponses
  const triangleResponses: TriangleResponseStruct[] = [];

  if (context.triangleQuestions) {
    context.triangleQuestions.forEach(question => {
      const value = extractedData.triangleResponses.get(question.id);

      if (value) {
        const isSkipped = value.x === -1 && value.y === -1;
        
        triangleResponses.push({
          questionId: question.id,
          questionText: question.question,
          xPosition: isSkipped ? null : value.x,
          yPosition: isSkipped ? null : value.y,
          responseType: isSkipped ? 'skipped' : 'answered',
          topLabel: question.topLabel,
          bottomLeftLabel: question.bottomLeftLabel,
          bottomRightLabel: question.bottomRightLabel
        });
      }
    });
  }

  // Convert participant responses from Map to array format expected by saveParticipantData
  const participantResponses: ParticipantResponseStruct[] = [];

  if (context.participantQuestions) {
    context.participantQuestions.forEach(question => {
      const response = extractedData.participantResponses.get(question.id);
      // Handle 'SKIPPED' as a special value - save as null in database
      if (response && response !== 'SKIPPED') {
        let choiceText = response;
        if (response.startsWith('[') && response.endsWith(']')) {
          try {
            const parsedIds = JSON.parse(response);
            if (Array.isArray(parsedIds)) {
              const choiceLabels = parsedIds.map((id: string) => {
                const found = question.choices?.find(c => c.id === id);
                return found ? found.label : id;
              });
              choiceText = JSON.stringify(choiceLabels);
            }
          } catch {
            // fallback to raw response
          }
        } else if (question.choices && Array.isArray(question.choices)) {
          const found = question.choices.find(c => c.id === response);
          if (found) {
            choiceText = found.label;
          }
        }

        participantResponses.push({
          questionId: question.id,
          questionText: question.label,
          choiceText
        });
      } else if (response === 'SKIPPED') {
        // Save skipped responses with null choice text
        participantResponses.push({
          questionId: question.id,
          questionText: question.label,
          choiceText: null
        });
      }
    });
  }

  return {
    // Use captured title if available, fallback to extracted
    title: capturedMetadata?.title || extractedData.storyTitle,
    text: extractedData.storyText,
    // Use captured emotion if available, fallback to extracted
    emotionalResponse: capturedMetadata?.emotion === 'other'
      ? capturedMetadata?.otherEmotion || ''
      : capturedMetadata?.emotion || extractedData.emotionalResponse || '',
    additionalComments: capturedMetadata?.additionalComments || extractedData.additionalComments || undefined,
    projectId,
    sliderResponses,
    triangleResponses,
    participantResponses
  };
}

/**
 * Save extracted interview data as a story with all responses
 */
export async function saveExtractedStory(
  extractedData: ExtractedStoryData,
  projectId: string,
  userId: string | null,
  context: {
    sliderQuestions?: Array<{
      id: number;
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
  },
  capturedMetadata?: {
    title?: string;
    emotion?: string;
    otherEmotion?: string;
    additionalComments?: string;
  },
  isPublic: boolean = false,
  formId?: string
): Promise<SaveResult> {
  try {
    debugLog('Converting extracted data to story format...');
    debugLog('Is Public:', isPublic);

    // Convert to StoryData format
    const storyData = convertToStoryData(extractedData, projectId, context, capturedMetadata);

    // Public interview submissions go through the server-side public endpoint (/api/public/submit-story)
    if (isPublic) {
      storyData.isPublic = true;
      storyData.formId = formId;

      debugLog('Submitting public interview story via /api/public/submit-story...');
      const submitted = await submitPublicForm(storyData);
      if (!submitted) {
        return {
          success: false,
          error: 'Failed to save story'
        };
      }

      return {
        success: true,
        storyId: 'public-submitted'
      };
    }

    debugLog('Saving story and responses atomically...');
    const storyId = await submitAuthenticatedStory(storyData, projectId, userId || undefined);

    if (!storyId) {
      return {
        success: false,
        error: 'Failed to save story'
      };
    }

    debugLog('Story and all responses saved successfully');

    return {
      success: true,
      storyId
    };

  } catch (error) {
    debugError('Error saving extracted story:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
