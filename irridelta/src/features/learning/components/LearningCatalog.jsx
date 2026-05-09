import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { fetchLearningItems } from "../services/learningContentService";
import {
  fetchUserLearningProgress,
  getCompletedResourceIds,
  isResourceCompleted,
} from "../services/learningProgressService";
import {
  EXAM_ATTEMPT_STATUS,
  EXAM_TYPES,
  fetchExamAttempts,
} from "../services/examAttemptsService";
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

function getItemProgress(item, progressItems = [], examAttempts = []) {
  const modules = item?.modulos ?? [];
  const completedResourceIds = getCompletedResourceIds(progressItems);
  const approvedModuleIds = new Set(
    examAttempts
      .filter(
        (attempt) =>
          attempt.estado === EXAM_ATTEMPT_STATUS.COMPLETED &&
          attempt.aprobado &&
          attempt.modulo_id
      )
      .map((attempt) => attempt.modulo_id)
  );
  const completedModules = modules.filter((module) => {
    const resources = getModuleResources(module);
    const hasExam = Array.isArray(module?.preguntas) && module.preguntas.length > 0;
    const resourcesCompleted =
      resources.length > 0 &&
      resources.every((resource) =>
        isResourceCompleted(resource, completedResourceIds, module.id)
      );

    return resourcesCompleted && (!hasExam || approvedModuleIds.has(module.id));
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
  const [attemptsByItemId, setAttemptsByItemId] = useState({});
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
          const attemptEntries = await Promise.all(
            data.map(async (item) => {
              try {
                const attempts = await fetchExamAttempts({
                  tipoExamen: EXAM_TYPES.MODULO,
                  capacitacionId: item.id,
                });

                return [item.id, attempts];
              } catch (attemptError) {
                console.error(
                  "No se pudieron cargar los intentos de modulo",
                  attemptError
                );
                return [item.id, []];
              }
            })
          );

          if (!ignore) {
            setProgressByItemId(Object.fromEntries(progressEntries));
            setAttemptsByItemId(Object.fromEntries(attemptEntries));
          }
        } else if (!ignore) {
          setProgressByItemId({});
          setAttemptsByItemId({});
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
        progress: getItemProgress(
          item,
          progressByItemId[item.id] ?? [],
          attemptsByItemId[item.id] ?? []
        ),
      })),
    [attemptsByItemId, items, progressByItemId]
  );

  const searchQuery = search.trim().toLowerCase();

  const filteredItems = useMemo(
    () => {
      const statusOrder = {
        [FILTERS.IN_PROGRESS]: 0,
        [FILTERS.PENDING]: 1,
        [FILTERS.COMPLETED]: 2,
      };

      return itemsWithProgress
        .filter(({ item, progress }) => {
        const matchesFilter =
          activeFilter === FILTERS.ALL || progress.status === activeFilter;

        return matchesFilter && matchesSearch(item, searchQuery);
        })
        .sort(
          (currentItem, nextItem) =>
            statusOrder[currentItem.progress.status] -
            statusOrder[nextItem.progress.status]
        );
    },
    [activeFilter, itemsWithProgress, searchQuery]
  );

  return (
    <section className={styles.catalog}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>
              Accede al material de formación y seguí tu avance en cada módulo.
            </p>

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
                <label htmlFor="learning-filter" className={styles.filterLabel}>
                  Filtrar por estado
                </label>
                <select
                  id="learning-filter"
                  value={activeFilter}
                  onChange={(event) => setActiveFilter(event.target.value)}
                  className={styles.filterSelect}
                >
                  <option value={FILTERS.ALL}>
                    Todos
                  </option>
                  <option value={FILTERS.PENDING}>
                    Pendientes
                  </option>
                  <option value={FILTERS.IN_PROGRESS}>
                    En progreso
                  </option>
                  <option value={FILTERS.COMPLETED}>
                    Completados
                  </option>
                </select>
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
