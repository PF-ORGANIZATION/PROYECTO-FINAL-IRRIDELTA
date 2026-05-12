import { supabase } from "../../../supabaseClient";
import { RESOURCE_TYPES } from "./learningContentService";

const PROGRESO_RECURSOS_TABLE = "progreso_recursos";

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

function isModuleCompleted(module, completedResourceIds) {
  const resources = getRequiredModuleResources(module);
  return resources.every((resource) =>
    isResourceCompleted(resource, completedResourceIds, module.id)
  );
}

export async function fetchUserLearningProgress(capacitacionId) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from(PROGRESO_RECURSOS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("capacitacion_id", capacitacionId)
    .eq("completado", true);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function markResourceAsCompleted({
  capacitacionId,
  moduloId,
  recursoId,
}) {
  if (!capacitacionId || !moduloId || !recursoId) {
    throw new Error("Datos incompletos para guardar el progreso del recurso.");
  }

  const userId = await getCurrentUserId();
  const now = new Date().toISOString();

  const { data: existingProgress, error: existingProgressError } = await supabase
    .from(PROGRESO_RECURSOS_TABLE)
    .select("id")
    .eq("user_id", userId)
    .eq("capacitacion_id", capacitacionId)
    .eq("modulo_id", moduloId)
    .eq("recurso_id", recursoId)
    .maybeSingle();

  if (existingProgressError) {
    throw existingProgressError;
  }

  if (existingProgress?.id) {
    const { data, error } = await supabase
      .from(PROGRESO_RECURSOS_TABLE)
      .update({
        completado: true,
        completado_en: now,
        updated_at: now,
      })
      .eq("id", existingProgress.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from(PROGRESO_RECURSOS_TABLE)
    .insert([
      {
        user_id: userId,
        capacitacion_id: capacitacionId,
        modulo_id: moduloId,
        recurso_id: recursoId,
        completado: true,
        completado_en: now,
        created_at: now,
        updated_at: now,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function getCompletedResourceIds(progressItems) {
  return new Set(
    (progressItems ?? [])
      .filter((progressItem) => progressItem.completado && progressItem.recurso_id)
      .map((progressItem) =>
        getResourceProgressKey(progressItem.modulo_id, progressItem.recurso_id)
      )
  );
}

export function getResourceProgressKey(moduloId, recursoId) {
  if (!moduloId || !recursoId) {
    return null;
  }

  return `${moduloId}:${recursoId}`;
}

export function isResourceCompleted(resource, completedResourceIds, moduloId) {
  const progressKey = getResourceProgressKey(moduloId ?? resource?.modulo_id, resource?.id);

  return Boolean(progressKey) && completedResourceIds.has(progressKey);
}

export function isModuleUnlocked(
  moduleIndex,
  modules,
  completedResourceIds
) {
  if (moduleIndex === 0) {
    return true;
  }

  const previousModules = (modules ?? []).slice(0, moduleIndex);

  return previousModules.every((module) =>
    isModuleCompleted(module, completedResourceIds)
  );
}

export function isResourceUnlocked(
  moduleIndex,
  resourceIndex,
  modules,
  completedResourceIds
) {
  if (!isModuleUnlocked(moduleIndex, modules, completedResourceIds)) {
    return false;
  }

  const module = modules?.[moduleIndex];
  const previousResources = getModuleResources(module).slice(0, resourceIndex);

  return previousResources.every((resource) =>
    isResourceCompleted(resource, completedResourceIds, module?.id)
  );
}

export function isCapacitacionCompleted(
  modules,
  completedResourceIds
) {
  const moduleList = modules ?? [];

  if (moduleList.length === 0) {
    return false;
  }

  return moduleList.every((module) =>
    getRequiredModuleResources(module).every((resource) =>
      isResourceCompleted(resource, completedResourceIds, module.id)
    )
  );
}
