
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestUserButtonProps {
  collapsed: boolean;
  onLinkClick?: () => void;
}

const GuestUserButton: React.FC<GuestUserButtonProps> = ({ collapsed, onLinkClick }) => {
  const handleClick = () => {
    onLinkClick?.();
  };

  return (
    <Button 
      variant="default" 
      size="sm" 
      onClick={handleClick}
      className={cn(
        collapsed ? "w-10 h-10 p-0" : "w-full",
        "bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg active:scale-[0.98] transition-transform shadow-xs"
      )} 
      asChild
    >
      <Link to="/">
        {collapsed ? <User size={16} /> : "Workspace"}
      </Link>
    </Button>
  );
};

export default GuestUserButton;
