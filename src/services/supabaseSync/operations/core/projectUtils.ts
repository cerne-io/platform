
import { supabase } from "@/integrations/supabase/client";
import { debugError } from "@/utils/debugLogger";

/**
 * Helper function to check if a project is a template with session caching
 */
export const checkIfTemplateProject = async (projectId: string): Promise<boolean> => {
    // Check session cache first
    const cacheKey = `is_template_${projectId}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached !== null) {
        return cached === 'true';
    }

    try {
        // First check if this project has a public form ID
        // If it does, it's not a template (public forms are only for regular projects)
        const { data: hasPublicForm, error: publicFormError } = await supabase
            .rpc('has_public_form_id', { project_id: projectId });

        if (!publicFormError && hasPublicForm) {
            sessionStorage.setItem(cacheKey, 'false');
            return false; // Has public form = not a template
        }

        // If no public form, check the projects table
        const { data, error } = await supabase
            .from('projects')
            .select('is_template')
            .eq('id', projectId)
            .maybeSingle();

        if (error) {
            debugError(`Error checking if project ${projectId} is a template:`, error);
            return false;
        }

        const isTemplate = data?.is_template === true;

        // Cache the result for the session
        sessionStorage.setItem(cacheKey, isTemplate.toString());

        return isTemplate;
    } catch (error) {
        debugError(`Error checking if project is a template:`, error);
        return false;
    }
};
