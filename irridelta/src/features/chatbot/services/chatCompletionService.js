import {
  LLM_MAX_TOKENS,
  LLM_MODEL,
  LLM_TEMPERATURE,
} from "./chatbotConfig";
import { getAssistantHttpErrorMessage } from "./chatbotErrors";
import { EMPTY_STREAM_RESPONSE } from "./chatbotMessages";

function parseSseToken(line) {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith("data: ")) {
    return null;
  }

  const rawData = trimmedLine.slice(6);
  if (rawData === "[DONE]") {
    return null;
  }

  try {
    const parsedData = JSON.parse(rawData);
    return parsedData.choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
}

export async function streamAssistantResponse({
  messages,
  signal,
  onToken,
  shouldContinue = () => true,
}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
      "apikey": supabaseKey,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      temperature: LLM_TEMPERATURE,
      max_tokens: LLM_MAX_TOKENS,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    console.error("Error en la Edge Function:", response.status, errorBody);
    throw new Error(getAssistantHttpErrorMessage(response.status));
  }

  if (!response.body) {
    return EMPTY_STREAM_RESPONSE;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullReply = "";
  let sseBuffer = "";

  while (true) {
    if (!shouldContinue()) {
      await reader.cancel();
      return null;
    }

    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop() || "";

    for (const line of lines) {
      if (!shouldContinue()) {
        await reader.cancel();
        return null;
      }

      const token = parseSseToken(line);
      if (!token) {
        continue;
      }

      fullReply += token;
      onToken?.(fullReply, token);
    }
  }

  return fullReply.trim() || EMPTY_STREAM_RESPONSE;
}
