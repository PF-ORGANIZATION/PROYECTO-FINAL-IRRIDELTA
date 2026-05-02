import React, { useState } from "react";
import { AlertCircle, ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../services/useAuth";
import styles from "./ForgotPassword.module.css";

function maskEmail(email) {
  const [localPart, domain = ""] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] || ""}***@${domain}`;
  }

  return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
}

function getForgotPasswordErrorFeedback(message) {
  if (String(message || "").trim() === "") {
    return {
      title: "No pudimos enviar el enlace",
      description:
        "Ocurrió un problema al iniciar el recupero de contraseña. Intenta nuevamente en unos instantes.",
    };
  }

  return {
    title: "No pudimos enviar el enlace",
    description: message,
  };
}

function ForgotPassword() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email ?? "");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [errorFeedback, setErrorFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorFeedback(null);

    if (!email.trim()) {
      setErrorFeedback({
        title: "Ingresa tu email",
        description:
          "Necesitamos tu email para enviarte el enlace de recuperación.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword(email.trim());
      setSubmittedEmail(email.trim());
    } catch (authError) {
      setErrorFeedback(getForgotPasswordErrorFeedback(authError.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className={styles.pageWrapper}>
        <div className={`${styles.authCard} ${styles.authCardPending}`}>
          <div className={styles.pendingHeader}>
            <div className={styles.pendingIconWrapper}>
              <MailCheck className="h-9 w-9" />
            </div>
            <h2 className={styles.pendingTitle}>
              Revisa tu correo
            </h2>
            <p className={styles.pendingSubtitle}>
              Si existe una cuenta asociada a{" "}
              <span className="font-semibold">{maskEmail(submittedEmail)}</span>,
              ya enviamos un enlace para restablecer la contraseña.
            </p>
          </div>

          <div className={styles.pendingBody}>
            <div className={styles.pendingInfoBox}>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-green-600" />
                <p>
                  Por seguridad, no confirmamos si el email pertenece o no a una
                  cuenta registrada.
                </p>
              </div>
              <p>
                El enlace puede tardar unos minutos en llegar. Si no lo ves,
                revisa tu carpeta de spam o correo no deseado.
              </p>
              <p>
                Usa siempre el correo más reciente que hayas recibido para evitar
                problemas con enlaces anteriores.
              </p>
            </div>

            <div className={styles.pendingActionGroup}>
              <Link
                to="/login"
                className="btn-primary"
                style={{ flex: 1, textAlign: 'center' }}
              >
                Ir al login
              </Link>

              <button
                type="button"
                onClick={() => {
                  setSubmittedEmail("");
                  setErrorFeedback(null);
                }}
                className={styles.pendingActionSecondary}
              >
                Enviar a otro correo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.authCard}>
        <div className={styles.formHeader}>
          <p className={styles.formSupertitle}>
            Recuperación de acceso
          </p>
          <h2 className={styles.formTitle}>
            ¿Olvidaste tu contraseña?
          </h2>
          <p className={styles.formSubtitle}>
            Ingresa tu email y te enviaremos un enlace seguro para crear una nueva
            contraseña.
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{ width: '100%', padding: '1rem' }}
              >
                {isSubmitting ? "Enviando enlace..." : "Enviar enlace de recuperación"}
              </button>

              <Link
                to="/login"
                className={styles.backLink}
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al login
              </Link>
            </form>
          </div>

          <div className={styles.infoSidebar}>
            <h3 className={styles.infoSidebarTitle}>
              Qué sucederá
            </h3>
            <ol className={styles.infoSidebarList}>
              <li>1. Te enviaremos un enlace de recuperación a tu correo.</li>
              <li>2. Abrirás ese enlace para definir una nueva contraseña.</li>
              <li>3. Te recomendamos usar el correo más reciente recibido.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
