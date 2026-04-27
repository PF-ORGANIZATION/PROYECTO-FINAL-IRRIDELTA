import React, { useState, useRef, useEffect } from "react";
import { HiChat, HiX } from "react-icons/hi";
import { useSessionStore } from "../store/sessionStore";
import { supabase } from "../supabaseClient";
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

function Chatbot() {
  const user = useSessionStore((state) => state.user);
  const userRole = useSessionStore((state) => state.role);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
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
      // 1. Vectorizar la pregunta del usuario y buscar en la KB
      const queryEmbedding = await embed(userMsg);
      const { data: documentos, error: searchErr } = await supabase.rpc('buscar_contexto_kb', {
        query_embedding: queryEmbedding,
        match_threshold: MATCH_THRESHOLD,
        match_count: MATCH_COUNT,
      });
      if (searchErr) {
        console.error("Error buscando en Supabase:", searchErr);
        throw searchErr;
      }

      // 2. Preparar el contexto y extraer fuentes
      let contexto = "";
      let fuentesUnicas = [];
      if (documentos && documentos.length > 0) {
        contexto = documentos.map(doc => doc.contenido).join("\n\n---\n\n");
        fuentesUnicas = [...new Set(documentos.map(doc => doc.metadata?.source).filter(Boolean))];
      }

      // 2b. FILTRO DE RELEVANCIA: bloquear queries fuera de tema sin gastar tokens
      const queryLower = userMsg.toLowerCase();
      const tieneContexto = contexto.length > 0;
      const tieneHistorial = conversationHistory.current.length > 0;
      const esRelevante = KEYWORDS_IRRIDELTA.some((kw) => queryLower.includes(kw));

      if (!tieneContexto && !tieneHistorial && !esRelevante) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, sender: "bot", text: OFF_TOPIC_RESPONSE },
        ]);
        return;
      }

      // 3. Armar mensajes para el LLM
      const systemPrompt = buildSystemPrompt(contexto);
      const llmMessages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.current,
        { role: "user", content: userMsg },
      ];

      // 4. Llamada a la Edge Function con streaming
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

      // 5. Leer el stream SSE token por token (con buffer para chunks parciales)
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

      // 6. Guardar turno en el historial
      conversationHistory.current.push(
        { role: "user", content: userMsg },
        { role: "assistant", content: fullReply }
      );
      if (conversationHistory.current.length > MAX_HISTORY_TURNS * 2) {
        conversationHistory.current = conversationHistory.current.slice(-MAX_HISTORY_TURNS * 2);
      }

      // Limpiar flag de streaming
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
        )
      );

    } catch (error) {
      console.error("Excepción general en el chatbot:", error);
      // Si ya se creó la burbuja de streaming, reemplazarla con el error
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

      // Cooldown para evitar saturar la API
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

  if (!user) return null;

  return (
    <>
      {/* Botón Flotante (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-2xl transition-transform hover:scale-105 hover:bg-green-700"
        aria-label="Abrir asistente"
      >
        {isOpen ? <HiX size={28} /> : <HiChat size={28} />}
      </button>

      {/* Ventana de Chat Flotante */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[600px] max-h-[80vh] w-[350px] sm:w-[400px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
          {/* Header */}
          <header className="bg-green-600 px-5 py-4 shadow-sm flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold text-white">Asistente AI Irridelta</h1>
              <p className="text-xs text-green-100">Consultas sobre manuales y datos de empresa</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-green-100 hover:text-white">
              <HiX size={20} />
            </button>
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
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200" 
              disabled={isLoading || cooldown > 0} 
            />
            <button 
              type="submit" 
              disabled={isLoading || cooldown > 0 || !input.trim()} 
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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