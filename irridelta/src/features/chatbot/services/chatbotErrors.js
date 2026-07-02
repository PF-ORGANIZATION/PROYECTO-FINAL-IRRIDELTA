export function getAssistantHttpErrorMessage(status) {
  if (status === 401 || status === 403) {
    return "Tu sesión no está habilitada para usar el asistente. Cerrá sesión e ingresá nuevamente.";
  }

  if (status === 429) {
    return "El servicio está saturado. Intentá de nuevo en unos segundos.";
  }

  if (status >= 500) {
    return "El asistente no está disponible en este momento. Intentá nuevamente en unos minutos.";
  }

  return "No pudimos completar la respuesta del asistente. Intentá de nuevo.";
}

export function getChatErrorMessage(error) {
  const rawMessage = String(error?.message || "").toLowerCase();

  if (
    rawMessage.includes("failed to fetch") ||
    rawMessage.includes("networkerror") ||
    rawMessage.includes("network request failed")
  ) {
    return "No pudimos conectarnos con el asistente. Revisá tu conexión e intentá de nuevo.";
  }

  if (rawMessage.includes("supabase") || rawMessage.includes("rpc")) {
    return "No pudimos consultar la base de conocimientos. Intentá nuevamente en unos minutos.";
  }

  return error?.message || "Hubo un problema al procesar tu consulta. Intentá de nuevo.";
}
