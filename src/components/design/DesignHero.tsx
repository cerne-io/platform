import React from "react";
import { BookOpen, PenTool, Sparkles, ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/common/AppLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { getEffectiveProjectId } from "@/services/utils/storageUtils";

interface DesignHeroProps {
  onSelectPath: (stepId: string) => void;
  onDismiss?: () => void;
  projectId?: string;
}

const DesignHero: React.FC<DesignHeroProps> = ({
  onSelectPath,
  projectId
}) => {
  const handleChoose = (stepId: string) => {
    const pid = projectId || getEffectiveProjectId();
    if (pid) {
      localStorage.setItem(`design-fork-choice-${pid}`, stepId);
      sessionStorage.setItem(`design-fork-choice-${pid}`, stepId);
    }
    onSelectPath(stepId);
  };

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-1 border border-primary/20 shadow-xs">
          <Compass className="w-6 h-6" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 text-primary">
            <AppLogo className="w-full h-full" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold font-heading tracking-[-0.02em] text-foreground [text-wrap:balance]">
            Cerne Design
          </h1>
        </div>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-xl mx-auto [text-wrap:pretty]">
          Choose where you want to start. You can explore, edit, and navigate between stages at any time from the sidebar.
        </p>
      </div>

      {/* Two Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Stage 1: Context & Framing */}
        <Card
          onClick={() => handleChoose("organization")}
          className="flex flex-col border border-border/80 hover:border-primary/50 transition-all duration-200 ease-smooth shadow-xs hover:shadow-sm bg-card rounded-lg cursor-pointer group active:scale-[0.99]"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center border border-primary/20 transition-transform duration-200 group-hover:scale-105">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-sm bg-muted text-muted-foreground border border-border/60 group-hover:text-foreground transition-colors tabular-nums">
                Stage 1
              </span>
            </div>
            <CardTitle className="text-lg md:text-xl font-heading font-semibold text-foreground group-hover:text-primary transition-colors tracking-tight">
              Context & Framing
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Strategic foundation & AI context
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 flex-1 text-xs md:text-sm text-muted-foreground">
            <p className="leading-relaxed font-medium text-foreground">
              Complete this stage by yourself or with your team to:
            </p>
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-sm bg-primary/10 text-primary text-xs font-mono font-medium shrink-0 mt-0.5 tabular-nums">
                  1
                </span>
                <span className="text-foreground/85 leading-relaxed">
                  Reflect on the context and focus of the project
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-sm bg-primary/10 text-primary text-xs font-mono font-medium shrink-0 mt-0.5 tabular-nums">
                  2
                </span>
                <span className="text-foreground/85 leading-relaxed inline-flex items-center gap-1.5 flex-wrap">
                  Use Design Assistant <Sparkles className="h-4 w-4 text-purple-500 inline-block shrink-0" /> to help you design the form
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2">
            <Button
              variant="outline"
              size="lg"
              className="w-full flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-150 font-medium active:scale-[0.98] shadow-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleChoose("organization");
              }}
            >
              <span>Start with Context & Framing</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
            </Button>
          </CardFooter>
        </Card>

        {/* Stage 2: Form Design */}
        <Card
          onClick={() => handleChoose("form-builder")}
          className="flex flex-col border border-border/80 hover:border-primary/50 transition-all duration-200 ease-smooth shadow-xs hover:shadow-sm bg-card rounded-lg cursor-pointer group active:scale-[0.99]"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center border border-primary/20 transition-transform duration-200 group-hover:scale-105">
                <PenTool className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-sm bg-muted text-muted-foreground border border-border/60 group-hover:text-foreground transition-colors tabular-nums">
                Stage 2
              </span>
            </div>
            <CardTitle className="text-lg md:text-xl font-heading font-semibold text-foreground group-hover:text-primary transition-colors tracking-tight">
              Form Design
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Direct story prompt & question setup
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 flex-1 text-xs md:text-sm text-muted-foreground">
            <p className="leading-relaxed font-medium text-foreground">
              Skip to stage 2 if:
            </p>
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-sm bg-primary/10 text-primary text-xs font-mono font-medium shrink-0 mt-0.5 tabular-nums">
                  1
                </span>
                <span className="text-foreground/85 leading-relaxed">
                  You have already reflected on the context and framing elsewhere
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-sm bg-primary/10 text-primary text-xs font-mono font-medium shrink-0 mt-0.5 tabular-nums">
                  2
                </span>
                <span className="text-foreground/85 leading-relaxed">
                  To input manually the contents of the form
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2">
            <Button
              variant="outline"
              size="lg"
              className="w-full flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-150 font-medium active:scale-[0.98] shadow-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleChoose("form-builder");
              }}
            >
              <span>Go directly to Form Design</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Guided Assistant Callout */}
      <div className="flex items-center justify-center pt-2">
        <Button
          variant="outline"
          size="lg"
          className="h-auto py-3 px-5 text-xs md:text-sm font-medium text-foreground hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-400/50 dark:hover:border-purple-600/50 bg-card hover:bg-purple-50/50 dark:hover:bg-purple-950/20 shadow-xs transition-all duration-150 rounded-lg gap-3 group active:scale-[0.98]"
          onClick={() => {
            handleChoose("form-builder");
            window.dispatchEvent(new CustomEvent("open-guided-assistant"));
          }}
        >
          <div className="w-7 h-7 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="leading-snug">
            Prefer interactive guidance?{" "}
            <span className="font-semibold text-purple-600 dark:text-purple-400 underline-offset-4 group-hover:underline">
              Start the Guided Assistant
            </span>
          </span>
        </Button>
      </div>
    </div>
  );
};

export default DesignHero;