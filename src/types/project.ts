
import { Tables } from "@/integrations/supabase/types";

export type Project = Tables<"projects"> & {
  stories_count?: number;
  lifetime_stories_collected?: number;
  topup_story_capacity?: number;
  is_archived?: boolean;
  expires_at?: string | null;
  has_active_link?: boolean;
  last_story_at?: string;
  user_role?: 'owner' | 'editor' | 'viewer';
};

