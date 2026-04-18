import { supabase } from "../supabaseClient";
import { useSessionStore } from "../store/sessionStore";

export function useAuth() {
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);

  const logIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      setSession(data.session);
    }

    return data;
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      setSession(data.session);
    }

    return data;
  };

  const logOut = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      clearSession();
      return;
    }

    const { error } = await supabase.auth.signOut({ scope: "local" });

    clearSession();

    if (error) {
      console.warn("Supabase devolvio un error al cerrar sesion", error);
    }
  };

  return { logIn, signUp, logOut };
}
