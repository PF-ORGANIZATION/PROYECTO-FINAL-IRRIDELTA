import React from "react";

function ChatbotInput({
  cooldown,
  input,
  isLoading,
  onChange,
  onSubmit,
}) {
  const isDisabled = isLoading || cooldown > 0;

  return (
    <form onSubmit={onSubmit} className="bg-white border-t border-gray-100 p-4 flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Escribe tu consulta..."
        className="input-field flex-1"
        disabled={isDisabled}
      />
      <button
        type="submit"
        disabled={isDisabled || !input.trim()}
        className="btn-primary"
      >
        {cooldown > 0 ? `${cooldown}s` : "Enviar"}
      </button>
    </form>
  );
}

export default ChatbotInput;
