import React from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FormErrorFallback } from "@/components/ui/form-error-fallback";
import AuthenticatedFormContainer from "@/components/collect/AuthenticatedFormContainer";
import { ProjectLanguages } from "@/services/formLanguageService";
import LanguageSelector from "@/components/form/LanguageSelector";
import { FileText } from "lucide-react";

interface CollectFormCardProps {
  projectId: string | null;
  refreshTrigger: number;
  handleForceRefresh: () => void;
  activeLang: string;
  langConfig?: ProjectLanguages;
  onLanguageChange?: (lang: string) => void;
}
const CollectFormCard: React.FC<CollectFormCardProps> = ({
  projectId,
  refreshTrigger,
  handleForceRefresh,
  activeLang,
  langConfig,
  onLanguageChange
}) => {
  return (
    <Card className="mb-6 border border-border/80 shadow-xs bg-card rounded-lg overflow-hidden">
      <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-xl sm:text-2xl font-heading font-semibold tracking-tight text-foreground flex items-center">
            <FileText className="mr-2 h-5 w-5 inline text-primary flex-shrink-0" />
            Collect Story Form
            <InfoTooltip contentKey="collect-story-form" size={16} />
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Preview and test your story collection form in real time.
          </CardDescription>
        </div>

        {langConfig && langConfig.enabledLanguages.length > 1 && onLanguageChange && (
          <LanguageSelector 
            activeLang={activeLang}
            enabledLanguages={langConfig.enabledLanguages}
            onLanguageChange={onLanguageChange}
          />
        )}
      </CardHeader>
      <CardContent className="bg-card p-4 sm:p-6 pb-12 force-light text-left border-t border-border/60">


      <ErrorBoundary fallback={<FormErrorFallback title="Form Loading Error" message="There was a problem loading the form. Please try refreshing the page." resetError={handleForceRefresh} />}>
        <AuthenticatedFormContainer 
          projectId={projectId || undefined} 
          key={`form-container-${refreshTrigger}`} 
          activeLang={activeLang}
        />
      </ErrorBoundary>
      </CardContent>
    </Card>
  );
};
export default CollectFormCard;