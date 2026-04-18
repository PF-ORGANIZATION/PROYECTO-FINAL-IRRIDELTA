import { create } from "zustand";
import { getUserRole } from "../utils/authRoles";

export const useSessionStore = create((set) => ({
  user: null,
  session: null,
  role: null,
  isLoading: true,
  setSession: (session) => {
    const user = session?.user ?? null;

    set({
      session,
      user,
      role: getUserRole(user),
      isLoading: false,
    });
  },
  clearSession: () =>
    set({
      user: null,
      session: null,
      role: null,
      isLoading: false,
    }),
}));
