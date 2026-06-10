export const LEARNING_PROGRESS_STATUS = {
  PENDING: "pendiente",
  IN_PROGRESS: "en-progreso",
  PENDING_CERTIFICATION: "pendiente-certificar",
  CERTIFICATION_REVIEW: "certificacion-en-revision",
  CERTIFIED: "certificado",
  COMPLETED: "completado",
};

export const LEARNING_PROGRESS_LABELS = {
  [LEARNING_PROGRESS_STATUS.PENDING]: "Pendiente",
  [LEARNING_PROGRESS_STATUS.IN_PROGRESS]: "En progreso",
  [LEARNING_PROGRESS_STATUS.PENDING_CERTIFICATION]: "Pendiente de certificar",
  [LEARNING_PROGRESS_STATUS.CERTIFICATION_REVIEW]:
    "Certificacion pendiente de aprobacion",
  [LEARNING_PROGRESS_STATUS.CERTIFIED]: "Certificado",
  [LEARNING_PROGRESS_STATUS.COMPLETED]: "Completado",
};

export const LEARNING_PROGRESS_ACTION_LABELS = {
  [LEARNING_PROGRESS_STATUS.PENDING]: "Comenzar",
  [LEARNING_PROGRESS_STATUS.IN_PROGRESS]: "Continuar",
  [LEARNING_PROGRESS_STATUS.PENDING_CERTIFICATION]: "Rendir examen final",
  [LEARNING_PROGRESS_STATUS.CERTIFICATION_REVIEW]: "Revisar capacitacion",
  [LEARNING_PROGRESS_STATUS.CERTIFIED]: "Ver certificado",
  [LEARNING_PROGRESS_STATUS.COMPLETED]: "Revisar",
};

export const LEARNING_PROGRESS_STATUS_ORDER = {
  [LEARNING_PROGRESS_STATUS.IN_PROGRESS]: 0,
  [LEARNING_PROGRESS_STATUS.PENDING_CERTIFICATION]: 1,
  [LEARNING_PROGRESS_STATUS.CERTIFICATION_REVIEW]: 2,
  [LEARNING_PROGRESS_STATUS.CERTIFIED]: 3,
  [LEARNING_PROGRESS_STATUS.PENDING]: 4,
  [LEARNING_PROGRESS_STATUS.COMPLETED]: 5,
};

export function getLearningProgressStatus({
  completedModules = 0,
  totalModules = 0,
  startedModules = 0,
} = {}) {
  if (totalModules === 0 || (completedModules === 0 && startedModules === 0)) {
    return LEARNING_PROGRESS_STATUS.PENDING;
  }

  if (completedModules >= totalModules) {
    return LEARNING_PROGRESS_STATUS.COMPLETED;
  }

  return LEARNING_PROGRESS_STATUS.IN_PROGRESS;
}
