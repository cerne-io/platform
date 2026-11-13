/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/toast";
import { supabase } from "@/integrations/supabase/client";
import {
  LOCAL_ADMIN_SESSION,
  type LocalSession,
  type LocalUser,
} from "@/lib/localClient";
import { sentimentService } from "@/services/sentimentService";
import { setSignedOut } from "@/utils/auth/signedOutFlag";
import { debugError } from "@/utils/debugLogger";

export interface AuthContextType {
  session: LocalSession | null;
  user: LocalUser | null;
  loading: boolean;
  passwordRequired: boolean;
  unconfigured: boolean;
  serverUnavailable?: boolean;
  refreshStatus?: () => Promise<void>;
  unlock: (password: string) => Promise<{ error: Error | null; data: LocalSession | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  isPublicRoute: () => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function isPublicPathname(path: string): boolean {
  return (
    path.startsWith("/submit-story/") ||
    path.startsWith("/interview/") ||
    path.startsWith("/public-dashboard/")
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState(true);
  const [unconfigured, setUnconfigured] = useState(false);
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const queryClient = useQueryClient();

  const loadAuthStatus = async () => {
    setLoading(true);
    try {
      if (typeof supabase.auth.getStatus === "function") {
        const status = await supabase.auth.getStatus();
        setPasswordRequired(status.passwordRequired);
        setUnconfigured(Boolean(status.unconfigured));
        setServerUnavailable(Boolean(status.serverUnavailable));
        const nextSession = status.unlocked ? LOCAL_ADMIN_SESSION : null;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      } else {
        const { data } = await supabase.auth.getSession();
        setPasswordRequired(true);
        setUnconfigured(false);
        setServerUnavailable(false);
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
    } catch (err) {
      debugError("Failed to inspect workspace auth status:", err);
      setServerUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAuthStatus();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_IN") {
        setSignedOut(false);
        setServerUnavailable(false);
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_OUT") {
        sentimentService.clearMemoryCache();
        queryClient.clear();
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const unlock = async (
    password: string
  ): Promise<{ error: Error | null; data: LocalSession | null }> => {
    const res = await supabase.auth.unlock(password);
    if (res.error || !res.session) {
      return {
        error: new Error(res.error?.message || "Invalid workspace password"),
        data: null,
      };
    }

    setSignedOut(false);
    setSession(res.session);
    setUser(res.session.user);
    return { error: null, data: res.session };
  };

  const signOut = async (): Promise<{ error: Error | null }> => {
    if (!passwordRequired) {
      toast({
        title: "Workspace lock disabled",
        description: "Set ADMIN_PASSWORD in your environment to require a workspace password.",
        variant: "info",
      });
      return { error: null };
    }

    await queryClient.cancelQueries();
    setSignedOut(true);

    const { error } = await supabase.auth.signOut();
    if (error) {
      debugError("Workspace lock failed", error);
      setSignedOut(false);
      return { error: new Error(error.message) };
    }

    sentimentService.clearMemoryCache();
    queryClient.clear();
    setSession(null);
    setUser(null);
    return { error: null };
  };

  const isPublicRoute = () => isPublicPathname(window.location.pathname);

  const value: AuthContextType = {
    session,
    user,
    loading,
    passwordRequired,
    unconfigured,
    serverUnavailable,
    refreshStatus: loadAuthStatus,
    unlock,
    signOut,
    isPublicRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
