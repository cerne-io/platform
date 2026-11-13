-- Cerne Open-Source Edition — Embedded PGlite Schema
-- Distilled from PostgreSQL migrations for single-container PGlite runtime.
-- Authorization (admin vs. public) is enforced by the Phase 3 Hono HTTP layer.

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS auth;

-- Deterministic local workspace owner UUID for legacy SQL defaults/RPCs
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql IMMUTABLE AS $$
    SELECT '00000000-0000-0000-0000-000000000001'::uuid
  $$;

-- =============================================================================
-- Enums
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.completion_activity AS ENUM (
    'story-question',
    'slider-questions',
    'participant-questions',
    'form-appearance-editor',
    'form-config',
    'triangle-questions',
    'question-type',
    'form-languages-editor'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.completion_phase AS ENUM (
    'design',
    'collection',
    'analysis',
    'build'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.completion_step AS ENUM (
    'questions',
    'form-appearance',
    'public-form',
    'form-languages'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Core Tables (15)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_template boolean NOT NULL DEFAULT false,
  is_active boolean DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  is_event_mode boolean DEFAULT false,
  activated_at timestamptz,
  expires_at timestamptz,
  lifetime_stories_collected integer NOT NULL DEFAULT 0 CHECK (lifetime_stories_collected >= 0),
  topup_story_capacity integer NOT NULL DEFAULT 0 CHECK (topup_story_capacity >= 0),
  last_capacity_alert_at_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.activity_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ar_phase_id text NOT NULL,
  ar_step_id text NOT NULL,
  ar_activity_id text NOT NULL,
  ar_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_responses_composite_key UNIQUE (ar_project_id, ar_phase_id, ar_step_id, ar_activity_id)
);

CREATE TABLE IF NOT EXISTS public.template_activity_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ar_phase_id text NOT NULL,
  ar_step_id text NOT NULL,
  ar_activity_id text NOT NULL,
  ar_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_template_activity_response UNIQUE (ar_project_id, ar_phase_id, ar_step_id, ar_activity_id)
);

CREATE TABLE IF NOT EXISTS public.form_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fi_project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  form_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  start_date timestamptz,
  end_date timestamptz,
  CONSTRAINT form_identifiers_form_id_key UNIQUE (form_id),
  CONSTRAINT unique_project_id UNIQUE (fi_project_id)
);

CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  st_project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  text text NOT NULL,
  emotional_response text,
  additional_comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_public boolean NOT NULL DEFAULT false,
  is_imported boolean NOT NULL DEFAULT false,
  audio_url text,
  has_audio boolean DEFAULT false,
  form_id text,
  feeling_sentiment text CHECK (feeling_sentiment IN ('positive', 'negative', 'neutral')),
  transcription_status text DEFAULT 'completed' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  story_source text
);

CREATE TABLE IF NOT EXISTS public.slider_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  question_id integer NOT NULL,
  question_text text NOT NULL,
  value integer,
  left_label text,
  right_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  response_type text NOT NULL DEFAULT 'answered' CHECK (response_type IN ('answered', 'skipped')),
  sr_project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  form_id text
);

CREATE TABLE IF NOT EXISTS public.triangle_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  question_id integer NOT NULL,
  question_text text NOT NULL,
  top_label text,
  bottom_left_label text,
  bottom_right_label text,
  x_position integer CHECK (x_position >= 0 AND x_position <= 100),
  y_position integer CHECK (y_position >= 0 AND y_position <= 100),
  response_type text NOT NULL DEFAULT 'answered' CHECK (response_type IN ('answered', 'skipped')),
  tr_project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  form_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.participant_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  question_text text NOT NULL,
  response text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  pr_project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  form_id text
);

CREATE TABLE IF NOT EXISTS public.project_completion_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  phase public.completion_phase NOT NULL,
  step public.completion_step NOT NULL,
  activity public.completion_activity NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_completion_state_project_id_phase_step_activity_key UNIQUE (project_id, phase, step, activity)
);

