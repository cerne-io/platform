import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { debugError } from "@/utils/debugLogger";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    debugError(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    // Add noindex meta tag
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans relative selection:bg-primary/20">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-radial from-primary/5 via-transparent to-transparent pointer-events-none" />

      <main className="flex-grow flex items-center justify-center p-6 py-20 relative z-10">
        <div className="text-center max-w-xl mx-auto space-y-8">
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center text-primary mx-auto shadow-xs">
              <Compass className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold font-heading text-foreground tracking-[-0.03em] [text-wrap:balance]">
              This page is off the grid.
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground [text-wrap:pretty] max-w-md mx-auto leading-relaxed">
              The link might be broken, or the page may have been moved or archived. Let's get you back on track.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" className="w-full sm:w-auto active:scale-[0.98] shadow-xs gap-2 rounded-xl h-11 px-6" asChild>
              <Link to="/">
                <Home className="w-4 h-4" />
                <span>Return to Cerne</span>
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
