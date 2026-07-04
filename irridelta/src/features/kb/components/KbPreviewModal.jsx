import React from "react";
import {
  Calendar,
  File,
  FileText,
  HardDrive,
  Layers,
  Loader2,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { TEXT_PREVIEW_CHARS } from "../services/kbConfig";
import {
  formatFileSize,
  getFileTypeLabel,
} from "../services/kbFileUtils";

function KbPreviewModal({
  isActive,
  isLoading,
  onClose,
  onToggleActive,
  preview,
}) {
  const active = isActive(preview.file);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="modal-container flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl">
          <h3 className="text-lg font-bold text-gray-800 truncate pr-4">
            {preview.file.nombre}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <p className="text-sm text-gray-500">Cargando detalle del documento...</p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 p-3">
                <HardDrive className="w-5 h-5 text-green-600" />
                <span className="text-xs text-gray-500">Peso</span>
                <span className="text-sm font-semibold text-gray-800">
                  {formatFileSize(preview.fileSize)}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 p-3">
                <File className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-gray-500">Tipo</span>
                <span className="text-sm font-semibold text-gray-800 uppercase">
                  {getFileTypeLabel(preview.file.nombre)}
                </span>
              </div>
              {preview.pageCount != null && (
                <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span className="text-xs text-gray-500">Páginas</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {preview.pageCount}
                  </span>
                </div>
              )}
              <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 p-3">
                <Layers className="w-5 h-5 text-amber-600" />
                <span className="text-xs text-gray-500">Chunks</span>
                <span className="text-sm font-semibold text-gray-800">
                  {preview.chunkCount ?? "-"}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 p-3 col-span-2 sm:col-span-4">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-xs text-gray-500">Fecha de carga</span>
                <span className="text-sm font-semibold text-gray-800">
                  {new Date(preview.file.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
              active
                ? "bg-green-50 border-green-200"
                : "bg-gray-100 border-gray-200"
            }`}>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {active ? "Activo en el RAG" : "Desactivado del RAG"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {active
                    ? "Los chunks de este archivo son consultados por el chatbot."
                    : "Este archivo está excluido de las búsquedas del chatbot."}
                </p>
              </div>
              <button
                onClick={() => onToggleActive(preview.file.id, active)}
                className="flex-shrink-0 transition-transform hover:scale-110"
                title={active ? "Desactivar" : "Activar"}
              >
                {active ? (
                  <ToggleRight className="w-8 h-8 text-green-600" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-gray-400" />
                )}
              </button>
            </div>

            {preview.previewUrl && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Vista previa (página 1)
                </h4>
                <div className="card mb-8">
                  <img
                    src={preview.previewUrl}
                    alt="Vista previa del PDF"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {preview.textPreview && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Vista previa del contenido
                </h4>
                <pre className="card-bordered">
                  {preview.textPreview}
                  {preview.textPreview.length >= TEXT_PREVIEW_CHARS &&
                    "\n\n... (contenido truncado)"}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default KbPreviewModal;
