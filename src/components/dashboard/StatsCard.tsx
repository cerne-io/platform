import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: React.ReactNode;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    className: string;
  };
}

const StatsCard = ({ title, value, subtitle, icon: Icon, badge }: StatsCardProps) => {
  return (
    <Card className="rounded-md border border-border/80 shadow-xs bg-card hover:border-primary/50 transition-colors duration-150">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-transparent">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </div>
          {badge && (
            <Badge variant="outline" className={cn("font-medium text-xs tabular-nums", badge.className)}>
              {badge.text}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
