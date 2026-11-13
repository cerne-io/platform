
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface FormErrorDisplayProps {
  error: string;
  debugInfo?: unknown;
}

const FormErrorDisplay: React.FC<FormErrorDisplayProps> = ({
  error,
  debugInfo
}) => {
  return (
    <Card className="shadow-xs border border-destructive/30 bg-card rounded-xl overflow-hidden">
      <CardHeader className="text-center p-6">
        <CardTitle className="font-serif text-2xl font-bold text-destructive tracking-tight">
          Error Loading Form
        </CardTitle>
        <CardDescription className="text-muted-foreground mt-1.5 text-sm [text-wrap:pretty]">
          {error}
        </CardDescription>
      </CardHeader>
      {!!debugInfo && (
        <CardContent className="border-t border-border/60 pt-4 pb-6 px-6 bg-muted/20">
          <details className="text-xs">
            <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground mb-2 select-none">
              Debug Information
            </summary>
            <pre className="bg-muted/40 border border-border/60 p-3 rounded-lg overflow-auto max-h-48 font-mono text-xs text-foreground/90">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </CardContent>
      )}
    </Card>
  );
};

export default FormErrorDisplay;
