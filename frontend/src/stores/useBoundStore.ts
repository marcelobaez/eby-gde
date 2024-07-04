import { create } from "zustand";
import { createUserSlice } from "./userSlice";

export interface User {
  email: string;
  hasAllPermissions: boolean;
  hasDocsPermissions: boolean;
  hasRelsPermissions: boolean;
}

export interface UserSlice {
  user: User | null;
  setUser: (user: User) => void;
}

export const useBoundStore = create<UserSlice>((...a) => ({
  ...createUserSlice(...a),
}));
