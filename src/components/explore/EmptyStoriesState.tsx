import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

interface EmptyStoriesStateProps {
  allStoriesEmpty: boolean;
  projectName?: string;
}

const EmptyStoriesState = ({ allStoriesEmpty, projectName }: EmptyStoriesStateProps) => {
  return (
    <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-8 sm:p-12 max-w-lg mx-auto text-center space-y-4 my-8">
      <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
        <BookOpen className="h-6 w-6" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">No stories found</h3>
        <p className="text-sm text-muted-foreground leading-relaxed [text-wrap:balance]">
          {allStoriesEmpty
            ? `There are no stories in ${projectName ? `the "${projectName}" project` : "this project"} yet.`
            : "Try adjusting your search query or filters to find what you're looking for."}
        </p>
      </div>
      <Button asChild className="rounded-lg active:scale-95 transition-transform">
        <Link to="/collect">Share a story</Link>
      </Button>
    </div>
  );
};

export default EmptyStoriesState;
