export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'researcher' | 'org_admin' | 'platform_admin';
  organization_id?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
