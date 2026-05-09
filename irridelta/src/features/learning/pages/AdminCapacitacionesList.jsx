import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CapacitacionPreviewModal from "../components/CapacitacionPreviewModal";
import {
  deleteLearningItem,
  fetchLearningItemById,
} from "../services/learningContentService";
import {
  LEARNING_FEED_VIEWS,
  fetchLearningFeed,
} from "../services/learningFeedService";

function AdminCapacitacionesList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [previewItem, setPreviewItem] = useState(null);
  const [previewLoadingId, setPreviewLoadingId] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const loadItems = useCallback(
    async ({ cursor = null, append = false } = {}) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const data = await fetchLearningFeed({
          view: LEARNING_FEED_VIEWS.ADMIN_CAPACITACIONES,
          cursor,
          search: debouncedSearch,
          status: statusFilter,
        });

        setItems((currentItems) =>
          append ? [...currentItems, ...data.items] : data.items
        );
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (loadError) {
        console.error("No se pudieron cargar las capacitaciones", loadError);
        setError(
          "No se pudieron cargar las capacitaciones. Revisa la conexion con Supabase."
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, statusFilter]
  );

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;

    if (!sentinel || !hasMore || loading || loadingMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor) {
          loadItems({ cursor: nextCursor, append: true });
        }
      },
      { rootMargin: "360px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadItems, loading, loadingMore, nextCursor]);

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

  const handlePreview = async (item) => {
    setPreviewLoadingId(item.id);
    setError("");

    try {
      const fullItem = await fetchLearningItemById(item.id);
      setPreviewItem(fullItem);
    } catch (previewError) {
      console.error("No se pudo cargar la vista previa", previewError);
      setError("No se pudo cargar la vista previa de la capacitacion.");
    } finally {
      setPreviewLoadingId(null);
    }
  };

  return (
    <section className="learning-page">
      <div className="learning-container">
      <header className="learning-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="learning-title">
              Panel de Capacitaciones
            </h1>
            <p className="learning-subtitle">
              Primero gestionas las capacitaciones. Luego entras a editar una puntual.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin/capacitaciones/nueva")}
            className="learning-button"
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

      <div className="learning-card mb-6 p-5">
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
        <div className="learning-empty">
          Cargando capacitaciones...
        </div>
      )}

      {!loading && !error && items.length === 0 && !debouncedSearch && statusFilter === "todos" && (
        <div className="learning-empty">
          <h2 className="learning-empty-title">
            Todavia no hay capacitaciones cargadas
          </h2>
          <p className="learning-empty-text">
            Empieza creando la primera capacitacion para construir el contenido y sus evaluaciones.
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/capacitaciones/nueva")}
            className="learning-button mt-6"
          >
            <Plus className="h-4 w-4" />
            Crear primera capacitacion
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (debouncedSearch || statusFilter !== "todos") && (
        <div className="learning-empty">
          No se encontraron capacitaciones con esos filtros.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="learning-card"
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
                      {item.certificacion ? "Configurado" : "Opcional"}
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
                    onClick={() => handlePreview(item)}
                    disabled={previewLoadingId === item.id}
                    className="btn-dark w-full"
                  >
                    {previewLoadingId === item.id ? "Cargando..." : "Ver"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/capacitaciones/${item.id}/editar`)}
                    className="btn-warning w-full"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="btn-danger-sm w-full"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
          <div ref={loadMoreRef} className="grid justify-items-center py-6">
            {loadingMore && <div className="learning-empty w-full">Cargando mas...</div>}
            {!loadingMore && hasMore && (
              <button
                type="button"
                className="learning-button-secondary"
                onClick={() => loadItems({ cursor: nextCursor, append: true })}
              >
                Cargar mas
              </button>
            )}
          </div>
        </div>
      )}

      <CapacitacionPreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />
      </div>
    </section>
  );
}

export default AdminCapacitacionesList;
