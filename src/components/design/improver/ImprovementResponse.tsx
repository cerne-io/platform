
import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

interface ImprovementResponseProps {
  response: string;
  onAccept: () => void;
  loading?: boolean;
}

const ImprovementResponse: React.FC<ImprovementResponseProps> = ({
  response,
  onAccept,
  loading = false
}) => {
  if (!response) {
    return null;
  }

  return (
    <div className="mt-4 p-4 rounded-md border bg-violet-50/50 border-violet-100 dark:bg-[#161B22] dark:border-violet-500/20">
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-medium text-violet-700 dark:text-violet-400">Improved Question:</p>
        <Button
          variant="outline"
          size="sm"
          className="ml-2 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20"
          onClick={onAccept}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Accept
            </>
          )}
        </Button>
      </div>
      <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{response}</div>
    </div>
  );
};

export default ImprovementResponse;
