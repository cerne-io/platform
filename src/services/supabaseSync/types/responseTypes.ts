
export interface FetchActivityResponseResult {
  found: boolean;
  data?: {
    id: string;
    ar_project_id: string;
    ar_phase_id: string;
    ar_step_id: string;
    ar_activity_id: string;
    ar_response: unknown;
    created_at: string;
    updated_at: string;
  };
  error?: string;
  error_code?: string;
}

export interface SaveTemplateActivityResponseResult {
  success?: boolean;
  error?: string;
  error_code?: string;
  data?: unknown;
}

export interface FetchTemplateActivityResponseResult {
  found: boolean;
  data?: {
    id: string;
    ar_project_id: string;
    ar_phase_id: string;
    ar_step_id: string;
    ar_activity_id: string;
    ar_response: unknown;
    created_at: string;
    updated_at: string;
  };
  error?: string;
  error_code?: string;
}
