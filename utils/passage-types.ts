// Type declarations for Passage modules

export type PassageUserInfo = {
  id: string;
  email: string;
  phone?: string;
  created_at?: string;
  last_login_at?: string;
  status?: string;
};

// Define a type for PassageUser
export interface PassageUserInterface {
  isAuthenticated: () => Promise<boolean>;
  userInfo: () => Promise<PassageUserInfo>;
  signOut: () => Promise<void>;
}

// Module type for dynamic imports
export interface PassageUserModule {
  PassageUser: new () => PassageUserInterface;
} 