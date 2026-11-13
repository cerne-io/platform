
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getStorageItem } from "@/services/utils/storageUtils";
import { STORAGE_KEYS } from "@/services/constants/storageKeys";

import { SidebarContent } from "./SidebarContent";

const SIDEBAR_STATE_KEY = STORAGE_KEYS.SIDEBAR_STATE;

const Sidebar = () => {

  // Initialize collapsed state from localStorage
  const [collapsed, setCollapsed] = useState(() => {
    return getStorageItem<boolean>(SIDEBAR_STATE_KEY, false);
  });

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    // Persist the sidebar state in localStorage
  };

  return (
    <aside className={cn(
      "hidden md:flex flex-col h-screen border-r border-sidebar-border transition-all duration-300 relative",
      collapsed ? "w-16" : "w-64"
    )}>
      <SidebarContent
        collapsed={collapsed}
        toggleSidebar={toggleSidebar}
      />
    </aside>
  );
};

export default Sidebar;
