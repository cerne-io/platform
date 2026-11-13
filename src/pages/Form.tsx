
import PageContentErrorBoundary from "@/components/layout/PageContentErrorBoundary";
import FormContainer from "@/components/form/FormContainer";
import { useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { clearLastLoadedProjectId } from "@/services/cache/projectCache";
import { useNavigate } from "react-router-dom";
import { debugLog } from "@/utils/debugLogger";

// Feature flag to control the loader option - set to true for unified loader
const FEATURE_FLAG_UNIFIED_LOADER_DEFAULT = true;

const Form = () => {
    const { activeProject, isLoading } = useProject();
    const navigate = useNavigate();

    // If no project is selected and we've finished loading, redirect to the projects page
    useEffect(() => {
        if (!activeProject && !isLoading) {
            debugLog("No active project selected, redirecting to Projects page");
            navigate("/projects");
        }
    }, [activeProject, isLoading, navigate]);

    // Clear the last loaded project ID on component mount
    useEffect(() => {
        // This ensures we don't use cached data from a previous project
        clearLastLoadedProjectId();

        // Initialize the unified loader preference from localStorage if not already set
        const storedPreference = localStorage.getItem("use_unified_form_loader");
        if (storedPreference === null) {
            localStorage.setItem("use_unified_form_loader", String(FEATURE_FLAG_UNIFIED_LOADER_DEFAULT));
        }
    }, []);

    // If no active project, don't render anything as we're redirecting
    if (!activeProject) {
        return null;
    }

    return (
        <PageContentErrorBoundary>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <FormContainer />
            </div>
        </PageContentErrorBoundary>
    );
};

export default Form;
