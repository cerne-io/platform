
import { supabase } from "@/integrations/supabase/client";
import { nanoid } from "nanoid";

import { debugLog, debugError } from "@/utils/debugLogger";

// Create or update a form identifier for sharing
export const createOrUpdateFormIdentifier = async (
  projectId: string,
  startDate?: Date | null,
  endDate?: Date | null
): Promise<string | null> => {
  try {
    if (!projectId) {
      debugError("No project ID provided for form identifier creation");
      return null;
    }

    // Check if a form ID already exists for this project
    const { data: existingFormIds, error: fetchError } = await supabase
      .from('form_identifiers')
      .select('form_id')
      .eq('fi_project_id', projectId)
      .maybeSingle();

    if (fetchError && !fetchError.message.includes('No rows found')) {
      debugError("Error checking for existing form ID:", fetchError);
      return null;
    }

    // If we found an existing form ID, update its schedule if provided, then return it
    if (existingFormIds?.form_id) {
      debugLog("Using existing form ID:", existingFormIds.form_id);

      if (startDate !== undefined || endDate !== undefined) {
        await updateFormSchedule(projectId, startDate, endDate);
      }

      return existingFormIds.form_id;
    }

    // Otherwise, create a new form ID
    const formId = nanoid(10); // Generate a short, unique ID

    debugLog("Creating new form ID:", formId, "for project:", projectId);

    const { data, error } = await supabase
      .from('form_identifiers')
      .insert({
        fi_project_id: projectId,
        form_id: formId,
        start_date: startDate ? startDate.toISOString() : null,
        end_date: endDate ? endDate.toISOString() : null
      })
      .select('form_id')
      .single();

    if (error) {
      debugError("Error creating form identifier:", error);
      return null;
    }

    debugLog("Created new form ID:", data.form_id);
    return data.form_id;
  } catch (error) {
    debugError("Failed to create/update form identifier:", error);
    return null;
  }
};

interface FormIdentifierData {
  form_id: string;
  start_date: string | null;
  end_date: string | null;
}

// Fetch an existing form identifier for a project
export const fetchExistingFormIdentifier = async (projectId: string): Promise<FormIdentifierData | null> => {
  if (!projectId) {
    debugError("No project ID provided for form identifier fetch");
    return null;
  }

  try {
    debugLog("Fetching form identifier for project:", projectId);

    const { data, error } = await supabase
      .from('form_identifiers')
      .select('form_id, start_date, end_date')
      .eq('fi_project_id', projectId)
      .maybeSingle();

    if (error) {
      debugError("Error fetching form ID:", error);
      return null;
    }

    if (!data?.form_id) {
      debugLog("No form ID found for project:", projectId);
      return null;
    }

    debugLog("Found form ID:", data.form_id, "for project:", projectId);
    return data as FormIdentifierData;
  } catch (error) {
    debugError("Error fetching form ID:", error);
    return null;
  }
};

// Update the schedule for a form identifier
export const updateFormSchedule = async (
  projectId: string,
  startDate?: Date | null,
  endDate?: Date | null
): Promise<boolean> => {
  try {
    if (!projectId) return false;

    const updates: { start_date?: string | null; end_date?: string | null } = {};
    if (startDate !== undefined) updates.start_date = startDate ? startDate.toISOString() : null;
    if (endDate !== undefined) updates.end_date = endDate ? endDate.toISOString() : null;

    if (Object.keys(updates).length === 0) return true;

    const { error } = await supabase
      .from('form_identifiers')
      .update(updates)
      .eq('fi_project_id', projectId);

    if (error) {
      debugError("Error updating form schedule:", error);
      return false;
    }

    return true;
  } catch (error) {
    debugError("Failed to update form schedule:", error);
    return false;
  }
};

// Check if a form ID exists
export const checkFormIdExists = async (formId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('form_identifiers')
      .select('form_id')
      .eq('form_id', formId)
      .maybeSingle();

    if (error) {
      debugError("Error checking if form ID exists:", error);
      return false;
    }

    return !!data?.form_id;
  } catch (error) {
    debugError("Error checking if form ID exists:", error);
    return false;
  }
};

// Revoke a form identifier
export const revokeFormIdentifier = async (projectId: string): Promise<boolean> => {
  try {
    if (!projectId) {
      debugError("No project ID provided for form identifier revocation");
      return false;
    }

    debugLog("Revoking form identifier for project:", projectId);

    const { error } = await supabase
      .from('form_identifiers')
      .delete()
      .eq('fi_project_id', projectId);

    if (error) {
      debugError("Error revoking form identifier:", error);
      return false;
    }

    debugLog("Successfully revoked form identifier for project:", projectId);
    return true;
  } catch (error) {
    debugError("Failed to revoke form identifier:", error);
    return false;
  }
};
