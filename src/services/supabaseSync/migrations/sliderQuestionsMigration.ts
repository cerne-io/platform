
import { SliderQuestion } from '@/services/types/designTypes';
import { fetchActivityResponse, saveActivityResponse, isAuthenticated } from '../operations';

import { debugLog, debugError } from "@/utils/debugLogger";

// Define our canonical storage location
export const CANONICAL_SLIDER_LOCATION = {
  phase: 'design',
  step: 'questions',
  activity: 'slider-questions'
};

// Define secondary location for public form
export const PUBLIC_FORM_SLIDER_LOCATION = {
  phase: 'collection',
  step: 'public-form',
  activity: 'slider-questions'
};

// Define the type for legacy locations to ensure all have a key property
interface LegacyLocation {
  phase: string;
  step: string;
  activity: string;
  key: string;
}

// Define all possible locations where slider questions might be stored
export const LEGACY_SLIDER_LOCATIONS: LegacyLocation[] = [
  { phase: 'collection', step: 'questions', activity: 'slider-questions', key: 'sliderQuestions' },
  { phase: 'design', step: 'form-questions', activity: 'slider-questions', key: 'sliderQuestions' },
  { phase: PUBLIC_FORM_SLIDER_LOCATION.phase, step: PUBLIC_FORM_SLIDER_LOCATION.step, activity: PUBLIC_FORM_SLIDER_LOCATION.activity, key: 'sliderQuestions' },
  { phase: 'collection', step: 'public-form', activity: 'form-config', key: 'sliderQuestions' }
];

/**
 * Clean and validate a slider question
 */
export const cleanSliderQuestion = (question: SliderQuestion): SliderQuestion => {
  // Ensure ID is a valid positive integer to avoid database errors
  // If ID is float (legacy Math.random()) or invalid, generate a new integer
  let id = question.id;
  if (!id || typeof id !== 'number' || id < 1 || !Number.isInteger(id)) {
    // Generate a random integer within Postgres integer range
    id = Math.floor(Math.random() * 2147483647);
  }

  return {
    id,
    theme: question.theme || 'General',
    question: typeof question.question === 'string'
      ? question.question.trim().replace(/\s+/g, ' ').replace(/\.(.*?)\./, ". ").replace(/(\.+ )/g, '. ')
      : `Question ${question.id}`,
    leftLabel: typeof question.leftLabel === 'string' ? question.leftLabel.trim() : 'Not at all',
    rightLabel: typeof question.rightLabel === 'string' ? question.rightLabel.trim() : 'Very much',
    sliderValue: Number(question.sliderValue || 50),
    translations: question.translations || undefined
  };
};

/**
 * Migrates slider questions data from all possible locations to the canonical location
 */
