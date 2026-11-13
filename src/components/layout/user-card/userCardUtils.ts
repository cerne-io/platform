
import type { LocalUser } from "@/lib/localClient";

export const getUserDisplayName = (
  userData: {
    full_name?: string | null;
  } | null,
  user: LocalUser
): string => {
  if (userData?.full_name) return userData.full_name;

  const userMetadata = user.user_metadata;
  if (userMetadata?.full_name) return userMetadata.full_name;
  if (userMetadata?.name) return userMetadata.name;
  if (user.email) return user.email.split('@')[0];

  return "Unknown User";
};
