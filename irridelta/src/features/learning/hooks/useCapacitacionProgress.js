import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const { onlyPublished = true, userId = null } = options;
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
  const progressRequestIdRef = useRef(0);
  const examAttemptsRequestIdRef = useRef(0);

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

  const refreshProgress = useCallback(async () => {
    const requestId = progressRequestIdRef.current + 1;
    progressRequestIdRef.current = requestId;

    if (!capacitacion?.id) {
      setProgressItems([]);
      setLoadingProgress(false);
      return [];
    }

    setLoadingProgress(true);
    setProgressError("");

    try {
      const data = await fetchUserLearningProgress(capacitacion.id);

      if (progressRequestIdRef.current === requestId) {
        setProgressItems(data);
      }

      return data;
    } catch (loadError) {
      console.error("No se pudo cargar el progreso", loadError);

      if (progressRequestIdRef.current === requestId) {
        setProgressError("No se pudo cargar tu progreso.");
      }

      return [];
    } finally {
      if (progressRequestIdRef.current === requestId) {
        setLoadingProgress(false);
      }
    }
  }, [capacitacion?.id]);

  const refreshExamAttempts = useCallback(async () => {
    const requestId = examAttemptsRequestIdRef.current + 1;
    examAttemptsRequestIdRef.current = requestId;

    if (!capacitacion?.id) {
      setExamAttempts([]);
      setLoadingExamAttempts(false);
      return [];
    }

    setLoadingExamAttempts(true);
    setExamAttemptsError("");

    try {
      const data = await fetchExamAttempts({
        tipoExamen: EXAM_TYPES.MODULO,
        capacitacionId: capacitacion.id,
      });

      if (examAttemptsRequestIdRef.current === requestId) {
        setExamAttempts(data);
      }

      return data;
    } catch (loadError) {
      console.error("No se pudieron cargar los examenes de modulo", loadError);

      if (examAttemptsRequestIdRef.current === requestId) {
        setExamAttemptsError("No se pudo cargar el avance de evaluaciones.");
      }

      return [];
    } finally {
      if (examAttemptsRequestIdRef.current === requestId) {
        setLoadingExamAttempts(false);
      }
    }
  }, [capacitacion?.id]);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress, userId]);

  useEffect(() => {
    refreshExamAttempts();
  }, [refreshExamAttempts, userId]);

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
    if (!capacitacion?.id) {
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
        capacitacionId: capacitacion.id,
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
    refreshExamAttempts,
    refreshProgress,
    setTrackingReady,
  };
}

export default useCapacitacionProgress;
