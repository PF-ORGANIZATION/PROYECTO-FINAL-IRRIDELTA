import { renderHook } from "@testing-library/react";
import sinon from "sinon";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuth } from "../../src/hooks/useAuth";
import { supabase } from "../../src/supabaseClient";
import { useSessionStore } from "../../src/store/sessionStore";
import { createSession, resetSessionStore } from "../helpers/authTestUtils";

describe("useAuth", () => {
  beforeEach(() => {
    sinon.restore();
    resetSessionStore();
  });

  it("inicia sesion y guarda la session cuando Supabase responde correctamente", async () => {
    const session = createSession("admin");
    const signInStub = sinon.stub(supabase.auth, "signInWithPassword").resolves({
      data: { session, user: session.user },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    const authData = await result.current.logIn("admin@irridelta.com", "secret123");

    expect(signInStub.calledOnceWithExactly({
      email: "admin@irridelta.com",
      password: "secret123",
    })).toBe(true);
    expect(authData.session).toEqual(session);
    expect(useSessionStore.getState().session).toEqual(session);
    expect(useSessionStore.getState().role).toBe("admin");
  });

  it("propaga errores de login sin modificar el store", async () => {
    const authError = new Error("Invalid login credentials");
    sinon.stub(supabase.auth, "signInWithPassword").resolves({
      data: { session: null, user: null },
      error: authError,
    });

    const { result } = renderHook(() => useAuth());

    await expect(result.current.logIn("user@example.com", "bad-pass")).rejects.toThrow(
      "Invalid login credentials"
    );
    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().isLoading).toBe(true);
  });

  it("registra usuarios usando el payload extendido y persiste la session si existe", async () => {
    const session = createSession("cliente");
    const signUpStub = sinon.stub(supabase.auth, "signUp").resolves({
      data: { session, user: session.user },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await result.current.signUp({
      email: "cliente@example.com",
      password: "clave123",
      metadata: {
        full_name: "Cliente Irridelta",
        phone: "1122334455",
      },
    });

    expect(
      signUpStub.calledOnceWithExactly({
        email: "cliente@example.com",
        password: "clave123",
        options: {
          data: {
            full_name: "Cliente Irridelta",
            phone: "1122334455",
          },
        },
      })
    ).toBe(true);
    expect(useSessionStore.getState().role).toBe("cliente");
  });

  it("cierra sesion localmente cuando no existe una session activa", async () => {
    useSessionStore.setState({
      session: createSession(),
      user: createSession().user,
      role: "cliente",
      isLoading: false,
    });

    const getSessionStub = sinon.stub(supabase.auth, "getSession").resolves({
      data: { session: null },
    });
    const signOutStub = sinon.stub(supabase.auth, "signOut");

    const { result } = renderHook(() => useAuth());
    await result.current.logOut();

    expect(getSessionStub.calledOnce).toBe(true);
    expect(signOutStub.called).toBe(false);
    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().isLoading).toBe(false);
  });

  it("cierra sesion y advierte si Supabase devuelve error en signOut", async () => {
    const session = createSession();
    useSessionStore.setState({
      session,
      user: session.user,
      role: "cliente",
      isLoading: false,
    });

    sinon.stub(supabase.auth, "getSession").resolves({
      data: { session },
    });
    const signOutError = new Error("sign out failed");
    const signOutStub = sinon.stub(supabase.auth, "signOut").resolves({
      error: signOutError,
    });
    const warnStub = sinon.stub(console, "warn");

    const { result } = renderHook(() => useAuth());
    await result.current.logOut();

    expect(signOutStub.calledOnceWithExactly({ scope: "local" })).toBe(true);
    expect(warnStub.calledOnce).toBe(true);
    expect(useSessionStore.getState().user).toBeNull();
  });

  it("envia el correo de recuperacion usando el redirectTo esperado", async () => {
    const resetStub = sinon.stub(supabase.auth, "resetPasswordForEmail").resolves({
      data: { sent: true },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    const data = await result.current.resetPassword("user@example.com");

    expect(
      resetStub.calledOnceWithExactly("user@example.com", {
        redirectTo: `${window.location.origin}/recuperar-contrasena`,
      })
    ).toBe(true);
    expect(data).toEqual({ sent: true });
  });

  it("actualiza la contrasena y vuelve a sincronizar la session", async () => {
    const session = createSession("cliente", { email: "updated@example.com" });
    const updateUserStub = sinon.stub(supabase.auth, "updateUser").resolves({
      data: { user: session.user },
      error: null,
    });
    const getSessionStub = sinon.stub(supabase.auth, "getSession").resolves({
      data: { session },
    });

    const { result } = renderHook(() => useAuth());
    const data = await result.current.updatePassword("nueva-clave");

    expect(updateUserStub.calledOnceWithExactly({ password: "nueva-clave" })).toBe(true);
    expect(getSessionStub.calledOnce).toBe(true);
    expect(data).toEqual({ user: session.user });
    expect(useSessionStore.getState().session).toEqual(session);
  });

  it("propaga errores al actualizar la contrasena", async () => {
    const authError = new Error("cannot update password");
    sinon.stub(supabase.auth, "updateUser").resolves({
      data: { user: null },
      error: authError,
    });

    const { result } = renderHook(() => useAuth());

    await expect(result.current.updatePassword("otra-clave")).rejects.toThrow(
      "cannot update password"
    );
  });
});
