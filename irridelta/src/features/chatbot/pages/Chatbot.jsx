import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { useSessionStore } from "../../../store/sessionStore";
import {
  useExamLockStore,
  useExamLockSync,
} from "../../../store/examLockStore";
import { supabase } from "../../../supabaseClient";
import { embed } from "../services/embeddingService";
import ChatBubble from "../components/ChatBubble";
import {
  MAX_HISTORY_TURNS,
  MATCH_THRESHOLD,
  MATCH_COUNT,
  COOLDOWN_SECONDS,
  LLM_MODEL,
  LLM_TEMPERATURE,
  LLM_MAX_TOKENS,
  KEYWORDS_IRRIDELTA,
  OFF_TOPIC_RESPONSE,
  NO_CONTEXT_RESPONSE,
  canAnswerFromStaticPromptOnly,
  buildSystemPrompt,
} from "../services/chatbotConfig";
import styles from "./Chatbot.module.css";

const INITIAL_BOT_MESSAGE =
  "¡Hola! Soy el asistente virtual de Irridelta. Estoy aquí para responder tus dudas basándome en nuestra información. ¿En qué te puedo ayudar?";

function createInitialMessages() {
  return [
    {
      id: "initial-bot-message",
      sender: "bot",
      text: INITIAL_BOT_MESSAGE,
    },
  ];
}

