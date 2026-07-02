export const MAX_HISTORY_TURNS = 10;
export const MATCH_THRESHOLD = 0.15;
export const MATCH_COUNT = 5;
export const COOLDOWN_SECONDS = 5;
export const LLM_MODEL = "openai/gpt-oss-20b";
export const LLM_TEMPERATURE = 0.1;
export const LLM_MAX_TOKENS = 2048;

export {
  KEYWORDS_IRRIDELTA,
  NO_CONTEXT_RESPONSE,
  OFF_TOPIC_RESPONSE,
  canAnswerFromStaticPromptOnly,
  getGuardrailResponse,
} from "./chatbotGuardrails";
export {
  buildAssistantMessages,
  buildSystemPrompt,
} from "./chatbotPrompt";
