import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, Eye, X } from "lucide-react";
import {
  ALLOWED_RESOURCE_EXTENSIONS,
  RESOURCE_TYPES,
  deleteLearningItem,
  fetchLearningItems,
  saveLearningItem,
} from "../services/learningContentService";
import LearningItemPreviewCard from "./LearningItemPreviewCard";

function createEmptyModule(index = 0) {
  return {
    clientId: `modulo-${Date.now()}-${index}`,
    id: null,
    titulo: "",
    descripcion: "",
    youtubeLinksText: "",
    selectedFiles: [],
    recursos: [],
    isCollapsed: false,
  };
}

function getInitialForm(type) {
  return {
    id: null,
    tipo: type,
    titulo: "",
    descripcion: "",
    modulos: [createEmptyModule()],
  };
}

function getFileExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function normalizeModuleForForm(module, index) {
  const recursos = module.recursos ?? [];
  const youtubeLinksText = recursos
    .filter((resource) => resource.tipo === RESOURCE_TYPES.YOUTUBE)
    .map((resource) => resource.youtube_url)
    .filter(Boolean)
    .join("\n");

  return {
    clientId: module.id ?? `modulo-edit-${index}`,
    id: module.id,
    titulo: module.titulo ?? "",
    descripcion: module.descripcion ?? "",
    youtubeLinksText,
    selectedFiles: [],
    recursos,
    isCollapsed: false,
  };
}

