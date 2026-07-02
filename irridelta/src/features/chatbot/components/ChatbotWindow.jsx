import React from "react";
import styles from "../pages/Chatbot.module.css";
import ChatbotHeader from "./ChatbotHeader";
import ChatbotInput from "./ChatbotInput";
import ChatbotMessages from "./ChatbotMessages";

function ChatbotWindow({
  cooldown,
  input,
  isExpanded,
  isLoading,
  messages,
  messagesEndRef,
  onClose,
  onInputChange,
  onSubmit,
  onToggleExpanded,
}) {
  return (
    <div
      className={`${styles.chatWindow} ${
        isExpanded ? styles.chatWindowExpanded : styles.chatWindowCollapsed
      }`}
    >
      <ChatbotHeader
        isExpanded={isExpanded}
        onClose={onClose}
        onToggleExpanded={onToggleExpanded}
      />
      <ChatbotMessages
        isLoading={isLoading}
        messages={messages}
        messagesEndRef={messagesEndRef}
      />
      <ChatbotInput
        cooldown={cooldown}
        input={input}
        isLoading={isLoading}
        onChange={onInputChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}

export default ChatbotWindow;
