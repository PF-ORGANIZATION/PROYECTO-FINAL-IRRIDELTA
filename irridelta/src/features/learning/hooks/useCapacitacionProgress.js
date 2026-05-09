import { useEffect, useMemo, useState } from "react";
import { fetchLearningItemById, fetchLearningItemBySlug } from "../services/learningContentService";
import {
  fetchUserLearningProgress,
  getCompletedResourceIds,
  isResourceCompleted,
  markResourceAsCompleted as saveResourceProgress,
} from "../services/learningProgressService";
import {
  EXAM_ATTEMPT_STATUS,
  EXAM_TYPES,
  fetchExamAttempts,
} from "../services/examAttemptsService";

function useCapacitacionProgress(capacitacionIdOrSlug, options = {}) {
  const { onlyPublished = true } = options;
  const [capacitacion, setCapacitacion] = useState(null);
  const [progressItems, setProgressItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [error, setError] = useState("");
  const [progressError, setProgressError] = useState("");
  const [examAttempts, setExamAttempts] = useState([]);
  const [loadingExamAttempts, setLoadingExamAttempts] = useState(true);
  const [examAttemptsError, setExamAttemptsError] = useState("");
  const [savingResourceId, setSavingResourceId] = useState(null);
  const [automaticTrackingResourceIds, setAutomaticTrackingResourceIds] =
    useState(() => new Set());

  useEffect(() => {
    let ignore = false;

    const loadCapacitacion = async () => {
      setLoading(true);
      setError("");

      try {
        // Check if it's a UUID (ID) or a slug
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/i.test(capacitacionIdOrSlug);
        const data = isUuid
          ? await fetchLearningItemById(capacitacionIdOrSlug, { onlyPublished })
          : await fetchLearningItemBySlug(capacitacionIdOrSlug, { onlyPublished });

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
  }, [capacitacionIdOrSlug, onlyPublished]);

  useEffect(() => {
    let ignore = false;

    const loadProgress = async () => {
      if (!capacitacion?.id) {
        return;
      }

      setLoadingProgress(true);
      setProgressError("");

      try {
        const data = await fetchUserLearningProgress(capacitacion.id);

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
  }, [capacitacion?.id]);

  useEffect(() => {
    let ignore = false;

    const loadExamAttempts = async () => {
      if (!capacitacion?.id) {
        return;
      }

      setLoadingExamAttempts(true);
      setExamAttemptsError("");

      try {
        const data = await fetchExamAttempts({
          tipoExamen: EXAM_TYPES.MODULO,
          capacitacionId: capacitacion.id,
        });

        if (!ignore) {
          setExamAttempts(data);
        }
      } catch (loadError) {
        if (!ignore) {
          console.error("No se pudieron cargar los examenes de modulo", loadError);
          setExamAttemptsError("No se pudo cargar el avance de evaluaciones.");
        }
      } finally {
        if (!ignore) {
          setLoadingExamAttempts(false);
        }
      }
    };

    loadExamAttempts();

    return () => {
      ignore = true;
    };
  }, [capacitacion?.id]);

  useEffect(() => {
    let ignore = false;

    const loadExamAttempts = async () => {
      setLoadingExamAttempts(true);
      setExamAttemptsError("");

      try {
        const data = await fetchExamAttempts({
          tipoExamen: EXAM_TYPES.MODULO,
          capacitacionId,
        });

        if (!ignore) {
          setExamAttempts(data);
        }
      } catch (loadError) {
        if (!ignore) {
          console.error("No se pudieron cargar los examenes de modulo", loadError);
          setExamAttemptsError("No se pudo cargar el avance de evaluaciones.");
        }
      } finally {
        if (!ignore) {
          setLoadingExamAttempts(false);
        }
      }
    };

    loadExamAttempts();

    return () => {
      ignore = true;
    };
  }, [capacitacionId]);

  const completedResourceIds = useMemo(
    () => getCompletedResourceIds(progressItems),
    [progressItems]
  );

  const approvedModuleIds = useMemo(
    () =>
      new Set(
        (examAttempts ?? [])
          .filter(
            (attempt) =>
              attempt.tipo_examen === EXAM_TYPES.MODULO &&
              attempt.estado === EXAM_ATTEMPT_STATUS.COMPLETED &&
              attempt.aprobado &&
              attempt.modulo_id
          )
          .map((attempt) => attempt.modulo_id)
      ),
    [examAttempts]
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

    if (!module?.id || !resource?.id) {
      setProgressError("No se pudo identificar el recurso.");
      return;
    }

    if (
      isResourceCompleted(resource, completedResourceIds, module.id) ||
      savingResourceId === resource.id
    ) {
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
          (item) =>
            item.modulo_id === module.id && item.recurso_id === resource.id
        );

        if (existingItem) {
          return currentItems.map((item) =>
            item.modulo_id === module.id && item.recurso_id === resource.id
              ? savedProgress
              : item
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
    examAttempts,
    completedResourceIds,
    approvedModuleIds,
    loading,
    loadingProgress,
    loadingExamAttempts,
    error,
    progressError,
    examAttemptsError,
    savingResourceId,
    automaticTrackingResourceIds,
    markResourceAsCompleted,
    setTrackingReady,
  };
}

export default useCapacitacionProgress;
