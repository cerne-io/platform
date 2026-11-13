
import { SliderQuestion, ParticipantQuestion, TriangleQuestion } from "../types/designTypes";
import { isPlainObject } from "./types";
import { debugLog, debugError } from "@/utils/debugLogger";

/**
 * Extracts the story question from various response formats
 */
export const extractStoryQuestion = (response: unknown): string | Record<string, string> | null => {
  try {
    // Handle string directly
    if (typeof response === 'string') {
      return response.trim();
    }

    // Handle object with question property
    if (isPlainObject(response) && typeof response.question === 'string') {
      return response.question.trim();
    }

    // Handle object with storyQuestion property
    if (isPlainObject(response) && typeof response.storyQuestion === 'string') {
      return response.storyQuestion.trim();
    }

    // Handle multi-language object (Record<string, string>)
    if (isPlainObject(response)) {
      // Check if it's a multi-language map (has 'en', 'pt-BR', etc.)
      const keys = Object.keys(response);
      if (keys.length > 0 && keys.every(k => typeof response[k] === 'string')) {
        return response as Record<string, string>;
      }
    }

    // Handle nested structure with storyQuestion property (recursive check)
    if (isPlainObject(response) && response.storyQuestion) {
      return extractStoryQuestion(response.storyQuestion);
    }

    // Handle nested structure with question property (recursive check)
    if (isPlainObject(response) && response.question) {
      return extractStoryQuestion(response.question);
    }

    // Handle nested structure
    if (isPlainObject(response) && isPlainObject(response.data) && typeof response.data.question === 'string') {
      return response.data.question.trim();
    }

    debugLog("No recognized story question format found");
    return null;
  } catch (error) {
    debugError("Error extracting story question:", error);
    return null;
  }
};

/**
 * Cleans and standardizes a slider question
 */
export const cleanSliderQuestion = (question: SliderQuestion): SliderQuestion => {
  return {
    id: question.id,
    theme: question.theme || "", // Add theme with default empty string
    question: typeof question.question === 'string' ? question.question.trim() : "",
    leftLabel: typeof question.leftLabel === 'string' ? question.leftLabel.trim() : "Not at all",
    rightLabel: typeof question.rightLabel === 'string' ? question.rightLabel.trim() : "Very much",
    sliderValue: typeof question.sliderValue === 'number' ? question.sliderValue : 50,
    translations: question.translations
  };
};

/**
 * Extracts slider questions from various response formats
 */
export const extractSliderQuestions = (response: unknown): SliderQuestion[] | null => {
  try {
    // Handle direct array of slider questions
    if (Array.isArray(response)) {
      debugLog("Found direct array of slider questions");
      return response.filter(item => item && typeof item === 'object')
        .map(cleanSliderQuestion);
    }

    // Handle nested sliderQuestions array
    if (isPlainObject(response) && response.sliderQuestions && Array.isArray(response.sliderQuestions)) {
      debugLog("Found nested sliderQuestions array");
      return response.sliderQuestions.filter(item => item && typeof item === 'object')
        .map(cleanSliderQuestion);
    }

    // Handle questions property if present
    if (isPlainObject(response) && response.questions && Array.isArray(response.questions)) {
      debugLog("Found questions array");
      return response.questions.filter(item => item && typeof item === 'object')
        .map(cleanSliderQuestion);
    }

    debugLog("No recognized slider questions format found");
    return null;
  } catch (error) {
    debugError("Error extracting slider questions:", error);
    return null;
  }
};
/**
 * Cleans and standardizes a triangle question
 */
export const cleanTriangleQuestion = (question: TriangleQuestion): TriangleQuestion => {
  return {
    id: question.id,
    theme: question.theme || "",
    question: typeof question.question === 'string' ? question.question.trim() : "",
    topLabel: typeof question.topLabel === 'string' ? question.topLabel.trim() : "Option A",
    bottomLeftLabel: typeof question.bottomLeftLabel === 'string' ? question.bottomLeftLabel.trim() : "Option B",
    bottomRightLabel: typeof question.bottomRightLabel === 'string' ? question.bottomRightLabel.trim() : "Option C",
    translations: question.translations
  };
};

/**
 * Extracts triangle questions from various response formats
 */
export const extractTriangleQuestions = (response: unknown): TriangleQuestion[] | null => {
  try {
    // Handle direct array of triangle questions
    if (Array.isArray(response)) {
      debugLog("Found direct array of triangle questions");
      return response.filter(item => item && typeof item === 'object')
        .map(cleanTriangleQuestion);
    }

    // Handle nested triangleQuestions array
    if (isPlainObject(response) && response.triangleQuestions && Array.isArray(response.triangleQuestions)) {
      debugLog("Found nested triangleQuestions array");
      return response.triangleQuestions.filter(item => item && typeof item === 'object')
        .map(cleanTriangleQuestion);
    }

    // Handle questions property if present
    if (isPlainObject(response) && response.questions && Array.isArray(response.questions)) {
      debugLog("Found questions array for triangles");
      return response.questions.filter(item => item && typeof item === 'object')
        .map(cleanTriangleQuestion);
    }

    debugLog("No recognized triangle questions format found");
    return null;
  } catch (error) {
    debugError("Error extracting triangle questions:", error);
    return null;
  }
};


/**
 * Extracts participant questions from various response formats
 */
export const extractParticipantQuestions = (response: unknown): ParticipantQuestion[] | null => {
  try {
    // Handle direct array of participant questions
    if (Array.isArray(response)) {
      debugLog("Found direct array of participant questions");
      return response.filter(item => item && typeof item === 'object');
    }

    // Handle nested participantQuestions array
    if (isPlainObject(response) && response.participantQuestions && Array.isArray(response.participantQuestions)) {
      debugLog("Found nested participantQuestions array");
      return response.participantQuestions.filter(item => item && typeof item === 'object');
    }

    // Handle questions property if present
    if (isPlainObject(response) && response.questions && Array.isArray(response.questions)) {
      debugLog("Found questions array for participants");
      return response.questions.filter(item => item && typeof item === 'object');
    }

    debugLog("No recognized participant questions format found");
    return null;
  } catch (error) {
    debugError("Error extracting participant questions:", error);
    return null;
  }
};

/**
 * Extracts the includePreferNotToSay flag from various response formats
 */
export const extractIncludePreferNotToSay = (response: unknown): boolean => {
  try {
    if (isPlainObject(response) && response.includePreferNotToSay !== undefined) {
      return Boolean(response.includePreferNotToSay);
    }
    return true; // Default to true if not specified
  } catch {
    return true;
  }
};
