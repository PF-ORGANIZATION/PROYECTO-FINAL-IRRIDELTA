import { RESOURCE_TYPES } from "../services/learningContentService";

export function getResourceHref(resource) {
  if (resource?.tipo === RESOURCE_TYPES.ARCHIVO) {
    return resource.archivo_url;
  }

  if (resource?.tipo === RESOURCE_TYPES.YOUTUBE) {
    return resource.youtube_url;
  }

  return null;
}

export function getResourceLabel(resource) {
  if (resource?.tipo === RESOURCE_TYPES.ARCHIVO) {
    return resource.archivo_nombre || resource.titulo || "Abrir archivo";
  }

  return resource?.titulo || "Ver YouTube";
}

export function areModuleResourcesCompleted(module, completedResourceIds) {
  const resources = module?.recursos ?? [];

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

export function getModuleRoute(capacitacionId, moduleIndex) {
  return `/capacitaciones/${capacitacionId}/modulos/${moduleIndex + 1}`;
}

