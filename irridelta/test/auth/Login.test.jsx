import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import sinon from "sinon";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "../../src/pages/Login";
import { resetSessionStore } from "../helpers/authTestUtils";

const routerMocks = vi.hoisted(() => ({
  navigate: () => {},
}));

const authMock = vi.hoisted(() => ({}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => routerMocks.navigate,
  };
});

vi.mock("../../src/hooks/useAuth", () => ({
  useAuth: () => authMock,
}));

describe("Login", () => {
  beforeEach(() => {
    sinon.restore();
    routerMocks.navigate = sinon.stub();
    authMock.logIn = sinon.stub();
    resetSessionStore();
  });

  it("redirige al usuario autenticado segun su rol", async () => {
    resetSessionStore({
      user: { id: "admin-1" },
      role: "admin",
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        routerMocks.navigate.calledOnceWithExactly("/admin/productos", {
          replace: true,
        })
      ).toBe(true);
    });
  });

  it("envia credenciales y navega al destino del usuario autenticado", async () => {
    authMock.logIn.resolves({
      session: {
        user: {
          id: "admin-1",
          app_metadata: { role: "admin" },
        },
      },
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("tu@email.com"), "admin@irridelta.com");
    await user.type(screen.getByPlaceholderText("********"), "secret123");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(authMock.logIn.calledOnceWithExactly("admin@irridelta.com", "secret123")).toBe(
        true
      );
      expect(
        routerMocks.navigate.calledOnceWithExactly("/admin/productos", {
          replace: true,
        })
      ).toBe(true);
    });
  });

  it("muestra feedback especifico para credenciales invalidas y permite ir a recuperacion", async () => {
    authMock.logIn.rejects(new Error("Invalid login credentials"));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("tu@email.com"), " usuario@example.com ");
    await user.type(screen.getByPlaceholderText("********"), "incorrecta");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(await screen.findByText(/No pudimos iniciar sesión/i)).toBeInTheDocument();
    expect(
      screen.getByText(/El email o la contraseña no coinciden con nuestros registros/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /recuperar contraseña/i }));

    expect(
      routerMocks.navigate.calledWithMatch(sinon.match.string, {
        state: { email: "usuario@example.com" },
      })
    ).toBe(true);
  });

  it("muestra feedback especifico cuando el correo no fue confirmado", async () => {
    authMock.logIn.rejects(new Error("Email not confirmed"));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("tu@email.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("********"), "secret123");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(await screen.findByText(/Confirma tu correo electrónico/i)).toBeInTheDocument();
  });

  it("muestra un mensaje generico cuando auth falla sin detalle conocido", async () => {
    authMock.logIn.rejects(new Error(""));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("tu@email.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("********"), "secret123");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(await screen.findByText(/Ocurrió un problema al procesar tu solicitud/i)).toBeInTheDocument();
  });
});
