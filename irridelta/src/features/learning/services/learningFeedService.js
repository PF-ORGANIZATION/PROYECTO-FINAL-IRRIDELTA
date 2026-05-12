import { supabase } from "../../../supabaseClient";
import { RESOURCE_TYPES } from "./learningContentService";
import {
  getCompletedResourceIds,
  isCapacitacionCompleted,
  isResourceCompleted,
} from "./learningProgressService";
import {
  getLearningProgressStatus,
  LEARNING_PROGRESS_STATUS,
  LEARNING_PROGRESS_STATUS_ORDER,
} from "../utils/learningProgressStatus";

export const LEARNING_FEED_VIEWS = {
  USER_CAPACITACIONES: "user-capacitaciones",
  ADMIN_CAPACITACIONES: "admin-capacitaciones",
  USER_CERTIFICACIONES: "user-certificaciones",
};

export const LEARNING_FEED_LIMIT = 8;

let shouldTryLearningFeedFunction = true;

function getCursorOffset(cursor) {
  const offset = Number(cursor ?? 0);

  return Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
}

function paginateItems(items, cursor, limit) {
  const offset = getCursorOffset(cursor);
  const nextOffset = offset + limit;

  return {
    items: items.slice(offset, nextOffset),
    total: items.length,
    nextCursor: nextOffset < items.length ? String(nextOffset) : null,
    hasMore: nextOffset < items.length,
  };
}

function getModuleResources(module) {
  return module?.recursos ?? [];
}

function getRequiredModuleResources(module) {
  const resources = getModuleResources(module);
  const primaryResources = resources.filter(
    (resource) => resource?.tipo !== RESOURCE_TYPES.ARCHIVO
  );

  return primaryResources.length > 0 ? primaryResources : resources;
}

function mapLightCapacitacion(item) {
  return {
    ...item,
    tipo: "capacitacion",
    modulos: (item.capacitacion_modulos ?? []).map((module) => ({
      id: module.id,
      recursos: module.modulo_recursos ?? [],
    })),
    certificacion: item.certificaciones?.[0]
      ? { id: item.certificaciones[0].id }
      : null,
  };
}

function getItemProgress(item, progressItems = []) {
  const modules = item?.modulos ?? [];
  const completedResourceIds = getCompletedResourceIds(progressItems);
  const startedModules = modules.filter((module) =>
    getRequiredModuleResources(module).some((resource) =>
      isResourceCompleted(resource, completedResourceIds, module.id)
    )
  ).length;
  const completedModules = modules.filter((module) => {
    const resources = getRequiredModuleResources(module);
    return resources.every((resource) =>
      isResourceCompleted(resource, completedResourceIds, module.id)
    );
  }).length;
  const totalModules = modules.length;
  const progressPercentage =
    totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  const status = getLearningProgressStatus({
    completedModules,
    totalModules,
    startedModules,
  });

  return {
    completedModules,
    totalModules,
    progressPercentage,
    status,
  };
}

function getFeedStatusOrder(item) {
  return LEARNING_PROGRESS_STATUS_ORDER[item?.progress?.status] ?? 99;
}

function sortUserCapacitaciones(items) {
  return [...items].sort((firstItem, secondItem) => {
    const statusDifference =
      getFeedStatusOrder(firstItem) - getFeedStatusOrder(secondItem);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return (
      new Date(secondItem.updated_at ?? secondItem.created_at ?? 0).getTime() -
      new Date(firstItem.updated_at ?? firstItem.created_at ?? 0).getTime()
    );
  });
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user?.id) {
    throw new Error("Usuario no autenticado.");
  }

  return user.id;
}

async function fetchProgressForItems(items) {
  const capacitacionIds = items.map((item) => item.id).filter(Boolean);

  if (capacitacionIds.length === 0) {
    return {};
  }

  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("progreso_recursos")
    .select("*")
    .eq("user_id", userId)
    .eq("completado", true)
    .in("capacitacion_id", capacitacionIds);

  if (error) {
    throw error;
  }

  return (data ?? []).reduce((acc, progressItem) => {
    acc[progressItem.capacitacion_id] = acc[progressItem.capacitacion_id] ?? [];
    acc[progressItem.capacitacion_id].push(progressItem);
    return acc;
  }, {});
}

async function fetchApprovedFinalAttemptCapacitacionIds(items) {
  const completedWithCertification = items.filter(
    (item) =>
      item.certificacion?.id &&
      item.progress?.status === LEARNING_PROGRESS_STATUS.COMPLETED
  );

  if (completedWithCertification.length === 0) {
    return new Set();
  }

  const userId = await getCurrentUserId();
  const capacitacionIds = completedWithCertification.map((item) => item.id);
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("capacitacion_id")
    .eq("user_id", userId)
    .eq("tipo_examen", "final")
    .eq("estado", "completado")
    .eq("aprobado", true)
    .in("capacitacion_id", capacitacionIds);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((attempt) => attempt.capacitacion_id));
}

async function attachCertificationProgressStatus(items) {
  const approvedFinalAttemptCapacitacionIds =
    await fetchApprovedFinalAttemptCapacitacionIds(items);

  return items.map((item) => {
    if (
      !item.certificacion?.id ||
      item.progress?.status !== LEARNING_PROGRESS_STATUS.COMPLETED ||
      approvedFinalAttemptCapacitacionIds.has(item.id)
    ) {
      return item;
    }

    return {
      ...item,
      progress: {
        ...item.progress,
        status: LEARNING_PROGRESS_STATUS.PENDING_CERTIFICATION,
      },
    };
  });
}

