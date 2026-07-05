import React from "react";
import ChatBubble from "./ChatBubble";

function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-100 text-gray-400 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm text-sm flex items-center gap-2">
        <svg
          className="animate-spin h-4 w-4 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Analizando...
      </div>
    </div>
  );
}

function ChatbotMessages({ isLoading, messages, messagesEndRef }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
      {messages.map((message) => (
        <ChatBubble key={message.id} msg={message} />
      ))}
      {isLoading && <LoadingBubble />}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default ChatbotMessages;
