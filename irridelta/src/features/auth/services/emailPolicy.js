const BLOCKED_EMAIL_DOMAINS = new Set([
  "demo.irridelta.com",
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "invalid.com",
  "mailinator.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
]);

const BLOCKED_DOMAIN_SUFFIXES = [".test", ".invalid", ".localhost", ".local"];

export function isPublicRegistrationEnabled() {
  return import.meta.env.VITE_ENABLE_PUBLIC_REGISTRATION === "true";
}

export function normalizeAuthEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function validateTransactionalEmail(email) {
  const normalizedEmail = normalizeAuthEmail(email);
  const [, domain = ""] = normalizedEmail.split("@");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return {
      isValid: false,
      email: normalizedEmail,
      title: "Correo inválido",
      description: "Ingresá un correo electrónico válido antes de continuar.",
    };
  }

  if (
    BLOCKED_EMAIL_DOMAINS.has(domain) ||
    BLOCKED_DOMAIN_SUFFIXES.some((suffix) => domain.endsWith(suffix))
  ) {
    return {
      isValid: false,
      email: normalizedEmail,
      title: "Usá un correo real",
      description:
        "Para proteger los envíos de Irridelta, no usamos correos de prueba, temporales o demo en este flujo.",
    };
  }

  return {
    isValid: true,
    email: normalizedEmail,
  };
}