function AdminLearningManager({ type, title }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(getInitialForm(type));
  const [previewItem, setPreviewItem] = useState(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchLearningItems(type);
      setItems(data);
    } catch (loadError) {
      console.error("No se pudieron cargar los cursos", loadError);
      setError(
        "No se pudo cargar el contenido. Revisa que las tablas esten creadas en Supabase."
      );
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    setForm(getInitialForm(type));
  }, [type]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!previewItem) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setPreviewItem(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [previewItem]);

  const resetForm = () => {
    setForm(getInitialForm(type));
    setFormError("");
  };

  const updateModule = (moduleIndex, changes) => {
    setForm((currentForm) => ({
      ...currentForm,
      modulos: currentForm.modulos.map((module, index) =>
        index === moduleIndex ? { ...module, ...changes } : module
      ),
    }));
  };

  const addModule = () => {
    setForm((currentForm) => ({
      ...currentForm,
      modulos: [
        ...currentForm.modulos.map((module) => ({
          ...module,
          isCollapsed: true,
        })),
        createEmptyModule(currentForm.modulos.length),
      ],
    }));
  };

  const removeModule = (moduleIndex) => {
    setForm((currentForm) => {
      const nextModules = currentForm.modulos.filter(
        (_module, index) => index !== moduleIndex
      );

      return {
        ...currentForm,
        modulos: nextModules.length > 0 ? nextModules : [createEmptyModule()],
      };
    });
  };

  const toggleModuleCollapse = (moduleIndex) => {
    setForm((currentForm) => ({
      ...currentForm,
      modulos: currentForm.modulos.map((module, index) =>
        index === moduleIndex
          ? { ...module, isCollapsed: !module.isCollapsed }
          : module
      ),
    }));
  };

  const handleFilesChange = (moduleIndex, fileList) => {
    const files = Array.from(fileList ?? []);
    const invalidFile = files.find(
      (file) => !ALLOWED_RESOURCE_EXTENSIONS.includes(getFileExtension(file.name))
    );

    if (invalidFile) {
      setFormError(
        `El archivo "${invalidFile.name}" no tiene un formato permitido. Formatos permitidos: ${ALLOWED_RESOURCE_EXTENSIONS.join(", ")}.`
      );
      return;
    }

    setFormError("");
    setForm((currentForm) => ({
      ...currentForm,
      modulos: currentForm.modulos.map((module, index) =>
        index === moduleIndex
          ? {
              ...module,
              selectedFiles: [...(module.selectedFiles ?? []), ...files],
            }
          : module
      ),
    }));
  };

  const removeSelectedFile = (moduleIndex, fileIndex) => {
    setForm((currentForm) => ({
      ...currentForm,
      modulos: currentForm.modulos.map((module, index) =>
        index === moduleIndex
          ? {
              ...module,
              selectedFiles: module.selectedFiles.filter(
                (_file, selectedIndex) => selectedIndex !== fileIndex
              ),
            }
          : module
      ),
    }));
  };

  const removeExistingResource = (moduleIndex, resourceId) => {
    setForm((currentForm) => ({
      ...currentForm,
      modulos: currentForm.modulos.map((module, index) => {
        if (index !== moduleIndex) {
          return module;
        }

        const removedResource = module.recursos.find(
          (resource) => resource.id === resourceId
        );
        const nextModule = {
          ...module,
          recursos: module.recursos.filter(
            (resource) => resource.id !== resourceId
          ),
        };

        if (removedResource?.tipo !== RESOURCE_TYPES.YOUTUBE) {
          return nextModule;
        }

        return {
          ...nextModule,
          youtubeLinksText: module.youtubeLinksText
            .split(/\r?\n/)
            .map((link) => link.trim())
            .filter((link) => link && link !== removedResource.youtube_url)
            .join("\n"),
        };
      }),
    }));
  };

  const validateForm = () => {
    if (!form.titulo.trim()) {
      return "El titulo es obligatorio.";
    }

    if (form.modulos.length === 0) {
      return "La capacitacion debe tener al menos un modulo.";
    }

    const moduleWithoutTitle = form.modulos.find(
      (module) => !module.titulo.trim()
    );

    if (moduleWithoutTitle) {
      return "Todos los modulos deben tener titulo.";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);

    try {
      await saveLearningItem(form);
      await loadItems();
      resetForm();
    } catch (saveError) {
      console.error("No se pudo guardar el curso", saveError);
      setFormError(
        saveError?.message
          ? `No se pudo guardar el contenido: ${saveError.message}`
          : "No se pudo guardar el contenido. Revisa permisos de base de datos y storage."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      id: item.id,
      tipo: item.tipo,
      titulo: item.titulo,
      descripcion: item.descripcion ?? "",
      modulos:
        item.modulos?.length > 0
          ? item.modulos.map(normalizeModuleForForm)
          : [createEmptyModule()],
    });
    setFormError("");
  };

  const handleDelete = async (item) => {
    const shouldDelete = window.confirm(
      `Seguro que quieres eliminar "${item.titulo}"?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteLearningItem(item);
      await loadItems();

      if (form.id === item.id) {
        resetForm();
      }
    } catch (deleteError) {
      console.error("No se pudo eliminar el curso", deleteError);
      setError("No se pudo eliminar el contenido.");
    }
  };

  const openPreview = (item) => {
    setPreviewItem(item);
  };

  const closePreview = () => {
    setPreviewItem(null);
  };

  return (
    <section className="min-h-screen bg-gray-100 px-6 py-6 md:px-12 lg:px-24">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Administra capacitaciones, modulos y recursos publicados en la
          aplicacion.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold">
            {form.id ? "Editar capacitacion" : "Nueva capacitacion"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="text"
              placeholder="Titulo de la capacitacion"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full rounded border p-3"
              required
            />

            <textarea
              placeholder="Descripcion breve"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="min-h-[100px] w-full rounded border p-3"
            />

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Modulos
                  </h3>
                  <p className="text-sm text-gray-600">
                    Agrega al menos un modulo y combina archivos con videos.
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Minimo requerido: 1 modulo.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {form.modulos.map((module, moduleIndex) => (
                  <article
                    key={module.clientId}
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleModuleCollapse(moduleIndex)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        aria-expanded={!module.isCollapsed}
                      >
                        <ChevronDown
                          className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform duration-200 ${
                            module.isCollapsed ? "-rotate-90" : "rotate-0"
                          }`}
                        />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900">
                            Modulo {moduleIndex + 1}
                          </h4>
                          <p className="truncate text-sm text-gray-600">
                            {module.titulo.trim() || "Sin titulo"}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeModule(moduleIndex)}
                        disabled={form.modulos.length === 1}
                        className="rounded bg-red-50 px-3 py-1 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Quitar
                      </button>
                    </div>

                    {!module.isCollapsed && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Titulo del modulo"
                          value={module.titulo}
                          onChange={(e) =>
                            updateModule(moduleIndex, { titulo: e.target.value })
                          }
                          className="w-full rounded border p-3"
                          required
                        />

                        <textarea
                          placeholder="Descripcion del modulo"
                          value={module.descripcion}
                          onChange={(e) =>
                            updateModule(moduleIndex, {
                              descripcion: e.target.value,
                            })
                          }
                          className="min-h-[80px] w-full rounded border p-3"
                        />

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Links de YouTube
                          </label>
                          <textarea
                            placeholder="Un link por linea"
                            value={module.youtubeLinksText}
                            onChange={(e) =>
                              updateModule(moduleIndex, {
                                youtubeLinksText: e.target.value,
                              })
                            }
                            className="min-h-[90px] w-full rounded border p-3"
                          />
                        </div>

                        <div className="rounded border border-dashed border-gray-300 p-4">
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Archivos
                          </label>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.docx,.pptx,.xlsx,.jpg,.png,.mp4"
                            onChange={(e) => {
                              handleFilesChange(moduleIndex, e.target.files);
                              e.target.value = "";
                            }}
                            className="w-full text-sm text-gray-700"
                          />
                          <p className="mt-2 text-xs text-gray-500">
                            Permitidos: {ALLOWED_RESOURCE_EXTENSIONS.join(", ")}
                          </p>
                        </div>

                        {module.selectedFiles.length > 0 && (
                          <div>
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
                                    onClick={() =>
                                      removeSelectedFile(moduleIndex, fileIndex)
                                    }
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
                          <div>
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
                                    {resource.tipo === RESOURCE_TYPES.ARCHIVO
                                      ? resource.archivo_nombre
                                      : resource.youtube_url}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeExistingResource(
                                        moduleIndex,
                                        resource.id
                                      )
                                    }
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
                    )}
                  </article>
                ))}
              </div>
            </div>

            {formError && (
              <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                {formError}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addModule}
                className="rounded-lg bg-green-600 px-5 py-2 text-white shadow transition duration-200 hover:bg-green-700"
              >
                Agregar modulo
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-500 px-5 py-2 text-white shadow transition duration-200 hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {saving ? "Guardando..." : form.id ? "Actualizar" : "Guardar"}
              </button>

              {form.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg bg-gray-500 px-5 py-2 text-white shadow"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold">Capacitaciones cargadas</h2>

          {loading && <p className="text-gray-600">Cargando capacitaciones...</p>}

          {!loading && items.length === 0 && (
            <p className="text-gray-600">Todavia no hay capacitaciones cargadas.</p>
          )}

          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-lg bg-gray-50 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {item.titulo}
                    </h3>
                    {item.descripcion && (
                      <p className="mt-2 text-sm text-gray-600">
                        {item.descripcion}
                      </p>
                    )}
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {item.modulos?.length ?? 0} modulos
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openPreview(item)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-1 text-white"
                    >
                      <Eye className="h-4 w-4" />
                      Ver
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="rounded-lg bg-yellow-500 px-4 py-1 text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="rounded-lg bg-red-500 px-4 py-1 text-white"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Cerrar previsualizacion"
            onClick={closePreview}
            className="absolute inset-0 bg-slate-900/65"
          />

          <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">
                  Previsualizacion
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900">
                  {previewItem.titulo}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Vista previa de la capacitacion sin salir del panel de administracion.
                </p>
              </div>

              <button
                type="button"
                onClick={closePreview}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Cerrar modal de previsualizacion"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto bg-gray-50 p-6">
              <LearningItemPreviewCard item={previewItem} />
            </div>

            <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={closePreview}
                className="rounded-lg bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminLearningManager;
