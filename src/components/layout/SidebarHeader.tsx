import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
interface SidebarHeaderProps {
  collapsed: boolean;
  toggleSidebar: () => void;
  isMobile?: boolean;
}
export const SidebarHeader = ({
  collapsed,
  toggleSidebar,
  isMobile = false
}: SidebarHeaderProps) => {
  return (
    <div
      className={cn(
        "flex items-center p-4 border-b border-sidebar-border/60 bg-sidebar-accent/5",
        collapsed ? "justify-center" : "justify-between"
      )}
    >
      {!collapsed && (
        <Link to="/projects" className="flex items-center gap-2 mt-0.5">
          <span className="text-2xl font-heading font-bold text-white tracking-[-0.02em] leading-none">
            Cerne
          </span>
          <span className="bg-white/10 text-slate-300 border border-white/15 text-[11px] font-mono px-1.5 py-0.5 rounded leading-none">
            OSS
          </span>
        </Link>
      )}
      {!isMobile && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 rounded-lg p-0 text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all shadow-xs" 
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      )}
    </div>
  );
};