CREATE TABLE IF NOT EXISTS public.saved_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 160),
  analysis_type text NOT NULL CHECK (analysis_type IN ('triangle', 'slider')),
  primary_question_id text NOT NULL,
  secondary_question_id text,
  question_label text,
  secondary_question_label text,
  group_a_name text NOT NULL DEFAULT 'Group A' CHECK (char_length(trim(group_a_name)) BETWEEN 1 AND 80),
  group_b_name text NOT NULL DEFAULT 'Group B' CHECK (char_length(trim(group_b_name)) BETWEEN 1 AND 80),
  group_a_story_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  group_b_story_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  comparison_engine_version text NOT NULL DEFAULT 'v1',
  source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (cardinality(group_a_story_ids) > 0),
  CHECK (cardinality(group_b_story_ids) > 0),
  CHECK (analysis_type <> 'slider' OR secondary_question_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.dashboard_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  observation_text text,
  hypothesis_text text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  observations jsonb DEFAULT '[]'::jsonb,
  hypotheses jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT dashboard_observations_project_id_question_id_key UNIQUE (project_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.dashboard_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  revoked_at timestamptz,
  expires_at timestamptz,
  show_pattern_insights boolean NOT NULL DEFAULT true,
  token_hash text,
  token_encrypted text,
  public_slug text NOT NULL DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  CONSTRAINT dashboard_tokens_public_slug_key UNIQUE (public_slug)
);

CREATE TABLE IF NOT EXISTS public.sentiment_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emotion_text text NOT NULL,
  sentiment text NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sentiment_cache_emotion_text_key UNIQUE (emotion_text)
);

CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT ai_prompts_prompt_key_key UNIQUE (prompt_key)
);

CREATE TABLE IF NOT EXISTS public.workspace_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_activity_responses_project ON public.activity_responses (ar_project_id);
CREATE INDEX IF NOT EXISTS idx_stories_project_created ON public.stories (st_project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slider_responses_project ON public.slider_responses (sr_project_id);
CREATE INDEX IF NOT EXISTS idx_slider_responses_story ON public.slider_responses (story_id);
CREATE INDEX IF NOT EXISTS idx_triangle_responses_project ON public.triangle_responses (tr_project_id);
CREATE INDEX IF NOT EXISTS idx_triangle_responses_story ON public.triangle_responses (story_id);
CREATE INDEX IF NOT EXISTS idx_participant_responses_project ON public.participant_responses (pr_project_id);
CREATE INDEX IF NOT EXISTS idx_participant_responses_story ON public.participant_responses (story_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_tokens_hash ON public.dashboard_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_dashboard_tokens_project ON public.dashboard_tokens (project_id);
CREATE INDEX IF NOT EXISTS idx_saved_comparisons_project_updated ON public.saved_comparisons (project_id, updated_at DESC);

-- =============================================================================
-- Views
-- =============================================================================

CREATE OR REPLACE VIEW public.project_story_stats AS
SELECT
  st_project_id AS project_id,
  COUNT(*) AS stories_count,
  MAX(created_at) AS last_story_at
FROM public.stories
GROUP BY st_project_id;

-- =============================================================================
-- Trigger Functions & Triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_stories_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_stories_updated_at ON public.stories;
CREATE TRIGGER set_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stories_updated_at();

CREATE OR REPLACE FUNCTION public.update_prompt_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_ai_prompt_timestamp ON public.ai_prompts;
CREATE TRIGGER update_ai_prompt_timestamp
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prompt_timestamp();

CREATE OR REPLACE FUNCTION public.update_completion_state_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_completion_state_updated_at ON public.project_completion_state;
CREATE TRIGGER update_completion_state_updated_at
  BEFORE UPDATE ON public.project_completion_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_completion_state_timestamp();

CREATE OR REPLACE FUNCTION public.update_saved_comparisons_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_saved_comparisons_updated_at ON public.saved_comparisons;
CREATE TRIGGER set_saved_comparisons_updated_at
  BEFORE UPDATE ON public.saved_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_saved_comparisons_updated_at();

CREATE OR REPLACE FUNCTION public.increment_project_lifetime_stories()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.st_project_id IS NOT NULL THEN
    UPDATE public.projects
    SET lifetime_stories_collected = lifetime_stories_collected + 1
    WHERE id = NEW.st_project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_project_lifetime_stories ON public.stories;
CREATE TRIGGER trg_increment_project_lifetime_stories
  AFTER INSERT ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_project_lifetime_stories();

-- =============================================================================
-- Retained RPC Functions (17)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fetch_activity_response(
  project_id uuid,
  phase_id text,
  step_id text,
  activity_id text
) RETURNS jsonb
  LANGUAGE plpgsql AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(ar.*) INTO result
  FROM public.activity_responses ar
  WHERE ar.ar_project_id = project_id
    AND ar.ar_phase_id = phase_id
    AND ar.ar_step_id = step_id
    AND ar.ar_activity_id = activity_id
  ORDER BY ar.updated_at DESC
  LIMIT 1;

  IF result IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object('found', true, 'data', result);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'error_code', SQLSTATE);
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_activity_response(
  project_id uuid,
  phase_id text,
  step_id text,
  activity_id text,
  response_data jsonb,
  p_updated_at timestamptz DEFAULT now()
) RETURNS jsonb
  LANGUAGE plpgsql AS $$
DECLARE
  result jsonb;
BEGIN
  INSERT INTO public.activity_responses (
    ar_project_id, ar_phase_id, ar_step_id, ar_activity_id, ar_response, updated_at
  )
  VALUES (
    project_id, phase_id, step_id, activity_id, response_data, COALESCE(p_updated_at, now())
  )
  ON CONFLICT ON CONSTRAINT activity_responses_composite_key
  DO UPDATE SET
    ar_response = EXCLUDED.ar_response,
    updated_at = EXCLUDED.updated_at
  RETURNING to_jsonb(activity_responses.*) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fetch_template_activity_response(
  project_id uuid,
  phase_id text,
  step_id text,
  activity_id text
) RETURNS jsonb
  LANGUAGE plpgsql AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(tar.*) INTO result
  FROM public.template_activity_responses tar
  WHERE tar.ar_project_id = project_id
    AND tar.ar_phase_id = phase_id
    AND tar.ar_step_id = step_id
    AND tar.ar_activity_id = activity_id
  ORDER BY tar.updated_at DESC
  LIMIT 1;

  IF result IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object('found', true, 'data', result);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'error_code', SQLSTATE);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_template_activity_response(
  project_id uuid,
  phase_id text,
  step_id text,
  activity_id text,
  response_data jsonb
) RETURNS jsonb
  LANGUAGE plpgsql AS $$
