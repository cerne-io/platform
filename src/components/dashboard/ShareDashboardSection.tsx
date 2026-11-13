import { debugError } from "@/utils/debugLogger";
import React, { useState, useEffect } from "react";
import { Copy, Link2, Shield, Trash2, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createDashboardToken, revokeDashboardToken } from "@/services/dashboardTokenService";
import { formatDistanceToNow } from "date-fns";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import EmbedCodeDialog from "@/components/common/EmbedCodeDialog";
import { generateDashboardEmbedCode } from "@/utils/embedCodeUtils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardTokensQuery } from "@/hooks/queries/useDashboardTokensQuery";
import { useQueryClient } from "@tanstack/react-query";
import { dashboardTokensQueryKey } from "@/hooks/queries/useDashboardTokensQuery";
import { getPublicFormBaseUrl } from "@/utils/urlUtils";
import { useProject } from "@/contexts/ProjectContext";

interface ShareDashboardSectionProps {
  projectId: string;
  projectName: string;
}

const ShareDashboardSection: React.FC<ShareDashboardSectionProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const { data: tokens = [], isLoading } = useDashboardTokensQuery(projectId);
  const [isCreating, setIsCreating] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const isAdmin = Boolean(useAuth().user);

  const { currentUserProjectRole } = useProject();

  useEffect(() => {
    const run = async () => {
      if (!projectId) return;

      try {
        // Check permissions
        const [userData, projectData] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from('projects')
            .select('user_id, is_template')
            .eq('id', projectId)
            .maybeSingle()
        ]);

        const userId = userData?.data?.user?.id;
        const isTrueOwner = projectData?.data?.user_id === userId;
        const owner = isTrueOwner || currentUserProjectRole === 'owner';
        const template = !!projectData?.data?.is_template;

        // Template projects: allow any user to create public links
        // Normal projects: only allow owners or superadmins
        setCanCreate(template || owner || isAdmin);
      } catch (err) {
        debugError('Error checking permissions:', err);
        setCanCreate(false);
      }
    };
    void run();
  }, [projectId, isAdmin, currentUserProjectRole]);

  // Create a new token
  const handleCreateToken = async () => {
    if (!canCreate) {
      toast({
        title: "Not allowed",
        description: "You don't have permission to create public links for this project.",
        variant: "destructive"
      });
      return;
    }
    setIsCreating(true);
    const newToken = await createDashboardToken(projectId);
    if (newToken) {
      // Invalidate the query to refetch tokens
      void queryClient.invalidateQueries({ queryKey: dashboardTokensQueryKey(projectId) });
      toast({
        title: "Public link created",
        description: "Public link created successfully"
      });
    } else {
      toast({
        title: "Failed to create public link",
        description: "An error occurred while creating the link",
        variant: "destructive"
      });
    }
    setIsCreating(false);
  };

  // Revoke a token
  const handleRevokeToken = async (tokenId: string) => {
    const success = await revokeDashboardToken(tokenId);
    if (success) {
      // Invalidate the query to refetch tokens
      void queryClient.invalidateQueries({ queryKey: dashboardTokensQueryKey(projectId) });
      toast({
        title: "Public link revoked",
        description: "The link is no longer accessible"
      });
    } else {
      toast({
        title: "Failed to revoke link",
        description: "An error occurred while revoking the link",
        variant: "destructive"
      });
    }
  };

  // Copy link to clipboard
  const copyLinkToClipboard = (token: string) => {
    const url = `${getPublicFormBaseUrl()}/public-dashboard/${token}`;
    void navigator.clipboard.writeText(url);
    toast({
      title: "Link copied to clipboard",
      description: "You can now share this link with others"
    });
  };

  return (
    <Card className="mt-8 bg-card rounded-xl border border-border/80 shadow-xs">
      <CardHeader className="bg-transparent border-b border-border/60 px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CardTitle className="font-semibold text-2xl sm:text-3xl tracking-tight text-foreground">
              <Link2 className="mr-2 h-6 w-6 inline" />
              Share Dashboard Publicly
            </CardTitle>
            <InfoTooltip contentKey="dashboard-share-publicly" size={16} />
          </div>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Create public links to share your dashboard with non-registered users
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-6 px-4 sm:px-6">
        <div className="space-y-4">
          <Alert className="bg-primary/5 border-primary/15 text-foreground rounded-xl">
            <Shield className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs sm:text-sm text-muted-foreground ml-2">
              Anyone with the link can view this project's dashboard without logging in.
              Revoke links at any time to prevent access.
            </AlertDescription>
          </Alert>

          {canCreate && (
            <Button
              onClick={() => { void handleCreateToken(); }}
              disabled={isCreating}
              className="mb-4"
            >
              {isCreating ? "Creating..." : "Create Public Link"}
            </Button>
          )}

          {isLoading ? (
            <div className="text-xs sm:text-sm text-muted-foreground">Loading...</div>
          ) : tokens.length === 0 ? (
            <div className="text-xs sm:text-sm text-muted-foreground">No public links have been created yet</div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Active Public Links</h3>
              {tokens.map(token => {
                const hasToken = !!token.token;
                const displayUrl = hasToken
                  ? `${getPublicFormBaseUrl()}/public-dashboard/${token.token}`
                  : "Link hidden (security)";

                return (
                  <div key={token.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 border border-border/70 bg-card hover:bg-muted/30 transition-colors rounded-xl gap-3 sm:gap-0">
                    <div className="w-full sm:w-auto overflow-hidden">
                      <div className={`font-mono text-xs sm:text-sm mb-1 sm:mb-0 break-all ${!hasToken ? 'italic text-muted-foreground' : 'text-foreground font-medium'}`}>
                        {displayUrl}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        Created {formatDistanceToNow(new Date(token.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="flex gap-1.5 w-full sm:w-auto justify-end">
                      {hasToken && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            onClick={() => copyLinkToClipboard(token.token!)}
                            title="Copy link"
                            aria-label="Copy link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          <EmbedCodeDialog
                            code={generateDashboardEmbedCode(token.token!)}
                            title="Embed Dashboard"
                            description="Copy this code to embed the dashboard on your website."
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                title="Get embed code"
                                aria-label="Get embed code"
                              >
                                <Code className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </>
                      )}

                      {canCreate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { void handleRevokeToken(token.id); }}
                          title="Revoke link"
                          aria-label="Revoke link"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Dialog removed */}
        </div>
      </CardContent>
    </Card>
  );
};


export default ShareDashboardSection;
