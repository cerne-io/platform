
export interface User {
  id: string;
  email: string;
  fullName?: string;
  roles: string[];
  isDemo?: boolean; // New flag to identify demo users
}