async function attachProgress(items) {
  const progressByItemId = await fetchProgressForItems(items);
  const itemsWithProgress = items.map((item) => ({
    ...item,
    progress: getItemProgress(item, progressByItemId[item.id] ?? []),
  }));

  return attachCertificationProgressStatus(itemsWithProgress);
}

async function prepareUserCapacitacionesItems(items) {
  const itemsWithCertificationStatus = await attachCertificationProgressStatus(items);

  return sortUserCapacitaciones(itemsWithCertificationStatus);
}

function applySearch(query, search) {
  const normalizedSearch = search.trim();

  if (!normalizedSearch) {
    return query;
  }

  const escapedSearch = normalizedSearch.replaceAll("%", "\\%").replaceAll("_", "\\_");
  return query.or(`titulo.ilike.%${escapedSearch}%,descripcion.ilike.%${escapedSearch}%`);
}

async function fetchLightCapacitaciones({
  onlyPublished = false,
  includeCount = true,
  cursor,
  limit,
  search,
  status,
}) {
  let query = supabase
    .from("capacitaciones")
    .select(
      `
      id,
      titulo,
      descripcion,
      publicada,
      created_at,
      updated_at,
      capacitacion_modulos(id, modulo_recursos(id, tipo)),
      certificaciones(id)
    `,
      includeCount ? { count: "exact" } : undefined
    )
    .order("created_at", { ascending: false });

  if (onlyPublished) {
    query = query.eq("publicada", true);
  } else if (status === "publicadas") {
    query = query.eq("publicada", true);
  } else if (status === "borradores") {
    query = query.eq("publicada", false);
  }

  query = applySearch(query, search);

  if (includeCount) {
    const offset = getCursorOffset(cursor);
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    items: (data ?? []).map(mapLightCapacitacion),
    count: count ?? data?.length ?? 0,
  };
}

async function fetchLearningFeedFallback({
  view,
  cursor,
  limit,
  search,
  status,
}) {
  if (view === LEARNING_FEED_VIEWS.USER_CAPACITACIONES) {
    if (status === "todos") {
      const { items, count } = await fetchLightCapacitaciones({
        onlyPublished: true,
        cursor,
        limit,
        search,
        status,
      });
      const itemsWithProgress = await attachProgress(items);
      const offset = getCursorOffset(cursor);
      const nextOffset = offset + limit;

      return {
        items: sortUserCapacitaciones(itemsWithProgress),
        total: count,
        nextCursor: nextOffset < count ? String(nextOffset) : null,
        hasMore: nextOffset < count,
      };
    }

    const { items } = await fetchLightCapacitaciones({
      onlyPublished: true,
      includeCount: false,
      cursor,
      limit,
      search,
      status,
    });
    let itemsWithProgress = await attachProgress(items);

    itemsWithProgress = itemsWithProgress.filter((item) => {
      const matchesStatus = status === "todos" || item.progress.status === status;

      return matchesStatus;
    });

    return paginateItems(sortUserCapacitaciones(itemsWithProgress), cursor, limit);
  }

  if (view === LEARNING_FEED_VIEWS.ADMIN_CAPACITACIONES) {
    const { items, count } = await fetchLightCapacitaciones({
      cursor,
      limit,
      search,
      status,
    });
    const offset = getCursorOffset(cursor);
    const nextOffset = offset + limit;

    return {
      items,
      total: count,
      nextCursor: nextOffset < count ? String(nextOffset) : null,
      hasMore: nextOffset < count,
    };
  }

  if (view === LEARNING_FEED_VIEWS.USER_CERTIFICACIONES) {
    const { items: capacitaciones } = await fetchLightCapacitaciones({
      onlyPublished: true,
      includeCount: false,
      cursor,
      limit,
      search,
      status,
    });
    const progressByItemId = await fetchProgressForItems(capacitaciones);
    const certifications = capacitaciones
      .filter((item) => {
        if (!item.certificacion) {
          return false;
        }

        const completedResourceIds = getCompletedResourceIds(
          progressByItemId[item.id] ?? []
        );

        return isCapacitacionCompleted(item.modulos, completedResourceIds);
      })
      .map((item) => ({
        ...item.certificacion,
        capacitacion_titulo: item.titulo,
      }));

    return paginateItems(certifications, cursor, limit);
  }

  throw new Error("Vista de feed no soportada.");
}

export async function fetchLearningFeed({
  view,
  cursor = null,
  limit = LEARNING_FEED_LIMIT,
  search = "",
  status = "todos",
} = {}) {
  if (!shouldTryLearningFeedFunction) {
    return fetchLearningFeedFallback({
      view,
      cursor,
      limit,
      search,
      status,
    });
  }

  try {
    const { data, error } = await supabase.functions.invoke("learning-feed", {
      body: {
        view,
        cursor,
        limit,
        search,
        status,
      },
    });

    if (error) {
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    const items =
      view === LEARNING_FEED_VIEWS.USER_CAPACITACIONES
        ? await prepareUserCapacitacionesItems(data?.items ?? [])
        : data?.items ?? [];

    return {
      items,
      total: Number(data?.total ?? 0),
      nextCursor: data?.nextCursor ?? null,
      hasMore: Boolean(data?.hasMore),
    };
  } catch (error) {
    shouldTryLearningFeedFunction = false;
    console.warn(
      "No se pudo invocar el feed; usando modo fallback.",
      error
    );

    return fetchLearningFeedFallback({
      view,
      cursor,
      limit,
      search,
      status,
    });
  }
}
