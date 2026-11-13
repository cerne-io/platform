/**
 * Get user initials from a name or email
 * @param name Optional name to extract initials from
 * @param email Optional email to extract initial from if no name is provided
 * @returns The initials (1-2 characters)
 */
export const getUserInitials = (name?: string | null, email?: string | null): string => {
  // If name exists, get initials from name
  if (name) {
    const parts = name.split(' ').filter(part => part.length > 0);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    } else if (parts.length === 1) {
      return parts[0][0].toUpperCase();
    }
  }
  
  // Fall back to email initial if no name
  if (email) {
    return email[0].toUpperCase();
  }
  
  // Default fallback
  return 'U';
};
