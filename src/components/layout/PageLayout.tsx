import React, { useEffect } from "react";
import Sidebar from "./Sidebar";
import { SidebarContent } from "./SidebarContent";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

import PublicFooter from "./PublicFooter";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  simplified?: boolean;
  allowMobile?: boolean; // Kept as part of interface for compatibility but unused
  customBranding?: {
    text?: string;
    logoUrl?: string;
  };
  hideFooter?: boolean;
  noPadding?: boolean;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  className = "",
  simplified = false,
  customBranding,
  hideFooter = false,
  noPadding = false
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  useEffect(() => {
    document.body.classList.add("app-layout");
    return () => {
      document.body.classList.remove("app-layout");
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Mobile Header - Visible only on mobile */}
      {!simplified && (
        <div className="md:hidden h-16 bg-sidebar border-b border-sidebar-border/60 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl font-heading font-bold text-white tracking-[-0.02em] leading-none">
              Cerne
            </span>
            <span className="bg-white/10 text-slate-300 border border-white/15 text-[11px] font-mono px-1.5 py-0.5 rounded leading-none">
              OSS
            </span>
          </div>

          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 hover:text-white rounded-lg active:scale-95 transition-transform" aria-label="Open menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-full max-w-full sm:max-w-xs bg-sidebar border-r border-sidebar-border/60 text-sidebar-foreground">
              <SheetTitle className="sr-only">Main Navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Main application navigation menu
              </SheetDescription>
              <SidebarContent
                collapsed={false}
                isMobile={true}
                onLinkClick={() => setIsMobileMenuOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Show sidebar only if not in simplified mode - Hidden on mobile via Sidebar component classes */}
      {!simplified && <Sidebar />}

      {/* Main content area */}
      <main className={`flex-1 overflow-auto bg-background transition-colors ${className}`}>
        <div className="flex flex-col min-h-full">
          <div className={`flex-1 ${noPadding ? '' : 'p-4 md:p-6'}`}>
            {children}
          </div>

          {/* Dynamic Public Footer */}
          {!hideFooter && <PublicFooter customBranding={customBranding} />}
        </div>
      </main>

    </div>
  );
};

export default PageLayout;
