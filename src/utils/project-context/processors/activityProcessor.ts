
/**
 * Process activity responses and add them to the context
 */
import { processFactors, processAlternativeFactors } from './factors';
import { processTopic } from './topicProcessor';
import { processStoryQuestion } from './storyQuestionProcessor';
import { processOrganizationInfo } from './organizationProcessor';
import { processRemainingResponses } from './miscProcessor';
import { processProjectDescription } from './projectDescriptionProcessor';
import { processProjectSuccess } from './projectSuccessProcessor';
import { processProjectTrigger } from './projectTriggerProcessor';
import { processProjectScope } from './projectScopeProcessor';
import { debugLog } from "@/utils/debugLogger";

export function processActivityResponses(context: string, activityResponses: Record<string, unknown>): string {
  // Ensure we have data to process
  if (!activityResponses || Object.keys(activityResponses).length === 0) {
    debugLog("Empty activity responses object provided");
    return context;
  }

  // Debug the full activityResponses object
  debugLog("Building context with activityResponses data containing keys:", Object.keys(activityResponses));
  debugLog("Activity responses sample:", JSON.stringify(activityResponses).substring(0, 300) + "...");

  context += `\nPROJECT ACTIVITY DATA:\n`;

  // Process project description
  context = processProjectDescription(context, activityResponses);

  // Process project success information
  context = processProjectSuccess(context, activityResponses);

  // Process trigger information
  context = processProjectTrigger(context, activityResponses);

  // Process scope information
  context = processProjectScope(context, activityResponses);

  // Process the factors (most important for slider generation)
  let factorsProcessed = processFactors(context, activityResponses);

  // Try alternate factor locations if primary location didn't work
  if (!factorsProcessed) {
    factorsProcessed = processAlternativeFactors(context, activityResponses);
  }

  // Include topic information if available
  context = processTopic(context, activityResponses);

  // Include existing story question if available
  context = processStoryQuestion(context, activityResponses);

  // Process organization information
  context = processOrganizationInfo(context, activityResponses);

  // Process all other activity responses systematically
  context = processRemainingResponses(context, activityResponses);

  return context;
};
