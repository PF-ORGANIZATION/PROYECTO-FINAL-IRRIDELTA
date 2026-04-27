import React from "react";
import { X } from "lucide-react";
import LearningItemPreviewCard from "./LearningItemPreviewCard";

function CapacitacionPreviewModal({ item, onClose }) {
  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Cerrar previsualizacion"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/65"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">
              Previsualizacion
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              {item.titulo}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Vista previa de la capacitacion sin salir del panel de administracion.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Cerrar modal de previsualizacion"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto bg-gray-50 p-6">
          <LearningItemPreviewCard item={item} />
        </div>

        <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default CapacitacionPreviewModal;
