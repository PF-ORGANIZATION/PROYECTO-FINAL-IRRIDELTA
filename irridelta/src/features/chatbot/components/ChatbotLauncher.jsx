import React from "react";
import { MessageCircle, X } from "lucide-react";
import styles from "../pages/Chatbot.module.css";

function ChatbotLauncher({ isOpen, onClick }) {
  return (
    <button
      onClick={onClick}
      className={styles.fabButton}
      aria-label={isOpen ? "Cerrar asistente" : "Abrir asistente"}
      type="button"
    >
      {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
    </button>
  );
}

export default ChatbotLauncher;
