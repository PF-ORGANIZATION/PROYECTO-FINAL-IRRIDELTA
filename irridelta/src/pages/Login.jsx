import React, { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSessionStore } from "../store/sessionStore";
import { getDefaultPathByRole, getUserRole } from "../utils/authRoles";

function getLoginErrorFeedback(authError) {
  const rawMessage = String(authError?.message || "").toLowerCase();

  if (
    rawMessage.includes("invalid login credentials") ||
    rawMessage.includes("invalid_grant")
  ) {
    return {
      title: "No pudimos iniciar sesión",
      description:
        "El email o la contraseña no coinciden con nuestros registros. Revisa los datos e intenta nuevamente.",
    };
  }

  if (rawMessage.includes("email not confirmed")) {
    return {
      title: "Confirma tu correo electrónico",
      description:
        "Tu cuenta aún no fue confirmada. Revisa tu bandeja de entrada y sigue el enlace de verificación antes de iniciar sesión.",
    };
  }

  return {
    title: "No pudimos iniciar sesión",
    description:
      authError?.message ||
      "Ocurrió un problema al procesar tu solicitud. Intenta nuevamente en unos instantes.",
  };
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorFeedback, setErrorFeedback] = useState(null);
  const { logIn } = useAuth();
  const user = useSessionStore((state) => state.user);
  const role = useSessionStore((state) => state.role);
  const isLoading = useSessionStore((state) => state.isLoading);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate(getDefaultPathByRole(role), { replace: true });
    }
  }, [isLoading, navigate, role, user]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorFeedback(null);

    try {
      const authData = await logIn(email, password);
      const authenticatedUser = authData.user ?? authData.session?.user ?? null;
      const authenticatedRole = getUserRole(authenticatedUser);

      navigate(getDefaultPathByRole(authenticatedRole), {
        replace: true,
      });
    } catch (authError) {
      setErrorFeedback(getLoginErrorFeedback(authError));
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <h2 className="mb-2 text-center text-3xl font-bold text-gray-800">
          Iniciar sesión
        </h2>
        <p className="mb-8 text-center text-sm text-gray-600">
          Accede con tu cuenta para continuar.
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
          {errorFeedback && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-red-100 p-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-semibold">{errorFeedback.title}</p>
                  <p className="mt-1 text-sm leading-6 text-red-800">
                    {errorFeedback.description}
                  </p>

                  <button
                    type="button"
                    className="mt-3 text-sm font-semibold text-red-700 underline underline-offset-2"
                    onClick={() =>
                      navigate("/olvide-contraseña", {
                        state: { email: email.trim() },
                      })
                    }
                  >
                    Recuperar contraseña
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              placeholder="tu@email.com"
              className="mt-1 block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="********"
              className="mt-1 block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button
            type="button"
            className="w-full text-right text-sm text-green-700 underline"
            onClick={() =>
              navigate("/olvide-contraseña", {
                state: { email: email.trim() },
              })
            }
          >
            Olvidé mi contraseña
          </button>

          <button
            type="submit"
            className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white transition duration-200 hover:bg-green-700"
          >
            Iniciar sesión
          </button>

          <p className="text-center text-sm text-gray-600">
            ¿Todavía no tienes cuenta?{" "}
            <Link className="font-semibold text-green-700 underline" to="/registro">
              Crear cuenta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
