import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  LEARNING_FEED_VIEWS,
  fetchLearningFeed,
} from "../services/learningFeedService";
import LearningItemPreviewCard from "./LearningItemPreviewCard";
import styles from "./LearningCatalog.module.css";

const FILTERS = {
  ALL: "todos",
  PENDING: "pendiente",
  IN_PROGRESS: "en-progreso",
  COMPLETED: "completado",
};

function LearningCatalog({ title, emptyMessage }) {
  const [items, setItems] = useState([]);
  const [activeFilter, setActiveFilter] = useState(FILTERS.ALL);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
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
          view: LEARNING_FEED_VIEWS.USER_CAPACITACIONES,
          cursor,
          search: debouncedSearch,
          status: activeFilter,
        });

        setItems((currentItems) =>
          append ? [...currentItems, ...data.items] : data.items
        );
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setTotal(data.total);
      } catch (loadError) {
        console.error("No se pudo cargar el contenido formativo", loadError);
        setError(
          "No se pudo cargar el contenido. Revisa que la funcion learning-feed este publicada en Supabase."
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeFilter, debouncedSearch]
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

  return (
    <section className="learning-page">
      <div className="learning-container">
        <header className="learning-header">
          <div>
            <h1 className="learning-title">{title}</h1>
            <p className="learning-subtitle">
              Accede al material de formacion y segui tu avance en cada modulo.
            </p>
          </div>
        </header>

        {loading && (
          <div className={styles.skeletonGrid} aria-label="Cargando contenido">
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
          </div>
        )}

        {!loading && error && (
          <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && activeFilter === FILTERS.ALL && !debouncedSearch && (
          <div className="learning-empty">{emptyMessage}</div>
        )}

        {!loading && !error && (items.length > 0 || activeFilter !== FILTERS.ALL || debouncedSearch) && (
          <>
            <div className={styles.controlPanel}>
              <div className={styles.searchBlock}>
                <label htmlFor="learning-search" className={styles.searchLabel}>
                  Buscar capacitaciones
                </label>
                <div className={styles.searchInputWrap}>
                  <Search className={styles.searchIcon} aria-hidden="true" />
                  <input
                    id="learning-search"
                    type="text"
                    placeholder="Buscar por titulo o descripcion"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <p className={styles.resultsHint}>
                  Mostrando {items.length} de {total} capacitaciones.
                </p>
              </div>

              <div className={styles.filterBlock}>
                <label htmlFor="learning-filter" className={styles.filterLabel}>
                  Filtrar por estado
                </label>
                <select
                  id="learning-filter"
                  value={activeFilter}
                  onChange={(event) => setActiveFilter(event.target.value)}
                  className={styles.filterSelect}
                >
                  <option value={FILTERS.ALL}>Todos</option>
                  <option value={FILTERS.PENDING}>Pendientes</option>
                  <option value={FILTERS.IN_PROGRESS}>En progreso</option>
                  <option value={FILTERS.COMPLETED}>Completados</option>
                </select>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="learning-empty">
                No se encontraron capacitaciones con ese criterio.
              </div>
            ) : (
              <>
                <div className={styles.grid}>
                  {items.map((item) => (
                    <LearningItemPreviewCard
                      key={item.id}
                      item={item}
                      progress={item.progress}
                    />
                  ))}
                </div>

                <div ref={loadMoreRef} className={styles.loadMoreSentinel}>
                  {loadingMore && (
                    <div className={styles.skeletonGrid} aria-hidden="true">
                      <div className={styles.skeletonCard} />
                      <div className={styles.skeletonCard} />
                    </div>
                  )}
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
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default LearningCatalog;
