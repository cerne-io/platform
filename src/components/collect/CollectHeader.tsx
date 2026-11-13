import React from "react";

const CollectHeader: React.FC = () => {
  return (
    <div className="mb-8 text-center space-y-2">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20 mb-2">
        Distribution Hub
      </div>
      <h1 className="text-3xl sm:text-4xl font-heading font-semibold tracking-[-0.03em] text-foreground [text-wrap:balance]">
        Story Collection
      </h1>
      <p className="text-base text-muted-foreground max-w-2xl mx-auto">
        Distribute public forms, launch AI-guided conversational interviews, and monitor collection intake in real time.
      </p>
    </div>
  );
};

export default CollectHeader;