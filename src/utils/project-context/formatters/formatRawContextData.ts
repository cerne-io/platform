/**
 * Main formatter for raw context data
 */
import { FormatOptions } from './types';
import { formatProjectContext } from './sections/projectContext';
import { formatOrganizationInfo } from './sections/organizationInfo';
import { formatFactors } from './sections/factors';
import { formatTopicInfo } from './sections/topicInfo';
import { formatStoryQuestion } from './sections/storyQuestion';
import { formatRemainingData } from './sections/remainingData';

/**
 * Formats raw context data into a readable string for AI prompts
 * 
 * @param rawData Raw context data from fetchComprehensiveProjectContext
 * @param options Formatting options (project name, description)
 * @returns Formatted context string
 */
export const formatRawContextData = (
  rawData: Record<string, unknown>,
  options: FormatOptions
): string => {
  let formattedText = `PROJECT OVERVIEW:\n`;
  formattedText += `Project: ${options.projectName}\n`;

  if (options.projectDescription) {
    formattedText += `Description: ${options.projectDescription}\n`;
  }

  // Format project context data
  formattedText += formatProjectContext(rawData);

  // Format organization information
  formattedText += formatOrganizationInfo(rawData);

  // Format project factors (most important for slider questions)
  formattedText += formatFactors(rawData);

  // Format project topic information
  formattedText += formatTopicInfo(rawData);

  // Format story question
  formattedText += formatStoryQuestion(rawData);

  // Format remaining important data
  formattedText += formatRemainingData(rawData);

  // Optional: Include raw data in a hidden section for debugging
  // This can be uncommented during development if needed
  /*
  try {
    const rawDataExcerpt = JSON.stringify(rawData, null, 2);
    formattedText += `\n\nRAW_DATA: ${rawDataExcerpt}`;
  } catch (e) {
    debugError("Error adding raw data", e);
  }
  */

  return formattedText;
};
