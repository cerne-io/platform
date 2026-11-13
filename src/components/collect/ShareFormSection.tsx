import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useFormLink } from "@/hooks/collect/useFormLink";
import { useCompletionState } from "@/hooks/useCompletionState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link, AlertCircle, Info, Loader2, FileText, UserCheck, Wand2, RotateCcw, Calendar as CalendarIcon } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { getPublicFormBaseUrl } from "@/utils/urlUtils";
import QRCodeGenerator from "@/components/collect/QRCodeGenerator";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { debugError } from "@/utils/debugLogger";
import ShareLinkCard from "./components/ShareLinkCard";

interface ShareFormSectionProps {
  integrityWarnings?: string[];
  limitReached?: boolean;
  graceRemaining?: number | null;
}

const ShareFormSection: React.FC<ShareFormSectionProps> = ({
  integrityWarnings = [],
}) => {
  const { toast } = useToast();
  const { activeProject, currentUserProjectRole } = useProject();
  const isViewer = currentUserProjectRole === 'viewer';

  const [isLinkReady, setIsLinkReady] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  const { markCompleted } = useCompletionState({
    projectId: activeProject?.id,
    phase: 'collection',
    step: 'public-form',
    activity: 'form-config'
  });

  const {
    formId,
    startDate,
    endDate,
    isGenerating,
    isRevoking,
    handleRevokeLink,
    ensureFormIdExists,
    handleUpdateSchedule
  } = useFormLink();

  useEffect(() => {
    if (formId) {
      setIsLinkReady(true);
    } else {
      setIsLinkReady(false);
      setShowSuccessAlert(false);
    }
  }, [formId]);

  const generateLink = useCallback(async () => {
    try {
      const id = await ensureFormIdExists();
      if (id) {
        setIsLinkReady(true);
        setShowSuccessAlert(true);
        await markCompleted();
      }
    } catch (error) {
      debugError("Error generating link:", error);
      toast({
        title: "Error",
        description: "Failed to generate link.",
        variant: "destructive"
      });
    }
  }, [ensureFormIdExists, markCompleted, toast]);

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const action = searchParams.get('action');

    if (action === 'generate-links') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams, { replace: true });

      if (!formId && !isLinkReady && !isGenerating) {
        void generateLink();
      }
    }
  }, [searchParams, formId, isLinkReady, isGenerating, generateLink, setSearchParams]);

  const getEmbedCode = (path: string) => {
    const url = `${getPublicFormBaseUrl()}${path}`;

    return `<iframe src="${url}" width="100%" height="800px" frameborder="0"></iframe>`;
  };

  return (
    <div className="space-y-6">
      {/* Header Section with Generate/Revoke Button */}
      <div className="bg-card p-6 rounded-xl shadow-xs border border-border/80">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center">
                <Wand2 className="mr-2 h-6 w-6 inline text-primary" />
                Generate Shareable Links
              </h2>
              <InfoTooltip contentKey="collect-generate-links" size={16} />
            </div>
            <p className="text-sm text-muted-foreground">
              Generate a shareable link, embed code, and QR code for form submissions.
            </p>
            <div className="flex items-center pt-1">
              {(() => {
                if (isLinkReady) {
                  const now = new Date();
                  const isStartValid = !startDate || now >= startDate;
                  const isEndValid = !endDate || now <= endDate;
                  const isActive = isStartValid && isEndValid;

                  if (isActive) {
                    return (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Collection Active
                      </span>
                    );
                  }
                }

                // Default inactive state
                return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                    Collection Inactive
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            {isLinkReady && !isViewer && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("min-w-[200px] justify-start text-left font-normal border-border/80 shadow-xs", !startDate && !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      endDate ? (
                        <>
                          {format(startDate, "LLL dd, y")} - {format(endDate, "LLL dd, y")}
                        </>
                      ) : (
                        <>From {format(startDate, "LLL dd, y")}</>
                      )
                    ) : (
                      endDate ? (
                        <>Until {format(endDate, "LLL dd, y")}</>
                      ) : (
                        <span>Schedule Availability</span>
                      )
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4 border-border/80 shadow-md rounded-xl" align="end">
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm leading-none text-foreground">Select Dates</h4>
                      <Calendar
                        mode="range"
                        defaultMonth={startDate || undefined}
                        selected={{
                          from: startDate || undefined,
                          to: endDate || undefined,
                        }}
                        onSelect={(range) => {
                          void handleUpdateSchedule(range?.from || null, range?.to || null);
                        }}
                        numberOfMonths={1}
                        initialFocus
                      />
                    </div>
                    {(startDate || endDate) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => { void handleUpdateSchedule(null, null); }}
                      >
                        Clear Schedule
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {!isViewer && (isLinkReady ? (
              <Button
                onClick={() => { void handleRevokeLink(); }}
                disabled={isRevoking}
                variant="destructive"
                className="min-w-[140px] shadow-xs"
                size="default"
              >
                {isRevoking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Revoke Links
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => { void generateLink(); }}
                disabled={isGenerating}
                className="min-w-[180px] shadow-xs"
                size="default"
                data-tour="generate-links-btn"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Links
                  </>
                )}
              </Button>
            ))}
          </div>
        </div>

        {!isLinkReady && !isGenerating && (
          <div className="mt-6 space-y-3">
            {integrityWarnings.length > 0 && (
              <Alert variant="warning" className="rounded-xl border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription>
                  <span className="font-medium">Optional elements missing:</span>
                  <ul className="list-disc list-inside mt-1 text-sm space-y-0.5">
                    {integrityWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                  <p className="text-xs mt-1.5 opacity-90">You can still generate links without these.</p>
                </AlertDescription>
              </Alert>
            )}
            {isViewer ? (
              <Alert className="rounded-xl border-border/80 bg-muted/40">
                <Info className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-muted-foreground text-sm">
                  Links have not been generated by the project owner yet.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="rounded-xl border-border/80 bg-muted/40">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-muted-foreground text-sm">
                  Click <strong className="text-foreground">"Generate Links"</strong> to create shareable links for your project.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>

      {/* Cards Section */}
      {isLinkReady && (
        <div className="space-y-6">
          {showSuccessAlert && (
            <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200 rounded-xl">
              <Link className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertDescription className="text-sm">
                Your links are ready! Share them with your participants.
                {startDate && (
                  <span className="ml-2 font-medium">
                    Active from {format(startDate, "MMM d, yyyy")}
                    {endDate && ` to ${format(endDate, "MMM d, yyyy")}`}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-6">
              <ShareLinkCard
                title="Share Form"
                description="Traditional web form story submission"
                url={`${getPublicFormBaseUrl()}/submit-story/${formId}`}
                embedCode={getEmbedCode(`/submit-story/${formId}`)}
                icon={FileText}
              />
              <ShareLinkCard
                title="Share Interviewer"
                description="AI-guided conversational interview experience"
                url={`${getPublicFormBaseUrl()}/interview/${formId}`}
                embedCode={getEmbedCode(`/interview/${formId}`)}
                icon={UserCheck}
              />
            </div>

            <QRCodeGenerator />
          </div>
        </div>
      )}
    </div>
  );
};
export default ShareFormSection;