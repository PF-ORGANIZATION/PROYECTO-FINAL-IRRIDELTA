import { supabase } from "../../../supabaseClient";

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

function isModuleCompleted(module, completedResourceIds) {
  const resources = getModuleResources(module);

  if (resources.length === 0) {
    return true;
  }

  return resources.every((resource) => completedResourceIds.has(resource.id));
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
  const userId = await getCurrentUserId();
  const now = new Date().toISOString();

  const { data: existingProgress, error: existingProgressError } = await supabase
    .from(PROGRESO_RECURSOS_TABLE)
    .select("id")
    .eq("user_id", userId)
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
      .filter((progressItem) => progressItem.completado)
      .map((progressItem) => progressItem.recurso_id)
  );
}

export function isModuleUnlocked(moduleIndex, modules, completedResourceIds) {
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
    completedResourceIds.has(resource.id)
  );
}

export function isCapacitacionCompleted(modules, completedResourceIds) {
  const allResources = (modules ?? []).flatMap((module) =>
    getModuleResources(module)
  );

  if (allResources.length === 0) {
    return false;
  }

  return allResources.every((resource) => completedResourceIds.has(resource.id));
}
