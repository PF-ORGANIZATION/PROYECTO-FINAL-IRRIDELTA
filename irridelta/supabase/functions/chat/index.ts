import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://irridelta.com.ar",
  "https://www.irridelta.com.ar",
  "https://irridelta.vercel.app",
  "https://www.irridelta.vercel.app",
  "https://irridelta-git-tweakschatbot-iangregorinis-projects.vercel.app",
  "https://www.irridelta-git-tweakschatbot-iangregorinis-projects.vercel.app/"
];
const ALLOWED_ROLES = new Set(["system", "user", "assistant"]);
const MODEL = Deno.env.get("GROQ_CHAT_MODEL") ?? "openai/gpt-oss-20b";
const FALLBACK_MODEL = Deno.env.get("GROQ_CHAT_FALLBACK_MODEL") ?? "llama-3.1-8b-instant";
const TEMPERATURE = 0.1;
const MAX_TOKENS = 2048;
const STREAM = true;
const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 20_000;
const MAX_TOTAL_CHARS = 50_000;
const RATE_LIMIT_WINDOW_MS = getPositiveNumberEnv("CHAT_RATE_LIMIT_WINDOW_SECONDS", 60) * 1000;
const RATE_LIMIT_MAX_REQUESTS = getPositiveNumberEnv("CHAT_RATE_LIMIT_MAX_REQUESTS", 12);
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

type ChatMessage = {
  role: string;
  content: string;
};

function getPositiveNumberEnv(name: string, fallback: number) {
  const value = Number(Deno.env.get(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getAllowedOrigins() {
  const configuredOrigins = Deno.env.get("CHAT_ALLOWED_ORIGINS")
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins?.length ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;
}

function getRequestOrigin(req: Request) {
  return req.headers.get("Origin") ?? "";
}

function isAllowedOrigin(origin: string) {
  return !origin || getAllowedOrigins().includes(origin);
}

function getCorsHeaders(req: Request) {
  const origin = getRequestOrigin(req);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function logEvent(
  level: "log" | "warn" | "error",
  event: string,
  metadata: Record<string, unknown> = {}
) {
  console[level](
    JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      ...metadata,
    })
  );
}

function summarizeGroqError(details: unknown) {
  if (!details || typeof details !== "object") {
    return {};
  }

  const error = (details as { error?: Record<string, unknown> }).error;

  if (!error || typeof error !== "object") {
    return {};
  }

  return {
    groqErrorType: typeof error.type === "string" ? error.type : undefined,
    groqErrorCode: typeof error.code === "string" ? error.code : undefined,
    groqErrorMessage: typeof error.message === "string" ? error.message : undefined,
  };
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-client-ip") ??
    "unknown"
  );
}

function consumeRateLimit(key: string) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    cleanupRateLimitBuckets(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function cleanupRateLimitBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

function validateMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) {
    throw new Error("Solicitud invalida: faltan los mensajes.");
  }

  if (messages.length === 0 || messages.length > MAX_MESSAGES) {
    throw new Error("Solicitud invalida: cantidad de mensajes fuera de limite.");
  }

  let totalChars = 0;
  const normalizedMessages = messages.map((message) => {
    if (!message || typeof message !== "object") {
      throw new Error("Solicitud invalida: formato de mensaje incorrecto.");
    }

    const { role, content } = message as Record<string, unknown>;

    if (typeof role !== "string" || !ALLOWED_ROLES.has(role)) {
      throw new Error("Solicitud invalida: rol de mensaje no permitido.");
    }

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Solicitud invalida: contenido de mensaje requerido.");
    }

    if (content.length > MAX_MESSAGE_CHARS) {
      throw new Error("Solicitud invalida: mensaje demasiado largo.");
    }

    totalChars += content.length;

    if (totalChars > MAX_TOTAL_CHARS) {
      throw new Error("Solicitud invalida: conversacion demasiado larga.");
    }

    return { role, content };
  });

  if (
    normalizedMessages[0].role !== "system" ||
    normalizedMessages.at(-1)?.role !== "user"
  ) {
    throw new Error("Solicitud invalida: estructura de conversacion no permitida.");
  }

  return normalizedMessages;
}

async function getAuthenticatedUser(req: Request, anonKey: string, supabaseUrl: string) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token || token === anonKey) {
    return { user: null, error: "USER_ACCESS_TOKEN_REQUIRED" };
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser();

  if (error || !user?.id) {
    return { user: null, error: error?.message ?? "INVALID_USER_TOKEN" };
  }

  return { user, error: null };
}

async function callGroq(groqApiKey: string, messages: ChatMessage[], model: string) {
  return fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      stream: STREAM,
    }),
  });
}

Deno.serve(async (req: Request) => {
  const origin = getRequestOrigin(req);
  const ip = getClientIp(req);

  if (!isAllowedOrigin(origin)) {
    logEvent("warn", "chat_disallowed_origin", { origin, ip });
    return jsonResponse(req, { error: "Origen no permitido." }, 403);
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Metodo no permitido." }, 405);
  }

  try {
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!groqApiKey || !supabaseUrl || !anonKey) {
      throw new Error("La configuracion de la Edge Function esta incompleta.");
    }

    const { user, error: authError } = await getAuthenticatedUser(req, anonKey, supabaseUrl);

    if (!user?.id) {
      logEvent("warn", "chat_auth_rejected", { reason: authError, origin, ip });
      return jsonResponse(req, { error: "Usuario no autenticado." }, 401);
    }

    const userLimit = consumeRateLimit(`user:${user.id}`);
    const ipLimit = consumeRateLimit(`ip:${ip}`);

    if (!userLimit.allowed || !ipLimit.allowed) {
      const retryAfterSeconds = Math.max(
        userLimit.retryAfterSeconds,
        ipLimit.retryAfterSeconds
      );

      logEvent("warn", "chat_rate_limited", {
        userId: user.id,
        origin,
        ip,
        retryAfterSeconds,
      });

      return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intenta nuevamente en unos segundos." }), {
        status: 429,
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSeconds),
        },
      });
    }

    const payload = await req.json().catch(() => null);
    const messages = validateMessages(payload?.messages);

    let groqResponse = await callGroq(groqApiKey, messages, MODEL);

    if ([400, 404].includes(groqResponse.status) && FALLBACK_MODEL !== MODEL) {
      logEvent("warn", "chat_model_fallback", {
        userId: user.id,
        model: MODEL,
        fallbackModel: FALLBACK_MODEL,
        status: groqResponse.status,
      });
      groqResponse = await callGroq(groqApiKey, messages, FALLBACK_MODEL);
    }

    if (!groqResponse.ok) {
      const details = await groqResponse.json().catch(() => ({}));

      logEvent("error", "chat_groq_error", {
        userId: user.id,
        status: groqResponse.status,
        ...summarizeGroqError(details),
      });

      return jsonResponse(req, { error: "No se pudo completar la respuesta del asistente." }, groqResponse.status);
    }

    return new Response(groqResponse.body, {
      status: 200,
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    const isValidationError = err instanceof Error && err.message.startsWith("Solicitud invalida");

    logEvent(isValidationError ? "warn" : "error", isValidationError ? "chat_invalid_payload" : "chat_unhandled_error", {
      origin,
      ip,
      error: err instanceof Error ? err.message : "Unknown error",
    });

    return jsonResponse(
      req,
      {
        error: isValidationError
          ? err instanceof Error ? err.message : "Solicitud invalida."
          : "No se pudo procesar la solicitud del asistente.",
      },
      isValidationError ? 400 : 500
    );
  }
});
