
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check user authentication status
 */
export const useAuthCheck = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const isAuth = !!data?.user;
      setIsAuthenticated(isAuth);
      setAuthChecked(true);
    };
    
    void checkAuth();
  }, []);

  return { isAuthenticated, authChecked };
};
