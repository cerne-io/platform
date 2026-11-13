import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { NavigationItem, isNavItemActive, isChildActive } from "@/utils/navigation";
import { preloadRoute } from "@/config/routeConfig";

interface SidebarNavItemProps {
  item: NavigationItem;
  level?: number;
  collapsed: boolean;
  expandedItems: string[];
  toggleExpand: (name: string) => void;
  onLinkClick?: () => void;
}

export function SidebarNavItem({
  item,
  level = 0,
  collapsed,
  expandedItems,
  toggleExpand,
  onLinkClick
}: SidebarNavItemProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isClickable = !!item.onClick || !!item.href || !!item.children;
  const isExpanded = expandedItems.includes(item.name);
  const hasChildren = item.children && item.children.length > 0;

  const isActive = isNavItemActive(item, location.pathname);
  const isChildActiveItem = isChildActive(item, location.pathname);

  const handleClick = () => {
    if (item.onClick) {
      item.onClick();
    }

    if (hasChildren) {
      toggleExpand(item.name);

      if (item.href) {
        navigate(item.href);
        if (onLinkClick) onLinkClick();
      }
    } else {
      if (item.href && onLinkClick) {
        onLinkClick();
      }
    }
  };

  const navContent = (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
        collapsed && "justify-center p-2",
        item.disabled && "opacity-50 cursor-not-allowed",
        !item.disabled && isActive
          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
          : !item.disabled && isChildActiveItem && !isActive
            ? "text-white bg-white/10 font-medium"
            : !item.disabled && "text-sidebar-foreground hover:bg-white/10 hover:text-white",
        !item.disabled && isClickable && "cursor-pointer active:scale-[0.98]",
        level > 0 && !collapsed && "ml-3.5 pl-3 border-l border-sidebar-border/40 text-xs py-1.5" // Indent children with tree guide
      )}
      onClick={(e) => {
        if (item.disabled) {
          e.preventDefault();
          return;
        }
        handleClick();
      }}
      onMouseEnter={() => {
        if (item.href && !item.disabled) {
          preloadRoute(item.href);
        }
      }}
      data-tour={item.dataTour}
    >
      <span className="flex-shrink-0 inline-flex items-center justify-center">{item.icon}</span>
      {!collapsed && (
        <div className="flex-1 flex items-center justify-between">
          <span className="tracking-tight">{item.name}</span>
          {hasChildren && (
            <span className="ml-auto text-sidebar-foreground/70">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </div>
      )}
    </div>
  );

  const wrappedContent = item.href && !hasChildren ? (
    <Link to={item.href}>
      {navContent}
    </Link>
  ) : navContent;

  const needsTooltip = collapsed || item.tooltip;
  const tooltipText = item.tooltip || item.name;
  
  const contentWithTooltip = needsTooltip ? (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <span className="block">{wrappedContent}</span>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-popover text-popover-foreground text-xs rounded-lg shadow-md border border-border/80 px-2.5 py-1">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  ) : wrappedContent;

  return (
    <div key={item.name}>
      {contentWithTooltip}
      {hasChildren && isExpanded && (
        <div className={cn("mt-1 space-y-1", collapsed && "flex flex-col items-center")}>
          {item.children!.map(child => (
            <SidebarNavItem
              key={child.name}
              item={child}
              level={level + 1}
              collapsed={collapsed}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
              onLinkClick={onLinkClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
