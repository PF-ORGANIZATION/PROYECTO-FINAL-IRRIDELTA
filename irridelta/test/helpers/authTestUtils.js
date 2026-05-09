import { useSessionStore } from "../../src/store/sessionStore";

export function resetSessionStore(overrides = {}) {
  useSessionStore.setState({
    user: null,
    session: null,
    role: null,
    isLoading: true,
    ...overrides,
  });
}

export function createSession(role = "cliente", userOverrides = {}) {
  return {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    user: {
      id: "user-1",
      email: "user@example.com",
      app_metadata: role ? { role } : {},
      ...userOverrides,
    },
  };
}
