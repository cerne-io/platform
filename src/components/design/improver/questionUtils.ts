import { debugError } from "@/utils/debugLogger";
/**
 * Extract just the question from a longer AI response
 * that might contain explanations or other text
 */
export const extractQuestionFromResponse = (response: string): string => {
  // First check if the response is empty or not a string
  if (!response || typeof response !== 'string') {
    return '';
  }

  const trimmedResponse = response.trim();

  // STRATEGY 1: Look for content explicitly inside double quotes
  // This is the most reliable method when the AI follows the pattern: Here is the question: "The Question?"
  const quoteMatch = trimmedResponse.match(/"([^"]+)"/);
  if (quoteMatch && quoteMatch[1] && quoteMatch[1].length > 10) {
    // We found a quoted string that looks substantial
    return quoteMatch[1].trim();
  }

  // STRATEGY 2: Remove common prefixes and take the rest
  // If no quotes, we assume the AI just output the question or prefixed it
  let cleanedResponse = trimmedResponse
    .replace(/^(here's an improved question:|improved question:|here is the improved question:|the improved question is:|suggestion:|here is a thoughtful, open-ended question[^:]*:)/i, '')
    .trim();

  // Remove leading/trailing quotes if they remain
  cleanedResponse = cleanedResponse.replace(/^["']|["']$/g, '').trim();

  // STRATEGY 3: Clean up trailing text
  // Sometimes AI adds text after the question, e.g. "Question? Hope this helps."
  // We look for the LAST question mark and take everything up to it
  const lastQuestionMarkIndex = cleanedResponse.lastIndexOf('?');
  if (lastQuestionMarkIndex > 0) {
    return cleanedResponse.substring(0, lastQuestionMarkIndex + 1);
  }

  return cleanedResponse;
};

/**
 * Strict extractor for FRESHLY GENERATED story questions only.
 * Picks the first real question out of conversational / multi-option / markdown output.
 * Do NOT use for user-authored or persisted text (it intentionally truncates).
 */
export const extractGeneratedQuestion = (response: string): string => {
  // First check if the response is empty or not a string
  if (!response || typeof response !== 'string') {
    return '';
  }

  // 1. Remove markdown bold/italic headers like **Question:** or ### Suggested Question
  let text = response
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim();

  // 2. Check if the text has multiple lines.
  // If the model output conversational intro + list of questions (e.g. "Here are a few questions:\n1. What happened...?\n2. Can you tell..."),
  // find the first line that looks like a legitimate question ending in '?' or containing an eliciting question phrase.
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    for (const line of lines) {
      const strippedLine = line.replace(/^(\d+[.)]\s*|[-•*]\s*)/, '').trim();
      const isConversationalIntro = /^(here (is|are)|certainly|sure|below|based on|i recommend|options?:|suggestions?:)/i.test(strippedLine);
      if (!isConversationalIntro && (strippedLine.includes('?') || /^(what|how|can you|tell me|describe|share|when)/i.test(strippedLine))) {
        text = strippedLine;
        break;
      }
    }
  }

  // 3. Look for content explicitly inside quotes if it forms a question
  const quoteMatch = text.match(/"([^"]{10,}\??)"/);
  if (quoteMatch && quoteMatch[1] && quoteMatch[1].includes('?')) {
    text = quoteMatch[1].trim();
  }

  // 4. Remove common conversational prefixes
  text = text
    .replace(/^(here's an improved question:|improved question:|here is the improved question:|the improved question is:|suggestion:|here is a thoughtful, open-ended question[^:]*:|here is a story question[^:]*:|story question:|question:)/i, '')
    .trim();

  // 5. Remove leading/trailing quotes
  text = text.replace(/^["'«»“”]|["'«»“”]$/g, '').trim();

  // 6. Clean up trailing conversational sign-offs after the question mark
  const firstQuestionMarkIndex = text.indexOf('?');
  if (firstQuestionMarkIndex > 0) {
    const after = text.substring(firstQuestionMarkIndex + 1).trim();
    if (after.length > 0) {
      if (/^(hope|let me know|this question|feel free|note:|good luck)/i.test(after) || !after.includes('?')) {
        text = text.substring(0, firstQuestionMarkIndex + 1);
      } else {
        // If there are multiple question marks, keep only the first complete question
        text = text.substring(0, firstQuestionMarkIndex + 1);
      }
    }
  }

  return text.trim();
};

/**
 * Clean up question text by:
 * - Removing dashes and unnecessary punctuation
 * - Ensuring proper spacing
 * - Capitalizing first letter
 * - Ensuring question ends with exactly one question mark
 */
export const cleanQuestionText = (text: string): string => {
  // First check if the text is empty or not a string
  if (!text || typeof text !== 'string') {
    return '';
  }

  // If text is just question marks or very short, return empty string
  if (text.trim() === '?' || text.trim() === '? ?' || text.length < 3) {
    return '';
  }

  // Main cleaning process
  let cleanedText = text
    // Remove any surrounding quotes
    .replace(/^["']|["']$/g, '')
    // Remove any leading/trailing dashes or spaces
    .trim()
    .replace(/^-+|-+$/g, '')
    // Remove common AI prefixes that might have been missed
    .replace(/^(here's a question:|question:|suggested question:)/i, '')
    // Replace dashes inside text with spaces
    .replace(/-+/g, ' ')
    // Fix spaces around punctuation
    .replace(/\s+([.,?!])/g, '$1')
    // Ensure single space after punctuation
    .replace(/([.,?!])\s*/g, '$1 ')
    // Remove double spaces
    .replace(/\s+/g, ' ')
    // Capitalize first letter
    .replace(/^[a-z]/, letter => letter.toUpperCase())
    // Trim again to remove any trailing spaces
    .trim();

  // Special handling for question marks - ensure exactly one at the end
  // First remove any trailing question marks
  cleanedText = cleanedText.replace(/\?+$/, '');

  // Then add a single question mark if needed
  if (!cleanedText.endsWith('?')) {
    cleanedText += '?';
  }

  return cleanedText;
};

/**
 * Cleanup for FRESHLY GENERATED story questions only (strips list markers,
 * collapses repeated punctuation, preserves hyphenated words).
 */
export const cleanGeneratedQuestion = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  if (text.trim() === '?' || text.trim() === '? ?' || text.length < 3) return '';

  let cleanedText = text
    .replace(/^["'«»“”]|["'«»“”]$/g, '')
    .trim()
    .replace(/^(\d+[.)]\s*|[-•*]\s*)/, '')
    .replace(/^-+|-+$/g, '')
    .replace(/^(here's a question:|question:|suggested question:|story question:)/i, '')
    .replace(/--+/g, ' ')
    .replace(/\?+/g, '?')
    .replace(/!+/g, '!')
    .replace(/\s+([.,?!])/g, '$1')
    .replace(/([.,?!])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .replace(/^[a-z]/, letter => letter.toUpperCase())
    .trim();

  cleanedText = cleanedText.replace(/[\s?.!]+$/, '').trim();
  return cleanedText + '?';
};

/**
 * Process a freshly generated AI story question into a single clean question.
 */
export const processGeneratedQuestion = (response: string): string => {
  if (!response) return '';
  try {
    const cleaned = cleanGeneratedQuestion(extractGeneratedQuestion(response));
    return cleaned.trim().length > 3 ? cleaned : processAIResponse(response);
  } catch (error) {
    debugError("Error processing generated question:", error);
    return processAIResponse(response);
  }
};

/**
 * Process and clean up a response from the AI service
 */
export const processAIResponse = (response: string): string => {
  // Safety check for null or undefined values
  if (!response) {
    // This is valid when no question exists yet, so just return empty string
    return "";
  }

  try {
    // First extract just the question part
    const extractedQuestion = extractQuestionFromResponse(response);

    // Then clean it up
    const cleanedQuestion = cleanQuestionText(extractedQuestion);

    // Only return the cleaned question if it's not empty
    if (cleanedQuestion && cleanedQuestion.trim().length > 3) {
      return cleanedQuestion;
    }

    // If cleaning resulted in an empty or very short string, 
    // return a default question rather than an invalid one
    return "Please share your story with us.";
  } catch (error) {
    debugError("Error processing AI response:", error);
    // Return a default question if processing fails
    return "Please share your story with us.";
  }
};