DECLARE
  result jsonb;
BEGIN
  INSERT INTO public.template_activity_responses (
    ar_project_id, ar_phase_id, ar_step_id, ar_activity_id, ar_response, updated_at
  )
  VALUES (
    project_id, phase_id, step_id, activity_id, response_data, now()
  )
  ON CONFLICT ON CONSTRAINT unique_template_activity_response
  DO UPDATE SET
    ar_response = EXCLUDED.ar_response,
    updated_at = now()
  RETURNING to_jsonb(template_activity_responses.*) INTO result;

  RETURN jsonb_build_object('success', true, 'data', result);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'error_code', SQLSTATE);
END;
$$;

CREATE OR REPLACE FUNCTION public.copy_template_to_user(
  template_id uuid,
  new_project_name text
) RETURNS TABLE(new_project_id uuid, story_mapping jsonb)
  LANGUAGE plpgsql AS $$
DECLARE
  v_new_project_id uuid;
  template_exists boolean;
  v_story_mapping jsonb := '{}';
  old_story_id uuid;
  new_story_id uuid;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.projects WHERE id = template_id AND is_template = true
  ) INTO template_exists;

  IF NOT template_exists THEN
    RAISE EXCEPTION 'Template project not found';
  END IF;

  INSERT INTO public.projects (name, description, user_id, is_template)
  SELECT new_project_name, description, auth.uid(), false
  FROM public.projects
  WHERE id = template_id
  RETURNING id INTO v_new_project_id;

  -- Copy configured template responses first
  INSERT INTO public.activity_responses (
    ar_project_id, ar_phase_id, ar_step_id, ar_activity_id, ar_response
  )
  SELECT v_new_project_id, ar_phase_id, ar_step_id, ar_activity_id, ar_response
  FROM public.template_activity_responses
  WHERE ar_project_id = template_id;

  -- Also copy any activity_responses rows on the template without duplicating
  INSERT INTO public.activity_responses (
    ar_project_id, ar_phase_id, ar_step_id, ar_activity_id, ar_response
  )
  SELECT v_new_project_id, ar_phase_id, ar_step_id, ar_activity_id, ar_response
  FROM public.activity_responses
  WHERE ar_project_id = template_id
  ON CONFLICT ON CONSTRAINT activity_responses_composite_key DO NOTHING;

  -- Copy template stories and their signification responses
  FOR old_story_id IN
    SELECT id FROM public.stories WHERE st_project_id = template_id
  LOOP
    INSERT INTO public.stories (
      st_project_id, user_id, title, text, emotional_response,
      additional_comments, feeling_sentiment, is_imported, story_source
    )
    SELECT
      v_new_project_id, auth.uid(), title, text, emotional_response,
      additional_comments, feeling_sentiment, true, 'template_copy'
    FROM public.stories
    WHERE id = old_story_id
    RETURNING id INTO new_story_id;

    v_story_mapping := jsonb_set(
      v_story_mapping,
      ARRAY[old_story_id::text],
      to_jsonb(new_story_id)
    );

    INSERT INTO public.slider_responses (
      story_id, sr_project_id, question_id, question_text,
      value, response_type, left_label, right_label
    )
    SELECT
      new_story_id, v_new_project_id, question_id, question_text,
      value, response_type, left_label, right_label
    FROM public.slider_responses
    WHERE story_id = old_story_id;

    INSERT INTO public.participant_responses (
      story_id, pr_project_id, question_id, question_text, response
    )
    SELECT
      new_story_id, v_new_project_id, question_id, question_text, response
    FROM public.participant_responses
    WHERE story_id = old_story_id;

    INSERT INTO public.triangle_responses (
      story_id, tr_project_id, question_id, question_text,
      top_label, bottom_left_label, bottom_right_label,
      x_position, y_position, response_type
    )
    SELECT
      new_story_id, v_new_project_id, question_id, question_text,
      top_label, bottom_left_label, bottom_right_label,
      x_position, y_position, response_type
    FROM public.triangle_responses
    WHERE story_id = old_story_id;
  END LOOP;

  RETURN QUERY SELECT v_new_project_id, v_story_mapping;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_public_form_id(project_id uuid)
