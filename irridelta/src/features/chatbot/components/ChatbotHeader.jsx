import React from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

function ChatbotHeader({ isExpanded, onClose, onToggleExpanded }) {
  return (
    <header className="bg-green-600 px-5 py-4 shadow-sm flex justify-between items-center">
      <div>
        <h1 className="text-lg font-bold text-white">Asistente Irridelta</h1>
        <p className="text-xs text-green-100">Consultas sobre manuales y datos de empresa</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onToggleExpanded}
          className="text-green-100 hover:text-white"
          title={isExpanded ? "Reducir" : "Expandir"}
          type="button"
        >
          {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
        <button
          onClick={onClose}
          className="text-green-100 hover:text-white"
          title="Cerrar"
          type="button"
        >
          <X size={20} />
        </button>
      </div>
    </header>
  );
}

export default ChatbotHeader;
