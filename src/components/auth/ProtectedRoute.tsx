import React from "react";
import { useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UnlockWorkspaceCard } from "./UnlockWorkspaceCard";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowPublic?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowPublic = false }) => {
  const { user, loading, isPublicRoute } = useAuth();
  const location = useLocation();

  const isPublicSubmissionRoute = isPublicRoute();
  const isPublicDashboardRoute =
    location.pathname.startsWith("/public-dashboard/") && location.pathname.length > 17;

  if (allowPublic || isPublicSubmissionRoute || isPublicDashboardRoute) {
    return <>{children || <Outlet />}</>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <UnlockWorkspaceCard />;
  }

  return <>{children || <Outlet />}</>;
};

export default ProtectedRoute;