RETURNS boolean
  LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.form_identifiers fi
    JOIN public.projects p ON p.id = fi.fi_project_id
    WHERE fi.fi_project_id = has_public_form_id.project_id
      AND p.is_archived = false
      AND p.is_template = false
      AND (p.expires_at IS NULL OR p.expires_at > now())
      AND (fi.start_date IS NULL OR fi.start_date <= now())
      AND (fi.end_date IS NULL OR fi.end_date >= now())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_project_id_by_form_id(p_form_id text)
RETURNS uuid
  LANGUAGE plpgsql AS $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT fi.fi_project_id INTO v_project_id
  FROM public.form_identifiers fi
  JOIN public.projects p ON fi.fi_project_id = p.id
  WHERE fi.form_id = p_form_id
    AND p.is_archived = false
    AND p.is_template = false
    AND (p.expires_at IS NULL OR p.expires_at > now())
    AND (fi.start_date IS NULL OR fi.start_date <= now())
    AND (fi.end_date IS NULL OR fi.end_date >= now());

  RETURN v_project_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_form_config(p_form_id text)
RETURNS SETOF public.activity_responses
  LANGUAGE plpgsql AS $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT fi.fi_project_id INTO v_project_id
  FROM public.form_identifiers fi
  JOIN public.projects p ON p.id = fi.fi_project_id
  WHERE fi.form_id = p_form_id
    AND p.is_archived = false
    AND p.is_template = false
    AND (p.expires_at IS NULL OR p.expires_at > now())
    AND (fi.start_date IS NULL OR fi.start_date <= now())
    AND (fi.end_date IS NULL OR fi.end_date >= now());

  IF v_project_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ar.*
  FROM public.activity_responses ar
  WHERE ar.ar_project_id = v_project_id
    AND (
      (ar.ar_phase_id = 'collection'
       AND ar.ar_step_id = 'public-form'
       AND ar.ar_activity_id IN (
         'form-config',
         'story-question',
         'slider-questions',
         'triangle-questions',
         'participant-questions',
         'question-type',
         'form-builder-questions'
       ))
      OR
      (ar.ar_phase_id = 'collection'
       AND ar.ar_step_id = 'questions'
       AND ar.ar_activity_id IN (
         'slider-questions',
         'triangle-questions',
         'participant-questions'
       ))
      OR
      (ar.ar_phase_id = 'design'
       AND ar.ar_step_id = 'questions'
       AND ar.ar_activity_id = 'question-type')
      OR
      (ar.ar_phase_id = 'design'
       AND ar.ar_step_id = 'form-builder'
       AND ar.ar_activity_id = 'form-builder-questions')
      OR
      (ar.ar_step_id = 'form-appearance'
       AND ar.ar_activity_id IN ('form-appearance-editor', 'form-languages'))
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_project(project_id_param uuid)
RETURNS boolean
  LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.projects WHERE id = project_id_param;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_story_with_responses(story_id_param text)
RETURNS jsonb
  LANGUAGE plpgsql AS $$
DECLARE
  slider_count integer := 0;
  participant_count integer := 0;
  triangle_count integer := 0;
  story_uuid uuid;
BEGIN
  story_uuid := story_id_param::uuid;

  IF NOT EXISTS (SELECT 1 FROM public.stories WHERE id = story_uuid) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Story not found');
  END IF;

  DELETE FROM public.slider_responses WHERE story_id = story_uuid;
  GET DIAGNOSTICS slider_count = ROW_COUNT;

  DELETE FROM public.participant_responses WHERE story_id = story_uuid;
  GET DIAGNOSTICS participant_count = ROW_COUNT;

  DELETE FROM public.triangle_responses WHERE story_id = story_uuid;
  GET DIAGNOSTICS triangle_count = ROW_COUNT;

  DELETE FROM public.stories WHERE id = story_uuid;

  RETURN jsonb_build_object(
    'success', true,
    'slider_responses_deleted', slider_count,
    'participant_responses_deleted', participant_count,
    'triangle_responses_deleted', triangle_count,
    'story_id', story_id_param
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_activity_completed(
  p_project_id uuid,
  p_phase public.completion_phase,
  p_step public.completion_step,
  p_activity public.completion_activity
) RETURNS boolean
  LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.project_completion_state
    WHERE project_id = p_project_id
      AND phase = p_phase
      AND step = p_step
      AND activity = p_activity
      AND is_completed = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_activity_completed(
  p_project_id uuid,
  p_phase public.completion_phase,
  p_step public.completion_step,
  p_activity public.completion_activity
) RETURNS boolean
  LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RETURN false;
  END IF;

  INSERT INTO public.project_completion_state (
    project_id, user_id, phase, step, activity, is_completed, completed_at
  )
  VALUES (
    p_project_id, auth.uid(), p_phase, p_step, p_activity, true, now()
  )
  ON CONFLICT (project_id, phase, step, activity)
  DO UPDATE SET
    is_completed = true,
    completed_at = now(),
    updated_at = now();

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_dashboard_token(
  p_project_id uuid,
  p_token text,
  p_created_at timestamptz DEFAULT now(),
  p_expires_at timestamptz DEFAULT NULL
) RETURNS TABLE(id uuid, public_slug text)
  LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
  v_public_slug text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE projects.id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  v_public_slug := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

  INSERT INTO public.dashboard_tokens (
    project_id,
    token_hash,
    token_encrypted,
    created_at,
    expires_at,
    is_active,
    public_slug
  )
  VALUES (
    p_project_id,
    encode(sha256(p_token::bytea), 'hex'),
    p_token,
    COALESCE(p_created_at, now()),
    p_expires_at,
    true,
    v_public_slug
  )
  RETURNING public.dashboard_tokens.id INTO v_id;

  RETURN QUERY SELECT v_id, v_public_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_project_dashboard_tokens(p_project_id uuid)
RETURNS json
  LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'id', dt.id,
          'project_id', dt.project_id,
          'token', dt.token_encrypted,
          'public_slug', dt.public_slug,
          'is_active', dt.is_active,
          'created_at', dt.created_at,
          'created_by', dt.created_by,
          'expires_at', dt.expires_at,
          'revoked_at', dt.revoked_at
        ) ORDER BY dt.created_at DESC
      ),
      '[]'::json
    )
    FROM public.dashboard_tokens dt
    WHERE dt.project_id = p_project_id
      AND dt.is_active = true
      AND dt.revoked_at IS NULL
      AND (dt.expires_at IS NULL OR dt.expires_at > now());
