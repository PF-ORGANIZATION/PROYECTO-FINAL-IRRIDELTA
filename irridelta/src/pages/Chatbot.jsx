import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useSessionStore } from "../store/sessionStore";
import { supabase } from "../supabaseClient";
import { embed } from "../services/embeddingService";

function Chatbot() {
  const user = useSessionStore((state) => state.user);
  const userRole = useSessionStore((state) => state.role);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
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
      // 1. Vectorizar la pregunta del usuario y buscar en la KB
      const queryEmbedding = await embed(userMsg);
      const { data: documentos, error: searchErr } = await supabase.rpc('buscar_contexto_kb', {
        query_embedding: queryEmbedding,
        match_threshold: 0.15,
        match_count: 5,
      });
      if (searchErr) {
        console.error("Error buscando en Supabase:", searchErr);
        throw searchErr;
      }

      // 2. Preparar el contexto y extraer fuentes si se encontraron resultados
      let contexto = "";
      let fuentesUnicas = [];
      if (documentos && documentos.length > 0) {
        contexto = documentos.map(doc => doc.contenido).join("\n\n---\n\n");
        fuentesUnicas = [...new Set(documentos.map(doc => doc.metadata?.source).filter(Boolean))];
      }

      // 2b. FILTRO DE RELEVANCIA: si no hay contexto RAG y la pregunta no es sobre Irridelta, bloquear
      const KEYWORDS_IRRIDELTA = [
        "irridelta", "riego", "goteo", "aspersión", "aspersor", "microaspersión",
        "bomba", "piscina", "filtro", "tubería", "cañería", "válvula",
        "jardín", "jardinería", "césped", "tratamiento de agua", "ablandador",
        "sumergible", "centrífuga", "periférica", "multietapa", "desagote",
        "sucursal", "contacto", "whatsapp", "horario", "benavídez", "benavidez", "escobar",
        "nosotros", "ustedes", "historia", "marca", "producto", "servicio",
        "cotización", "presupuesto", "precio", "instalar", "instalación",
        "capacitación", "certificación", "asesor",
      ];
      const queryLower = userMsg.toLowerCase();
      const tieneContexto = contexto.length > 0;
      const tieneHistorial = conversationHistory.current.length > 0;
      const esRelevante = KEYWORDS_IRRIDELTA.some((kw) => queryLower.includes(kw));

      if (!tieneContexto && !tieneHistorial && !esRelevante) {
        // Respuesta enlatada sin llamar al LLM
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "bot",
            text: "Lo siento, soy el asistente técnico de Irridelta y solo puedo ayudarte con consultas sobre **riego, bombas, piscinas, tratamiento de agua, jardinería** y nuestros **productos y servicios**.\n\n¿En qué te puedo ayudar?",
          },
        ]);
        return;
      }

      // 3. Armar el System Prompt
      const systemPrompt = `Eres el asistente virtual técnico de Irridelta.

SOBRE IRRIDELTA:
Irridelta trabaja en el sector del riego desde fines de los años 90. Iniciaron como instaladores de sistemas residenciales, deportivos y agrícolas. En 2012 abrieron su local en Benavídez enfocándose en venta de insumos, capacitación y formación de instaladores independientes. Son distribuidores de las principales marcas del rubro. También comercializan productos de áreas afines: piscinas, tratamiento de agua, bombas (centrífugas, sumergibles, periféricas, multietapas), herramientas de jardinería y máquinas de explosión. En octubre de 2024 abrieron una nueva sucursal en Escobar.

SUCURSALES Y CONTACTO:
- Sucursal Benavídez: Av. Benavidez 3750, Benavidez (Locales 5 y 6). WhatsApp: +54 9 11 6285-6457. Horario: Lunes a Viernes 8-17hs, Sábados 8-13hs.
- Sucursal Escobar: Av. San Martín 2213, Belén de Escobar. WhatsApp: +54 9 11 6285-6483. Horario: Lunes a Viernes 8-17hs, Sábados 8-13hs.
- Página de contacto web: /contacto (formulario de consulta).
- Instagram: https://instagram.com/irridelta
- Facebook: https://www.facebook.com/p/Irridelta-100064054083065/

INSTRUCCIONES CRÍTICAS DE COMPORTAMIENTO:
1. IDENTIDAD: Eres parte del equipo de Irridelta. Habla siempre en primera persona del plural ("nosotros", "ofrecemos", "nuestros locales") cuando te refieras a la empresa. NUNCA hables de Irridelta en tercera persona (ej. NUNCA digas "contacta con Irridelta", di "contactate con nosotros" o "hablá con uno de nuestros asesores").
2. LÍMITE DE TEMA: Si el bloque de CONTEXTO contiene información relevante, respondé usando esa información sin importar el tema. Si el CONTEXTO está vacío y la pregunta no tiene relación con Irridelta ni con los temas de nuestros manuales, respondé: "Lo siento, soy un asistente técnico y solo puedo ayudar con consultas sobre productos, servicios e información de Irridelta."
3. LÍMITE DE INFORMACIÓN: Basa tu respuesta ÚNICAMENTE en el CONTEXTO provisto, en la información SOBRE IRRIDELTA y en el historial. Si la respuesta a una pregunta válida no está en estas fuentes, responde: "No dispongo de esa información en mis manuales actuales. Por favor, contactate con nuestros asesores para más detalles."
4. REGLA SOBRE PRECIOS: Jamás inventes ni des estimaciones de precios numéricos a menos que aparezcan exactamente en el CONTEXTO. Si te piden precios que no están en el texto, responde que requieren una cotización personalizada.
5. FORMATO: Usá Markdown para formatear: **negrita** para términos clave, listas con viñetas (- o *) para enumerar, y encabezados (##) para secciones. NUNCA uses tablas Markdown (|---|), usá listas en su lugar.
6. Sé profesional, claro y conciso.

CONTEXTO:
${contexto}`;

      // 4. Armar el array de mensajes con historial de conversación
      const llmMessages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.current,
        { role: "user", content: userMsg },
      ];

      // 5. Llamada a la Edge Function con streaming
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
      const botMsgId = Date.now() + 1;

      // Crear el mensaje del bot con placeholder para ir llenándolo
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
      setIsLoading(false); // Ocultar spinner, el texto ya aparece progresivamente

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({
          //model: "llama-3.1-8b-instant",
          model: "openai/gpt-oss-20b",
          messages: llmMessages,
          temperature: 0.1,
          max_tokens: 1024,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Error en la Edge Function:", errData);
        throw new Error("No se pudo conectar con la IA. Intenta de nuevo en unos segundos.");
      }

      // Leer el stream SSE token por token
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              fullReply += token;
              // Actualizar el mensaje del bot progresivamente
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMsgId ? { ...msg, text: fullReply } : msg
                )
              );
            }
          } catch {
            // Línea SSE no parseable, ignorar
          }
        }
      }

      // 7. Guardar el turno completo en el historial de conversación
      conversationHistory.current.push(
        { role: "user", content: userMsg },
        { role: "assistant", content: fullReply }
      );
      // Limitar a los últimos N turnos (cada turno = 2 mensajes: user + assistant)
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

      // Cooldown de 5 segundos para evitar saturar la API
      setCooldown(5);
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
                className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                  msg.sender === "user"
                    ? "bg-green-500 text-white rounded-br-none whitespace-pre-wrap"
                    : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                }`}
              >
                {msg.sender === "bot" ? (
                  <div className="flex flex-col">
                    <div className="text-sm leading-relaxed prose prose-sm prose-green max-w-none overflow-x-auto">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400">
                        <span className="font-semibold">Fuentes RAG:</span> {msg.sources.join(", ")}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                )}
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
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu consulta aquí..." className="flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200" disabled={isLoading || cooldown > 0} />
          <button type="submit" disabled={isLoading || cooldown > 0 || !input.trim()} className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {cooldown > 0 ? `Espera ${cooldown}s` : "Enviar"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Chatbot;