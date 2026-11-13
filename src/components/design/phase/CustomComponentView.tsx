
import React from "react";
import PhaseNavigation from "../PhaseNavigation";

interface CustomComponentViewProps {
  component: React.ReactNode;
  phaseId: string;
}

const CustomComponentView: React.FC<CustomComponentViewProps> = ({
  component,
  phaseId,
}) => {
  return (
    <div className="space-y-8">
      {component}
      <PhaseNavigation phaseId={phaseId} />
    </div>
  );
};

export default CustomComponentView;
