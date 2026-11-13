import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Paintbrush, MessageSquare, Sliders, Triangle, User, ArrowRight, Sparkles, AlertCircle } from "lucide-react";

interface FormDesignRequiredProps {
  hasStoryQuestion: boolean;
  hasSliderQuestions: boolean;
  hasTriangleQuestions: boolean;
  hasParticipantQuestions: boolean;
  integrityErrors?: string[];
  integrityWarnings?: string[];
}

const FormDesignRequired: React.FC<FormDesignRequiredProps> = ({
  hasStoryQuestion,
  hasSliderQuestions,
  hasTriangleQuestions,
  hasParticipantQuestions,
  integrityErrors = [],
}) => {
  const designItems = [
    {
      id: "story",
      title: "Story Question",
      description: "Set up the main question that participants will respond to",
      icon: <MessageSquare className="h-5 w-5" />,
      completed: hasStoryQuestion,
      href: "/design?phase=context&step=story-question",
      required: true
    },
    {
      id: "sliders",
      title: "Slider Questions",
      description: "Linear scale questions for participant interpretations",
      icon: <Sliders className="h-5 w-5" />,
      completed: hasSliderQuestions,
      href: "/design?step=questions",
      required: !hasTriangleQuestions, // Required if no triangle questions
      alternativeWith: "triangles"
    },
    {
      id: "triangles",
      title: "Triangle Questions",
      description: "Three-way trade-off questions for nuanced responses",
      icon: <Triangle className="h-5 w-5" />,
      completed: hasTriangleQuestions,
      href: "/design?step=questions",
      required: !hasSliderQuestions, // Required if no slider questions
      alternativeWith: "sliders"
    },
    {
      id: "participant",
      title: "Participant Questions",
      description: "Collect demographic or additional information from participants",
      icon: <User className="h-5 w-5" />,
      completed: hasParticipantQuestions,
      href: "/design?phase=context&step=participant-questions",
      required: false
    }
  ];

  const _requiredItems = designItems.filter(item => item.required);

  return (
    <div className="space-y-6">
      <Card className="bg-card border border-border/80 shadow-xs rounded-xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center justify-center">
            <Sparkles className="mr-2 h-6 w-6 inline text-primary" />
            Complete Your Form Design
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
            Your form needs a few required questions before you can generate shareable links and start collecting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Integrity Errors */}
          {integrityErrors.length > 0 && (
            <Alert variant="destructive" className="rounded-xl border-destructive/30 bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium text-sm">Required elements missing:</span>
                <ul className="list-disc list-inside mt-1.5 text-xs space-y-1">
                  {integrityErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-xs text-muted-foreground text-center">
              Head back to the Form Builder to configure your story and interpretation questions.
            </p>
            <Button asChild size="default" className="shadow-xs min-w-48">
              <Link to="/design" className="flex items-center gap-2">
                <Paintbrush className="h-4 w-4" />
                Continue Designing
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};



export default FormDesignRequired;
