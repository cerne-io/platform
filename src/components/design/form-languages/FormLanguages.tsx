import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useProject } from "@/contexts/ProjectContext";
import FormLanguageSettings from "../form-appearance/components/FormLanguageSettings";
import { useCompletionState } from "@/hooks/useCompletionState";
import { Globe } from "lucide-react";
import { InfoTooltip } from "../../ui/info-tooltip";

const FormLanguages: React.FC = () => {
  const { activeProject } = useProject();

  // Completion state tracking for this new activity
  const { markCompleted } = useCompletionState({
    projectId: activeProject?.id,
    phase: 'build',
    step: 'form-languages',
    activity: 'form-languages-editor'
  });

  // Track completion when languages are saved
  const handleLanguagesSaved = async () => {
    await markCompleted();
  };

  if (!activeProject?.id) return null;

  return (
    <Card className="bg-white dark:bg-[#161B22] shadow-sm border border-gray-100 dark:border-white/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-md text-primary">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Form Languages
              </CardTitle>
              <div className="mt-0.5">
                <InfoTooltip 
                  content="Enabling multiple languages allows you to provide translations for your form questions. Once saved here, you'll see language tabs in each question editor."
                  contentKey="form-languages"
                />
              </div>
            </div>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Configure which languages your public form supports.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormLanguageSettings 
          projectId={activeProject.id} 
          onSave={() => void handleLanguagesSaved()}
        />
      </CardContent>
    </Card>
  );
};

export default FormLanguages;