function getAssistantHttpErrorMessage(status) {
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

function getChatErrorMessage(error) {
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

function Chatbot() {
  const user = useSessionStore((state) => state.user);
  const userRole = useSessionStore((state) => state.role);
  const isExamInProgress = useExamLockStore((state) => state.isExamInProgress);
  useExamLockSync();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState(createInitialMessages);
  const messagesEndRef = useRef(null);
  const requestControllerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const sessionKey = `${user?.id ?? "sin-usuario"}:${userRole ?? "sin-rol"}`;
  const sessionKeyRef = useRef(sessionKey);

  // Historial de conversación para el LLM (últimos N turnos user/assistant)
  const conversationHistory = useRef([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    sessionKeyRef.current = sessionKey;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;

    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }

    conversationHistory.current = [];
    setMessages(createInitialMessages());
    setInput("");
    setCooldown(0);
    setIsLoading(false);
    setIsOpen(false);
    setIsExpanded(false);
  }, [sessionKey]);

  useEffect(() => (
    () => {
      requestControllerRef.current?.abort();
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    }
  ), []);

  useEffect(() => {
    if (!isExamInProgress) {
      return;
    }

    requestControllerRef.current?.abort();
    requestControllerRef.current = null;

    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }

    setInput("");
    setCooldown(0);
    setIsLoading(false);
    setIsOpen(false);
    setIsExpanded(false);
  }, [isExamInProgress]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || cooldown > 0) return;

    const userMsg = input.trim();
    const requestSessionKey = sessionKeyRef.current;
    const controller = new AbortController();
    requestControllerRef.current = controller;

    setMessages((prev) => [...prev, { id: Date.now(), sender: "user", text: userMsg }]);
    setInput("");
    setIsLoading(true);

    try {
      // 1. Detectar si es un follow-up corto y enriquecer la query para el embedding
      const tieneHistorial = conversationHistory.current.length > 0;
      const esFollowUp = tieneHistorial && userMsg.split(/\s+/).length <= 5;

      let queryParaEmbedding = userMsg;
      if (esFollowUp) {
        // Usar el último intercambio como contexto para mejorar la búsqueda vectorial
        const lastAssistant = [...conversationHistory.current]
          .reverse()
          .find((m) => m.role === "assistant");
        if (lastAssistant) {
          // Tomar las primeras 200 chars de la última respuesta como contexto
          const resumenPrevio = lastAssistant.content.slice(0, 200);
          queryParaEmbedding = `${resumenPrevio} ${userMsg}`;
        }
      }

      // 2. Vectorizar y buscar en la KB
      const queryEmbedding = await embed(queryParaEmbedding);
      const { data: documentos, error: searchErr } = await supabase.rpc('buscar_contexto_kb', {
        query_embedding: queryEmbedding,
        match_threshold: MATCH_THRESHOLD,
        match_count: MATCH_COUNT,
      });

      if (sessionKeyRef.current !== requestSessionKey) {
        return;
      }

      if (searchErr) {
        console.error("Error buscando en Supabase:", searchErr);
        throw searchErr;
      }

      // 3. Preparar el contexto y extraer fuentes
      let contexto = "";
      let fuentesUnicas = [];
      if (documentos && documentos.length > 0) {
        contexto = documentos.map(doc => doc.contenido).join("\n\n---\n\n");
        fuentesUnicas = [...new Set(documentos.map(doc => doc.metadata?.source).filter(Boolean))];
      }

      const replyWithGuardrail = (responseText) => {
        conversationHistory.current.push(
          { role: "user", content: userMsg },
          { role: "assistant", content: responseText }
        );
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, sender: "bot", text: responseText },
        ]);
        setIsLoading(false);
      };

      // 3b. FILTRO DE RELEVANCIA: bloquear sin gastar tokens cuando la KB no aporta contexto.
      const queryLower = userMsg.toLowerCase();
      const tieneContexto = contexto.length > 0;
      const esRelevante = KEYWORDS_IRRIDELTA.some((kw) => queryLower.includes(kw));
      const respondeSoloConPromptEstatico = canAnswerFromStaticPromptOnly(
        userMsg,
        conversationHistory.current
      );

      if (!tieneContexto && !tieneHistorial && !esRelevante) {
        replyWithGuardrail(OFF_TOPIC_RESPONSE);
        return;
      }

      if (!tieneContexto && !respondeSoloConPromptEstatico) {
        replyWithGuardrail(NO_CONTEXT_RESPONSE);
        return;
      }

      // 4. Armar mensajes para el LLM
      const systemPrompt = buildSystemPrompt(contexto);
      const llmMessages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.current,
        { role: "user", content: userMsg },
      ];

      // 5. Llamada a la Edge Function con streaming
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
      const botMsgId = Date.now() + 1;

      // Crear la burbuja del bot con placeholder
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: "bot",
          text: "_Pensando..._",
          isStreaming: true,
          sources: userRole === "admin" ? fuentesUnicas : undefined,
        },
      ]);
      setIsLoading(false);

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: llmMessages,
          temperature: LLM_TEMPERATURE,
          max_tokens: LLM_MAX_TOKENS,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Error en la Edge Function:", response.status, errData);
        throw new Error(getAssistantHttpErrorMessage(response.status));
      }

      // 6. Leer el stream SSE token por token (con buffer para chunks parciales)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = "";
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        // Procesar solo líneas completas (terminadas en \n)
        const parts = sseBuffer.split("\n");
        // La última parte puede estar incompleta, la guardamos para el próximo ciclo
        sseBuffer = parts.pop() || "";

        for (const line of parts) {
          if (sessionKeyRef.current !== requestSessionKey) {
            await reader.cancel();
            return;
          }

          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              fullReply += token;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMsgId ? { ...msg, text: fullReply } : msg
                )
              );
            }
          } catch {
            // JSON incompleto, se procesará cuando llegue el resto
          }
        }
      }

      // 7. Computar respuesta final (fallback si el stream no devolvió nada)
      const finalReply = fullReply.trim() || "Lo siento, hubo un problema al generar la respuesta. Por favor intenta reformular tu consulta o contactarnos directamente.";

      if (sessionKeyRef.current !== requestSessionKey) {
        return;
      }

      // 8. Guardar turno en el historial con la respuesta final (no fullReply que puede ser "")
      conversationHistory.current.push(
        { role: "user", content: userMsg },
        { role: "assistant", content: finalReply }
      );
      if (conversationHistory.current.length > MAX_HISTORY_TURNS * 2) {
        conversationHistory.current = conversationHistory.current.slice(-MAX_HISTORY_TURNS * 2);
      }

      // Limpiar flag de streaming
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId ? { ...msg, text: finalReply, isStreaming: false } : msg
        )
      );

    } catch (error) {
      if (error?.name === "AbortError" || sessionKeyRef.current !== requestSessionKey) {
        return;
      }

      console.error("Excepción general en el chatbot:", error);
      const userMessage = getChatErrorMessage(error);

      // Si ya se creó la burbuja de streaming, reemplazarla con el error
      setMessages((prev) => {
        const hasStreamBubble = prev.some((m) => m.isStreaming);
        if (hasStreamBubble) {
          return prev.map((m) =>
            m.isStreaming
              ? { ...m, text: userMessage, isStreaming: false }
              : m
          );
        }
        return [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "bot",
            text: userMessage,
          },
        ];
      });
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }

      if (sessionKeyRef.current === requestSessionKey) {
        setIsLoading(false);

        // Cooldown para evitar saturar la API
        setCooldown(COOLDOWN_SECONDS);
        if (cooldownTimerRef.current) {
          clearInterval(cooldownTimerRef.current);
        }
        cooldownTimerRef.current = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(cooldownTimerRef.current);
              cooldownTimerRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  };

  if (!user || isExamInProgress) return null;

  return (
    <>
      {/* Botón Flotante (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.fabButton}
        aria-label="Abrir asistente"
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>

      {/* Ventana de Chat Flotante */}
      {isOpen && (
        <div 
          className={`${styles.chatWindow} ${
            isExpanded ? styles.chatWindowExpanded : styles.chatWindowCollapsed
          }`}
        >
          {/* Header */}
          <header className="bg-green-600 px-5 py-4 shadow-sm flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold text-white">Asistente Irridelta</h1>
              <p className="text-xs text-green-100">Consultas sobre manuales y datos de empresa</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsExpanded(!isExpanded)} className="text-green-100 hover:text-white" title={isExpanded ? "Reducir" : "Expandir"}>
                {isExpanded ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7M4 10h6m0 0V4m0 6l-7-7m17 11h-6m0 0v6m0-6l7 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
              <button onClick={() => setIsOpen(false)} className="text-green-100 hover:text-white" title="Cerrar">
                <X size={20} />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 text-gray-400 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm text-sm flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analizando...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="bg-white border-t border-gray-100 p-4 flex gap-2">
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Escribe tu consulta..." 
              className="input-field flex-1"
              disabled={isLoading || cooldown > 0} 
            />
            <button 
              type="submit" 
              disabled={isLoading || cooldown > 0 || !input.trim()} 
              className="btn-primary"
            >
              {cooldown > 0 ? `${cooldown}s` : "Enviar"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default Chatbot;
