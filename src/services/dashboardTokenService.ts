
import { supabase } from "@/integrations/supabase/client";
import { nanoid } from "nanoid";
import { debugError } from "@/utils/debugLogger";

export interface DashboardToken {
  id: string;
  project_id: string;
  token?: string;
  token_hash?: string;
  public_slug?: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
  revoked_at?: string | null;
  expires_at?: string | null;
}

export const createDashboardToken = async (projectId: string): Promise<DashboardToken | null> => {
  try {
    // Generate a secure, URL-friendly token
    const token = nanoid(16);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const { data: tokenId, error } = await supabase
      .rpc('create_dashboard_token', {
        p_project_id: projectId,
        p_token: token
      });

    if (error || !tokenId || !Array.isArray(tokenId) || tokenId.length === 0) {
      debugError('Error creating dashboard token:', error);
      return null;
    }

    // Extract the first row from the table result
    const result = (tokenId as unknown as { id: string; public_slug?: string }[])[0];

    return {
      id: result.id,
      public_slug: result.public_slug,
      project_id: projectId,
      token: token,
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: userId
    };
  } catch (error) {
    debugError('Failed to create dashboard token:', error);
    return null;
  }
};

/**
 * Fetches all active tokens for a project
 */
export const getProjectDashboardTokens = async (projectId: string): Promise<DashboardToken[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_project_dashboard_tokens', { p_project_id: projectId });

    if (error) {
      debugError('Error fetching dashboard tokens:', error);
      return [];
    }

    return (data as unknown as DashboardToken[]).map(t => ({
      ...t,
      // Ensure we have the token property set from the decrypted value
      token: t.token
    })) as DashboardToken[];
  } catch (error) {
    debugError('Failed to fetch dashboard tokens:', error);
    return [];
  }
};

/**
 * Revokes a dashboard token by setting is_active to false
 */
export const revokeDashboardToken = async (tokenId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('dashboard_tokens')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString()
      })
      .eq('id', tokenId);

    if (error) {
      debugError('Error revoking dashboard token:', error);
      return false;
    }

    return true;
  } catch (error) {
    debugError('Failed to revoke dashboard token:', error);
    return false;
  }
};

/**
 * Validates a dashboard token and returns the associated project ID
 */
export const validateDashboardToken = async (token: string): Promise<string | null> => {
  try {
    // Use the database function to validate the token
    const { data, error } = await supabase
      .rpc('validate_dashboard_token', { token_value: token });

    if (error || !data) {
      debugError('Error validating dashboard token:', error);
      return null;
    }

    return data;
  } catch (error) {
    debugError('Failed to validate dashboard token:', error);
    return null;
  }
};
