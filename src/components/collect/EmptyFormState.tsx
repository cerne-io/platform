
import React from "react";
import { useNavigate } from "react-router-dom";
import { FormInput } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const EmptyFormState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FormInput className="h-5 w-5 text-cerne-600" />
          Story Collection Form Not Configured
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>Your story collection form hasn't been configured yet. Please complete the design phase first.</p>
        <Button onClick={() => navigate("/design")} className="mt-4">
          Go to Design Phase
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmptyFormState;
