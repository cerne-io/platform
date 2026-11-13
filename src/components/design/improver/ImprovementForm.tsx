import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
interface ImprovementFormProps {
  improvementPrompt: string;
  onImprovementPromptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}
const ImprovementForm: React.FC<ImprovementFormProps> = ({
  improvementPrompt,
  onImprovementPromptChange,
  onSubmit,
  loading
}) => {
  return <form onSubmit={onSubmit} className="space-y-4">
    <Textarea
      placeholder="Example: 'Make this question more engaging' or 'Focus more on emotional aspects'"
      value={improvementPrompt}
      onChange={onImprovementPromptChange}
      rows={2}
      className="w-full bg-white dark:bg-[#0d1117] dark:border-white/10 dark:text-gray-200"
      disabled={loading}
    />

    <Button type="submit" disabled={loading || !improvementPrompt.trim()} className="w-full flex items-center justify-center gap-2 bg-white dark:bg-[#9D7CFF]/10 border border-[#5D3FD3] dark:border-[#9D7CFF]/50 text-[#5D3FD3] dark:text-[#9D7CFF] hover:bg-[#5D3FD3]/5 dark:hover:bg-[#9D7CFF]/20 dark:shadow-[0_0_15px_rgba(157,124,255,0.2)] transition-all">
      {loading ? <>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Improving question...</span>
      </> : <>
        <Sparkles className="h-4 w-4" />
        <span>Improve Question</span>
      </>}
    </Button>

    {loading && <div className="text-xs text-violet-700 dark:text-violet-300 text-center bg-violet-50 dark:bg-violet-900/20 p-2 rounded-md border border-violet-100 dark:border-violet-800/30">
      Optimizing your question... This should only take a few seconds.
    </div>}
  </form>;
};
export default ImprovementForm;