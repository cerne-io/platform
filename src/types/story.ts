export interface SliderResponse {
  id: string;
  question_id: number | string;
  question_text: string;
  value: number | null;
  response_type: "answered" | "skipped";
  left_label?: string;
  right_label?: string;
}

export interface ParticipantResponse {
  id: string;
  question_id: string;
  question_text: string;
  response: string | string[] | number | boolean | null;
  response_type?: string;
}

export interface TriangleResponse {
  id: string;
  question_id: number | string;
  question_text: string;
  x_position: number | null;
  y_position: number | null;
  response_type: "answered" | "skipped";
  top_label?: string;
  bottom_left_label?: string;
  bottom_right_label?: string;
}

export interface SignificationSlider {
  question_id: string;
  question: string;
  value: number | null;
  left_label?: string;
  right_label?: string;
  response_type?: "answered" | "skipped";
}

export interface SignificationTriangle {
  question_id: string;
  question: string;
  x_position: number | null;
  y_position: number | null;
  top_label?: string;
  bottom_left_label?: string;
  bottom_right_label?: string;
  response_type?: "answered" | "skipped";
}

export interface SignificationParticipantResponse {
  question_id: string;
  question: string;
  response_type: string;
  response: string | string[] | number | boolean | null;
}

export interface SignificationSnapshot {
  schema_version: 1;
  sliders: SignificationSlider[];
  triangles: SignificationTriangle[];
  participant_responses: SignificationParticipantResponse[];
}

export interface Story {
  id: number | string;
  story_id?: string;
  public_story_id?: string;
  title: string;
  text: string;
  name?: string;
  email?: string;
  feeling: string;
  feelingSentiment?: "positive" | "neutral" | "negative";
  hasPersistedSentiment?: boolean;
  impact?: number;
  date: string;
  isPublic?: boolean;
  isImported?: boolean;
  additional_comments?: string;
  sliderResponses?: SliderResponse[];
  participantResponses?: ParticipantResponse[];
  triangleResponses?: TriangleResponse[];
  signification?: SignificationSnapshot;
  project_id?: string;
  isSaved?: boolean; // Added for saved story functionality
  has_audio?: boolean; // Flag indicating if this story has an audio recording
  audio_url?: string; // URL to the audio file
  created_at?: string;
  updated_at?: string;
}
