import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import sinon from "sinon";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPassword from "../../src/pages/ForgotPassword";

const routerMocks = vi.hoisted(() => ({
  location: {
    state: null,
  },
}));

const authMock = vi.hoisted(() => ({}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useLocation: () => routerMocks.location,
  };
});

vi.mock("../../src/hooks/useAuth", () => ({
  useAuth: () => authMock,
}));

describe("ForgotPassword", () => {
  beforeEach(() => {
    sinon.restore();
    routerMocks.location = { state: null };
    authMock.resetPassword = sinon.stub();
  });

  it("precarga el email recibido desde la navegacion", () => {
    routerMocks.location = {
      state: { email: "cliente@example.com" },
    };

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText("tu@email.com")).toHaveValue("cliente@example.com");
  });

  it("valida que el email no este vacio", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /enviar enlace de recuperación/i }));

    expect(await screen.findByText(/Ingresa tu email/i)).toBeInTheDocument();
    expect(authMock.resetPassword.called).toBe(false);
  });

  it("muestra la confirmacion despues de enviar el enlace", async () => {
    authMock.resetPassword.resolves({});
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("tu@email.com"), "usuario@example.com");
    await user.click(screen.getByRole("button", { name: /enviar enlace de recuperación/i }));

    expect(await screen.findByText(/Revisa tu correo/i)).toBeInTheDocument();
    expect(screen.getByText(/us\*\*\*o@example.com/i)).toBeInTheDocument();
  });

  it("muestra el mensaje devuelto por auth cuando falla el envio", async () => {
    authMock.resetPassword.rejects(new Error("Servicio no disponible"));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("tu@email.com"), "usuario@example.com");
    await user.click(screen.getByRole("button", { name: /enviar enlace de recuperación/i }));

    expect(await screen.findByText(/Servicio no disponible/i)).toBeInTheDocument();
  });

  it("usa un mensaje generico si auth falla sin detalle", async () => {
    authMock.resetPassword.rejects(new Error(""));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("tu@email.com"), "usuario@example.com");
    await user.click(screen.getByRole("button", { name: /enviar enlace de recuperación/i }));

    expect(await screen.findByText(/No pudimos enviar el enlace/i)).toBeInTheDocument();
  });
});
