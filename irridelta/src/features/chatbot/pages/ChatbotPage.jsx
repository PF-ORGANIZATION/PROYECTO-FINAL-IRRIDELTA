import React, { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { MessageCircle } from "lucide-react";
import { useSessionStore } from "../../../store/sessionStore";
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
  buildSystemPrompt,
} from "../services/chatbotConfig";

function ChatbotPage() {
  const user = useSessionStore((state) => state.user);
  const userRole = useSessionStore((state) => state.role);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const messagesEndRef = useRef(null);

  // Historial de conversación para el LLM (últimos N turnos user/assistant)
  const conversationHistory = useRef([]);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: `¡Hola! Soy el asistente virtual de Irridelta. Estoy aquí para responder tus dudas basándome en nuestra información. ¿En qué te puedo ayudar?`,
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || cooldown > 0) return;

    const userMsg = input.trim();
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

      // 3b. FILTRO DE RELEVANCIA: bloquear queries fuera de tema sin gastar tokens
      const queryLower = userMsg.toLowerCase();
      const tieneContexto = contexto.length > 0;
      const esRelevante = KEYWORDS_IRRIDELTA.some((kw) => queryLower.includes(kw));

      if (!tieneContexto && !tieneHistorial && !esRelevante) {
        conversationHistory.current.push(
          { role: "user", content: userMsg },
          { role: "assistant", content: OFF_TOPIC_RESPONSE }
        );
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, sender: "bot", text: OFF_TOPIC_RESPONSE },
        ]);
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
        console.error("Error en la Edge Function:", errData);
        throw new Error("No se pudo conectar con la IA. Intenta de nuevo en unos segundos.");
      }

      // 6. Leer el stream SSE token por token
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = "";
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        const parts = sseBuffer.split("\n");
        sseBuffer = parts.pop() || "";

        for (const line of parts) {
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
            // JSON incompleto, se procesará en el próximo ciclo
          }
        }
      }

      const finalReply = fullReply.trim() || "Lo siento, hubo un problema al generar la respuesta.";

      conversationHistory.current.push(
        { role: "user", content: userMsg },
        { role: "assistant", content: finalReply }
      );
      if (conversationHistory.current.length > MAX_HISTORY_TURNS * 2) {
        conversationHistory.current = conversationHistory.current.slice(-MAX_HISTORY_TURNS * 2);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId ? { ...msg, text: finalReply, isStreaming: false } : msg
        )
      );

    } catch (error) {
      console.error("Excepción general en el chatbot:", error);
      setMessages((prev) => {
        const hasStreamBubble = prev.some((m) => m.isStreaming);
        if (hasStreamBubble) {
          return prev.map((m) =>
            m.isStreaming
              ? { ...m, text: error.message || "Hubo un problema al procesar tu consulta.", isStreaming: false }
              : m
          );
        }
        return [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "bot",
            text: error.message || "Hubo un problema al procesar tu consulta. Intenta de nuevo.",
          },
        ];
      });
    } finally {
      setIsLoading(false);
      setCooldown(COOLDOWN_SECONDS);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  return (
    <>
      <Helmet>
        <title>Asistente AI | IRRIDELTA</title>
      </Helmet>

      <section className="py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <MessageCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Asistente Virtual</h1>
            <p className="mt-2 text-lg text-gray-600">
              Estoy aquí para responder tus dudas sobre Irridelta
            </p>
          </div>

          <div className="rounded-lg bg-white shadow-lg">
            <div className="flex h-96 flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu pregunta..."
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none"
                    disabled={isLoading || cooldown > 0}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading || cooldown > 0}
                    className="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "..." : cooldown > 0 ? `${cooldown}s` : "Enviar"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default ChatbotPage;