
import { supabase } from "@/integrations/supabase/client";
import { safeError } from "@/utils/productionLogger";

/**
 * Check if the current user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return false;
    }
    return true;
  } catch (error) {
    safeError("Error checking authentication:", error);
    return false;
  }
};
