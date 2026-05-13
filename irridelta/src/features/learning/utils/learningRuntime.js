import { RESOURCE_TYPES } from "../services/learningContentService";

const VIDEO_FILE_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);

export function getResourceHref(resource) {
  if (resource?.tipo === RESOURCE_TYPES.ARCHIVO) {
    return resource.archivo_url;
  }

  if (resource?.tipo === RESOURCE_TYPES.YOUTUBE) {
    return resource.youtube_url;
  }

  return null;
}

export function getResourceExtension(resource) {
  const rawExtension =
    resource?.extension ||
    resource?.archivo_nombre?.split(".").pop() ||
    resource?.archivo_url?.split("?")[0]?.split(".").pop();

  return typeof rawExtension === "string" ? rawExtension.toLowerCase() : "";
}

export function isVideoResource(resource) {
  if (resource?.tipo === RESOURCE_TYPES.YOUTUBE) {
    return true;
  }

  return (
    resource?.tipo === RESOURCE_TYPES.ARCHIVO &&
    VIDEO_FILE_EXTENSIONS.has(getResourceExtension(resource))
  );
}

function isUrlLike(value) {
  if (typeof value !== "string") {
    return false;
  }

  const normalizedValue = value.trim();

  return (
    /^https?:\/\//i.test(normalizedValue) ||
    /(?:youtube\.com|youtu\.be)/i.test(normalizedValue)
  );
}

function getCleanLabel(candidates) {
  for (const candidate of candidates) {
    const normalizedCandidate =
      typeof candidate === "string" ? candidate.trim() : "";

    if (normalizedCandidate && !isUrlLike(normalizedCandidate)) {
      return normalizedCandidate;
    }
  }

  return null;
}

export function getResourceLabel(resource, fallbackLabel = null) {
  if (resource?.tipo === RESOURCE_TYPES.ARCHIVO) {
    return (
      getCleanLabel([resource.archivo_nombre, resource.titulo]) ||
      fallbackLabel ||
      "Abrir archivo"
    );
  }

  return (
    getCleanLabel([resource?.titulo, resource?.nombre, resource?.descripcion]) ||
    fallbackLabel ||
    "Video"
  );
}

export function getRequiredModuleResources(module) {
  const resources = module?.recursos ?? [];
  const primaryResources = resources.filter((resource) =>
    isVideoResource(resource)
  );

  return primaryResources.length > 0 ? primaryResources : resources;
}

export function areModuleResourcesCompleted(module, completedResourceIds) {
  const resources = getRequiredModuleResources(module);

  return resources.every(
    (resource) =>
      Boolean(module?.id) &&
      Boolean(resource?.id) &&
      completedResourceIds.has(`${module.id}:${resource.id}`)
  );
}

export function isModuleCompleted(module, completedResourceIds) {
  return areModuleResourcesCompleted(module, completedResourceIds);
}

export function parseModuleIndex(moduleIndexParam) {
  const moduleIndex = Number(moduleIndexParam);

  if (!Number.isInteger(moduleIndex) || moduleIndex < 1) {
    return -1;
  }

  return moduleIndex - 1;
}

export function getModuleRoute(capacitacionIdOrSlug, moduleIndex) {
  return `/capacitaciones/${capacitacionIdOrSlug}/modulos/${moduleIndex + 1}`;
}

