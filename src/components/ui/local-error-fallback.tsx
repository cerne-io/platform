import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Send, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { logError } from "@/utils/errorLogging";
import { toast } from "@/hooks/toast";

interface LocalErrorFallbackProps {
  error?: Error;
  eventId?: string | null;
  resetErrorBoundary?: () => void;
  className?: string;
  componentName?: string;
}

/**
 * A production-ready Cerne error fallback for granular UI sections.
 */
export const LocalErrorFallback: React.FC<LocalErrorFallbackProps> = ({ 
  error, 
  eventId,
  resetErrorBoundary,
  className,
  componentName = "AI Section"
}) => {
  const [isReporting, setIsReporting] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  const handleReport = async () => {
    if (!error) return;
    
    setIsReporting(true);
    try {
      // Use our centralized logging system
      logError(error, `User reported issue in ${componentName}`, {
        componentName,
        category: 'ai',
        severity: 'error',
        metadata: {
          userReport: true,
          isCritical: false, // Local failure is not app-critical
        },
        report: true // This triggers the email/backend report
      });

      setHasReported(true);
      toast({
        title: "Issue Reported",
        description: "Thank you. Our team has been notified and will investigate.",
        variant: "success"
      });
    } catch (err) {
      console.error("Failed to report error:", err);
    } finally {
      setIsReporting(false);
    }
  };

  const isInterviewer = componentName?.toLowerCase().includes('interviewer');
  const isAnalysis = !isInterviewer && (
    componentName?.toLowerCase().includes('analysis') ||
    componentName?.toLowerCase().includes('dashboard') ||
    componentName?.toLowerCase().includes('chart') ||
    componentName?.toLowerCase().includes('insight') ||
    componentName?.toLowerCase().includes('triangle') ||
    componentName?.toLowerCase().includes('slider')
  );

  const title = isInterviewer
    ? "Interviewer Unavailable"
    : isAnalysis
      ? "Analysis Unavailable"
      : `${componentName || "Section"} Unavailable`;

  const description = isInterviewer
    ? "We're having trouble loading the interview session right now. Please try restoring the section or refreshing the page."
    : `We're having trouble processing this ${componentName ? componentName.toLowerCase() : "section"} right now. Please try restoring the section or report the issue if it persists.`;

  const showAiBadge = isInterviewer || isAnalysis || componentName?.toLowerCase().includes('ai') || componentName?.toLowerCase().includes('chat');

  return (
    <div className={cn(
      "relative overflow-hidden group p-8 min-h-[300px] flex items-center justify-center bg-gradient-to-br from-background to-muted/30 border border-primary/10 rounded-2xl shadow-sm transition-all duration-500 hover:shadow-md hover:border-primary/20",
      className
    )}>
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-destructive/5 rounded-full blur-2xl group-hover:bg-destructive/10 transition-colors duration-500" />
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center rotate-3 group-hover:rotate-6 transition-transform duration-500">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          {showAiBadge && (
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-background border border-primary/20 flex items-center justify-center shadow-sm">
              <span className="text-[10px] font-bold text-primary">AI</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-bold tracking-tight text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed px-4">
            {description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full px-8">
          <Button
            onClick={resetErrorBoundary}
            className="w-full sm:flex-1 h-10 gap-2 font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Restore Section
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleReport()}
            disabled={isReporting || hasReported}
            className={cn(
              "w-full sm:w-auto h-10 gap-2 border-primary/10 hover:bg-primary/5 transition-all",
              hasReported && "text-green-600 border-green-200 bg-green-50"
            )}
          >
            {hasReported ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Sent
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {isReporting ? "Sending..." : "Report"}
              </>
            )}
          </Button>
        </div>
        
        <div className="pt-2">
          {eventId ? (
            <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-all">
              Reference ID: {eventId}
            </p>
          ) : (
            process.env.NODE_ENV === 'development' && error && (
              <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
                Dev Error: {error.message}
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalErrorFallback;
