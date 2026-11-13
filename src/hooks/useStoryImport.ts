
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { parseCSVFile, convertCSVToStories, isCSVFile } from "@/utils/story/csvImportUtils";
import { saveStory } from "@/hooks/collect/form-submission/storyOperations";
import { saveSliderResponses } from "@/hooks/collect/form-submission/sliderResponseOperations";
import { saveParticipantData } from "@/hooks/collect/form-submission/participantResponseOperations";
import { StoryData } from "@/hooks/collect/form-submission/types";
import { supabase } from "@/integrations/supabase/client";
import { saveTriangleResponses } from "@/hooks/collect/form-submission/triangleResponseOperations";
import { debugError } from "@/utils/debugLogger";

interface ImportedSliderResponse {
  question_id: number | string;
  question_text?: string;
  value?: number;
  left_label?: string;
  right_label?: string;
}

interface ImportedTriangleResponse {
  question_id: number | string;
  question_text?: string;
  x_position?: number;
  y_position?: number;
  top_label?: string;
  bottom_left_label?: string;
  bottom_right_label?: string;
}

interface ImportedParticipantResponse {
  question_id: string;
  question_text?: string;
  response?: string;
}

interface ImportedStory {
  title?: string;
  text?: string;
  feeling?: string;
  additional_comments?: string;
  sliderResponses?: ImportedSliderResponse[];
  triangleResponses?: ImportedTriangleResponse[];
  participantResponses?: ImportedParticipantResponse[];
  [key: string]: unknown;
}

interface ImportResults {
  successCount: number;
  errorCount: number;
  partialErrorCount: number;
  hasRLSError: boolean;
}

