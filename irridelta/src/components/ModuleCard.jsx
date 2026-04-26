import React from "react";
import { ChevronDown, FileText, Link2, PencilLine, Trash2 } from "lucide-react";
import { ALLOWED_RESOURCE_EXTENSIONS } from "../services/learningContentService";
import {
  getModuleCompletionInfo,
  getModuleResourceCounts,
  isModuleAssessmentConfigured,
} from "../utils/adminCapacitacionesForm";

function ModuleCard({
  module,
  index,
  canRemove,
  onToggle,
  onRemove,
  onUpdate,
  onFilesChange,
  onRemoveSelectedFile,
  onRemoveExistingResource,
  onEditAssessment,
}) {
  const resourceCounts = getModuleResourceCounts(module);
  const isAssessmentReady = isModuleAssessmentConfigured(module);
  const moduleTitle = module.titulo.trim() || "Sin titulo";
  const moduleCompletion = getModuleCompletionInfo(module);

  return (
    <article className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          aria-expanded={!module.isCollapsed}
        >
          <ChevronDown
            className={`mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500 transition-transform duration-200 ${
              module.isCollapsed ? "-rotate-90" : "rotate-0"
            }`}
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-gray-900">Modulo {index + 1}</h4>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  moduleCompletion.isComplete
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {moduleCompletion.isComplete ? "Completo" : "Pendiente"}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-600">{moduleTitle}</p>
            <p className="mt-1 text-xs text-slate-500">{moduleCompletion.detail}</p>

            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
                <Link2 className="h-3.5 w-3.5" />
                {resourceCounts.videos} links/videos
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
                <FileText className="h-3.5 w-3.5" />
                {resourceCounts.archivos} archivos
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          >
            <Trash2 className="h-4 w-4" />
            Quitar
          </button>
        </div>
      </div>

      {!module.isCollapsed && (
        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
          <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h5 className="text-base font-semibold text-gray-900">
                  Contenido del modulo
                </h5>
                <p className="mt-1 text-sm text-gray-600">
                  Gestiona titulo, descripcion, links y archivos.
                </p>
              </div>
            </div>

            <input
              type="text"
              placeholder="Titulo del modulo"
              value={module.titulo}
              onChange={(e) => onUpdate({ titulo: e.target.value })}
              className="w-full rounded border p-3"
              required
            />

            <textarea
              placeholder="Descripcion del modulo"
              value={module.descripcion}
              onChange={(e) => onUpdate({ descripcion: e.target.value })}
              className="min-h-[90px] w-full rounded border p-3"
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Links de YouTube
              </label>
              <textarea
                placeholder="Un link por linea"
                value={module.youtubeLinksText}
                onChange={(e) => onUpdate({ youtubeLinksText: e.target.value })}
                className="min-h-[90px] w-full rounded border p-3"
              />
            </div>

            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Archivos
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.xlsx,.jpg,.png,.mp4"
                onChange={(e) => {
                  onFilesChange(e.target.files);
                  e.target.value = "";
                }}
                className="w-full text-sm text-gray-700"
              />
              <p className="mt-2 text-xs text-gray-500">
                Permitidos: {ALLOWED_RESOURCE_EXTENSIONS.join(", ")}
              </p>
            </div>

            {module.selectedFiles.length > 0 && (
              <div className="rounded-xl bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-gray-700">
                  Archivos seleccionados
                </p>
                <ul className="space-y-2">
                  {module.selectedFiles.map((file, fileIndex) => (
                    <li
                      key={`${file.name}-${file.lastModified}`}
                      className="flex items-center justify-between gap-3 rounded bg-gray-50 px-3 py-2 text-sm"
                    >
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveSelectedFile(fileIndex)}
                        className="font-semibold text-red-600"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {module.recursos.length > 0 && (
              <div className="rounded-xl bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-gray-700">
                  Recursos actuales
                </p>
                <ul className="space-y-2">
                  {module.recursos.map((resource) => (
                    <li
                      key={resource.id}
                      className="flex items-center justify-between gap-3 rounded bg-gray-50 px-3 py-2 text-sm"
                    >
                      <span>
                        {resource.tipo === "archivo"
                          ? resource.archivo_nombre
                          : resource.youtube_url}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveExistingResource(resource.id)}
                        className="font-semibold text-red-600"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="text-sm font-medium text-gray-500">Estado</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {isAssessmentReady ? "Lista" : "Pendiente"}
                </p>
              </div>

              <button
                type="button"
                onClick={onEditAssessment}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-slate-900"
              >
                <PencilLine className="h-4 w-4" />
                Editar prueba
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="text-sm font-medium text-gray-500">
                  Preguntas cargadas
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {module.preguntas?.length ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="text-sm font-medium text-gray-500">
                  A mostrar
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {module.cantidad_preguntas_a_mostrar ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="text-sm font-medium text-gray-500">
                  Aprobación
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {module.porcentaje_aprobacion ? `${module.porcentaje_aprobacion}%` : "-"}
                </p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="text-sm font-medium text-gray-500">
                  Duración
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {module.duracion_maxima_minutos
                    ? `${module.duracion_maxima_minutos} min`
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default ModuleCard;
