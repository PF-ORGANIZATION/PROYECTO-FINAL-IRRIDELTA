import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSessionStore } from "../store/sessionStore";
import { getDefaultPathByRole, getUserRole } from "../utils/authRoles";

function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { logIn, signUp } = useAuth();
  const user = useSessionStore((state) => state.user);
  const role = useSessionStore((state) => state.role);
  const isLoading = useSessionStore((state) => state.isLoading);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate(getDefaultPathByRole(role), { replace: true });
    }
  }, [isLoading, navigate, role, user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const authData = isSignUp
        ? await signUp(email, password)
        : await logIn(email, password);

      if (!authData.session) {
        setError(
          "Registro exitoso. Revisa tu correo para confirmar la cuenta antes de iniciar sesion."
        );
        return;
      }

      const authenticatedUser = authData.user ?? authData.session?.user ?? null;
      const authenticatedRole = getUserRole(authenticatedUser);

      navigate(getDefaultPathByRole(authenticatedRole), { replace: true });
    } catch (authError) {
      setError(authError.message || "No se pudo completar la autenticacion.");
    }
  };

  const toggleMode = () => {
    setError("");
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="flex min-h-screen w-full justify-center bg-gray-50 py-16">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <h2 className="mb-8 text-center text-3xl font-bold text-gray-800">
          Bienvenido
        </h2>
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div
              className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Usuario
            </label>
            <input
              type="email"
              placeholder="email"
              className="mt-1 block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contrasena
            </label>
            <input
              type="password"
              placeholder="********"
              className="mt-1 block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white transition duration-200 hover:bg-green-700"
          >
            {isSignUp ? "Registrarse" : "Iniciar sesion"}
          </button>

          <button
            type="button"
            className="w-full text-sm text-green-700 underline"
            onClick={toggleMode}
          >
            {isSignUp
              ? "Ya tenes cuenta? Inicia sesion"
              : "No tenes cuenta? Registrate"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
