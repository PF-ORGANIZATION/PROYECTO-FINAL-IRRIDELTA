import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CapacitacionPreviewModal from "../components/CapacitacionPreviewModal";
import {
  LEARNING_TYPES,
  deleteLearningItem,
  fetchLearningItems,
} from "../services/learningContentService";

function AdminCapacitacionesList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchLearningItems(LEARNING_TYPES.CAPACITACION);
      setItems(data);
    } catch (loadError) {
      console.error("No se pudieron cargar las capacitaciones", loadError);
      setError(
        "No se pudieron cargar las capacitaciones. Revisa que el esquema este correcto en Supabase."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search.trim() ||
        item.titulo?.toLowerCase().includes(search.toLowerCase()) ||
        item.descripcion?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "publicadas" && item.publicada) ||
        (statusFilter === "borradores" && !item.publicada);

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  const handleDelete = async (item) => {
    const confirmation = window.prompt(
      `Vas a eliminar "${item.titulo}". Escribe "eliminar" para confirmar.`
    );

    if (confirmation?.trim().toLowerCase() !== "eliminar") {
      return;
    }

    try {
      await deleteLearningItem(item);
      await loadItems();
    } catch (deleteError) {
      console.error("No se pudo eliminar la capacitacion", deleteError);
      setError("No se pudo eliminar la capacitacion.");
    }
  };

  return (
    <section className="min-h-screen bg-gray-100 px-6 py-6 md:px-12 lg:px-24">
      <header className="mb-8 border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Panel de Capacitaciones
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Primero gestionas las capacitaciones. Luego entras a editar una puntual.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin/capacitaciones/nueva")}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Nueva capacitacion
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-md">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por titulo o descripcion"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <option value="todos">Todos</option>
            <option value="publicadas">Publicadas</option>
            <option value="borradores">Borradores</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-md">
          Cargando capacitaciones...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-2xl bg-white p-12 text-center shadow-md">
          <h2 className="text-2xl font-bold text-gray-900">
            Todavia no hay capacitaciones cargadas
          </h2>
          <p className="mt-3 text-sm text-gray-600">
            Empieza creando la primera capacitacion para construir el contenido y sus evaluaciones.
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/capacitaciones/nueva")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Crear primera capacitacion
          </button>
        </div>
      )}

      {!loading && items.length > 0 && filteredItems.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-md">
          No se encontraron capacitaciones con esos filtros.
        </div>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900">{item.titulo}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.publicada
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.publicada ? "Publicada" : "Borrador"}
                    </span>
                  </div>

                  {item.descripcion && (
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      {item.descripcion}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">Modulos:</span>{" "}
                      {item.modulos?.length ?? 0}
                    </div>
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">Prueba final:</span>{" "}
                      {Array.isArray(item.certificacion?.preguntas) &&
                      item.certificacion.preguntas.length > 0
                        ? "Configurado"
                        : "Pendiente"}
                    </div>
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">Ultima actualizacion:</span>{" "}
                      {item.updated_at
                        ? new Date(item.updated_at).toLocaleDateString("es-AR")
                        : "-"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/capacitaciones/${item.id}/editar`)}
                    className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <CapacitacionPreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </section>
  );
}

export default AdminCapacitacionesList;
