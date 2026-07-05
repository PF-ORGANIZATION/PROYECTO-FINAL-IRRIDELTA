import React from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import {
  ACCEPTED_FILE_TYPES,
  MAX_SIZE_MB,
} from "../services/kbConfig";
import { formatFileSize } from "../services/kbFileUtils";
import styles from "../pages/AdminKB.module.css";

function KbUploadPanel({
  dragHandlers,
  file,
  fileInputRef,
  isDragging,
  isProcessing,
  manualText,
  onClearFile,
  onFileSelected,
  onManualTextChange,
  onSubmit,
  progress,
  status,
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
      <header className="bg-green-600 px-6 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-white">Panel de Conocimiento</h1>
        <p className="text-sm text-green-100">Carga documentos</p>
      </header>

      <form onSubmit={onSubmit} className="p-6 space-y-6 bg-gray-50 flex-1 overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subir Archivo (PDF, Markdown, TXT)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={(event) => onFileSelected(event.target.files[0])}
            disabled={isProcessing}
            className="hidden"
          />

          {!file ? (
            <div
              {...dragHandlers}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`${styles.dropzone} ${
                isProcessing
                  ? styles.dropzoneProcessing
                  : isDragging
                    ? styles.dropzoneDragging
                    : styles.dropzoneIdle
              }`}
            >
              <UploadCloud
                className={`w-10 h-10 transition-colors duration-200 ${
                  isDragging ? "text-green-600" : "text-gray-400"
                }`}
              />
              <div className="text-center">
                <p
                  className={`text-sm font-semibold transition-colors duration-200 ${
                    isDragging ? "text-green-700" : "text-gray-600"
                  }`}
                >
                  {isDragging ? "Suelta el archivo aquí" : "Arrastra y suelta tu archivo aquí"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  o haz clic para seleccionar • PDF, MD, TXT • Máx {MAX_SIZE_MB}MB
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 truncate">{file.name}</p>
                <p className="text-xs text-green-600">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={onClearFile}
                className="p-1.5 text-green-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                title="Quitar archivo"
                disabled={isProcessing}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            O carga manual de texto
          </label>
          <textarea
            rows="6"
            value={manualText}
            onChange={(event) => onManualTextChange(event.target.value)}
            placeholder="Escribe o pega tu texto aquí..."
            disabled={isProcessing}
            className="input-field resize-none"
          />
        </div>

        {status && (
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-600 mb-2 font-medium">{status}</p>
            {isProcessing && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isProcessing || (!file && !manualText.trim())}
            className="btn-primary"
          >
            {isProcessing ? "Procesando..." : "Procesar y Subir"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default KbUploadPanel;
