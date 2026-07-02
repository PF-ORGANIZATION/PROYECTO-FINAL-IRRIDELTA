import React from "react";
import { useExamLockStore, useExamLockSync } from "../../../store/examLockStore";
import { useSessionStore } from "../../../store/sessionStore";
import ChatbotLauncher from "../components/ChatbotLauncher";
import ChatbotWindow from "../components/ChatbotWindow";
import { useChatbotController } from "../hooks/useChatbotController";

function Chatbot() {
  const user = useSessionStore((state) => state.user);
  const userRole = useSessionStore((state) => state.role);
  const isExamInProgress = useExamLockStore((state) => state.isExamInProgress);
  useExamLockSync();

  const chatbot = useChatbotController({
    user,
    userRole,
    isExamInProgress,
  });

  if (!user || isExamInProgress) {
    return null;
  }

  return (
    <>
      <ChatbotLauncher
        isOpen={chatbot.isOpen}
        onClick={chatbot.toggleChat}
      />
      {chatbot.isOpen && (
        <ChatbotWindow
          cooldown={chatbot.cooldown}
          input={chatbot.input}
          isExpanded={chatbot.isExpanded}
          isLoading={chatbot.isLoading}
          messages={chatbot.messages}
          messagesEndRef={chatbot.messagesEndRef}
          onClose={chatbot.closeChat}
          onInputChange={chatbot.setInput}
          onSubmit={chatbot.handleSend}
          onToggleExpanded={() =>
            chatbot.setIsExpanded((previousIsExpanded) => !previousIsExpanded)
          }
        />
      )}
    </>
  );
}

export default Chatbot;
