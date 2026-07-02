export const INITIAL_BOT_MESSAGE =
  "¡Hola! Soy el asistente virtual de Irridelta. Estoy aquí para responder tus dudas basándome en nuestra información. ¿En qué te puedo ayudar?";

export const STREAMING_PLACEHOLDER = "_Pensando..._";
export const EMPTY_STREAM_RESPONSE =
  "Lo siento, hubo un problema al generar la respuesta. Por favor intenta reformular tu consulta o contactarnos directamente.";

export function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createInitialMessages() {
  return [
    {
      id: "initial-bot-message",
      sender: "bot",
      text: INITIAL_BOT_MESSAGE,
    },
  ];
}

export function createUserMessage(text) {
  return {
    id: createMessageId(),
    sender: "user",
    text,
  };
}

export function createBotMessage({ text, sources, isStreaming = false }) {
  return {
    id: createMessageId(),
    sender: "bot",
    text,
    isStreaming,
    sources,
  };
}

export function appendConversationTurn(history, userMessage, assistantMessage, maxTurns) {
  const nextHistory = [
    ...history,
    { role: "user", content: userMessage },
    { role: "assistant", content: assistantMessage },
  ];

  return nextHistory.slice(-maxTurns * 2);
}
