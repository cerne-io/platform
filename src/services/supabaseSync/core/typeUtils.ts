
import { Json } from "@/integrations/supabase/types";

/**
 * Convert any type to a JSON object
 */
export const asJsonObject = <T>(data: T): Json => {
  // If it's already a valid JSON type (including primitives)
  if (data === null || 
      typeof data === 'string' || 
      typeof data === 'number' || 
      typeof data === 'boolean' || 
      Array.isArray(data) || 
      (typeof data === 'object' && data !== null)) {
    return data as unknown as Json;
  }
  
  // Default to empty object only if truly incompatible
  return {} as Json;
};
