import React, { useState, useRef, useEffect } from "react";
import { useSessionStore } from "../store/sessionStore";
import { supabase } from "../supabaseClient";
import { embed } from "../services/embeddingService";

function Chatbot() {
  const user = useSessionStore((state) => state.user);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Historial de conversación para el LLM (últimos N turnos user/assistant)
  const MAX_HISTORY_TURNS = 10;
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
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { id: Date.now(), sender: "user", text: userMsg }]);
    setInput("");
    setIsLoading(true);

    try {
      // 1. Vectorizar la pregunta del usuario
      const queryEmbedding = await embed(userMsg);

      // 2. Buscar contexto en Supabase
      // match_threshold: 0.3 es un buen punto de partida (30% de similitud mínima)
      const { data: documentos, error } = await supabase.rpc('buscar_contexto_kb', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3, 
        match_count: 4 // Traemos los 4 mejores fragmentos
      });

      if (error) {
        console.error("Error buscando en Supabase:", error);
        throw error;
      }

      // 3. Preparar el contexto si se encontraron resultados
      let contexto = "";
      if (documentos && documentos.length > 0) {
        contexto = documentos.map(doc => doc.contenido).join("\n\n---\n\n");
      }

      // 4. Armar el System Prompt
      const systemPrompt = `Eres el asistente virtual técnico de la empresa Irridelta.
Tu tarea es responder la pregunta del usuario utilizando ÚNICAMENTE la información provista en el bloque de CONTEXTO.
Si la respuesta no está clara en el contexto, pide disculpas y responde: "No dispongo de esa información en mis manuales actuales".
NUNCA inventes información, precios, ni asumas datos técnicos que no estén en el texto.
Responde de manera profesional, clara y concisa.

CONTEXTO:
${contexto}`;

      // 5. Armar el array de mensajes con historial de conversación
      const llmMessages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.current,
        { role: "user", content: userMsg },
      ];

      // 6. Llamada a la Edge Function segura (el API Key de Groq nunca sale del servidor)
      const { data: groqData, error: fnError } = await supabase.functions.invoke("chat", {
        body: {
          model: "llama-3.1-8b-instant",
          messages: llmMessages,
          temperature: 0.1, // Muy bajo para evitar "alucinaciones"
          max_tokens: 1024,
        },
      });

      if (fnError) {
        console.error("Error en la Edge Function:", fnError);
        throw new Error("Fallo en la comunicación con la IA generativa.");
      }

      const botReply = groqData.choices[0].message.content;

      // 7. Guardar el turno en el historial de conversación
      conversationHistory.current.push(
        { role: "user", content: userMsg },
        { role: "assistant", content: botReply }
      );
      // Limitar a los últimos N turnos (cada turno = 2 mensajes: user + assistant)
      if (conversationHistory.current.length > MAX_HISTORY_TURNS * 2) {
        conversationHistory.current = conversationHistory.current.slice(-MAX_HISTORY_TURNS * 2);
      }

      // 8. Mostrar la respuesta en la interfaz
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: botReply,
        },
      ]);

    } catch (error) {
      console.error("Excepción general en el chatbot:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: "Hubo un problema al procesar tu consulta. Revisa la consola para más detalles.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-[80vh] bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-[70vh] max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <header className="bg-green-600 px-6 py-4 shadow-sm">
          <h1 className="text-xl font-bold text-white">Asistente AI Irridelta</h1>
          <p className="text-sm text-green-100">Consultas basadas exclusivamente en nuestros datos</p>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm whitespace-pre-wrap ${
                  msg.sender === "user" ? "bg-green-500 text-white rounded-br-none" : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 text-gray-400 rounded-2xl rounded-bl-none px-5 py-3 shadow-sm text-sm flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analizando manuales...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="bg-white border-t border-gray-100 p-4 sm:p-6 flex gap-3">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu consulta aquí..." className="flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200" disabled={isLoading} />
          <button type="submit" disabled={isLoading || !input.trim()} className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
            Enviar
          </button>
        </form>
      </div>
    </section>
  );
}

export default Chatbot;