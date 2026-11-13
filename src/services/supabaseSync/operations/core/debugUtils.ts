
// Import the core debug utility directly from the service's core directory
import { debugSupabaseQuery as coreDebugSupabaseQuery } from "../../../../services/supabaseSync/core/debugUtils";

/**
 * Utility for debugging Supabase queries
 * Re-exports the core debug utility to avoid duplication
 * @param message Debug message to log
 */
export const debugSupabaseQuery = coreDebugSupabaseQuery;
