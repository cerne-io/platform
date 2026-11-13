
/**
 * Centralized type definitions for chat-related functionality
 */

export type AIProvider = 'openai' | 'perplexity' | 'anthropic' | 'custom';

export type MessageType = 'text' | 'slider' | 'multiple_choice' | 'emotion_selection' | 'triangle';

export interface SliderMessageData {
  questionId: number;
  question: string;
  leftLabel: string;
  rightLabel: string;
  theme?: string;
}

export interface TriangleMessageData {
  questionId: number;
  question: string;
  topLabel: string;
  bottomLeftLabel: string;
  bottomRightLabel: string;
}

export interface MultipleChoiceMessageData {
  questionId: string;
  question: string;
  choices: Array<{ id: string; label: string }>;
  questionType?: 'multiple-choice' | 'checkboxes';
}

export interface KnowledgeReference {
  chunk_id: string;
  ref_id: string;
  title: string;
  source_title: string;
  source_author?: string | null;
  source_locator?: string | null;
  provenance_type: string;
  text: string;
  score?: number;
}

export type ChatErrorCode =
  | 'api_key_missing'
  | 'invalid_api_key'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'bad_request'
  | 'rate_limited'
  | 'service_unavailable'
  | 'gateway_timeout'
  | 'bad_gateway'
  | 'network_error'
  | 'relay_error'
  | 'edge_function_error'
  | 'client_error'
  | 'invalid_response'
  | 'api_error';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  messageType?: MessageType;
  interactiveData?: SliderMessageData | MultipleChoiceMessageData | TriangleMessageData;
  citations?: string[];
  knowledgeReferences?: KnowledgeReference[];
  isError?: boolean;
  phase?: string;
}

export interface ChatDebugInfo {
  prompt: string | null;
  context: string | null;
  response: string | null;
}

export type AssistantMode = 'general' | 'storyQuestion' | 'improve' | 'analysis' | 'design' | 'suggestNextStep' | 'translate' | 'guidedDesign';

export interface AIAssistantRequest {
  prompt: string;
  projectContext?: string;
  mode?: AssistantMode;
  content?: unknown;
  targetLanguage?: string;
  targetLanguages?: string[];
  promptKey?: string;
  promptVariables?: Record<string, string>;
  sessionToken?: string;
}

export interface AIAssistantResponse {
  response: string | null;
  error: string | null;
  errorCode: string | null;
  skipped?: boolean;
}
