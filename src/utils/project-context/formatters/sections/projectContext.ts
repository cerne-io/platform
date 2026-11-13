
/**
 * Project context formatting module
 */

/**
 * Format project context information
 */
export const formatProjectContext = (rawData: Record<string, unknown>): string => {
  let text = '\n\nPROJECT CONTEXT:\n';

  // Project description
  if (rawData.projectDescription) {
    const data = rawData.projectDescription;
    if (typeof data === 'string') {
      text += `• Description: ${data}\n`;
    } else if (data && typeof data === 'object') {
      Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim()) {
          text += `• ${formatFieldName(key)}: ${value}\n`;
        }
      });
    }
  }

  // Project scope
  if (rawData.projectScope) {
    const data = rawData.projectScope;
    text += `\nProject Scope:\n`;

    if (typeof data === 'string') {
      text += `• ${data}\n`;
    } else if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (dataObj.project_about) text += `• About: ${dataObj.project_about}\n`;
      if (dataObj.problem_solving) text += `• Problem to Solve: ${dataObj.problem_solving}\n`;

      Object.entries(dataObj).forEach(([key, value]) => {
        if (!['project_about', 'problem_solving'].includes(key) && typeof value === 'string' && value.trim()) {
          text += `• ${formatFieldName(key)}: ${value}\n`;
        }
      });
    }
  }

  // Project trigger
  if (rawData.projectTrigger) {
    const data = rawData.projectTrigger;
    text += `\nProject Trigger:\n`;

    if (typeof data === 'string') {
      text += `• ${data}\n`;
    } else if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (dataObj.project_trigger) text += `• ${dataObj.project_trigger}\n`;

      Object.entries(dataObj).forEach(([key, value]) => {
        if (key !== 'project_trigger' && typeof value === 'string' && value.trim()) {
          text += `• ${formatFieldName(key)}: ${value}\n`;
        }
      });
    }
  }

  // Project success criteria
  if (rawData.projectSuccess) {
    const data = rawData.projectSuccess;
    text += `\nProject Success Criteria:\n`;

    if (typeof data === 'string') {
      text += `• ${data}\n`;
    } else if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (dataObj.achievement) text += `• Achievement: ${dataObj.achievement}\n`;

      const successCriteria = dataObj.success_criteria || dataObj.project_success;
      if (typeof successCriteria === 'string') {
        text += `• Success Criteria: ${successCriteria}\n`;

        // Try to parse any bullet points in success criteria
        if (successCriteria.includes('•') || successCriteria.includes('-') || successCriteria.includes('*')) {
          const bulletPoints = successCriteria
            .split(/\n|•|⦁|·|●|\*|-/)
            .map((point: string) => point.trim())
            .filter((point: string) => point.length > 0);

          if (bulletPoints.length > 1) {
            text += "Success criteria details:\n";
            bulletPoints.forEach((point: string) => {
              if (point) text += `  ⦁ ${point}\n`;
            });
          }
        }
      }

      Object.entries(dataObj).forEach(([key, value]) => {
        if (!['achievement', 'success_criteria', 'project_success'].includes(key) && typeof value === 'string' && value.trim()) {
          text += `• ${formatFieldName(key)}: ${value}\n`;
        }
      });
    }
  }

  return text;
};

// Import the utility function
import { formatFieldName } from '../utils/formattingUtils';
