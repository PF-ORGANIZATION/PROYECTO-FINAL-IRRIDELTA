import React from "react";
import { FileText } from "lucide-react";
import KbDocumentRow from "./KbDocumentRow";

function KbDocumentList({
  files,
  isActive,
  isLoading,
  onDelete,
  onDownload,
  onPreview,
  onToggleActive,
}) {
  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-green-600" />
        Documentos Subidos
      </h2>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Cargando documentos...</p>
      ) : files.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay documentos registrados aún.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-600">
                <th className="py-3 px-4 font-semibold">Nombre</th>
                <th className="py-3 px-4 font-semibold">Fecha de Carga</th>
                <th className="py-3 px-4 font-semibold">Estado</th>
                <th className="py-3 px-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {files.map((file) => (
                <KbDocumentRow
                  key={file.id}
                  file={file}
                  isActive={isActive}
                  onDelete={onDelete}
                  onDownload={onDownload}
                  onPreview={onPreview}
                  onToggleActive={onToggleActive}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default KbDocumentList;
