import React from "react";
import { AlertTriangle } from "lucide-react";

function UnsavedChangesModal({ isOpen, onStay, onLeave }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Cerrar aviso de cambios sin guardar"
        onClick={onStay}
        className="absolute inset-0 bg-slate-900/65"
      />

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900">
              Tenes cambios sin guardar
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Si salis ahora, vas a perder los cambios realizados.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onStay}
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow transition duration-200 hover:bg-gray-50"
          >
            Seguir editando
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition duration-200 hover:bg-red-700"
          >
            Salir sin guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnsavedChangesModal;