export const migrateSliderQuestions = async (projectId: string): Promise<SliderQuestion[]> => {
  if (!projectId) {
    debugLog("No project ID provided, migration skipped");
    return [];
  }

  debugLog(`Starting slider questions migration for project: ${projectId}`);

  try {
    // Check if the user is authenticated
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      debugLog("User not authenticated, migration skipped");
      return [];
    }

    // First check if we already have data in the canonical location
    debugLog("Checking canonical location for existing data");
    const canonicalData = await fetchActivityResponse<{ sliderQuestions: SliderQuestion[] }>(
      projectId,
      CANONICAL_SLIDER_LOCATION.phase,
      CANONICAL_SLIDER_LOCATION.step,
      CANONICAL_SLIDER_LOCATION.activity,
      undefined,
      'sliderQuestions'
    );

    if (canonicalData && Array.isArray(canonicalData) && canonicalData.length > 0) {
      debugLog("Data already exists in canonical location");

      // SELF-HEALING: Verify that the public mirror also exists and is valid
      // This ensures that even if migration was previously skipped, we enforce the mirror
      try {
        const publicData = await fetchActivityResponse<unknown>(
          projectId,
          PUBLIC_FORM_SLIDER_LOCATION.phase,
          PUBLIC_FORM_SLIDER_LOCATION.step,
          PUBLIC_FORM_SLIDER_LOCATION.activity,
          null,
          'sliderQuestions'
        );

        const hasPublicData = publicData && (
          (Array.isArray(publicData) && publicData.length > 0) ||
          ((publicData as Record<string, unknown>).sliderQuestions && Array.isArray((publicData as Record<string, unknown>).sliderQuestions) && ((publicData as Record<string, unknown>).sliderQuestions as unknown[]).length > 0)
        );

        if (!hasPublicData) {
          debugLog("⚠️ Public mirror missing despite canonical data existing. Self-healing...");

          const questionsToSync = canonicalData.map(cleanSliderQuestion);

          await saveActivityResponse(
            projectId,
            PUBLIC_FORM_SLIDER_LOCATION.phase,
            PUBLIC_FORM_SLIDER_LOCATION.step,
            PUBLIC_FORM_SLIDER_LOCATION.activity,
            { sliderQuestions: questionsToSync }
          );
          debugLog("✅ Self-healing completed: Public mirror updated");
        } else {
          debugLog("✅ Public mirror verified");
        }
      } catch (mirrorError) {
        debugError("Error verifying public mirror:", mirrorError);
      }

      return canonicalData.map(cleanSliderQuestion);
    }

    // If no canonical data, check all legacy locations
    debugLog("Checking all legacy locations for data");

    let mostRecentQuestions: SliderQuestion[] = [];

    // Check each location in order
    for (const location of LEGACY_SLIDER_LOCATIONS) {
      debugLog(`Checking ${location.phase}/${location.step}/${location.activity}`);

      const locationData = await fetchActivityResponse<unknown>(
        projectId,
        location.phase,
        location.step,
        location.activity,
        null,
        location.key
      );

      let questionsFromLocation: SliderQuestion[] = [];

      if (locationData) {
        if (Array.isArray(locationData)) {
          debugLog(`Found array with ${locationData.length} questions`);
          questionsFromLocation = locationData as SliderQuestion[];
        } else if (typeof locationData === 'object' && locationData !== null) {
          const locObj = locationData as Record<string, unknown>;
          if (Array.isArray(locObj.sliderQuestions)) {
            debugLog(`Found sliderQuestions array with ${locObj.sliderQuestions.length} items`);
            questionsFromLocation = locObj.sliderQuestions as SliderQuestion[];
          }
        }
      }

      if (questionsFromLocation.length > 0) {
        debugLog(`Found ${questionsFromLocation.length} questions in ${location.phase}/${location.step}/${location.activity}`);

        // If we find questions, use them and continue checking other locations
        if (questionsFromLocation.length > mostRecentQuestions.length) {
          mostRecentQuestions = questionsFromLocation;
        }
      }
    }

    // If we found questions, migrate them to the canonical location
    if (mostRecentQuestions.length > 0) {
      debugLog(`Migrating ${mostRecentQuestions.length} questions to canonical location`);

      // Clean the questions
      const cleanedQuestions = mostRecentQuestions.map(cleanSliderQuestion);

      // Save to canonical location
      await saveActivityResponse(
        projectId,
        CANONICAL_SLIDER_LOCATION.phase,
        CANONICAL_SLIDER_LOCATION.step,
        CANONICAL_SLIDER_LOCATION.activity,
        { sliderQuestions: cleanedQuestions }
      );

      // Also save to public form location for future use
      await saveActivityResponse(
        projectId,
        PUBLIC_FORM_SLIDER_LOCATION.phase,
        PUBLIC_FORM_SLIDER_LOCATION.step,
        PUBLIC_FORM_SLIDER_LOCATION.activity,
        { sliderQuestions: cleanedQuestions }
      );

      debugLog("Migration completed successfully");
      return cleanedQuestions;
    }

    debugLog("No slider questions found in any location");
    return [];
  } catch (error) {
    debugError("Error during slider questions migration:", error);
    return [];
  }
};
