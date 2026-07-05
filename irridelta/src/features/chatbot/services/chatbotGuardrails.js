export const KEYWORDS_IRRIDELTA = [
  "irridelta", "riego", "goteo", "aspersión", "aspersor", "microaspersión",
  "bomba", "piscina", "filtro", "tubería", "cañería", "válvula",
  "jardín", "jardinería", "césped", "tratamiento de agua", "ablandador",
  "sumergible", "centrífuga", "periférica", "multietapa", "desagote",
  "sucursal", "contacto", "whatsapp", "horario", "benavídez", "benavidez", "escobar",
  "nosotros", "ustedes", "historia", "marca", "producto", "servicio",
  "cotización", "presupuesto", "precio", "instalar", "instalación",
  "capacitación", "certificación", "asesor",
];

export const OFF_TOPIC_RESPONSE =
  "Lo siento, soy el asistente técnico de Irridelta y solo puedo ayudarte con consultas sobre **riego, bombas, piscinas, tratamiento de agua, jardinería** y nuestros **productos y servicios**.\n\n¿En qué te puedo ayudar?";

export const NO_CONTEXT_RESPONSE =
  "No dispongo de esa información en los documentos activos de la base de conocimientos. Para detalles específicos, te recomendamos contactarte con nuestros asesores.";

const STATIC_CONTACT_KEYWORDS = [
  "contact", "whatsapp", "telefono", "horario", "direccion", "ubicacion",
  "donde estan", "donde queda", "sucursal", "locales", "benavidez", "escobar",
  "instagram", "facebook",
];

const COMPANY_OVERVIEW_INTENTS = [
  "que es", "que hacen", "quienes son", "historia", "sobre", "empresa",
  "servicio", "servicios", "producto", "productos", "capacitacion",
  "certificacion",
];

const CONTACT_FOLLOW_UPS = ["como", "como hago", "donde", "telefono", "whatsapp"];
const CONTACT_RESPONSE_MARKERS = ["contact", "asesor", "whatsapp", "sucursal"];

function normalizeForSearch(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function canAnswerFromStaticPromptOnly(message, history = []) {
  const query = normalizeForSearch(message);

  if (STATIC_CONTACT_KEYWORDS.some((keyword) => query.includes(keyword))) {
    return true;
  }

  const mentionsCompany =
    query.includes("irridelta") ||
    query.includes("ustedes") ||
    query.includes("nosotros");
  const asksCompanyOverview = COMPANY_OVERVIEW_INTENTS.some((intent) =>
    query.includes(intent)
  );

  if ((mentionsCompany && asksCompanyOverview) || query.trim() === "irridelta") {
    return true;
  }

  const isContactFollowUp = CONTACT_FOLLOW_UPS.includes(query.trim());
  if (!isContactFollowUp) {
    return false;
  }

  const lastAssistant = [...history]
    .reverse()
    .find((entry) => entry.role === "assistant");
  const lastAssistantContent = normalizeForSearch(lastAssistant?.content || "");

  return CONTACT_RESPONSE_MARKERS.some((marker) =>
    lastAssistantContent.includes(marker)
  );
}

export function getGuardrailResponse({ userMessage, hasContext, hadHistory, history }) {
  if (hasContext) {
    return null;
  }

  const queryLower = userMessage.toLowerCase();
  const isDomainRelevant = KEYWORDS_IRRIDELTA.some((keyword) =>
    queryLower.includes(keyword)
  );

  if (!hadHistory && !isDomainRelevant) {
    return OFF_TOPIC_RESPONSE;
  }

  if (!canAnswerFromStaticPromptOnly(userMessage, history)) {
    return NO_CONTEXT_RESPONSE;
  }

  return null;
}
