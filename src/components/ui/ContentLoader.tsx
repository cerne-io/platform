import { Loader2 } from "lucide-react";

export const ContentLoader = () => {
    return (
        <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
};