const parseQuestionNumericId = (id: number | string | undefined, fallback: number = 0): number => {
  if (typeof id === 'number') return id;
  if (typeof id === 'string') {
    const parsed = parseInt(id, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

export const useStoryImport = (onImportSuccess: () => void) => {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const { activeProject, currentUserProjectRole } = useProject();

  const validateProject = (): boolean => {
    if (!activeProject?.id) {
      toast({
        title: "No active project",
        description: "Please select a project before importing stories.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const validateFileType = (file: File): boolean => {
    if (!isCSVFile(file)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const importFile = async (file: File): Promise<void> => {
    if (!activeProject?.id || !validateFileType(file)) return;

    setIsImporting(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        debugError("Error getting current user:", userError);
        throw new Error("Could not authenticate user");
      }

      const userId = userData.user?.id;

      // Defensive check: Only project owner can import stories
      const isOwner = currentUserProjectRole === 'owner' || (userId && activeProject.user_id === userId);
      if (!isOwner) {
        toast({
          title: "Permission denied",
          description: "Only the project owner can import stories.",
          variant: "destructive"
        });
        setIsImporting(false);
        return;
      }

      const csvData = await parseCSVFile(file);
      const storiesToImport = convertCSVToStories(csvData) as ImportedStory[];

      const importResults = await importStories(storiesToImport, activeProject.id, userId);
      handleImportResults(importResults);

    } catch (error) {
      debugError("Error parsing CSV:", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to parse CSV file.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const importStories = async (storiesToImport: ImportedStory[], projectId: string, userId?: string): Promise<ImportResults> => {
    let successCount = 0;
    let errorCount = 0;
    let partialErrorCount = 0;
    let hasRLSError = false;

    const IMPORT_BATCH_SIZE = 5;

    const importSingleStory = async (story: ImportedStory) => {
      try {
        const formData: StoryData = {
          title: (story.title as string) || "",
          text: (story.text as string) || "",
          emotionalResponse: (story.feeling as string) || "",
          additionalComments: (story.additional_comments as string) || "",
          sliderResponses: [],
          participantResponses: [],
          projectId: projectId,
          isImported: true,
          storySource: 'csv_import'
        };

        const storyId = await saveStory(formData, projectId, userId);

        if (storyId) {
          const responseSaves: Promise<boolean>[] = [];

          if (Array.isArray(story.sliderResponses) && story.sliderResponses.length > 0) {
            responseSaves.push(saveSliderData(story, storyId, projectId));
          }

          if (Array.isArray(story.triangleResponses) && story.triangleResponses.length > 0) {
            responseSaves.push(saveTriangleData(story, storyId, projectId));
          }

          if (Array.isArray(story.participantResponses) && story.participantResponses.length > 0) {
            responseSaves.push(saveParticipantData(createParticipantFormData(story, projectId), storyId));
          }

          const results = await Promise.all(responseSaves);
          const responsesAllSaved = results.every(Boolean);

          return { status: "ok" as const, partialError: !responsesAllSaved };
        }

        return { status: "error" as const, rlsError: false };
      } catch (error) {
        debugError("Error importing story:", error);
        const rlsError = Boolean(error && typeof error === 'object' && 'code' in error && error.code === '42501');
        return { status: "error" as const, rlsError };
      }
    };

    for (let i = 0; i < storiesToImport.length; i += IMPORT_BATCH_SIZE) {
      const batch = storiesToImport.slice(i, i + IMPORT_BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(importSingleStory));

      for (const res of batchResults) {
        if (res.status === "ok") {
          successCount++;
          if (res.partialError) partialErrorCount++;
        } else {
          errorCount++;
          if (res.rlsError) hasRLSError = true;
        }
      }
    }

    return { successCount, errorCount, partialErrorCount, hasRLSError };
  };

  const saveSliderData = async (story: ImportedStory, storyId: string, projectId: string): Promise<boolean> => {
    const sliderResponses = story.sliderResponses ?? [];
    const sliderFormData: StoryData = {
      text: (story.text as string) || "",
      title: (story.title as string) || "",
      emotionalResponse: "",
      additionalComments: "",
      sliderResponses: sliderResponses.map((slider) => ({
        questionId: parseQuestionNumericId(slider.question_id),
        questionText: slider.question_text || `Slider Question ${slider.question_id}`,
        value: typeof slider.value === 'number' ? slider.value : 0,
        responseType: 'answered',
        leftLabel: slider.left_label || "",
        rightLabel: slider.right_label || ""
      })),
      participantResponses: [],
      projectId: projectId
    };

    return saveSliderResponses(sliderFormData, storyId);
  };

  const saveTriangleData = async (story: ImportedStory, storyId: string, projectId: string): Promise<boolean> => {
    const triangleResponses = story.triangleResponses ?? [];
    const triangleFormData: StoryData = {
      text: (story.text as string) || "",
      title: (story.title as string) || "",
      emotionalResponse: "",
      additionalComments: "",
      sliderResponses: [],
      triangleResponses: triangleResponses.map((triangle) => ({
        questionId: parseQuestionNumericId(triangle.question_id),
        questionText: triangle.question_text || `Triangle Question ${triangle.question_id}`,
        xPosition: typeof triangle.x_position === 'number' ? triangle.x_position : null,
        yPosition: typeof triangle.y_position === 'number' ? triangle.y_position : null,
        topLabel: triangle.top_label || "",
        bottomLeftLabel: triangle.bottom_left_label || "",
        bottomRightLabel: triangle.bottom_right_label || "",
        responseType: 'answered'
      })),
      participantResponses: [],
      projectId: projectId
    };

    return saveTriangleResponses(triangleFormData, storyId);
  };

  const createParticipantFormData = (story: ImportedStory, projectId: string): StoryData => {
    const participantResponses = story.participantResponses ?? [];
    const participantFormData: StoryData = {
      text: (story.text as string) || "",
      title: (story.title as string) || "",
      emotionalResponse: "",
      additionalComments: "",
      sliderResponses: [],
      participantResponses: participantResponses.map((response) => ({
        questionId: String(response.question_id ?? ""),
        questionText: response.question_text || "",
        choiceId: response.response || "",
        choiceText: response.response || ""
      })),
      projectId: projectId
    };

    return participantFormData;
  };

  const handleImportResults = ({ successCount, errorCount, partialErrorCount, hasRLSError }: ImportResults) => {
    if (successCount > 0) {
      if (partialErrorCount > 0) {
        toast({
          title: "Import completed with warnings",
          description: errorCount > 0
            ? `Imported ${successCount} stories; ${errorCount} stories failed to import. Question responses could not be fully saved for ${partialErrorCount} imported stories.`
            : `Imported ${successCount} stories. Question responses could not be fully saved for ${partialErrorCount} stories.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Import completed",
          description: `Successfully imported ${successCount} stories with their responses.${errorCount > 0 ? ` Failed to import ${errorCount} stories.` : ''}`,
          variant: "default"
        });
      }

      onImportSuccess();
    } else {
      if (hasRLSError) {
        toast({
          title: "Import failed - Permission denied",
          description: "You don't have permission to add stories to this project. Please contact your project administrator.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Import failed",
          description: `Failed to import any stories. Please check your CSV format and try again.`,
          variant: "destructive"
        });
      }
    }
  };

  return {
    isImporting,
    validateProject,
    importFile
  };
};
