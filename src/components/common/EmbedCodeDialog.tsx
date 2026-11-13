
import React from "react";
import { Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface EmbedCodeDialogProps {
  code: string;
  title: string;
  description: string;
  trigger: React.ReactNode;
}

const EmbedCodeDialog: React.FC<EmbedCodeDialogProps> = ({
  code,
  title,
  description,
  trigger
}) => {
  const { toast } = useToast();

  const handleCopyCode = () => {
    void navigator.clipboard.writeText(code);
    toast({
      title: "Embed code copied",
      description: "The code has been copied to your clipboard"
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="dark:text-white">{title}</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 overflow-hidden">
          <pre className="bg-gray-50 p-4 rounded-md text-sm font-mono overflow-x-auto border max-h-[300px] dark:bg-white/5 dark:border-white/10 dark:text-gray-300">
            {code}
          </pre>
        </div>

        <div className="flex justify-between mt-4">
          <Button
            variant="default"
            className="flex items-center gap-2"
            onClick={handleCopyCode}
          >
            <Code className="h-4 w-4" />
            Copy Code
          </Button>

          <DialogClose asChild>
            <Button variant="outline" className="dark:border-white/20 dark:text-white dark:hover:bg-white/10">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmbedCodeDialog;
