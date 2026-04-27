// src/components/ChatBubble.jsx
// Componente para renderizar burbujas de chat (usuario y bot).

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renderiza una burbuja de chat.
 * - Mensajes del usuario: texto plano, burbuja verde.
 * - Mensajes del bot: Markdown renderizado (con GFM para tablas), burbuja blanca, con fuentes RAG opcionales.
 */
function ChatBubble({ msg }) {
  const isUser = msg.sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
          isUser
            ? "bg-green-500 text-white rounded-br-none whitespace-pre-wrap"
            : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
        }`}
      >
        {!isUser ? (
          <div className="flex flex-col">
            <div className="text-sm leading-relaxed prose prose-sm prose-green max-w-none overflow-x-auto chatbot-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400 break-all">
                <span className="font-semibold">Fuentes RAG:</span> {msg.sources.join(", ")}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{msg.text}</p>
        )}
      </div>
    </div>
  );
}

export default ChatBubble;
