import React from "react";
import {
  Download,
  Eye,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";

function KbDocumentRow({
  file,
  isActive,
  onDelete,
  onDownload,
  onPreview,
  onToggleActive,
}) {
  const active = isActive(file);

  return (
    <tr className={`border-b border-gray-100 transition-colors ${active ? "hover:bg-gray-50" : "bg-gray-50/70 opacity-60"}`}>
      <td className="py-3 px-4 max-w-[300px] truncate" title={file.nombre}>
        <span className={active ? "" : "line-through text-gray-400"}>{file.nombre}</span>
      </td>
      <td className="py-3 px-4 whitespace-nowrap">
        {new Date(file.created_at).toLocaleDateString()}
      </td>
      <td className="py-3 px-4">
        <button
          onClick={() => onToggleActive(file.id, active)}
          className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 transition-all ${
            active
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-gray-200 text-gray-500 hover:bg-gray-300"
          }`}
          title={active ? "Activo en RAG — click para desactivar" : "Inactivo en RAG — click para activar"}
        >
          {active ? (
            <>
              <ToggleRight className="w-4 h-4" /> Activo
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4" /> Inactivo
            </>
          )}
        </button>
      </td>
      <td className="py-3 px-4 flex justify-end gap-2">
        <button
          onClick={() => onPreview(file)}
          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
          title="Ver detalle"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDownload(file.storage_path)}
          className={`p-2 rounded-lg transition ${
            file.storage_path
              ? "text-blue-600 hover:bg-blue-50"
              : "text-gray-300 cursor-not-allowed"
          }`}
          title={file.storage_path ? "Descargar documento" : "Carga manual sin archivo"}
          disabled={!file.storage_path}
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(file.id, file.storage_path)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          title="Eliminar documento"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

export default KbDocumentRow;
