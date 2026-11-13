import React, { useState, useEffect, useRef } from "react";
import FormHeader from "./FormHeader";
import { useProject } from "@/contexts/ProjectContext";

import FormLoadingState from "@/components/collect/FormLoadingState";
import { useFormDataWithQuery } from "@/hooks/collect/useFormDataWithQuery";

import CollectFormCard from "@/components/collect/components/CollectFormCard";
import { useFormDesignValidation } from "@/hooks/collect/useFormDesignValidation";
import FormDesignRequired from "@/components/collect/FormDesignRequired";
import { debugLog } from "@/utils/debugLogger";
import { formLanguageService, ProjectLanguages, DEFAULT_LANGUAGES } from "@/services/formLanguageService";

import i18n from "@/i18n";
import { useSearchParams, useNavigate } from "react-router-dom";

const FormContainer: React.FC = () => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { activeProject } = useProject();
    const projectId = activeProject?.id || null;



    const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [stableLoading, setStableLoading] = useState(true);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [langConfig, setLangConfig] = useState<ProjectLanguages>(DEFAULT_LANGUAGES);
    const [activeLang, setActiveLang] = useState<string>('en');
    const [isLangsLoading, setIsLangsLoading] = useState(true);


    // Initial language from URL if present
    const langParam = searchParams.get('lang');

    // Load language settings
    useEffect(() => {
        const loadLangs = async () => {
            if (!projectId) {
                setIsLangsLoading(false);
                return;
            }
            try {
                const config = await formLanguageService.getLanguageConfig(projectId);
                setLangConfig(config);
                
                // Priority: lang param > defaultLanguage > 'en'
                const initialLang = langParam || config.defaultLanguage || 'en';
                setActiveLang(initialLang);
                
                // Sync with i18n
                if (i18n.language !== initialLang) {
                    void i18n.changeLanguage(initialLang);
                }
            } catch (error) {
                debugLog("[FormContainer] Error loading languages:", error);
            } finally {
                setIsLangsLoading(false);
            }
        };
        void loadLangs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const handleLanguageChange = (lang: string) => {
        setActiveLang(lang);
        void i18n.changeLanguage(lang);
        // Optionally update URL param
        const newParams = new URLSearchParams(searchParams);
        newParams.set('lang', lang);
        setSearchParams(newParams, { replace: true });
    };

    // If no project is selected, redirect to the projects page
    useEffect(() => {
        if (!activeProject) {
            debugLog("FormContainer: No active project detected");
            navigate("/projects");
        }
    }, [activeProject, navigate]);

    // Validate form design before showing collect interface
    const {
        hasFormIntegrity,
        hasStoryQuestion,
        hasSliderQuestions,
        hasTriangleQuestions,
        hasParticipantQuestions,
        isLoading: isValidating
    } = useFormDesignValidation(projectId);

    // Use the TanStack Query loader for all form data
    const {
        storyQuestion,
        sliderQuestions,
        participantQuestions,
        triangleQuestions,
        isLoading,
        reloadFromRemote
    } = useFormDataWithQuery(projectId);

    // Add a timeout to prevent flickering on status changes
    useEffect(() => {
        // Clear any existing timeout when loading state changes
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
        }

        if (isLoading) {
            // Set stable loading immediately when we start loading
            setStableLoading(true);
        } else {
            // Delay removing the loading state to prevent flickering
            loadingTimeoutRef.current = setTimeout(() => {
                setStableLoading(false);
            }, 300);
        }

        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [isLoading]);



    // Debug the questions
    useEffect(() => {
        debugLog("FormContainer - Questions loaded:", {
            storyQuestion: storyQuestion ? "Present" : "Missing",
            sliderQuestionsCount: sliderQuestions?.length || 0,
            participantQuestionsCount: participantQuestions?.length || 0,
            triangleQuestionsCount: triangleQuestions?.length || 0,
            isLoading
        });
    }, [participantQuestions, sliderQuestions, triangleQuestions, storyQuestion, isLoading]);

    // Function to force a refresh of the form
    const handleForceRefresh = () => {
        debugLog("Forcing refresh of form data from database");
        if (reloadFromRemote) {
            // Reload data from remote source
            reloadFromRemote();
        } else {
            setRefreshTrigger(prev => prev + 1);
        }
    };

    // If we're still loading the form data or validating design, show a loading state
    if (stableLoading || isValidating || isLangsLoading) {
        return (
            <div className="max-w-4xl mx-auto space-y-8">
                <FormHeader />
                <FormLoadingState />
            </div>
        );
    }

    // If form doesn't have integrity (missing required elements), show the design required component
    if (!hasFormIntegrity) {
        return (
            <div className="max-w-4xl mx-auto space-y-8">
                <FormHeader />
                <FormDesignRequired
                    hasStoryQuestion={hasStoryQuestion}
                    hasSliderQuestions={hasSliderQuestions}
                    hasTriangleQuestions={hasTriangleQuestions}
                    hasParticipantQuestions={hasParticipantQuestions}
                />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <FormHeader />

            <CollectFormCard
                projectId={projectId}
                refreshTrigger={refreshTrigger}
                handleForceRefresh={handleForceRefresh}
                activeLang={activeLang}
                langConfig={langConfig}
                onLanguageChange={handleLanguageChange}
            />
        </div>
    );
};

export default FormContainer;
