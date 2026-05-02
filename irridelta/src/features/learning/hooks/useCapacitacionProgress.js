import { useEffect, useMemo, useState } from "react";
import { fetchLearningItemById } from "../services/learningContentService";
import {
  fetchUserLearningProgress,
  getCompletedResourceIds,
  markResourceAsCompleted as saveResourceProgress,
} from "../services/learningProgressService";

function useCapacitacionProgress(capacitacionId, options = {}) {
  const { onlyPublished = true } = options;
  const [capacitacion, setCapacitacion] = useState(null);
  const [progressItems, setProgressItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [error, setError] = useState("");
  const [progressError, setProgressError] = useState("");
  const [savingResourceId, setSavingResourceId] = useState(null);
  const [automaticTrackingResourceIds, setAutomaticTrackingResourceIds] =
    useState(() => new Set());

  useEffect(() => {
    let ignore = false;

    const loadCapacitacion = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchLearningItemById(capacitacionId, {
          onlyPublished,
        });

        if (!ignore) {
          setCapacitacion(data);
        }
      } catch (loadError) {
        if (!ignore) {
          console.error("No se pudo cargar la capacitacion", loadError);
          setError("No se pudo cargar la capacitacion solicitada.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadCapacitacion();

    return () => {
      ignore = true;
    };
  }, [capacitacionId, onlyPublished]);

  useEffect(() => {
    let ignore = false;

    const loadProgress = async () => {
      setLoadingProgress(true);
      setProgressError("");

      try {
        const data = await fetchUserLearningProgress(capacitacionId);

        if (!ignore) {
          setProgressItems(data);
        }
      } catch (loadError) {
        if (!ignore) {
          console.error("No se pudo cargar el progreso", loadError);
          setProgressError("No se pudo cargar tu progreso.");
        }
      } finally {
        if (!ignore) {
          setLoadingProgress(false);
        }
      }
    };

    loadProgress();

    return () => {
      ignore = true;
    };
  }, [capacitacionId]);

  const completedResourceIds = useMemo(
    () => getCompletedResourceIds(progressItems),
    [progressItems]
  );

  const setTrackingReady = (resourceId, isReady) => {
    setAutomaticTrackingResourceIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (isReady) {
        nextIds.add(resourceId);
      } else {
        nextIds.delete(resourceId);
      }

      return nextIds;
    });
  };

  const markResourceAsCompleted = async (module, resource) => {
    if (!capacitacionId) {
      return;
    }

    if (completedResourceIds.has(resource.id) || savingResourceId === resource.id) {
      return;
    }

    setSavingResourceId(resource.id);
    setProgressError("");

    try {
      const savedProgress = await saveResourceProgress({
        capacitacionId,
        moduloId: module.id,
        recursoId: resource.id,
      });

      setProgressItems((currentItems) => {
        const existingItem = currentItems.find(
          (item) => item.recurso_id === resource.id
        );

        if (existingItem) {
          return currentItems.map((item) =>
            item.recurso_id === resource.id ? savedProgress : item
          );
        }

        return [...currentItems, savedProgress];
      });
    } catch (saveError) {
      console.error("No se pudo marcar el recurso como visto", saveError);
      setProgressError("No se pudo marcar el recurso como visto.");
    } finally {
      setSavingResourceId(null);
    }
  };

  return {
    capacitacion,
    progressItems,
    completedResourceIds,
    loading,
    loadingProgress,
    error,
    progressError,
    savingResourceId,
    automaticTrackingResourceIds,
    markResourceAsCompleted,
    setTrackingReady,
  };
}

export default useCapacitacionProgress;
