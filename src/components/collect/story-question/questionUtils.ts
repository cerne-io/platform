import { debugLog } from "@/utils/debugLogger";

/**
 * Process a raw question string to ensure it's display-ready
 * This includes handling HTML entities, newlines, and other formatting issues
 */
export function processQuestion(questionText: string | Record<string, string> | null): string | Record<string, string> {
  if (!questionText) return "";
  
  // If it's an object (translation record), return as is
  if (typeof questionText !== 'string') {
    return questionText;
  }

  // Clean the question text if it's a string
  const cleaned = questionText
    .trim()
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

  debugLog("Question processed (plain text):", JSON.stringify(cleaned));

  return cleaned;
}
