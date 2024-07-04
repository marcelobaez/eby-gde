import { StateCreator } from "zustand";
import { UserSlice } from "./useBoundStore";

export const createUserSlice: StateCreator<UserSlice> = (set, get) => ({
  user: null,
  setUser: (newUser) => set(() => ({ user: newUser })),
});
