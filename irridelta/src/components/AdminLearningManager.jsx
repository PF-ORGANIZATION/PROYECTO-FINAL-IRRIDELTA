import React, { useEffect, useState } from "react";
import {
  deleteLearningItem,
  fetchLearningItems,
  saveLearningItem,
} from "../services/learningContentService";

function getInitialForm(type) {
  return {
    id: null,
    tipo: type,
    titulo: "",
    descripcion: "",
    youtube_url: "",
    archivo_url: null,
    archivo_path: null,
    archivo_nombre: null,
  };
}

function AdminLearningManager({ type, title }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState(getInitialForm(type));

  useEffect(() => {
    setForm(getInitialForm(type));
    setSelectedFile(null);
  }, [type]);

  useEffect(() => {
    loadItems();
  }, [type]);

  const loadItems = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchLearningItems(type);
      setItems(data);
    } catch (loadError) {
      console.error("No se pudieron cargar los cursos", loadError);
      setError(
        "No se pudo cargar el contenido. Revisa que la tabla y el bucket esten creados en Supabase."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(getInitialForm(type));
    setSelectedFile(null);
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    if (!form.titulo.trim()) {
      setFormError("El titulo es obligatorio.");
      setSaving(false);
      return;
    }

    if (!selectedFile && !form.youtube_url && !form.archivo_url) {
      setFormError("Carga un link de YouTube o selecciona un archivo.");
      setSaving(false);
      return;
    }

    try {
      await saveLearningItem(form, selectedFile);
      await loadItems();
      resetForm();
    } catch (saveError) {
      console.error("No se pudo guardar el curso", saveError);
      setFormError(
        "No se pudo guardar el contenido. Revisa permisos de base de datos y storage."
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
      youtube_url: item.youtube_url ?? "",
      archivo_url: item.archivo_url ?? null,
      archivo_path: item.archivo_path ?? null,
      archivo_nombre: item.archivo_nombre ?? null,
    });
    setSelectedFile(null);
    setFormError("");
  };

  const handleDelete = async (item) => {
    const shouldDelete = window.confirm(
      `¿Seguro que quieres eliminar "${item.titulo}"?`
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

  return (
    <section className="min-h-screen bg-gray-100 px-6 py-6 md:px-12 lg:px-24">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Carga contenido simple para clientes mediante YouTube y archivos.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold">
            {form.id ? "Editar contenido" : "Nuevo contenido"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Titulo del curso"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full rounded border p-3"
              required
            />

            <textarea
              placeholder="Descripcion breve"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="min-h-[120px] w-full rounded border p-3"
            />

            <input
              type="url"
              placeholder="https://www.youtube.com/..."
              value={form.youtube_url}
              onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
              className="w-full rounded border p-3"
            />

            <div className="rounded border border-dashed border-gray-300 p-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Archivo
              </label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-700"
              />

              {form.archivo_nombre && !selectedFile && (
                <p className="mt-2 text-xs text-gray-500">
                  Archivo actual: {form.archivo_nombre}
                </p>
              )}

              {selectedFile && (
                <p className="mt-2 text-xs text-gray-500">
                  Nuevo archivo: {selectedFile.name}
                </p>
              )}
            </div>

            {formError && (
              <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                {formError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-500 px-5 py-2 text-white shadow transition duration-200 hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {saving
                  ? "Guardando..."
                  : form.id
                    ? "Actualizar"
                    : "Guardar"}
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
          <h2 className="mb-4 text-xl font-semibold">Contenidos cargados</h2>

          {loading && <p className="text-gray-600">Cargando contenidos...</p>}

          {!loading && items.length === 0 && (
            <p className="text-gray-600">Todavia no hay contenidos cargados.</p>
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
                  </div>

                  <div className="flex flex-col gap-2">
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

                <div className="mt-4 flex flex-wrap gap-3">
                  {item.youtube_url && (
                    <a
                      href={item.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-red-600"
                    >
                      Ver YouTube
                    </a>
                  )}

                  {item.archivo_url && (
                    <a
                      href={item.archivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-blue-600"
                    >
                      Abrir archivo
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminLearningManager;
