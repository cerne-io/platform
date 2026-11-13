import React, { useState } from "react";
import { Lock, Loader2, AlertTriangle, ServerOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const UnlockWorkspaceCard: React.FC = () => {
  const { unlock, unconfigured, serverUnavailable, refreshStatus } = useAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const { error: unlockError } = await unlock(password);
      if (unlockError) {
        setError(unlockError.message);
      } else {
        setPassword("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg border-border/70">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            {serverUnavailable ? (
              <ServerOff className="h-5 w-5" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
          </div>
          <CardTitle className="text-xl">
            {serverUnavailable ? "Backend Server Unreachable" : "Unlock Workspace"}
          </CardTitle>
          <CardDescription>
            {serverUnavailable
              ? "Cannot reach /api/auth/status."
              : unconfigured
                ? "Production security lock active"
                : "Enter your workspace password to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serverUnavailable ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Start the local backend server with <code>npm run dev:server</code> (port{" "}
                  <code>3000</code>) alongside Vite, then click Retry.
                </AlertDescription>
              </Alert>
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  void refreshStatus?.();
                }}
              >
                Retry Connection
              </Button>
            </div>
          ) : unconfigured ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <code>ADMIN_PASSWORD</code> is not set in production. Configure{" "}
                <code>ADMIN_PASSWORD</code> (or set{" "}
                <code>ALLOW_UNAUTHENTICATED_ADMIN=true</code>) and restart the server.
              </AlertDescription>
            </Alert>
          ) : (
            <form
              onSubmit={(e) => {
                void handleSubmit(e);
              }}
              className="space-y-4"
            >
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Workspace password"
                  aria-label="Workspace password"
                  autoComplete="current-password"
                  autoFocus
                  disabled={submitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !password}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  "Unlock Workspace"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
