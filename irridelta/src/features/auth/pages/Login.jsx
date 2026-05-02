import React, { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../services/useAuth";
import { useSessionStore } from "../../../store/sessionStore";
import { getDefaultPathByRole, getUserRole } from "../authRoles";
import styles from "./Login.module.css";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setIsSubmitting(true);

    try {
      const authData = await logIn(email, password);
      const authenticatedUser = authData.user ?? authData.session?.user ?? null;
      const authenticatedRole = getUserRole(authenticatedUser);

      navigate(getDefaultPathByRole(authenticatedRole), {
        replace: true,
      });
    } catch (authError) {
      setErrorFeedback(getLoginErrorFeedback(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.authCard}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>
            Iniciar sesión
          </h2>
          <p className={styles.formSubtitle}>
            Accede con tu cuenta para continuar.
          </p>
        </div>

        <form onSubmit={handleLogin} className={styles.formGroup}>
          {errorFeedback && (
            <div className={styles.alertWrapper} role="alert">
              <div className={styles.alertLayout}>
                <div className={styles.alertIconBox}>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>

                <div className="flex-1">
                  <p className={styles.alertTitle}>{errorFeedback.title}</p>
                  <p className={styles.alertText}>
                    {errorFeedback.description}
                  </p>

                  <button
                    type="button"
                    className={styles.forgotPasswordButton}
                    onClick={() =>
                      navigate("/olvide-contrasena", {
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
            <label className={styles.inputLabel}>
              Email
            </label>
            <input
              type="email"
              placeholder="tu@email.com"
              className="input-field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <label className={styles.inputLabel}>
              Contraseña
            </label>
            <input
              type="password"
              placeholder="********"
              className="input-field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button
            type="button"
            className={styles.forgotPasswordLink}
            onClick={() =>
              navigate("/olvide-contrasena", {
                state: { email: email.trim() },
              })
            }
          >
            Olvidé mi contraseña
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {isSubmitting ? "Iniciando..." : "Iniciar sesión"}
          </button>

          <p className={styles.footerText}>
            ¿Todavía no tienes cuenta?{" "}
            <Link className={styles.footerLink} to="/registro">
              Crear cuenta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
