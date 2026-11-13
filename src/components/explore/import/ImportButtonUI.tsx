import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
interface ImportButtonUIProps {
  onClick: () => void;
  isLoading: boolean;
}
const ImportButtonUI = ({
  onClick,
  isLoading
}: ImportButtonUIProps) => {
  return <Button variant="secondary" onClick={onClick} disabled={isLoading} className="gap-2 bg-gray-100 border-none hover:bg-gray-200 text-gray-900 shadow-none dark:bg-[#161B22] dark:border dark:border-white/10 dark:text-gray-200 dark:hover:bg-[#1c2128] dark:hover:text-white transition-colors">
    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
    Import CSV
  </Button>;
};
export default ImportButtonUI;