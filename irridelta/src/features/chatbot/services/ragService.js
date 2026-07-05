import { supabase } from "../../../supabaseClient";
import { MATCH_COUNT, MATCH_THRESHOLD } from "./chatbotConfig";
import { embed } from "./embeddingService";

const SHORT_FOLLOW_UP_MAX_WORDS = 5;
const FOLLOW_UP_CONTEXT_CHARS = 200;

function getLastAssistantMessage(history) {
  return [...history].reverse().find((message) => message.role === "assistant");
}

export function buildEmbeddingQuery(userMessage, history) {
  const hasHistory = history.length > 0;
  const isShortFollowUp =
    hasHistory && userMessage.split(/\s+/).length <= SHORT_FOLLOW_UP_MAX_WORDS;

  if (!isShortFollowUp) {
    return userMessage;
  }

  const lastAssistant = getLastAssistantMessage(history);
  if (!lastAssistant) {
    return userMessage;
  }

  return `${lastAssistant.content.slice(0, FOLLOW_UP_CONTEXT_CHARS)} ${userMessage}`;
}

export function buildRagContext(documents = []) {
  if (!documents.length) {
    return {
      context: "",
      sources: [],
    };
  }

  return {
    context: documents.map((document) => document.contenido).join("\n\n---\n\n"),
    sources: [
      ...new Set(
        documents
          .map((document) => document.metadata?.source)
          .filter(Boolean)
      ),
    ],
  };
}

export async function searchKnowledgeBase({ userMessage, history }) {
  const embeddingQuery = buildEmbeddingQuery(userMessage, history);
  const queryEmbedding = await embed(embeddingQuery);
  const { data, error } = await supabase.rpc("buscar_contexto_kb", {
    query_embedding: queryEmbedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
  });

  if (error) {
    throw error;
  }

  return buildRagContext(data ?? []);
}