$$;

CREATE OR REPLACE FUNCTION public.validate_dashboard_token(token_value text)
RETURNS uuid
  LANGUAGE sql STABLE AS $$
    SELECT dt.project_id
    FROM public.dashboard_tokens dt
    JOIN public.projects p ON p.id = dt.project_id
    WHERE dt.token_hash = encode(sha256(token_value::bytea), 'hex')
      AND dt.is_active = true
      AND (dt.expires_at IS NULL OR dt.expires_at > now())
      AND dt.revoked_at IS NULL
      AND p.is_archived = false
      AND p.is_template = false
      AND (p.expires_at IS NULL OR p.expires_at > now())
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_dashboard_data(token_value text)
RETURNS json
  LANGUAGE plpgsql AS $$
DECLARE
  v_project_id uuid;
  v_show_pattern_insights boolean := false;
  v_project_data json;
  v_stories_data json;
  v_question_type text;
  v_saved_comparisons json;
  v_form_config json;
  v_observations json;
  v_has_sliders boolean := false;
  v_has_triangles boolean := false;
BEGIN
  SELECT project_id, COALESCE(show_pattern_insights, false)
  INTO v_project_id, v_show_pattern_insights
  FROM public.dashboard_tokens
  WHERE token_hash = encode(sha256(token_value::bytea), 'hex')
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND revoked_at IS NULL
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'id', id,
    'name', name,
    'description', description,
    'created_at', created_at
  ) INTO v_project_data
  FROM public.projects
  WHERE id = v_project_id
    AND is_archived = false
    AND is_template = false
    AND (expires_at IS NULL OR expires_at > now());

  IF v_project_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- Query live stories and responses directly (omitting user_id and author name)
  SELECT json_agg(
    json_build_object(
      'id', s.id,
      'story_id', s.id,
      'project_id', s.st_project_id,
      'title', COALESCE(s.title, 'Untitled Story'),
      'text', s.text,
      'feeling', s.emotional_response,
      'feelingSentiment', s.feeling_sentiment,
      'date', s.created_at,
      'has_audio', false,
      'audio_url', NULL,
      'isPublic', true,
      'isImported', s.is_imported,
      'additional_comments', s.additional_comments,
      'sliderResponses', COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', sr.id,
              'question_id', sr.question_id,
              'question_text', sr.question_text,
              'value', sr.value,
              'left_label', COALESCE(sr.left_label, ''),
              'right_label', COALESCE(sr.right_label, ''),
              'response_type', sr.response_type
            ) ORDER BY sr.question_id ASC
          )
          FROM public.slider_responses sr
          WHERE sr.story_id = s.id
        ),
        '[]'::json
      ),
      'triangleResponses', COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', tr.id,
              'question_id', tr.question_id,
              'question_text', tr.question_text,
              'x_position', tr.x_position,
              'y_position', tr.y_position,
              'top_label', COALESCE(tr.top_label, 'Top'),
              'bottom_left_label', COALESCE(tr.bottom_left_label, 'Left'),
              'bottom_right_label', COALESCE(tr.bottom_right_label, 'Right'),
              'response_type', tr.response_type
            ) ORDER BY tr.question_id ASC
          )
          FROM public.triangle_responses tr
          WHERE tr.story_id = s.id
        ),
        '[]'::json
      ),
      'participantResponses', COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', pr.id,
              'question_id', pr.question_id,
              'question_text', pr.question_text,
              'response', pr.response,
              'response_type', CASE
                WHEN pr.response IS NULL OR pr.response = '' THEN 'skipped'
                ELSE 'answered'
              END
            ) ORDER BY pr.question_id ASC
          )
          FROM public.participant_responses pr
          WHERE pr.story_id = s.id
        ),
        '[]'::json
      )
    ) ORDER BY s.created_at DESC
  ) INTO v_stories_data
  FROM public.stories s
  WHERE s.st_project_id = v_project_id;

  SELECT
    EXISTS (
      SELECT 1
      FROM public.slider_responses sr
      JOIN public.stories s ON sr.story_id = s.id
      WHERE s.st_project_id = v_project_id
        AND sr.response_type <> 'skipped'
        AND sr.value IS NOT NULL
      LIMIT 1
    ),
    EXISTS (
      SELECT 1
      FROM public.triangle_responses tr
      JOIN public.stories s ON tr.story_id = s.id
      WHERE s.st_project_id = v_project_id
        AND tr.response_type <> 'skipped'
        AND tr.x_position IS NOT NULL
        AND tr.y_position IS NOT NULL
      LIMIT 1
    )
  INTO v_has_sliders, v_has_triangles;

  IF v_has_sliders AND v_has_triangles THEN
    v_question_type := 'both';
  ELSIF v_has_triangles THEN
    v_question_type := 'triangle';
  ELSIF v_has_sliders THEN
    v_question_type := 'slider';
  ELSE
    v_question_type := 'none';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(sc)), '[]'::json) INTO v_saved_comparisons
  FROM (
    SELECT
      c.id,
      c.project_id,
      c.name,
      c.analysis_type,
      c.primary_question_id,
      c.secondary_question_id,
      c.question_label,
      c.secondary_question_label,
      c.group_a_name,
      c.group_b_name,
      COALESCE(
        ARRAY(
          SELECT unnest(c.group_a_story_ids)
          INTERSECT
          SELECT id FROM public.stories WHERE st_project_id = v_project_id
        ),
        '{}'::uuid[]
      ) AS group_a_story_ids,
      COALESCE(
        ARRAY(
          SELECT unnest(c.group_b_story_ids)
          INTERSECT
          SELECT id FROM public.stories WHERE st_project_id = v_project_id
        ),
        '{}'::uuid[]
      ) AS group_b_story_ids,
      c.comparison_engine_version,
      json_build_object(
        'groupACountAtSave', COALESCE((c.source_snapshot->>'groupACountAtSave')::int, 0),
        'groupBCountAtSave', COALESCE((c.source_snapshot->>'groupBCountAtSave')::int, 0),
        'sharedCountAtSave', COALESCE((c.source_snapshot->>'sharedCountAtSave')::int, 0)
      ) AS source_snapshot,
      c.created_at,
      c.updated_at
    FROM public.saved_comparisons c
    WHERE c.project_id = v_project_id
    ORDER BY c.updated_at DESC, c.id DESC
  ) sc;

  SELECT COALESCE(json_agg(row_to_json(ar)), '[]'::json) INTO v_form_config
  FROM public.activity_responses ar
  WHERE ar.ar_project_id = v_project_id
    AND (
      (ar.ar_phase_id = 'collection'
       AND ar.ar_step_id = 'public-form'
       AND ar.ar_activity_id IN (
         'form-config',
         'story-question',
         'slider-questions',
         'triangle-questions',
         'participant-questions',
         'question-type',
         'form-builder-questions'
       ))
      OR
      (ar.ar_phase_id = 'collection'
       AND ar.ar_step_id = 'questions'
       AND ar.ar_activity_id IN (
         'slider-questions',
         'triangle-questions',
         'participant-questions'
       ))
      OR
      (ar.ar_phase_id = 'design'
       AND ar.ar_step_id = 'questions'
       AND ar.ar_activity_id = 'question-type')
      OR
      (ar.ar_phase_id = 'design'
       AND ar.ar_step_id = 'form-builder'
       AND ar.ar_activity_id = 'form-builder-questions')
      OR
      (ar.ar_step_id = 'form-appearance'
       AND ar.ar_activity_id IN ('form-appearance-editor', 'form-languages'))
    );

  IF v_show_pattern_insights THEN
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'question_id', o.question_id,
          'observation_text', o.observation_text,
          'hypothesis_text', o.hypothesis_text,
          'observations', COALESCE(o.observations, '[]'::jsonb),
          'hypotheses', COALESCE(o.hypotheses, '[]'::jsonb)
        )
      ),
      '[]'::json
    ) INTO v_observations
    FROM public.dashboard_observations o
    WHERE o.project_id = v_project_id;
  ELSE
    v_observations := '[]'::json;
  END IF;

  RETURN json_build_object(
    'project', v_project_data,
    'stories', COALESCE(v_stories_data, '[]'::json),
    'questionType', v_question_type,
    'customBranding', '{}'::json,
    'savedComparisons', v_saved_comparisons,
    'formConfig', v_form_config,
    'observations', v_observations
  );
END;
$$;

