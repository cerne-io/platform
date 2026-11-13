
import { createServiceDebugLogger } from "@/utils/debugLogger";

const logger = createServiceDebugLogger('SupabaseDebug');

/**
 * Utility for debugging Supabase queries
 * @param message Debug message to log
 */
export const debugSupabaseQuery = (message: string): void => {
  logger.log(message);
};
