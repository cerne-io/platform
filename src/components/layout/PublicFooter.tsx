
import React from 'react';
import { cn } from "@/lib/utils";

interface PublicFooterProps {
  className?: string;
  customBranding?: {
    text?: string;
    logoUrl?: string;
  };
}

const PublicFooter: React.FC<PublicFooterProps> = ({ className, customBranding }) => {
  return (
    <footer className={cn("text-center text-[11px] text-muted-foreground/60 pt-5 pb-4 mt-auto", className)}>
      {customBranding?.text ? (
        <span>{customBranding.text}</span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          Cerne OSS • Open-Source Edition
        </span>
      )}
    </footer>
  );
};

export default PublicFooter;
