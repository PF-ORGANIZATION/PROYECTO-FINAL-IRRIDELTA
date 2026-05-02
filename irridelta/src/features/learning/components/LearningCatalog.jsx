import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Search,
  Sparkles,
} from "lucide-react";
import { fetchLearningItems } from "../services/learningContentService";
import {
  fetchUserLearningProgress,
  getCompletedResourceIds,
} from "../services/learningProgressService";
import LearningItemPreviewCard from "./LearningItemPreviewCard";
import styles from "./LearningCatalog.module.css";

const FILTERS = {
  ALL: "todos",
  PENDING: "pendiente",
  IN_PROGRESS: "en-progreso",
  COMPLETED: "completado",
};

function getModuleResources(module) {
  return module?.recursos ?? [];
}

function getItemProgress(item, progressItems = []) {
  const modules = item?.modulos ?? [];
  const completedResourceIds = getCompletedResourceIds(progressItems);
  const completedModules = modules.filter((module) => {
    const resources = getModuleResources(module);

    return (
      resources.length > 0 &&
      resources.every((resource) => completedResourceIds.has(resource.id))
    );
  }).length;
  const totalModules = modules.length;
  const progressPercentage =
    totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  const status =
    totalModules === 0 || completedModules === 0
      ? "pendiente"
      : completedModules === totalModules
      ? "completado"
      : "en-progreso";

  return {
    completedModules,
    totalModules,
    progressPercentage,
    status,
  };
}

function matchesSearch(item, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    item?.titulo,
    item?.descripcion,
    ...(item?.modulos ?? []).flatMap((module) => [
      module?.titulo,
      module?.descripcion,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function LearningCatalog({ type, title, emptyMessage, onlyPublished = false }) {
  const [items, setItems] = useState([]);
  const [progressByItemId, setProgressByItemId] = useState({});
  const [activeFilter, setActiveFilter] = useState(FILTERS.ALL);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadItems = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchLearningItems(type, { onlyPublished });

        if (!ignore) {
          setItems(data);
        }

        if (data.length > 0) {
          setLoadingProgress(true);

          const progressEntries = await Promise.all(
            data.map(async (item) => {
              const progress = await fetchUserLearningProgress(item.id);

              return [item.id, progress];
            })
          );

          if (!ignore) {
            setProgressByItemId(Object.fromEntries(progressEntries));
          }
        } else if (!ignore) {
          setProgressByItemId({});
        }
      } catch (loadError) {
        if (!ignore) {
          console.error("No se pudo cargar el contenido formativo", loadError);
          setError(
            "No se pudo cargar el contenido. Revisa que las tablas estén creadas en Supabase."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setLoadingProgress(false);
        }
      }
    };

    loadItems();

    return () => {
      ignore = true;
    };
  }, [onlyPublished, type]);

  const itemsWithProgress = useMemo(
    () =>
      items.map((item) => ({
        item,
        progress: getItemProgress(item, progressByItemId[item.id] ?? []),
      })),
    [items, progressByItemId]
  );

  const searchQuery = search.trim().toLowerCase();

  const filteredItems = useMemo(
    () =>
      itemsWithProgress.filter(({ item, progress }) => {
        const matchesFilter =
          activeFilter === FILTERS.ALL || progress.status === activeFilter;

        return matchesFilter && matchesSearch(item, searchQuery);
      }),
    [activeFilter, itemsWithProgress, searchQuery]
  );

  const catalogStats = useMemo(
    () => ({
      total: itemsWithProgress.length,
      inProgress: itemsWithProgress.filter(
        ({ progress }) => progress.status === FILTERS.IN_PROGRESS
      ).length,
      completed: itemsWithProgress.filter(
        ({ progress }) => progress.status === FILTERS.COMPLETED
      ).length,
    }),
    [itemsWithProgress]
  );

  return (
    <section className={styles.catalog}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.headerGlow} aria-hidden="true" />
          <div className={styles.headerContent}>
            <div className={styles.heroIcon}>
              <Sparkles size={28} />
            </div>
            <span className={styles.eyebrow}>Capacitaciones IRRIDELTA</span>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>
              Accede al material de formación y seguí tu avance en cada módulo.
            </p>

            <div className={styles.statsGrid}>
              <article className={styles.statCard}>
                <BookOpen className={styles.statIcon} aria-hidden="true" />
                <div>
                  <p className={styles.statValue}>{catalogStats.total}</p>
                  <p className={styles.statLabel}>Capacitaciones disponibles</p>
                </div>
              </article>

              <article className={styles.statCard}>
                <Clock3 className={styles.statIcon} aria-hidden="true" />
                <div>
                  <p className={styles.statValue}>{catalogStats.inProgress}</p>
                  <p className={styles.statLabel}>En progreso</p>
                </div>
              </article>

              <article className={styles.statCard}>
                <CheckCircle2 className={styles.statIcon} aria-hidden="true" />
                <div>
                  <p className={styles.statValue}>{catalogStats.completed}</p>
                  <p className={styles.statLabel}>Completadas</p>
                </div>
              </article>
            </div>
          </div>
        </header>

        {loading && <div className={styles.feedbackCard}>Cargando contenido...</div>}

        {!loading && error && (
          <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className={styles.feedbackCard}>{emptyMessage}</div>
        )}

        {!loading && !error && items.length > 0 && (
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
                    placeholder="Buscar por título, descripción o módulo"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <p className={styles.resultsHint}>
                  Mostrando {filteredItems.length} de {items.length} capacitaciones.
                </p>
              </div>

              <div className={styles.filterBlock}>
                <p className={styles.filterLabel}>Filtrar por estado</p>
                <div
                  className={styles.filters}
                  role="group"
                  aria-label="Filtrar capacitaciones"
                >
                  <button
                    type="button"
                    className={`${styles.filterButton} ${
                      activeFilter === FILTERS.ALL ? styles.filterButtonActive : ""
                    }`}
                    onClick={() => setActiveFilter(FILTERS.ALL)}
                    aria-pressed={activeFilter === FILTERS.ALL}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterButton} ${
                      activeFilter === FILTERS.PENDING
                        ? styles.filterButtonActive
                        : ""
                    }`}
                    onClick={() => setActiveFilter(FILTERS.PENDING)}
                    aria-pressed={activeFilter === FILTERS.PENDING}
                  >
                    Pendientes
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterButton} ${
                      activeFilter === FILTERS.IN_PROGRESS
                        ? styles.filterButtonActive
                        : ""
                    }`}
                    onClick={() => setActiveFilter(FILTERS.IN_PROGRESS)}
                    aria-pressed={activeFilter === FILTERS.IN_PROGRESS}
                  >
                    En progreso
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterButton} ${
                      activeFilter === FILTERS.COMPLETED
                        ? styles.filterButtonActive
                        : ""
                    }`}
                    onClick={() => setActiveFilter(FILTERS.COMPLETED)}
                    aria-pressed={activeFilter === FILTERS.COMPLETED}
                  >
                    Completados
                  </button>
                </div>
              </div>
            </div>

            {loadingProgress && (
              <p className={styles.progressLoading}>Actualizando progreso...</p>
            )}

            {filteredItems.length === 0 ? (
              <div className={styles.feedbackCard}>
                No se encontraron capacitaciones con ese criterio.
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredItems.map(({ item, progress }) => (
                  <LearningItemPreviewCard
                    key={item.id}
                    item={item}
                    progress={progress}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default LearningCatalog;
