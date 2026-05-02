import React, { useEffect, useState } from "react";
import { AlertCircle, BadgeCheck, UserRoundPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../services/useAuth";
import { useSessionStore } from "../../../store/sessionStore";
import { getDefaultPathByRole, getUserRole } from "../authRoles";
import styles from "./Register.module.css";
// Nota: Las clases comunes como input-field y btn-primary vienen del CSS global (shared.css)

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

function getRegisterErrorFeedback(type, message) {
  if (type === "full_name") {
    return {
      title: "Nombre incompleto",
      description:
        "Ingresa tu nombre completo para completar el registro de manera correcta.",
    };
  }

  if (type === "phone") {
    return {
      title: "Número de celular inválido",
      description:
        "Revisa tu número de celular e intenta nuevamente. Debe contener al menos 8 dígitos.",
    };
  }

  if (type === "password_length") {
    return {
      title: "La contraseña es demasiado corta",
      description:
        "Tu contraseña debe tener al menos 6 caracteres para poder crear la cuenta.",
    };
  }

  if (type === "password_mismatch") {
    return {
      title: "Las contraseñas no coinciden",
      description:
        "Revisa ambos campos y asegúrate de ingresar exactamente la misma contraseña.",
    };
  }

  if (type === "already_registered") {
    return {
      title: "Esta cuenta ya existe",
      description:
        "Ya hay un usuario registrado con ese email. Inicia sesión o utiliza la opción de recupero de contraseña.",
    };
  }

  return {
    title: "No pudimos completar el registro",
    description:
      message ||
      "Ocurrió un problema al crear tu cuenta. Intenta nuevamente en unos instantes.",
  };
}

function Register() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorFeedback, setErrorFeedback] = useState(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp } = useAuth();
  const user = useSessionStore((state) => state.user);
  const role = useSessionStore((state) => state.role);
  const isLoading = useSessionStore((state) => state.isLoading);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate(getDefaultPathByRole(role), { replace: true });
    }
  }, [isLoading, navigate, role, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorFeedback(null);

    if (fullName.trim().length < 3) {
      setErrorFeedback(getRegisterErrorFeedback("full_name"));
      return;
    }

    const digitsOnlyPhone = phone.replace(/\D/g, "");
    if (digitsOnlyPhone.length < 8) {
      setErrorFeedback(getRegisterErrorFeedback("phone"));
      return;
    }

    if (password.length < 6) {
      setErrorFeedback(getRegisterErrorFeedback("password_length"));
      return;
    }

    if (password !== confirmPassword) {
      setErrorFeedback(getRegisterErrorFeedback("password_mismatch"));
      return;
    }

    try {
      setIsSubmitting(true);

      const authData = await signUp({
        email,
        password,
        metadata: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      });

      if (!authData.session) {
        setPendingConfirmationEmail(email.trim());
        return;
      }

      const authenticatedUser = authData.user ?? authData.session?.user ?? null;
      const authenticatedRole = getUserRole(authenticatedUser);

      navigate(getDefaultPathByRole(authenticatedRole), {
        replace: true,
        state: {
          welcomeModal: {
            title: "Usuario creado con éxito",
            description:
              "Tu cuenta ya está lista. Bienvenido a Irridelta, vamos a acompañarte en cada proyecto.",
          },
        },
      });
    } catch (authError) {
      const rawMessage = String(authError?.message || "").toLowerCase();
      if (rawMessage.includes("already registered")) {
        setErrorFeedback(getRegisterErrorFeedback("already_registered"));
      } else {
        setErrorFeedback(
          getRegisterErrorFeedback("generic", authError?.message)
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pendingConfirmationEmail) {
    return (
      <div className={styles.pageWrapper}>
        <div className={`${styles.authCard} ${styles.authCardPending}`}>
          <div className={styles.pendingHeader}>
            <div className={styles.pendingIconWrapper}>
              <BadgeCheck className="h-8 w-8" />
            </div>
            <h2 className={styles.pendingTitle}>
              Revisa tu correo
            </h2>
            <p className={styles.pendingSubtitle}>
              Enviamos un enlace de confirmación a{" "}
              <span className="font-semibold">
                {maskEmail(pendingConfirmationEmail)}
              </span>{" "}
              para activar tu cuenta.
            </p>
          </div>

          <div className={styles.pendingBody}>
            <div className={styles.pendingInfoBox}>
              <p>
                Una vez confirmada tu cuenta, podrás iniciar sesión con tu email
                y contraseña.
              </p>
              <p className="mt-3">
                Si no encuentras el mensaje, revisa tu carpeta de spam o correo
                no deseado.
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
                  setPendingConfirmationEmail("");
                  setErrorFeedback(null);
                }}
                className={styles.pendingActionSecondary}
              >
                Usar otro correo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={`${styles.authCard} ${styles.formWrapper}`}>
        <div className={styles.formHeader}>
          <div className={styles.formIconWrapper}>
            <UserRoundPlus className="h-8 w-8" />
          </div>
          <h2 className={styles.formTitle}>Crear cuenta</h2>
          <p className={styles.formSubtitle}>
            Completa tus datos para registrarte en Irridelta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.formGroup}>
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
                </div>
              </div>
            </div>
          )}

          <div>
            <label className={styles.inputLabel}>
              Nombre completo
            </label>
            <input
              type="text"
              placeholder="Nombre y apellido"
              className="input-field"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </div>

          <div>
            <label className={styles.inputLabel}>
              Número de celular
            </label>
            <input
              type="tel"
              placeholder="Ej. 11 2345 6789"
              className="input-field"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </div>

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
              placeholder="Mínimo 6 caracteres"
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
            style={{ width: '100%' }}
          >
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          <p className={styles.footerText}>
            ¿Ya tienes cuenta?{" "}
            <Link className={styles.footerLink} to="/login">
              Iniciar sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
