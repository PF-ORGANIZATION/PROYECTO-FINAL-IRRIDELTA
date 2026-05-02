import { supabase } from "../../../supabaseClient";
import { useSessionStore } from "../../../store/sessionStore";

export function useAuth() {
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);

  const getPasswordResetRedirectTo = () => {
    if (typeof window === "undefined") {
      return undefined;
    }

    return `${window.location.origin}/reset-password`;
  };

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

  const signUp = async (emailOrPayload, maybePassword, maybeMetadata = {}) => {
    const payload =
      typeof emailOrPayload === "object"
        ? emailOrPayload
        : {
            email: emailOrPayload,
            password: maybePassword,
            metadata: maybeMetadata,
          };

    const { email, password, metadata = {} } = payload;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
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
      console.warn("Supabase devolvió un error al cerrar sesión", error);
    }
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectTo(),
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const updatePassword = async (password) => {
    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      throw error;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      setSession(session);
    }

    return data;
  };

  return { logIn, signUp, logOut, resetPassword, updatePassword };
}
