import { create } from "zustand";
import { createUserSlice } from "./userSlice";
import { Session } from "next-auth";

export interface User {
  email: string;
  canAccessAll: boolean;
  canAccessDocs: boolean;
  canAccessDocsAll: boolean;
  canAccessAsoc: boolean;
  canAccessSearch: boolean;
  canAccessSearchAll: boolean;
}

export interface UserSlice {
  user: User | null;
  setUser: (user: User) => void;
  setPermissions: (role: Session["role"]) => void;
}

export const useUserStore = create<UserSlice>((...a) => ({
  ...createUserSlice(...a),
}));
