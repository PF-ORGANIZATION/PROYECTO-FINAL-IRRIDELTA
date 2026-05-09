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

    const userMessage = input.trim();
    setInput("");

    // Agregar mensaje del usuario
    const userMessageObj = {
      id: Date.now(),
      sender: "user",
      text: userMessage,
    };
    setMessages((prev) => [...prev, userMessageObj]);

    // Agregar al historial de conversación
    conversationHistory.current.push({ role: "user", content: userMessage });

    // Limitar el historial
    if (conversationHistory.current.length > MAX_HISTORY_TURNS * 2) {
      conversationHistory.current = conversationHistory.current.slice(-MAX_HISTORY_TURNS * 2);
    }

    setIsLoading(true);

    try {
      // Verificar si la consulta es relevante para Irridelta
      const isRelevant = KEYWORDS_IRRIDELTA.some((keyword) =>
        userMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      if (!isRelevant) {
        const botMessage = {
          id: Date.now() + 1,
          sender: "bot",
          text: OFF_TOPIC_RESPONSE,
        };
        setMessages((prev) => [...prev, botMessage]);
        setIsLoading(false);
        return;
      }

      // Buscar en la base de conocimientos
      const { data: chunks, error: embedError } = await embed(userMessage, MATCH_COUNT, MATCH_THRESHOLD);

      if (embedError) {
        console.error("Error al buscar en la KB:", embedError);
        const botMessage = {
          id: Date.now() + 1,
          sender: "bot",
          text: "Lo siento, tuve un problema al buscar información. Por favor, intenta de nuevo.",
        };
        setMessages((prev) => [...prev, botMessage]);
        setIsLoading(false);
        return;
      }

      // Preparar el contexto
      const context = chunks?.map((chunk) => chunk.content).join("\n\n") || "";

      // Preparar el prompt del sistema
      const systemPrompt = buildSystemPrompt(context, userRole);

      // Preparar los mensajes para el LLM
      const messagesForLLM = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.current,
      ];

      // Llamar al LLM
      const { data: llmResponse, error: llmError } = await supabase.functions.invoke("chat", {
        body: {
          messages: messagesForLLM,
          model: LLM_MODEL,
          temperature: LLM_TEMPERATURE,
          max_tokens: LLM_MAX_TOKENS,
        },
      });

      if (llmError) {
        console.error("Error del LLM:", llmError);
        const botMessage = {
          id: Date.now() + 1,
          sender: "bot",
          text: "Lo siento, tuve un problema al procesar tu consulta. Por favor, intenta de nuevo.",
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const botResponse = llmResponse?.choices?.[0]?.message?.content || "No pude generar una respuesta.";
        const botMessage = {
          id: Date.now() + 1,
          sender: "bot",
          text: botResponse,
        };
        setMessages((prev) => [...prev, botMessage]);

        // Agregar respuesta del bot al historial
        conversationHistory.current.push({ role: "assistant", content: botResponse });
      }
    } catch (error) {
      console.error("Excepción general en el chatbot:", error);
      const botMessage = {
        id: Date.now() + 1,
        sender: "bot",
        text: "Ocurrió un error inesperado. Por favor, intenta de nuevo.",
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsLoading(false);

      // Iniciar cooldown
      setCooldown(COOLDOWN_SECONDS);
      const cooldownInterval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownInterval);
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