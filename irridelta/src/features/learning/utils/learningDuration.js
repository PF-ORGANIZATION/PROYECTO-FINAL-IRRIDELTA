import { RESOURCE_TYPES } from "../services/learningContentService";

const FALLBACK_VIDEO_MINUTES = 10;
const FALLBACK_FILE_MINUTES = 3;
const FALLBACK_MODULE_EXAM_MINUTES = 5;
const FALLBACK_FINAL_EXAM_MINUTES = 10;

function getPositiveNumber(value) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function getModuleFallbackMinutes(module) {
  const resources = module?.recursos ?? [];
  const resourceMinutes = resources.reduce((total, resource) => {
    if (resource.tipo === RESOURCE_TYPES.YOUTUBE) {
      return total + FALLBACK_VIDEO_MINUTES;
    }

    return total + FALLBACK_FILE_MINUTES;
  }, 0);

  return resourceMinutes + FALLBACK_MODULE_EXAM_MINUTES;
}

export function getModuleEstimatedMinutes(module) {
  return getPositiveNumber(module?.duracion_estimada_minutos) ?? getModuleFallbackMinutes(module);
}

export function getLearningEstimatedMinutes(item) {
  const modules = item?.modulos ?? [];
  const modulesMinutes = modules.reduce(
    (total, module) => total + getModuleEstimatedMinutes(module),
    0
  );

  return modulesMinutes + (item?.certificacion ? FALLBACK_FINAL_EXAM_MINUTES : 0);
}

export function formatEstimatedDuration(minutes) {
  const roundedMinutes = Math.max(Math.round(Number(minutes) || 0), 0);

  if (roundedMinutes <= 0) {
    return "~0 min";
  }

  if (roundedMinutes < 60) {
    return `~${roundedMinutes} min`;
  }

  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (remainingMinutes === 0) {
    return `~${hours} h`;
  }

  return `~${hours} h ${remainingMinutes} min`;
}
