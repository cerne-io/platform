import { useState, useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";

import { useFormDesignValidation } from "@/hooks/collect/useFormDesignValidation";
import { useStoryQuestion } from "@/hooks/useStoryQuestion";
import { fetchComprehensiveProjectContext } from "@/utils/project-context/dataFetcher";
import { buildProjectContext } from "@/utils/project-context/contextBuilder";
import { getProjectSliderQuestions } from "@/services/accessQuestions/sliderQuestionsAccess";
import { getProjectTriangleQuestions } from "@/services/accessQuestions/triangleQuestionsAccess";
import { getParticipantQuestionsWithSync } from "@/services/sync/participantQuestionsSyncService";
import { getQuestionType } from "@/services/formConfig/questionTypeService";
import { fetchProjectById } from "@/services/projectService";
import { SliderQuestion, TriangleQuestion, ParticipantQuestion } from "@/services/types/designTypes";
import { debugLog, debugError } from "@/utils/debugLogger";
import { filterQuestionsByType } from "@/utils/filterQuestionsByType";

export const useInterviewerPageData = (projectId: string | undefined) => {
    const { setActiveProject, activeProject } = useProject();

    const [projectContext, setProjectContext] = useState<string>("");
    const [contextLoading, setContextLoading] = useState(true);
    const [sliderQuestions, setSliderQuestions] = useState<SliderQuestion[]>([]);
    const [triangleQuestions, setTriangleQuestions] = useState<TriangleQuestion[]>([]);
    const [participantQuestions, setParticipantQuestions] = useState<ParticipantQuestion[]>([]);

    // Validate form design before showing interviewer interface
    const {
        hasFormIntegrity,
        hasStoryQuestion,
        hasSliderQuestions,
        hasTriangleQuestions,
        hasParticipantQuestions,
        isLoading: isValidating
    } = useFormDesignValidation(projectId);

    // Get story question for this project
    const {
        savedQuestion,
        isLoading: storyLoading
    } = useStoryQuestion(projectId || '');

    // Sync active project with URL projectId
    useEffect(() => {
        if (!projectId) return;
        const syncActiveProject = async () => {
            try {
                const { data: project, error } = await fetchProjectById(projectId);

                if (error) {
                    debugError('Error fetching project for interviewer:', error);
                    return;
                }

                if (project) {
                    debugLog('Setting active project for interviewer:', project.name);
                    setActiveProject(project);
                }
            } catch (error) {
                debugError('Failed to sync active project:', error);
            }
        };
        void syncActiveProject();
    }, [projectId, setActiveProject]);

    // Load project context on mount
    useEffect(() => {
        const loadProjectContext = async () => {
            if (!projectId) return;
            setContextLoading(true);
            try {
                // Fetch comprehensive project context data
                const contextData = await fetchComprehensiveProjectContext(projectId);

                // Build the project context using the project data object
                const context = buildProjectContext({
                    name: `Project ${projectId}`,
                    id: projectId,
                    description: "Project context for interviewer AI",
                    activityResponses: contextData
                });
                setProjectContext(context);

                // Fetch question type, slider questions, triangle questions, and participant questions
                const [qType, sliders, triangles, participants] = await Promise.all([
                    getQuestionType(projectId),
                    getProjectSliderQuestions(projectId),
                    getProjectTriangleQuestions(projectId),
                    getParticipantQuestionsWithSync(projectId)
                ]);
                debugLog('Interviewer - Question Type:', qType);

                // Filter question arrays to respect the saved question type
                const filtered = filterQuestionsByType(sliders, triangles, qType);
                setSliderQuestions(filtered.sliderQuestions);
                setTriangleQuestions(filtered.triangleQuestions);
                setParticipantQuestions(participants?.questions || []);
            } catch (error) {
                debugError("Error loading project context:", error);
            } finally {
                setContextLoading(false);
            }
        };
        void loadProjectContext();
    }, [projectId]);

    return {
        projectContext,
        contextLoading,
        sliderQuestions,
        triangleQuestions,
        participantQuestions,
        isValidating,
        hasFormIntegrity,
        hasStoryQuestion,
        hasSliderQuestions,
        hasTriangleQuestions,
        hasParticipantQuestions,
        savedQuestion,
        storyLoading,
        activeProject
    };
};
