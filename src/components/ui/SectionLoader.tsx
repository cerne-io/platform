import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionLoaderProps {
    className?: string;
    height?: string;
}

export const SectionLoader = ({ className, height = "h-[300px]" }: SectionLoaderProps) => {
    return (
        <div className={cn("flex w-full items-center justify-center bg-muted/5 rounded-lg border border-border/10", height, className)}>
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm">Loading component...</span>
            </div>
        </div>
    );
};
