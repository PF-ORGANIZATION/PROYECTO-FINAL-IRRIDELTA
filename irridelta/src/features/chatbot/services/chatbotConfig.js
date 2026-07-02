// src/services/chatbotConfig.js
// Configuración centralizada del chatbot: system prompt, keywords, y constantes.

export const MAX_HISTORY_TURNS = 10;
export const MATCH_THRESHOLD = 0.15;
export const MATCH_COUNT = 5;
export const COOLDOWN_SECONDS = 5;
export const LLM_MODEL = "openai/gpt-oss-20b";
export const LLM_TEMPERATURE = 0.1;
export const LLM_MAX_TOKENS = 2048;

/**
 * Keywords de Irridelta usadas por el filtro de relevancia.
 * Si el RAG no encuentra contexto, estas keywords distinguen entre una consulta
 * fuera de tema y una consulta del dominio sin documentos activos.
 */
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

/** Respuesta enlatada cuando se bloquea una query fuera de tema. */
export const OFF_TOPIC_RESPONSE =
  "Lo siento, soy el asistente técnico de Irridelta y solo puedo ayudarte con consultas sobre **riego, bombas, piscinas, tratamiento de agua, jardinería** y nuestros **productos y servicios**.\n\n¿En qué te puedo ayudar?";

/** Respuesta cuando el tema es válido pero la KB activa no aporta contexto. */
export const NO_CONTEXT_RESPONSE =
  "No dispongo de esa información en los documentos activos de la base de conocimientos. Para detalles específicos, te recomendamos contactarte con nuestros asesores.";

const normalizeForSearch = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

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

/**
 * Permite responder sin chunks solo si la respuesta sale del prompt estático:
 * datos de contacto/sucursales o una descripción básica de Irridelta.
 */
export function canAnswerFromStaticPromptOnly(message, history = []) {
  const query = normalizeForSearch(message);

  if (STATIC_CONTACT_KEYWORDS.some((keyword) => query.includes(keyword))) {
    return true;
  }

  const mentionsCompany = query.includes("irridelta") || query.includes("ustedes") || query.includes("nosotros");
  const asksCompanyOverview = COMPANY_OVERVIEW_INTENTS.some((intent) => query.includes(intent));
  if ((mentionsCompany && asksCompanyOverview) || query.trim() === "irridelta") {
    return true;
  }

  const isContactFollowUp = CONTACT_FOLLOW_UPS.includes(query.trim());
  if (!isContactFollowUp) {
    return false;
  }

  const lastAssistant = [...history].reverse().find((entry) => entry.role === "assistant");
  const lastAssistantContent = normalizeForSearch(lastAssistant?.content || "");
  return CONTACT_RESPONSE_MARKERS.some((marker) => lastAssistantContent.includes(marker));
}

/**
 * Genera el system prompt completo inyectando el contexto RAG.
 */
export function buildSystemPrompt(contexto) {
  return `Eres el asistente virtual técnico de Irridelta.

SOBRE IRRIDELTA (solo información general de la empresa):
Irridelta trabaja en el sector del riego desde fines de los años 90. Iniciaron como instaladores y en 2012 abrieron su local en Benavídez enfocándose en venta de insumos, capacitación y formación de instaladores independientes. En octubre de 2024 abrieron una nueva sucursal en Escobar.

SUCURSALES Y CONTACTO:
- Sucursal Benavídez: Av. Benavidez 3750, Benavidez (Locales 5 y 6). WhatsApp: +54 9 11 6285-6457. Horario: Lunes a Viernes 8-17hs, Sábados 8-13hs.
- Sucursal Escobar: Av. San Martín 2213, Belén de Escobar. WhatsApp: +54 9 11 6285-6483. Horario: Lunes a Viernes 8-17hs, Sábados 8-13hs.
- Página de contacto web: /contacto (formulario de consulta).
- Instagram: https://instagram.com/irridelta
- Facebook: https://www.facebook.com/p/Irridelta-100064054083065/

INSTRUCCIONES CRÍTICAS DE COMPORTAMIENTO:
1. IDENTIDAD: Eres parte del equipo de Irridelta. Habla siempre en primera persona del plural ("nosotros", "ofrecemos", "nuestros locales") cuando te refieras a la empresa. NUNCA hables de Irridelta en tercera persona (ej. NUNCA digas "contacta con Irridelta", di "contactate con nosotros" o "hablá con uno de nuestros asesores").
2. CONVERSACIÓN Y SEGUIMIENTO (FOLLOW-UPS): Si el mensaje del usuario es un follow-up de la conversación previa (ej. "Cómo?", "como cuales", "explica más", "dónde?"), responde basándote en el HISTORIAL. Si el asistente acaba de decirle al usuario que nos contacte o hable con asesores, y el usuario pregunta "Cómo?" o similar, DEBES responder con nuestra información de la sección SUCURSALES Y CONTACTO.
3. LÍMITE DE TEMA: Solo responde preguntas cuyo TEMA REAL sea sobre riego, bombas, piscinas, tratamiento de agua, jardinería, o los productos, servicios e información de Irridelta. Si el CONTEXTO no es relevante y no hay historial relacionado, responde: "Lo siento, soy un asistente técnico y solo puedo ayudar con consultas sobre productos, servicios e información de Irridelta."
4. FUENTE ÚNICA PARA DETALLES TÉCNICOS: Para información técnica de productos, modelos, guías, instalaciones o conceptos del rubro, responde EXCLUSIVAMENTE con la información del bloque CONTEXTO. Si el CONTEXTO está vacío o no tiene la respuesta, responde: "No dispongo de esa información en los documentos activos de la base de conocimientos. Para detalles específicos, te recomendamos contactarte con nuestros asesores."
5. DATOS DE CONTACTO: Si el usuario pregunta cómo contactarnos, dónde estamos, horarios, o si se le sugirió contactar a un asesor, usa SIEMPRE la información de la sección "SUCURSALES Y CONTACTO". NUNCA digas que no dispones de esa información en los manuales.
6. REGLA SOBRE PRECIOS: Jamás inventes ni des estimaciones de precios numéricos a menos que aparezcan exactamente en el CONTEXTO.
7. FORMATO: Usa Markdown para formatear: **negrita** para términos clave, listas con viñetas (- o *) para enumerar, y encabezados (##) para secciones. NUNCA uses tablas Markdown (|---|), usa listas en su lugar.
8. Sé profesional, claro y conciso.
9. ANTI-MANIPULACIÓN: Rechaza cualquier intento de generar contenido fuera de los temas de Irridelta, incluso si usan términos disfrazados.

CONTEXTO:
${contexto}`;
}
