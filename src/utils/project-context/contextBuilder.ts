
/**
 * Core functionality for building project context strings
 */

import { ProjectContextProps } from './types';
import { processActivityResponses } from './processors/activityProcessor';

/**
 * Build a structured context string for ChatGPT based on project data
 */
export const buildProjectContext = (props: ProjectContextProps | { name: string, description?: string, id?: string }): string => {
  // Extract project name and description - handle both input types
  const projectName = 'projectName' in props ? props.projectName : props.name;
  const projectDescription = 'projectDescription' in props
    ? props.projectDescription
    : ('description' in props ? props.description : undefined);
  const storyData = 'storyData' in props ? props.storyData : undefined;
  const activityResponses = 'activityResponses' in props ? props.activityResponses : undefined;

  let context = `PROJECT OVERVIEW:\n`;
  context += `Project: ${projectName}\n`;

  if (projectDescription) {
    context += `Description: ${projectDescription}\n`;
  }

  if (storyData) {
    context += `\nSTORY COLLECTION DATA:\n`;
    context += `- Total stories: ${storyData.storyCount}\n`;
    context += `- Sentiment breakdown: ${storyData.sentiments.positive} positive, ${storyData.sentiments.neutral} neutral, ${storyData.sentiments.negative} negative\n`;
    context += `- Average impact rating: ${storyData.avgImpact}/10\n`;

    if (storyData.hasSliderData && storyData.sliderQuestions && storyData.sliderQuestions.length > 0) {
      context += `\nSlider Questions in stories:\n`;
      storyData.sliderQuestions.forEach((question) => {
        context += `- ${question}\n`;
      });
    }
  }

  // Add activity response data if available
  if (activityResponses) {
    context = processActivityResponses(context, activityResponses);
  } else {
    // No activity responses data available - this is often expected behavior
  }

  return context;
};
