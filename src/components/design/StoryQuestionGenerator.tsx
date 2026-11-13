
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface StoryQuestionGeneratorProps {
  loading: boolean;
  error: string | null;
  onGenerate: (e: React.MouseEvent) => void;
  onManualStart?: () => void;
}

const StoryQuestionGenerator: React.FC<StoryQuestionGeneratorProps> = ({
  loading,
  error,
  onGenerate,
  onManualStart
}) => {
  const handleGenerate = (e: React.MouseEvent) => {
    // Add a user-visible toast when generate is clicked
    toast({
      title: "Generating question",
      description: "Creating your story question based on project information...",
    });

    onGenerate(e);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Let the AI assistant suggest story questions based on your project information.
        This will use information from your planning phase activities to create a question.
      </p>
      <div className="flex flex-col gap-3">
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white dark:bg-[#9D7CFF]/10 border border-[#5D3FD3] dark:border-[#9D7CFF]/50 text-[#5D3FD3] dark:text-[#9D7CFF] hover:bg-[#5D3FD3]/5 dark:hover:bg-[#9D7CFF]/20 dark:shadow-[0_0_15px_rgba(157,124,255,0.2)] transition-all"
          variant={error ? "destructive" : "default"}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating question... (may take 30 seconds)
            </>
          ) : error ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              Retry Generation
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Story Question
            </>
          )}
        </Button>

        {!loading && onManualStart && (
          <Button
            variant="ghost"
            onClick={onManualStart}
            className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            Write manually
          </Button>
        )}
      </div>

      {loading && (
        <div className="mt-2 p-3 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-white/10 rounded-md text-sm text-gray-600 dark:text-gray-300 shadow-sm">
          <p className="font-medium text-foreground">AI is working on your question</p>
          <p>This may take up to 30 seconds depending on server load. Please be patient.</p>
        </div>
      )}

      {error && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-md text-sm text-red-700 dark:text-red-200">
          <p className="font-medium">Error generating question:</p>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default StoryQuestionGenerator;
