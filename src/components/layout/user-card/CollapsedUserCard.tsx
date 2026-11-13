
import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { LocalUser } from "@/lib/localClient";

interface CollapsedUserCardProps {
  user: LocalUser | null;
  getUserInitial: () => string;
  goToProfile: () => void;
  signOut: () => void;
}

const CollapsedUserCard: React.FC<CollapsedUserCardProps> = ({
  user,
  getUserInitial,
  goToProfile,
  signOut
}) => {
  if (!user) {
    return (
      <Button
        variant="default"
        size="sm"
        className="w-10 h-10 p-0 bg-brand-primary hover:bg-brand-primary/90"
        asChild
      >
        <Link to="/">
          <UserIcon size={16} />
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="User menu" className="h-9 w-9 rounded-full p-0 ring-2 ring-white/15 hover:ring-primary/40 active:scale-95 transition-all shadow-xs">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-muted text-foreground font-medium text-xs flex items-center justify-center select-none">
              {getUserInitial()}
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-lg">
        <DropdownMenuItem onClick={goToProfile} className="cursor-pointer rounded-lg hover:bg-muted text-foreground">
          <UserIcon className="mr-2 h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/60" />
        <DropdownMenuItem disabled className="flex flex-col items-start px-2.5 py-1.5 opacity-90">
          <span className="text-[11px] text-muted-foreground">Signed in as</span>
          <span className="font-medium text-xs text-foreground truncate max-w-full">{user.email}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/60" />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-lg mt-0.5 text-xs font-medium"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          <span>Lock Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CollapsedUserCard;
