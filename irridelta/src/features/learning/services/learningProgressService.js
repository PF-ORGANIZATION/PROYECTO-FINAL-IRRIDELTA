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

function isModuleCompleted(module, completedResourceIds, approvedModuleIds = new Set()) {
  const resources = getModuleResources(module);
  const hasExam = Array.isArray(module?.preguntas) && module.preguntas.length > 0;
  const resourcesCompleted =
    resources.length > 0 &&
    resources.every((resource) =>
      isResourceCompleted(resource, completedResourceIds, module.id)
    );

  if (!resourcesCompleted) {
    return false;
  }

  return !hasExam || approvedModuleIds.has(module.id);
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
  completedResourceIds,
  approvedModuleIds = new Set()
) {
  if (moduleIndex === 0) {
    return true;
  }

  const previousModules = (modules ?? []).slice(0, moduleIndex);

  return previousModules.every((module) =>
    isModuleCompleted(module, completedResourceIds, approvedModuleIds)
  );
}

export function isResourceUnlocked(
  moduleIndex,
  resourceIndex,
  modules,
  completedResourceIds,
  approvedModuleIds = new Set()
) {
  if (!isModuleUnlocked(moduleIndex, modules, completedResourceIds, approvedModuleIds)) {
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
  completedResourceIds,
  approvedModuleIds = new Set()
) {
  const allResources = (modules ?? []).flatMap((module) =>
    getModuleResources(module)
  );

  if (allResources.length === 0) {
    return false;
  }

  const resourcesCompleted = allResources.every((resource) =>
    isResourceCompleted(resource, completedResourceIds, resource.modulo_id)
  );
  const moduleExamsApproved = (modules ?? []).every((module) => {
    const hasExam = Array.isArray(module?.preguntas) && module.preguntas.length > 0;

    return !hasExam || approvedModuleIds.has(module.id);
  });

  return resourcesCompleted && moduleExamsApproved;
}
