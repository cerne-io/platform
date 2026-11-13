export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_responses: {
        Row: {
          ar_activity_id: string
          ar_phase_id: string
          ar_project_id: string
          ar_response: Json
          ar_step_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          ar_activity_id: string
          ar_phase_id: string
          ar_project_id: string
          ar_response?: Json
          ar_step_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          ar_activity_id?: string
          ar_phase_id?: string
          ar_project_id?: string
          ar_response?: Json
          ar_step_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_responses_project_id_fkey"
            columns: ["ar_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          prompt_key: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          prompt_key: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          prompt_key?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      dashboard_observations: {
        Row: {
          created_at: string
          hypotheses: Json | null
          hypothesis_text: string | null
          id: string
          observation_text: string | null
          observations: Json | null
          project_id: string
          question_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hypotheses?: Json | null
          hypothesis_text?: string | null
          id?: string
          observation_text?: string | null
          observations?: Json | null
          project_id: string
          question_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hypotheses?: Json | null
          hypothesis_text?: string | null
          id?: string
          observation_text?: string | null
          observations?: Json | null
          project_id?: string
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          project_id: string
          public_slug: string
          revoked_at: string | null
          show_pattern_insights: boolean
          token_encrypted: string | null
          token_hash: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          project_id: string
          public_slug?: string
          revoked_at?: string | null
          show_pattern_insights?: boolean
          token_encrypted?: string | null
          token_hash?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          project_id?: string
          public_slug?: string
          revoked_at?: string | null
          show_pattern_insights?: boolean
          token_encrypted?: string | null
          token_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      form_identifiers: {
        Row: {
          created_at: string
          end_date: string | null
          fi_project_id: string
          form_id: string
          id: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          fi_project_id: string
          form_id: string
          id?: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          fi_project_id?: string
          form_id?: string
          id?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_identifiers_project_id_fkey"
            columns: ["fi_project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_responses: {
        Row: {
          created_at: string
          form_id: string | null
          id: string
          pr_project_id: string | null
          question_id: string
          question_text: string
          response: string
          story_id: string
        }
        Insert: {
          created_at?: string
          form_id?: string | null
          id?: string
          pr_project_id?: string | null
          question_id: string
          question_text: string
          response: string
          story_id: string
        }
        Update: {
          created_at?: string
          form_id?: string | null
          id?: string
          pr_project_id?: string | null
          question_id?: string
          question_text?: string
          response?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_responses_project_id_fkey"
            columns: ["pr_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_responses_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      project_completion_state: {
        Row: {
          activity: Database["public"]["Enums"]["completion_activity"]
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          phase: Database["public"]["Enums"]["completion_phase"]
          project_id: string
          step: Database["public"]["Enums"]["completion_step"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activity: Database["public"]["Enums"]["completion_activity"]
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          phase: Database["public"]["Enums"]["completion_phase"]
          project_id: string
          step: Database["public"]["Enums"]["completion_step"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: Database["public"]["Enums"]["completion_activity"]
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          phase?: Database["public"]["Enums"]["completion_phase"]
          project_id?: string
          step?: Database["public"]["Enums"]["completion_step"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_completion_state_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          activated_at: string | null
          created_at: string
          description: string | null
          expires_at?: string | null
          id: string
          is_active: boolean | null
          is_archived?: boolean
          is_event_mode: boolean | null
          is_template: boolean
          lifetime_stories_collected?: number
          name: string
          topup_story_capacity?: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean
          is_event_mode?: boolean | null
          is_template?: boolean
          lifetime_stories_collected?: number
          name: string
          topup_story_capacity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean
          is_event_mode?: boolean | null
          is_template?: boolean
          lifetime_stories_collected?: number
          name?: string
          topup_story_capacity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_comparisons: {
        Row: {
          analysis_type: string
          comparison_engine_version: string
          created_at: string
          created_by: string | null
          group_a_name: string
          group_a_story_ids: string[]
          group_b_name: string
          group_b_story_ids: string[]
          id: string
          name: string
          primary_question_id: string
          project_id: string
          question_label: string | null
          secondary_question_id: string | null
          secondary_question_label: string | null
          source_snapshot: Json
          updated_at: string
        }
        Insert: {
          analysis_type: string
          comparison_engine_version?: string
          created_at?: string
          created_by?: string | null
          group_a_name?: string
          group_a_story_ids?: string[]
          group_b_name?: string
          group_b_story_ids?: string[]
          id?: string
          name: string
          primary_question_id: string
          project_id: string
          question_label?: string | null
          secondary_question_id?: string | null
          secondary_question_label?: string | null
          source_snapshot?: Json
          updated_at?: string
        }
        Update: {
          analysis_type?: string
          comparison_engine_version?: string
          created_at?: string
          created_by?: string | null
          group_a_name?: string
          group_a_story_ids?: string[]
          group_b_name?: string
          group_b_story_ids?: string[]
          id?: string
          name?: string
          primary_question_id?: string
          project_id?: string
          question_label?: string | null
          secondary_question_id?: string | null
          secondary_question_label?: string | null
          source_snapshot?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_comparisons_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sentiment_cache: {
        Row: {
          created_at: string
          emotion_text: string
          id: string
          sentiment: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          emotion_text: string
          id?: string
          sentiment: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          emotion_text?: string
          id?: string
          sentiment?: string
          updated_at?: string
        }
        Relationships: []
      }
      slider_responses: {
        Row: {
          created_at: string
          form_id: string | null
          id: string
          left_label: string | null
          question_id: number
          question_text: string
          response_type: string
          right_label: string | null
          sr_project_id: string | null
          story_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          form_id?: string | null
          id?: string
          left_label?: string | null
          question_id: number
          question_text: string
          response_type?: string
          right_label?: string | null
          sr_project_id?: string | null
          story_id: string
          value?: number | null
        }
        Update: {
          created_at?: string
          form_id?: string | null
          id?: string
          left_label?: string | null
          question_id?: number
          question_text?: string
          response_type?: string
          right_label?: string | null
          sr_project_id?: string | null
          story_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "slider_responses_project_id_fkey"
            columns: ["sr_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slider_responses_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          additional_comments: string | null
          audio_url: string | null
          content_version: number
          created_at: string
          emotional_response: string | null
          feeling_sentiment: string | null
          form_id: string | null
          has_audio: boolean | null
          id: string
          is_imported: boolean
          is_public: boolean
          st_project_id: string | null
          story_source: string | null
          text: string
          title: string
          transcription_status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          additional_comments?: string | null
          audio_url?: string | null
          content_version?: number
          created_at?: string
          emotional_response?: string | null
          feeling_sentiment?: string | null
          form_id?: string | null
          has_audio?: boolean | null
          id?: string
          is_imported?: boolean
          is_public?: boolean
          st_project_id?: string | null
          story_source?: string | null
          text: string
          title: string
          transcription_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          additional_comments?: string | null
          audio_url?: string | null
          content_version?: number
          created_at?: string
          emotional_response?: string | null
          feeling_sentiment?: string | null
          form_id?: string | null
          has_audio?: boolean | null
          id?: string
          is_imported?: boolean
          is_public?: boolean
          st_project_id?: string | null
          story_source?: string | null
          text?: string
          title?: string
          transcription_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_project_id_fkey"
            columns: ["st_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      template_activity_responses: {
        Row: {
          ar_activity_id: string
          ar_phase_id: string
          ar_project_id: string
          ar_response: Json
          ar_step_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          ar_activity_id: string
          ar_phase_id: string
          ar_project_id: string
          ar_response?: Json
          ar_step_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          ar_activity_id?: string
          ar_phase_id?: string
          ar_project_id?: string
          ar_response?: Json
          ar_step_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      triangle_responses: {
        Row: {
          bottom_left_label: string | null
          bottom_right_label: string | null
          created_at: string
          form_id: string | null
          id: string
          question_id: number
          question_text: string
          response_type: string
          story_id: string
          top_label: string | null
          tr_project_id: string | null
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          bottom_left_label?: string | null
          bottom_right_label?: string | null
          created_at?: string
          form_id?: string | null
          id?: string
          question_id: number
          question_text: string
          response_type?: string
          story_id: string
          top_label?: string | null
          tr_project_id?: string | null
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          bottom_left_label?: string | null
          bottom_right_label?: string | null
          created_at?: string
          form_id?: string | null
          id?: string
          question_id?: number
          question_text?: string
          response_type?: string
          story_id?: string
          top_label?: string | null
          tr_project_id?: string | null
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "triangle_responses_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triangle_responses_tr_project_id_fkey"
            columns: ["tr_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      project_story_stats: {
        Row: {
          project_id: string
          stories_count: number
          last_story_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_story_stats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      activate_project: { Args: { project_id_param: string }; Returns: Json }
      check_expired_user_roles: { Args: never; Returns: undefined }
      cleanup_old_api_logs: { Args: never; Returns: undefined }
      copy_template_to_user: {
        Args: { new_project_name: string; template_id: string }
        Returns: {
          new_project_id: string
          story_mapping: Json
        }[]
      }
      create_dashboard_token: {
        Args: {
          p_created_at?: string
          p_expires_at?: string
          p_project_id: string
          p_token: string
        }
        Returns: {
          id: string
          public_slug: string
        }[]
      }
      cron_check_budget_alerts: { Args: never; Returns: undefined }
      cron_process_digests: { Args: never; Returns: undefined }
      cron_process_transcriptions: { Args: never; Returns: undefined }
      cron_send_push_notifications: { Args: never; Returns: undefined }
      deactivate_expired_projects: { Args: never; Returns: undefined }
      delete_project: { Args: { project_id_param: string }; Returns: boolean }
      delete_story: { Args: { story_id_param: string }; Returns: boolean }
      delete_story_with_responses: {
        Args: { story_id_param: string }
        Returns: Json
      }
      ensure_user_initialized: { Args: never; Returns: undefined }
      fetch_activity_response: {
        Args: {
          activity_id: string
          phase_id: string
          project_id: string
          step_id: string
        }
        Returns: Json
      }
      fetch_template_activity_response: {
        Args: {
          activity_id: string
          phase_id: string
          project_id: string
          step_id: string
        }
        Returns: Json
      }
      get_api_usage_by_user_v2: {
        Args: { p_hours?: number }
        Returns: {
          avg_processing_time: number
          breakdown: Json
          estimated_cost: number
          failed_requests: number
          last_request_at: string
          successful_requests: number
          total_requests: number
          total_tokens: number
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_cost_timeline_v2: {
        Args: { p_days?: number; p_interval?: string }
        Returns: {
          estimated_cost: number
          function_name: string
          provider_label: string
          request_count: number
          time_bucket: string
          tokens_used: number
        }[]
      }
      get_project_dashboard_tokens: {
        Args: { p_project_id: string }
        Returns: Json
      }
      get_project_id_by_form_id: {
        Args: { p_form_id: string }
        Returns: string
      }
      get_project_owner: { Args: { p_project_id: string }; Returns: string }
      get_public_dashboard_data: {
        Args: { token_value: string }
        Returns: Json
      }
      get_public_form_config: {
        Args: { p_form_id: string }
        Returns: {
          ar_activity_id: string
          ar_phase_id: string
          ar_project_id: string
          ar_response: Json
          ar_step_id: string
          created_at: string
          id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "activity_responses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_suspicious_ips:
        | {
            Args: { p_hours?: number; p_min_requests?: number }
            Returns: {
              client_ip: string
              error_count: number
              error_rate: number
              request_count: number
              unique_projects: number
            }[]
          }
        | {
            Args: { p_threshold?: number }
            Returns: {
              client_ip: string
              error_rate: number
              estimated_cost: number
              first_seen: string
              last_seen: string
              request_count: number
              risk_score: number
              tokens_consumed: number
            }[]
          }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_vantage_data: { Args: never; Returns: Json }
      has_practitioner_access: { Args: { _user_id: string }; Returns: boolean }
      has_public_form_id: { Args: { project_id: string }; Returns: boolean }
      insert_activity_response: {
        Args: {
          activity_id: string
          p_updated_at?: string
          phase_id: string
          project_id: string
          response_data: Json
          step_id: string
        }
        Returns: Json
      }
      is_activity_completed: {
        Args: {
          p_activity: Database["public"]["Enums"]["completion_activity"]
          p_phase: Database["public"]["Enums"]["completion_phase"]
          p_project_id: string
          p_step: Database["public"]["Enums"]["completion_step"]
        }
        Returns: boolean
      }
      is_project_active: { Args: { p_project_id: string }; Returns: boolean }
      is_valid_form_id: { Args: { p_form_id: string }; Returns: boolean }
      is_valid_public_token: { Args: { project_id: string }; Returns: boolean }
      mark_activity_completed: {
        Args: {
          p_activity: Database["public"]["Enums"]["completion_activity"]
          p_phase: Database["public"]["Enums"]["completion_phase"]
          p_project_id: string
          p_step: Database["public"]["Enums"]["completion_step"]
        }
        Returns: boolean
      }
      mask_email: { Args: { email: string }; Returns: string }
      reclaim_abandoned_embedding_jobs: { Args: never; Returns: undefined }
      redeem_upgrade_code: { Args: { code_text: string }; Returns: Json }
      remove_push_token: { Args: { p_token: string }; Returns: undefined }
      save_push_token:
        | {
            Args: {
              p_device_name: string
              p_platform: string
              p_project_id: string
              p_token: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_device_name: string
              p_form_id?: string
              p_platform: string
              p_project_id: string
              p_token: string
            }
            Returns: undefined
          }
      save_template_activity_response: {
        Args: {
          activity_id: string
          phase_id: string
          project_id: string
          response_data: Json
          step_id: string
        }
        Returns: Json
      }
      validate_dashboard_token: {
        Args: { token_value: string }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "user"
        | "admin"
        | "superuser"
        | "superadmin"
        | "demo"
        | "subscriber"
        | "solo"
      completion_activity:
        | "story-question"
        | "slider-questions"
        | "participant-questions"
        | "form-appearance-editor"
        | "form-config"
        | "triangle-questions"
        | "question-type"
        | "form-languages-editor"
      completion_phase: "design" | "collection" | "analysis" | "build"
      completion_step:
        | "questions"
        | "form-appearance"
        | "public-form"
        | "form-languages"
      embedding_job_operation: "upsert" | "delete"
      embedding_job_source:
        | "db_trigger"
        | "clone"
        | "manual_reindex"
        | "migration"
      embedding_job_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "superseded"
        | "retry_scheduled"
        | "dead_letter"
        | "cancelled"
      project_role: "owner" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "user",
        "admin",
        "superuser",
        "superadmin",
        "demo",
        "subscriber",
        "solo",
      ],
      completion_activity: [
        "story-question",
        "slider-questions",
        "participant-questions",
        "form-appearance-editor",
        "form-config",
        "triangle-questions",
        "question-type",
        "form-languages-editor",
      ],
      completion_phase: ["design", "collection", "analysis", "build"],
      completion_step: [
        "questions",
        "form-appearance",
        "public-form",
        "form-languages",
      ],
      embedding_job_operation: ["upsert", "delete"],
      embedding_job_source: [
        "db_trigger",
        "clone",
        "manual_reindex",
        "migration",
      ],
      embedding_job_status: [
        "pending",
        "processing",
        "succeeded",
        "superseded",
        "retry_scheduled",
        "dead_letter",
        "cancelled",
      ],
      project_role: ["owner", "editor", "viewer"],
    },
  },
} as const
