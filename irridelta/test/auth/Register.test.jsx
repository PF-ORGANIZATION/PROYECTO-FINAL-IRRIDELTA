import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import sinon from "sinon";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Register from "../../src/pages/Register";
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

describe("Register", () => {
  beforeEach(() => {
    sinon.restore();
    routerMocks.navigate = sinon.stub();
    authMock.signUp = sinon.stub();
    resetSessionStore();
  });

  async function completeValidForm(user, overrides = {}) {
    await user.type(
      screen.getByPlaceholderText("Nombre y apellido"),
      overrides.fullName ?? "Juan Perez"
    );
    await user.type(
      screen.getByPlaceholderText("Ej. 11 2345 6789"),
      overrides.phone ?? "1122334455"
    );
    await user.type(
      screen.getByPlaceholderText("tu@email.com"),
      overrides.email ?? "user@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Mínimo 6 caracteres"),
      overrides.password ?? "secret123"
    );
    await user.type(
      screen.getByPlaceholderText("********"),
      overrides.confirmPassword ?? overrides.password ?? "secret123"
    );
  }

  it("redirige si ya existe un usuario autenticado", async () => {
    resetSessionStore({
      user: { id: "user-1" },
      role: "cliente",
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        routerMocks.navigate.calledOnceWithExactly("/nosotros", { replace: true })
      ).toBe(true);
    });
  });

  it("valida el nombre completo antes de invocar el registro", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await completeValidForm(user, { fullName: "Jo" });
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText(/Nombre incompleto/i)).toBeInTheDocument();
    expect(authMock.signUp.called).toBe(false);
  });

  it("valida el numero de celular antes de invocar el registro", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await completeValidForm(user, { phone: "1234" });
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText(/Número de celular inválido/i)).toBeInTheDocument();
    expect(authMock.signUp.called).toBe(false);
  });

  it("valida que ambas contrasenas coincidan", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await completeValidForm(user, {
      password: "secret123",
      confirmPassword: "otra1234",
    });
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText(/Las contraseñas no coinciden/i)).toBeInTheDocument();
    expect(authMock.signUp.called).toBe(false);
  });

  it("valida la longitud minima de la contrasena", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await completeValidForm(user, {
      password: "123",
      confirmPassword: "123",
    });
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText(/La contraseña es demasiado corta/i)).toBeInTheDocument();
    expect(authMock.signUp.called).toBe(false);
  });

  it("muestra la pantalla de confirmacion cuando Supabase no devuelve session", async () => {
    authMock.signUp.resolves({
      session: null,
      user: null,
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await completeValidForm(user, { email: "usuario@example.com" });
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText(/Revisa tu correo/i)).toBeInTheDocument();
    expect(screen.getByText(/us\*\*\*o@example.com/i)).toBeInTheDocument();
  });

  it("permite volver al formulario desde la pantalla de confirmacion", async () => {
    authMock.signUp.resolves({
      session: null,
      user: null,
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await completeValidForm(user, { email: "otro@example.com" });
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
    await screen.findByText(/Revisa tu correo/i);

    await user.click(screen.getByRole("button", { name: /usar otro correo/i }));

    expect(screen.getByRole("heading", { name: /crear cuenta/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("tu@email.com")).toHaveValue("otro@example.com");
  });

  it("navega al destino del usuario cuando el registro devuelve session", async () => {
    authMock.signUp.resolves({
      session: {
        user: {
          id: "user-1",
          app_metadata: {},
        },
      },
      user: {
        id: "user-1",
        app_metadata: {},
      },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await completeValidForm(user);
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(authMock.signUp.calledOnce).toBe(true);
      expect(
        routerMocks.navigate.calledOnceWithExactly(
          "/nosotros",
          sinon.match({
            replace: true,
            state: {
              welcomeModal: {
                title: "Usuario creado con éxito",
                description: sinon.match.string,
              },
            },
          })
        )
      ).toBe(true);
    });
  });

  it("muestra un mensaje especifico si el email ya estaba registrado", async () => {
    authMock.signUp.rejects(new Error("User already registered"));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await completeValidForm(user);
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText(/Esta cuenta ya existe/i)).toBeInTheDocument();
  });

  it("muestra feedback generico cuando el registro falla por otro motivo", async () => {
    authMock.signUp.rejects(new Error(""));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await completeValidForm(user);
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText(/No pudimos completar el registro/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Ocurrió un problema al crear tu cuenta/i)
    ).toBeInTheDocument();
  });
});
