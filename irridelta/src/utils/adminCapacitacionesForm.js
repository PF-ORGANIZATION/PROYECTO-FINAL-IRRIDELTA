import {
  buildAssessment,
  isAssessmentComplete,
  normalizeAssessmentForForm,
} from "./assessments";

export function createEmptyModule(index = 0) {
  return {
    clientId: `modulo-${Date.now()}-${index}`,
    id: null,
    titulo: "",
    descripcion: "",
    youtubeLinksText: "",
    selectedFiles: [],
    recursos: [],
    isCollapsed: false,
    ...buildAssessment({
      includeQuestionCount: true,
      questionCountKey: "cantidad_preguntas_a_mostrar",
    }),
  };
}

export function createEmptyFinalCertification() {
  return {
    id: null,
    titulo: "Evaluacion final",
    descripcion: "",
    ...buildAssessment(),
  };
}

export function getInitialCapacitacionForm(type) {
  return {
    id: null,
    tipo: type,
    titulo: "",
    descripcion: "",
    publicada: false,
    modulos: [createEmptyModule()],
    certificacion: createEmptyFinalCertification(),
  };
}

export function normalizeModuleForForm(module, index) {
  const recursos = module.recursos ?? [];
  const youtubeLinksText = recursos
    .filter((resource) => resource.tipo === "youtube")
    .map((resource) => resource.youtube_url)
    .filter(Boolean)
    .join("\n");

  return {
    clientId: module.id ?? `modulo-edit-${index}`,
    id: module.id,
    titulo: module.titulo ?? "",
    descripcion: module.descripcion ?? "",
    youtubeLinksText,
    selectedFiles: [],
    recursos,
    isCollapsed: true,
    ...normalizeAssessmentForForm(module, {
      includeQuestionCount: true,
      questionCountKey: "cantidad_preguntas_a_mostrar",
    }),
  };
}

export function normalizeFinalCertificationForForm(capacitacion) {
  const certification = capacitacion.certificacion ?? {};

  return {
    id: certification.id ?? null,
    titulo:
      certification.titulo ??
      `Evaluacion final - ${capacitacion.titulo ?? "Capacitacion"}`,
    descripcion: certification.descripcion ?? "",
    ...normalizeAssessmentForForm(certification),
  };
}

export function buildFormFromCapacitacion(item, type) {
  return {
    id: item.id,
    tipo: type,
    titulo: item.titulo ?? "",
    descripcion: item.descripcion ?? "",
    publicada: Boolean(item.publicada),
    modulos:
      item.modulos?.length > 0
        ? item.modulos.map(normalizeModuleForForm)
        : [createEmptyModule()],
    certificacion: normalizeFinalCertificationForForm(item),
  };
}

export function duplicateModule(module, index) {
  return {
    ...normalizeModuleForForm(module, index),
    clientId: `modulo-copy-${Date.now()}-${index}`,
    id: null,
    recursos: module.recursos ?? [],
    selectedFiles: [],
    isCollapsed: true,
  };
}

export function buildDuplicateForm(item, type) {
  return {
    id: null,
    tipo: type,
    titulo: `${item.titulo} (copia)`,
    descripcion: item.descripcion ?? "",
    publicada: false,
    modulos:
      item.modulos?.length > 0
        ? item.modulos.map(duplicateModule)
        : [createEmptyModule()],
    certificacion: {
      ...normalizeFinalCertificationForForm(item),
      id: null,
      titulo: item.certificacion?.titulo
        ? `${item.certificacion.titulo} (copia)`
        : `Evaluacion final - ${item.titulo} (copia)`,
    },
  };
}

export function getModuleResourceCounts(module) {
  const existingResources = module.recursos ?? [];
  const selectedFiles = module.selectedFiles ?? [];
  const youtubeLines = (module.youtubeLinksText ?? "")
    .split(/\r?\n/)
    .map((link) => link.trim())
    .filter(Boolean);

  const existingYoutubeCount = existingResources.filter(
    (resource) => resource.tipo === "youtube"
  ).length;
  const existingFileCount = existingResources.filter(
    (resource) => resource.tipo === "archivo"
  ).length;

  return {
    videos: existingYoutubeCount + youtubeLines.length,
    archivos: existingFileCount + selectedFiles.length,
  };
}

function normalizeQuestionForComparison(question) {
  return {
    id: question.id ?? null,
    tipo: question.tipo ?? "",
    enunciado: question.enunciado ?? "",
    opciones: Array.isArray(question.opciones) ? question.opciones : [],
    respuesta_correcta: Number(question.respuesta_correcta ?? 0),
  };
}

function normalizeSelectedFileForComparison(file) {
  return {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    type: file.type,
  };
}

function normalizeResourceForComparison(resource) {
  return {
    id: resource.id ?? null,
    tipo: resource.tipo ?? "",
    titulo: resource.titulo ?? "",
    youtube_url: resource.youtube_url ?? "",
    archivo_url: resource.archivo_url ?? "",
    archivo_path: resource.archivo_path ?? "",
    archivo_nombre: resource.archivo_nombre ?? "",
    extension: resource.extension ?? "",
    orden: Number(resource.orden ?? 0),
  };
}

export function serializeCapacitacionForm(form) {
  return JSON.stringify({
    id: form.id ?? null,
    tipo: form.tipo ?? "",
    titulo: form.titulo ?? "",
    descripcion: form.descripcion ?? "",
    publicada: Boolean(form.publicada),
    modulos: (form.modulos ?? []).map((module) => ({
      id: module.id ?? null,
      titulo: module.titulo ?? "",
      descripcion: module.descripcion ?? "",
      youtubeLinksText: module.youtubeLinksText ?? "",
      recursos: (module.recursos ?? []).map(normalizeResourceForComparison),
      selectedFiles: (module.selectedFiles ?? []).map(
        normalizeSelectedFileForComparison
      ),
      preguntas: (module.preguntas ?? []).map(normalizeQuestionForComparison),
      porcentaje_aprobacion: Number(module.porcentaje_aprobacion ?? 0),
      duracion_maxima_minutos: Number(module.duracion_maxima_minutos ?? 0),
      cantidad_preguntas_a_mostrar: Number(
        module.cantidad_preguntas_a_mostrar ?? 0
      ),
    })),
    certificacion: {
      id: form.certificacion?.id ?? null,
      titulo: form.certificacion?.titulo ?? "",
      descripcion: form.certificacion?.descripcion ?? "",
      preguntas: (form.certificacion?.preguntas ?? []).map(
        normalizeQuestionForComparison
      ),
      porcentaje_aprobacion: Number(
        form.certificacion?.porcentaje_aprobacion ?? 0
      ),
      duracion_maxima_minutos: Number(
        form.certificacion?.duracion_maxima_minutos ?? 0
      ),
    },
  });
}

export function isModuleAssessmentConfigured(module) {
  return isAssessmentComplete(module, {
    includeQuestionCount: true,
    questionCountKey: "cantidad_preguntas_a_mostrar",
  });
}

export function getModuleCompletionInfo(module) {
  const missingItems = [];

  if (!module.titulo?.trim()) {
    missingItems.push("falta titulo");
  }

  if (!isModuleAssessmentConfigured(module)) {
    missingItems.push("falta completar la prueba");
  }

  return {
    isComplete: missingItems.length === 0,
    detail:
      missingItems.length === 0
        ? "Modulo completo"
        : missingItems.join(" · "),
  };
}

export function isFinalAssessmentConfigured(certification) {
  return (
    Boolean(certification?.titulo?.trim()) &&
    isAssessmentComplete(certification)
  );
}
