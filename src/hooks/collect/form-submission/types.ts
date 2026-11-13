
/**
 * Story submission data structure
 * All text fields are validated and sanitized before database insertion
 * See validationSchemas.ts for length limits and security constraints
 */
// Define response interfaces here or import them if available elsewhere
// For now, defining them inline to avoid circular dependencies with storySaveService
export interface SliderResponseStruct {
  questionId: number;
  questionText: string;
  value: number | null;
  responseType: string;
  leftLabel: string;
  rightLabel: string;
}

export interface TriangleResponseStruct {
  questionId: number;
  questionText: string;
  xPosition: number | null;
  yPosition: number | null;
  responseType: string;
  topLabel: string;
  bottomLeftLabel: string;
  bottomRightLabel: string;
}

export interface ParticipantResponseStruct {
  questionId: string;
  questionText: string;
  choiceId?: string;
  choiceText: string | null;
}

export interface StoryData {
  /** Story title (max 200 characters, sanitized) */
  title: string;

  /** Main story text (max 10,000 characters, sanitized) */
  text: string;

  /** Emotional response/feeling (max 500 characters, sanitized) */
  emotionalResponse: string;

  /** Additional comments (max 2,000 characters, sanitized) */
  additionalComments?: string;

  /** Slider question responses */
  sliderResponses?: SliderResponseStruct[];

  /** Participant question responses */
  participantResponses?: ParticipantResponseStruct[];

  /** Triangle question responses */
  triangleResponses?: TriangleResponseStruct[];

  /** Project ID this story belongs to */
  projectId?: string;

  /** Form identifier for spam prevention */
  formId?: string;

  /** Whether this story was imported from external source */
  isImported?: boolean;

  /** Source of the story (e.g., 'csv_import', 'template_copy') */
  storySource?: string;

  /** Whether this story has audio recording */
  hasAudio?: boolean;

  /** Base64 encoded audio data */
  audioData?: string;

  /** Whether this is a public submission (anonymous) */
  isPublic?: boolean;

  /** User ID for authenticated submissions */
  userId?: string | null;
}

// Add the missing FormSubmissionHandler type
export type FormSubmissionHandler = (data: StoryData) => Promise<boolean | string>;

// Add SliderResponseData type (validated and sanitized)
export interface SliderResponseData {
  story_id: string;
  /** Question ID (converted to number for database) */
  question_id: string | number;
  /** Question text (max 500 characters, sanitized) */
  question_text: string;
  /** Slider value (clamped to 0-100 range) */
  value: number | null;
  /** Response type indicator */
  response_type?: string;
  /** Left label (max 100 characters, sanitized) */
  left_label?: string;
  /** Right label (max 100 characters, sanitized) */
  right_label?: string;
  sr_project_id?: string;
  form_id?: string; // Form identifier for spam prevention
  created_at?: string; // Optional override for anonymity
}

// Add ParticipantResponseData type (validated and sanitized)
export interface ParticipantResponseData {
  story_id: string;
  question_id: string;
  /** Question text (max 500 characters, sanitized) */
  question_text: string;
  /** Participant response (max 1,000 characters, sanitized) */
  response: string;
  pr_project_id?: string;
  form_id?: string; // Form identifier for spam prevention
  created_at?: string; // Optional override for anonymity
}

// Add TriangleResponseData type (validated and sanitized)
export interface TriangleResponseData {
  story_id: string;
  /** Question ID (converted to number for database) */
  question_id: string | number;
  /** Question text (max 500 characters, sanitized) */
  question_text: string;
  /** X position (clamped to 0-100 range) */
  x_position: number | null;
  /** Y position (clamped to 0-100 range) */
  y_position: number | null;
  /** Response type indicator */
  response_type?: string;
  /** Top label (max 100 characters, sanitized) */
  top_label?: string;
  /** Bottom left label (max 100 characters, sanitized) */
  bottom_left_label?: string;
  /** Bottom right label (max 100 characters, sanitized) */
  bottom_right_label?: string;
  tr_project_id?: string;
  form_id?: string; // Form identifier for spam prevention
  created_at?: string; // Optional override for anonymity
}
