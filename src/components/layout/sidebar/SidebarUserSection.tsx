
import React from "react";
import { cn } from "@/lib/utils";
import { UserCard } from "../UserCard";


interface SidebarUserSectionProps {
  collapsed: boolean;
  onLinkClick?: () => void;
}

export const SidebarUserSection: React.FC<SidebarUserSectionProps> = ({ collapsed, onLinkClick }) => {
  return (
    <div className={cn(
      "border-t border-sidebar-border p-4 bg-sidebar-accent/5",
      collapsed ? "flex items-center justify-center p-2" : ""
    )}>
      <div className={cn("w-full transition-all duration-300", collapsed ? "flex justify-center" : "")}>
        <UserCard collapsed={collapsed} onLinkClick={onLinkClick} />
      </div>
    </div>
  );
};
