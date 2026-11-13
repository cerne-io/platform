
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface PhaseNavigationProps {
  phaseId: string;
}

const PhaseNavigation: React.FC<PhaseNavigationProps> = ({ phaseId }) => {
  return (
    <div className="flex justify-center mt-8">
      {phaseId === "context" && (
        <Button asChild>
          <Link to="/design?phase=define" className="flex items-center gap-2">
            Move to Define Phase
            <ChevronRight size={16} />
          </Link>
        </Button>
      )}
      {phaseId === "define" && (
        <Button asChild>
          <Link to="/design?phase=design" className="flex items-center gap-2">
            Move to Design Phase
            <ChevronRight size={16} />
          </Link>
        </Button>
      )}
      {phaseId === "design" && (
        <Button asChild>
          <Link to="/design?phase=build" className="flex items-center gap-2">
            Move to Build Phase
            <ChevronRight size={16} />
          </Link>
        </Button>
      )}
      {phaseId === "build" && (
        <Button asChild>
          <Link to="/collect" className="flex items-center gap-2">
            Move to Collection
            <ChevronRight size={16} />
          </Link>
        </Button>
      )}
    </div>
  );
};

export default PhaseNavigation;
