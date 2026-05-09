import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import sinon from "sinon";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPassword from "../../src/pages/ResetPassword";
import { createSession, resetSessionStore } from "../helpers/authTestUtils";

const routerMocks = vi.hoisted(() => ({
  navigate: () => {},
  location: {
    hash: "",
    search: "",
  },
}));

const authMock = vi.hoisted(() => ({}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => routerMocks.navigate,
    useLocation: () => routerMocks.location,
  };
});

vi.mock("../../src/hooks/useAuth", () => ({
  useAuth: () => authMock,
}));

describe("ResetPassword", () => {
  beforeEach(() => {
    sinon.restore();
    vi.useRealTimers();
    routerMocks.navigate = sinon.stub();
    routerMocks.location = {
      hash: "",
      search: "",
    };
    authMock.updatePassword = sinon.stub();
    resetSessionStore({
      session: createSession(),
      isLoading: false,
    });
  });

  function getPasswordInputs() {
    return screen.getAllByPlaceholderText("********");
  }

  it("muestra un mensaje claro cuando el enlace expiro", () => {
    routerMocks.location = {
      hash: "#error_code=otp_expired",
      search: "",
    };

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    expect(screen.getByText(/El enlace expiró/i)).toBeInTheDocument();
  });

  it("muestra una advertencia cuando no existe la session temporal", () => {
    resetSessionStore({
      session: null,
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    expect(screen.getByText(/No pudimos validar el enlace/i)).toBeInTheDocument();
  });

  it("muestra el feedback por defecto cuando llega un codigo de error distinto", () => {
    routerMocks.location = {
      hash: "",
      search: "?error_code=unknown_issue&error_description=Enlace+inválido",
    };

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    expect(screen.getByText(/Este enlace ya no es válido/i)).toBeInTheDocument();
    expect(screen.getByText(/Enlace inválido/i)).toBeInTheDocument();
  });

  it("valida la longitud minima de la nueva contrasena", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    const [passwordInput, confirmPasswordInput] = getPasswordInputs();
    await user.type(passwordInput, "123");
    await user.type(confirmPasswordInput, "123");
    await user.click(screen.getByRole("button", { name: /guardar nueva contraseña/i }));

    expect(await screen.findByText(/La contraseña es demasiado corta/i)).toBeInTheDocument();
    expect(authMock.updatePassword.called).toBe(false);
  });

  it("valida que ambas contrasenas coincidan", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    const [passwordInput, confirmPasswordInput] = getPasswordInputs();
    await user.type(passwordInput, "secret123");
    await user.type(confirmPasswordInput, "secret456");
    await user.click(screen.getByRole("button", { name: /guardar nueva contraseña/i }));

    expect(await screen.findByText(/Las contraseñas no coinciden/i)).toBeInTheDocument();
    expect(authMock.updatePassword.called).toBe(false);
  });

  it("actualiza la contrasena y redirige al login luego del estado exitoso", async () => {
    authMock.updatePassword.resolves({});
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    const [passwordInput, confirmPasswordInput] = getPasswordInputs();
    fireEvent.change(passwordInput, { target: { value: "secret123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "secret123" } });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /guardar nueva contraseña/i })
      );
    });

    expect(screen.getByText(/Contraseña actualizada/i)).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(2500);
    expect(
      routerMocks.navigate.calledOnceWithExactly("/login", { replace: true })
    ).toBe(true);
    vi.useRealTimers();
  });

  it("muestra el error de auth si la actualizacion falla", async () => {
    authMock.updatePassword.rejects(new Error("No fue posible actualizar"));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    const [passwordInput, confirmPasswordInput] = getPasswordInputs();
    await user.type(passwordInput, "secret123");
    await user.type(confirmPasswordInput, "secret123");
    await user.click(screen.getByRole("button", { name: /guardar nueva contraseña/i }));

    await waitFor(() => {
      expect(screen.getByText(/No fue posible actualizar/i)).toBeInTheDocument();
    });
  });
});
