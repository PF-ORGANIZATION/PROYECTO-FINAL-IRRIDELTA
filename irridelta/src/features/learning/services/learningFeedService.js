import { supabase } from "../../../supabaseClient";
import {
  LEARNING_TYPES,
  fetchLearningItems,
} from "./learningContentService";
import {
  fetchUserLearningProgress,
  getCompletedResourceIds,
  isCapacitacionCompleted,
  isResourceCompleted,
} from "./learningProgressService";
import { getLearningProgressStatus } from "../utils/learningProgressStatus";

export const LEARNING_FEED_VIEWS = {
  USER_CAPACITACIONES: "user-capacitaciones",
  ADMIN_CAPACITACIONES: "admin-capacitaciones",
  USER_CERTIFICACIONES: "user-certificaciones",
};

export const LEARNING_FEED_LIMIT = 8;

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

function getItemProgress(item, progressItems = []) {
  const modules = item?.modulos ?? [];
  const completedResourceIds = getCompletedResourceIds(progressItems);
  const startedModules = modules.filter((module) =>
    getModuleResources(module).some((resource) =>
      isResourceCompleted(resource, completedResourceIds, module.id)
    )
  ).length;
  const completedModules = modules.filter((module) => {
    const resources = getModuleResources(module);
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

function matchesSearch(item, search) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [item?.titulo, item?.descripcion]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

async function attachProgress(items) {
  const progressEntries = await Promise.all(
    items.map(async (item) => {
      const progress = await fetchUserLearningProgress(item.id);

      return [item.id, progress];
    })
  );
  const progressByItemId = Object.fromEntries(progressEntries);

  return items.map((item) => ({
    ...item,
    progress: getItemProgress(item, progressByItemId[item.id] ?? []),
  }));
}

async function fetchLearningFeedFallback({
  view,
  cursor,
  limit,
  search,
  status,
}) {
  if (view === LEARNING_FEED_VIEWS.USER_CAPACITACIONES) {
    const items = await fetchLearningItems(LEARNING_TYPES.CAPACITACION, {
      onlyPublished: true,
    });
    let itemsWithProgress = await attachProgress(items);

    itemsWithProgress = itemsWithProgress.filter((item) => {
      const matchesStatus = status === "todos" || item.progress.status === status;

      return matchesStatus && matchesSearch(item, search);
    });

    return paginateItems(itemsWithProgress, cursor, limit);
  }

  if (view === LEARNING_FEED_VIEWS.ADMIN_CAPACITACIONES) {
    let items = await fetchLearningItems(LEARNING_TYPES.CAPACITACION);

    items = items.filter((item) => {
      const matchesStatus =
        status === "todos" ||
        (status === "publicadas" && item.publicada) ||
        (status === "borradores" && !item.publicada);

      return matchesStatus && matchesSearch(item, search);
    });

    return paginateItems(items, cursor, limit);
  }

  if (view === LEARNING_FEED_VIEWS.USER_CERTIFICACIONES) {
    const capacitaciones = await fetchLearningItems(LEARNING_TYPES.CAPACITACION, {
      onlyPublished: true,
    });
    const progressEntries = await Promise.all(
      capacitaciones.map(async (item) => {
        const progress = await fetchUserLearningProgress(item.id);
        return [item.id, progress];
      })
    );
    const progressByItemId = Object.fromEntries(progressEntries);
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

    return {
      items: data?.items ?? [],
      total: Number(data?.total ?? 0),
      nextCursor: data?.nextCursor ?? null,
      hasMore: Boolean(data?.hasMore),
    };
  } catch (error) {
    console.warn(
      "No se pudo invocar learning-feed; usando fallback directo a Supabase.",
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
