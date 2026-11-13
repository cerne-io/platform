
import { STORAGE_KEYS } from './constants/storageKeys';
import { ParticipantQuestion, ParticipantQuestionsData } from './types/designTypes';
import { getStorageItem, setStorageItem, markFormAsDesigned } from './utils/storageUtils';
import { debugLog } from '@/utils/debugLogger';

// Get the participant questions for a specific project
export const getParticipantQuestions = (projectId?: string): ParticipantQuestionsData => {
  // Use project-specific storage key if available
  const storageKey = projectId
    ? `${STORAGE_KEYS.PARTICIPANT_QUESTIONS}_${projectId}`
    : STORAGE_KEYS.PARTICIPANT_QUESTIONS;

  const preferNotToSayKey = projectId
    ? `cerne_prefer_not_to_say_${projectId}`
    : `cerne_prefer_not_to_say`;

  // First check the project-specific or global storage location
  const savedQuestions = getStorageItem<ParticipantQuestion[] | null>(storageKey, null);

  const includeStr = localStorage.getItem(preferNotToSayKey);
  const includePreferNotToSay = includeStr !== null ? includeStr === 'true' : true;

  // Validate the data we got
  if (!Array.isArray(savedQuestions)) {
    debugLog("Invalid participant questions format, returning empty array");
    return { questions: [], includePreferNotToSay };
  }

  // Filter out any questions that don't have the required properties
  const validQuestions = savedQuestions.filter(q =>
    q && typeof q === 'object' && 'id' in q && 'label' in q && 'choices' in q
  );

  debugLog(`Retrieved participant questions for project: ${projectId || 'global'}:`, validQuestions);
  return { questions: validQuestions, includePreferNotToSay };
};

// Helper function to save participant questions
export const saveParticipantQuestions = (questions: ParticipantQuestion[], projectId?: string, includePreferNotToSay: boolean = true): void => {
  // Use project-specific storage key if available
  const storageKey = projectId
    ? `${STORAGE_KEYS.PARTICIPANT_QUESTIONS}_${projectId}`
    : STORAGE_KEYS.PARTICIPANT_QUESTIONS;

  const preferNotToSayKey = projectId
    ? `cerne_prefer_not_to_say_${projectId}`
    : `cerne_prefer_not_to_say`;

  setStorageItem(storageKey, questions);
  localStorage.setItem(preferNotToSayKey, includePreferNotToSay.toString());



  // Use projectId if provided, otherwise use undefined which will just mark the global flag
  markFormAsDesigned(projectId || '');

  debugLog("Saved participant questions:", questions, "for project:", projectId || 'global');
};

// Export a renamed function for the hooks that need it
export const getParticipantQuestionsFromService = getParticipantQuestions;
