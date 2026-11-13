import React from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import type { LocalUser } from "@/lib/localClient";

interface ExpandedUserCardProps {
  user: LocalUser;
  getUserInitial: () => string;
  getDisplayName: () => string;
  goToProfile: () => void;
  signOut: () => void;
}

const ExpandedUserCard: React.FC<ExpandedUserCardProps> = ({
  user,
  getUserInitial,
  getDisplayName,
  goToProfile,
  signOut
}) => {
  return (
    <div className="flex flex-col space-y-2.5">
      <div
        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/10 cursor-pointer transition-all duration-150 active:scale-[0.98]"
        onClick={goToProfile}
        title="View profile and account settings"
      >
        <div className="h-8 w-8 rounded-full ring-2 ring-white/15 shadow-xs shrink-0 bg-muted text-foreground font-medium text-xs flex items-center justify-center select-none">
          {getUserInitial()}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center">
            <span className="font-semibold text-sm text-white tracking-tight truncate">{getDisplayName()}</span>
          </div>
          <span className="text-xs text-sidebar-foreground/70 truncate">{user.email}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut()}
        className="flex items-center gap-2 text-sidebar-foreground/80 hover:bg-rose-500/10 hover:text-rose-400 w-full justify-start rounded-lg text-xs font-medium active:scale-[0.98] transition-colors h-8 px-2"
      >
        <LogOut size={14} />
        <span>Lock Workspace</span>
      </Button>
    </div>
  );
};

export default ExpandedUserCard;
