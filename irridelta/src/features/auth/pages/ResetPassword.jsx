import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../services/useAuth";
import { useSessionStore } from "../../../store/sessionStore";
import styles from "./ResetPassword.module.css";

function getResetPasswordErrorFeedback(type, message) {
  if (type === "min_length") {
    return {
      title: "La contraseña es demasiado corta",
      description:
        "Tu nueva contraseña debe tener al menos 6 caracteres para poder continuar.",
    };
  }

  if (type === "mismatch") {
    return {
      title: "Las contraseñas no coinciden",
      description:
        "Revisa ambos campos y asegúrate de ingresar exactamente la misma contraseña en los dos.",
    };
  }

  return {
    title: "No pudimos actualizar la contraseña",
    description:
      message ||
      "Ocurrió un problema al actualizar tu contraseña. Intenta nuevamente en unos instantes.",
  };
}

function getLinkIssueFeedback(errorCode, description) {
  if (errorCode === "otp_expired") {
    return {
      title: "El enlace expiró",
      description:
        "Por seguridad, el enlace de recuperación ya venció. Solicita uno nuevo para continuar.",
    };
  }

  if (errorCode === "access_denied") {
    return {
      title: "No pudimos validar el enlace",
      description:
        description ||
        "El enlace no es válido o ya fue utilizado anteriormente. Solicita uno nuevo para continuar.",
    };
  }

  return {
    title: "Este enlace ya no es válido",
    description:
      description ||
      "El enlace de recuperación no corresponde a una solicitud activa o ya no puede utilizarse.",
  };
}

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorFeedback, setErrorFeedback] = useState(null);
  const [successState, setSuccessState] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePassword } = useAuth();
  const session = useSessionStore((state) => state.session);
  const isLoading = useSessionStore((state) => state.isLoading);
  const location = useLocation();
  const navigate = useNavigate();

  const linkIssue = useMemo(() => {
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(location.search);
    const errorCode =
      hashParams.get("error_code") ||
      hashParams.get("error") ||
      searchParams.get("error_code") ||
      searchParams.get("error");
    const description =
      hashParams.get("error_description") ||
      searchParams.get("error_description") ||
      "";

    if (!errorCode) {
      return null;
    }

    return getLinkIssueFeedback(errorCode, description.replace(/\+/g, " "));
  }, [location.hash, location.search]);

  useEffect(() => {
    if (!successState) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [navigate, successState]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorFeedback(null);

    if (password.length < 6) {
      setErrorFeedback(getResetPasswordErrorFeedback("min_length"));
      return;
    }

    if (password !== confirmPassword) {
      setErrorFeedback(getResetPasswordErrorFeedback("mismatch"));
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePassword(password);
      setSuccessState(true);
    } catch (authError) {
      setErrorFeedback(
        getResetPasswordErrorFeedback("generic", authError.message)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (linkIssue || (!isLoading && !session)) {
    const issueFeedback =
      linkIssue ||
      getLinkIssueFeedback(
        "access_denied",
        "El enlace no es válido o la sesión temporal ya no está disponible."
      );

    return (
      <div className={styles.pageWrapper}>
        <div className={`${styles.authCard} ${styles.authCardIssue}`}>
          <div className={styles.headerIssue}>
            <div className={styles.iconWrapper}>
              <AlertTriangle className="h-9 w-9" />
            </div>
            <h2 className={styles.headerTitle}>
              {issueFeedback.title}
            </h2>
            <p className={`${styles.headerSubtitle} ${styles.headerSubtitleIssue}`}>
              {issueFeedback.description}
            </p>
          </div>

          <div className={styles.bodyContent}>
            <div className={`${styles.infoBoxBase} ${styles.infoBoxIssue}`}>
              <p>
                Por seguridad, los enlaces para restablecer la contraseña tienen
                una validez limitada y solo pueden utilizarse dentro del flujo de
                recuperación correspondiente.
              </p>
              <p className="mt-3">
                Te recomendamos solicitar un nuevo enlace y utilizar siempre el
                correo más reciente que hayas recibido.
              </p>
            </div>

            <div className={styles.actionGroup}>
              <Link
                to="/olvide-contraseña"
                className="btn-primary flex items-center justify-center gap-2"
                style={{ flex: 1 }}
              >
                <RefreshCcw className="h-4 w-4" />
                Solicitar nuevo enlace
              </Link>

              <Link
                to="/login"
                className={styles.actionSecondary}
              >
                Volver al login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (successState) {
    return (
      <div className={styles.pageWrapper}>
        <div className={`${styles.authCard} ${styles.authCardSuccess}`}>
          <div className={styles.headerSuccess}>
            <div className={styles.iconWrapper}>
              <BadgeCheck className="h-9 w-9" />
            </div>
            <h2 className={styles.headerTitle}>
              Contraseña actualizada
            </h2>
            <p className={`${styles.headerSubtitle} ${styles.headerSubtitleSuccess}`}>
              Tu nueva contraseña ya quedó guardada correctamente.
            </p>
          </div>

          <div className={styles.bodyContent}>
            <div className={`${styles.infoBoxBase} ${styles.infoBoxSuccess}`}>
              <p>
                En unos segundos te redirigiremos al login para que vuelvas a
                ingresar con tus nuevas credenciales.
              </p>
            </div>

            <div className="mt-8">
              <Link
                to="/login"
                className="btn-primary"
                style={{ display: 'block', textAlign: 'center', width: '100%' }}
              >
                Ir al login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasMinLength = password.length >= 6;
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  return (
    <div className={styles.pageWrapper}>
      <div className={`${styles.authCard} ${styles.authCardForm}`}>
        <div className={styles.headerForm}>
          <p className={styles.formSupertitle}>
            Seguridad de acceso
          </p>
          <h2 className={styles.formTitle}>
            Crear nueva contraseña
          </h2>
          <p className={styles.formSubtitle}>
            Elige una contraseña nueva para proteger tu cuenta y continuar con el
            acceso.
          </p>
        </div>

        <div className={styles.layoutGrid}>
          <div>
            <form onSubmit={handleSubmit} className={styles.formGroup}>
              {errorFeedback && (
                <div className={styles.alertWrapper} role="alert">
                  <div className={styles.alertLayout}>
                    <div className={styles.alertIconBox}>
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>

                    <div className="flex-1">
                      <p className={styles.alertTitle}>
                        {errorFeedback.title}
                      </p>
                      <p className={styles.alertText}>
                        {errorFeedback.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className={styles.inputLabel}>
                  Nueva contraseña
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

              <div>
                <label className={styles.inputLabel}>
                  Repetir contraseña
                </label>
                <input
                  type="password"
                  placeholder="********"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{ width: '100%', padding: '1rem' }}
              >
                {isSubmitting ? "Actualizando..." : "Guardar nueva contraseña"}
              </button>
            </form>
          </div>

          <div className={styles.infoSidebar}>
            <h3 className={styles.infoSidebarTitle}>
              Requisitos
            </h3>

            <div className={styles.infoSidebarList}>
              <div className={styles.listItem}>
                <CheckCircle2
                  className={`${styles.checkIcon} ${hasMinLength ? styles.checkIconValid : styles.checkIconInvalid}`}
                />
                <p>Debe contener al menos 6 caracteres.</p>
              </div>

              <div className={styles.listItem}>
                <CheckCircle2
                  className={`${styles.checkIcon} ${passwordsMatch ? styles.checkIconValid : styles.checkIconInvalid}`}
                />
                <p>Ambos campos deben coincidir exactamente.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
