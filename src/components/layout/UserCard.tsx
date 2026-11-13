import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getUserInitials } from "@/utils/avatarUtils";
import GuestUserButton from "./user-card/GuestUserButton";
import CollapsedUserCard from "./user-card/CollapsedUserCard";
import ExpandedUserCard from "./user-card/ExpandedUserCard";
import { getUserDisplayName } from "./user-card/userCardUtils";

export const UserCard = ({
  collapsed,
  onLinkClick,
}: {
  collapsed: boolean;
  onLinkClick?: () => void;
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <GuestUserButton collapsed={collapsed} onLinkClick={onLinkClick} />;
  }

  const goToProfile = () => {
    navigate("/settings");
    onLinkClick?.();
  };

  const handleSignOut = () => {
    void signOut();
    onLinkClick?.();
  };

  const getDisplayName = () => getUserDisplayName(null, user);
  const getUserInitial = () => getUserInitials(getDisplayName()) || "W";

  if (collapsed) {
    return (
      <CollapsedUserCard
        user={user}
        getUserInitial={getUserInitial}
        goToProfile={goToProfile}
        signOut={handleSignOut}
      />
    );
  }

  return (
    <ExpandedUserCard
      user={user}
      getUserInitial={getUserInitial}
      getDisplayName={getDisplayName}
      goToProfile={goToProfile}
      signOut={handleSignOut}
    />
  );
};
