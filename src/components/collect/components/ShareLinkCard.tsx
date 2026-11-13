import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Code } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface ShareLinkCardProps {
  title: string;
  description: string;
  url: string;
  embedCode: string;
  icon: React.ElementType;
}

const ShareLinkCard: React.FC<ShareLinkCardProps> = ({
  title,
  description,
  url,
  embedCode,
  icon: Icon,
}) => {
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({
      title: "Link copied!",
      description: `${title} link copied to clipboard.`,
    });
  };

  const handleCopyEmbed = () => {
    void navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
    toast({
      title: "Code copied!",
      description: "Embed code copied to clipboard.",
    });
  };

  const handleOpenLink = () => {
    window.open(url, '_blank');
  };

  return (
    <Card className="flex flex-col h-full bg-card border border-border/80 shadow-xs hover:border-border transition-all duration-200 rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center">
          <Icon className="mr-2 h-5 w-5 inline text-primary" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between space-y-4 pt-1">
        <div className="p-3 bg-muted/40 border border-border/60 rounded-lg text-xs font-mono break-all text-muted-foreground select-all selection:bg-primary/20">
          {url}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center gap-2 border-border/80 shadow-xs hover:bg-accent/60"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </Button>
          <Button
            onClick={handleOpenLink}
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center gap-2 border-border/80 shadow-xs hover:bg-accent/60"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-2 border-border/80 shadow-xs hover:bg-accent/60"
                title="Get Embed Code"
              >
                <Code className="h-3.5 w-3.5" />
                Embed
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-xl border border-border/80 shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-foreground">Embed {title}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Copy this code to embed this session directly into your website.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Textarea
                  readOnly
                  value={embedCode}
                  className="font-mono text-xs h-32 bg-muted/30 border-border/80 text-foreground resize-none"
                />
                <Button onClick={handleCopyEmbed} className="w-full shadow-xs">
                  {copiedEmbed ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-emerald-300" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShareLinkCard;
