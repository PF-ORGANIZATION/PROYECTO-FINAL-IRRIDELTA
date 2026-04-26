import { supabase } from "../supabaseClient";
import {
  QUESTION_TYPES,
  sanitizeQuestionForSave,
  validateAssessment,
} from "../utils/assessments";

export const CAPACITACIONES_TABLE = "capacitaciones";
export const CAPACITACION_MODULOS_TABLE = "capacitacion_modulos";
export const MODULO_RECURSOS_TABLE = "modulo_recursos";
export const CERTIFICACIONES_TABLE = "certificaciones";
export const LEARNING_BUCKET = "formacion-archivos";

export const RESOURCE_TYPES = {
  ARCHIVO: "archivo",
  YOUTUBE: "youtube",
};

export const ALLOWED_RESOURCE_EXTENSIONS = [
  "pdf",
  "docx",
  "pptx",
  "xlsx",
  "jpg",
  "png",
  "mp4",
];

export const LEARNING_TYPES = {
  CAPACITACION: "capacitacion",
  CERTIFICACION: "certificacion",
};

export const CERTIFICATION_QUESTION_TYPES = QUESTION_TYPES;

function normalizeText(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function sanitizeFileName(fileName) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function getFileExtension(fileName) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension;
}

function validateFileExtension(fileName) {
  const extension = getFileExtension(fileName);

  if (!ALLOWED_RESOURCE_EXTENSIONS.includes(extension)) {
    throw new Error(
      `El archivo "${fileName}" no tiene un formato permitido. Formatos permitidos: ${ALLOWED_RESOURCE_EXTENSIONS.join(", ")}.`
    );
  }

  return extension;
}

function validateLearningModules(modules) {
  if (modules.length === 0) {
    throw new Error("La capacitacion debe tener al menos un modulo.");
  }

  const moduleWithoutTitle = modules.find((module) => !module.titulo?.trim());

  if (moduleWithoutTitle) {
    throw new Error("Todos los modulos deben tener titulo.");
  }

  for (const module of modules) {
    const assessmentError = validateAssessment(module, {
      name: `El test del modulo "${module.titulo?.trim() || "sin titulo"}"`,
      includeQuestionCount: true,
      questionCountKey: "cantidad_preguntas_a_mostrar",
      questionCountLabel: "La cantidad de preguntas a mostrar del test del modulo",
    });

    if (assessmentError) {
      throw new Error(assessmentError);
    }

    for (const file of module.selectedFiles ?? []) {
      validateFileExtension(file.name);
    }
  }
}

function normalizeCertificationQuestion(question, index) {
  const type =
    question.tipo === CERTIFICATION_QUESTION_TYPES.TRUE_FALSE
      ? CERTIFICATION_QUESTION_TYPES.TRUE_FALSE
      : CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE;

  return sanitizeQuestionForSave({ ...question, tipo: type }, index);
}

function mapCapacitacionItem(item) {
  return {
    ...item,
    modulos: item.modulos ?? [],
    certificacion: item.certificacion ?? null,
    tipo: LEARNING_TYPES.CAPACITACION,
  };
}

function mapCertificationItem(item) {
  return {
    ...item,
    tipo: LEARNING_TYPES.CERTIFICACION,
  };
}

export async function fetchLearningItems(type, options = {}) {
  if (type === LEARNING_TYPES.CAPACITACION) {
    let query = supabase
      .from(CAPACITACIONES_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (options.onlyPublished) {
      query = query.eq("publicada", true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return hydrateCapacitaciones(data ?? []);
  }

  if (type === LEARNING_TYPES.CERTIFICACION) {
    let query = supabase
      .from(CERTIFICACIONES_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (options.onlyPublished) {
      const { data: publishedCapacitaciones, error: publishedCapacitacionesError } =
        await supabase
          .from(CAPACITACIONES_TABLE)
          .select("id")
          .eq("publicada", true);

      if (publishedCapacitacionesError) {
        throw publishedCapacitacionesError;
      }

      const publishedIds = (publishedCapacitaciones ?? []).map((item) => item.id);

      if (publishedIds.length === 0) {
        return [];
      }

      query = query.in("capacitacion_id", publishedIds);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapCertificationItem);
  }

  throw new Error("Tipo de contenido no soportado");
}

async function hydrateCapacitaciones(capacitaciones) {
  const capacitacionIds = capacitaciones.map((item) => item.id);

  if (capacitacionIds.length === 0) {
    return [];
  }

  const { data: modulos, error: modulesError } = await supabase
    .from(CAPACITACION_MODULOS_TABLE)
    .select("*")
    .in("capacitacion_id", capacitacionIds)
    .order("orden", { ascending: true });

  if (modulesError) {
    throw modulesError;
  }

  const moduleIds = (modulos ?? []).map((module) => module.id);
  let recursos = [];

  if (moduleIds.length > 0) {
    const { data: fetchedResources, error: resourcesError } = await supabase
      .from(MODULO_RECURSOS_TABLE)
      .select("*")
      .in("modulo_id", moduleIds)
      .order("orden", { ascending: true });

    if (resourcesError) {
      throw resourcesError;
    }

    recursos = fetchedResources ?? [];
  }

  const resourcesByModuleId = recursos.reduce((acc, resource) => {
    acc[resource.modulo_id] = acc[resource.modulo_id] ?? [];
    acc[resource.modulo_id].push(resource);
    return acc;
  }, {});

  const modulesByCapacitacionId = (modulos ?? []).reduce((acc, module) => {
    acc[module.capacitacion_id] = acc[module.capacitacion_id] ?? [];
    acc[module.capacitacion_id].push({
      ...module,
      recursos: resourcesByModuleId[module.id] ?? [],
    });
    return acc;
  }, {});

  const { data: certifications, error: certificationsError } = await supabase
    .from(CERTIFICACIONES_TABLE)
    .select("*")
    .in("capacitacion_id", capacitacionIds);

  if (certificationsError) {
    throw certificationsError;
  }

  const certificationsByCapacitacionId = (certifications ?? []).reduce(
    (acc, certification) => {
      acc[certification.capacitacion_id] = mapCertificationItem({
        ...certification,
        requiere_aprobacion_modulos: true,
      });
      return acc;
    },
    {}
  );

  return capacitaciones.map((item) =>
    mapCapacitacionItem({
      ...item,
      modulos: modulesByCapacitacionId[item.id] ?? [],
      certificacion: certificationsByCapacitacionId[item.id] ?? null,
    })
  );
}

export async function fetchCertificationById(id) {
  const { data, error } = await supabase
    .from(CERTIFICACIONES_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return mapCertificationItem({
    ...data,
    requiere_aprobacion_modulos: true,
  });
}

async function uploadLearningFile(file, capacitacionId, moduleIndex) {
  const extension = validateFileExtension(file.name);
  const safeName = sanitizeFileName(file.name);
  const uniqueId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const filePath = `${capacitacionId}/modulo-${moduleIndex + 1}/${uniqueId}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(LEARNING_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(LEARNING_BUCKET).getPublicUrl(filePath);

  return {
    archivo_url: data.publicUrl,
    archivo_path: filePath,
    archivo_nombre: file.name,
    extension,
  };
}

async function removeLearningFiles(resources) {
  const filePaths = resources
    .filter((resource) => resource.archivo_path)
    .map((resource) => resource.archivo_path);

  if (filePaths.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from(LEARNING_BUCKET).remove(filePaths);

  if (error) {
    console.warn("No se pudieron eliminar archivos anteriores", error);
  }
}

function normalizeYoutubeResources(module) {
  const linksFromText = (module.youtubeLinksText ?? "")
    .split(/\r?\n/)
    .map((link) => link.trim())
    .filter(Boolean);

  return linksFromText.map((link) => ({
    tipo: RESOURCE_TYPES.YOUTUBE,
    titulo: link,
    youtube_url: link,
  }));
}

async function fetchResourcesForCapacitacion(capacitacionId) {
  const { data: modules, error: modulesError } = await supabase
    .from(CAPACITACION_MODULOS_TABLE)
    .select("id")
    .eq("capacitacion_id", capacitacionId);

  if (modulesError) {
    throw modulesError;
  }

  const moduleIds = (modules ?? []).map((module) => module.id);

  if (moduleIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(MODULO_RECURSOS_TABLE)
    .select("*")
    .in("modulo_id", moduleIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function deleteCapacitacionChildren(capacitacionId) {
  const { error: certificationDeleteError } = await supabase
    .from(CERTIFICACIONES_TABLE)
    .delete()
    .eq("capacitacion_id", capacitacionId);

  if (certificationDeleteError) {
    throw certificationDeleteError;
  }

  const { data: modules, error: modulesError } = await supabase
    .from(CAPACITACION_MODULOS_TABLE)
    .select("id")
    .eq("capacitacion_id", capacitacionId);

  if (modulesError) {
    throw modulesError;
  }

  const moduleIds = (modules ?? []).map((module) => module.id);

  if (moduleIds.length > 0) {
    const { error: resourcesError } = await supabase
      .from(MODULO_RECURSOS_TABLE)
      .delete()
      .in("modulo_id", moduleIds);

    if (resourcesError) {
      throw resourcesError;
    }
  }

  const { error: modulesDeleteError } = await supabase
    .from(CAPACITACION_MODULOS_TABLE)
    .delete()
    .eq("capacitacion_id", capacitacionId);

  if (modulesDeleteError) {
    throw modulesDeleteError;
  }
}

async function replaceCapacitacionModules(capacitacionId, modules) {
  const oldResources = await fetchResourcesForCapacitacion(capacitacionId);
  const keptFilePaths = new Set(
    modules.flatMap((module) =>
      (module.recursos ?? [])
        .filter((resource) => resource.tipo === RESOURCE_TYPES.ARCHIVO)
        .map((resource) => resource.archivo_path)
        .filter(Boolean)
    )
  );
  const removedResources = oldResources.filter(
    (resource) => !keptFilePaths.has(resource.archivo_path)
  );

  if (oldResources.length > 0) {
    const { error: resourcesDeleteError } = await supabase
      .from(MODULO_RECURSOS_TABLE)
      .delete()
      .in(
        "modulo_id",
        [...new Set(oldResources.map((resource) => resource.modulo_id))]
      );

    if (resourcesDeleteError) {
      throw resourcesDeleteError;
    }
  }

  const { error: modulesDeleteError } = await supabase
    .from(CAPACITACION_MODULOS_TABLE)
    .delete()
    .eq("capacitacion_id", capacitacionId);

  if (modulesDeleteError) {
    throw modulesDeleteError;
  }

  await removeLearningFiles(removedResources);

  for (const [moduleIndex, module] of modules.entries()) {
    const { data: savedModule, error: moduleError } = await supabase
      .from(CAPACITACION_MODULOS_TABLE)
      .insert([
        {
          capacitacion_id: capacitacionId,
          titulo: module.titulo.trim(),
          descripcion: normalizeText(module.descripcion),
          orden: moduleIndex + 1,
          preguntas: module.preguntas.map(normalizeCertificationQuestion),
          porcentaje_aprobacion: Number(module.porcentaje_aprobacion),
          duracion_maxima_minutos: Number(module.duracion_maxima_minutos),
          cantidad_preguntas_a_mostrar: Number(module.cantidad_preguntas_a_mostrar),
        },
      ])
      .select()
      .single();

    if (moduleError) {
      throw moduleError;
    }

    const youtubeResources = normalizeYoutubeResources(module);
    const existingFileResources = (module.recursos ?? []).filter(
      (resource) => resource.tipo === RESOURCE_TYPES.ARCHIVO && resource.archivo_url
    );

    const uploadedFileResources = [];

    for (const file of module.selectedFiles ?? []) {
      const uploadedFile = await uploadLearningFile(file, capacitacionId, moduleIndex);

      uploadedFileResources.push({
        tipo: RESOURCE_TYPES.ARCHIVO,
        titulo: file.name,
        ...uploadedFile,
      });
    }

    const resources = [
      ...youtubeResources,
      ...existingFileResources,
      ...uploadedFileResources,
    ];

    if (resources.length === 0) {
      continue;
    }

    const resourcesPayload = resources.map((resource, resourceIndex) => ({
      modulo_id: savedModule.id,
      tipo: resource.tipo,
      titulo: normalizeText(resource.titulo) ?? resource.archivo_nombre ?? resource.youtube_url,
      orden: resourceIndex + 1,
      youtube_url: normalizeText(resource.youtube_url),
      archivo_url: resource.archivo_url ?? null,
      archivo_path: resource.archivo_path ?? null,
      archivo_nombre: resource.archivo_nombre ?? null,
      extension: resource.extension ?? null,
    }));

    const { error: resourcesError } = await supabase
      .from(MODULO_RECURSOS_TABLE)
      .insert(resourcesPayload);

    if (resourcesError) {
      throw resourcesError;
    }
  }
}

async function upsertFinalCertification(capacitacionId, certification) {
  const assessmentError = validateAssessment(certification, {
    name: "El test final",
  });

  if (assessmentError) {
    throw new Error(assessmentError);
  }

  const payload = {
    capacitacion_id: capacitacionId,
    titulo: certification.titulo.trim(),
    descripcion: normalizeText(certification.descripcion),
    preguntas: certification.preguntas.map(normalizeCertificationQuestion),
    porcentaje_aprobacion: Number(certification.porcentaje_aprobacion),
    duracion_maxima_minutos: Number(certification.duracion_maxima_minutos),
  };

  const { data: existingCertification, error: existingCertificationError } =
    await supabase
      .from(CERTIFICACIONES_TABLE)
      .select("id")
      .eq("capacitacion_id", capacitacionId)
      .maybeSingle();

  if (existingCertificationError) {
    throw existingCertificationError;
  }

  if (existingCertification?.id) {
    const { error } = await supabase
      .from(CERTIFICACIONES_TABLE)
      .update(payload)
      .eq("id", existingCertification.id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from(CERTIFICACIONES_TABLE).insert([payload]);

  if (error) {
    throw error;
  }
}

export async function saveLearningItem(item) {
  const now = new Date().toISOString();
  const payload = {
    titulo: item.titulo.trim(),
    descripcion: normalizeText(item.descripcion),
    publicada: Boolean(item.publicada),
    updated_at: now,
  };
  const modules = item.modulos ?? [];
  validateLearningModules(modules);

  if (!item.certificacion) {
    throw new Error("La capacitacion debe tener un test final configurado.");
  }

  if (item.id) {
    const { data, error } = await supabase
      .from(CAPACITACIONES_TABLE)
      .update(payload)
      .eq("id", item.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await replaceCapacitacionModules(data.id, modules);
    await upsertFinalCertification(data.id, item.certificacion);
    return (await hydrateCapacitaciones([data]))[0];
  }

  const { data, error } = await supabase
    .from(CAPACITACIONES_TABLE)
    .insert([{ ...payload, created_at: item.created_at ?? now }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  await replaceCapacitacionModules(data.id, modules);
  await upsertFinalCertification(data.id, item.certificacion);
  return (await hydrateCapacitaciones([data]))[0];
}

export async function saveCertification(certification) {
  const payload = {
    capacitacion_id: certification.capacitacion_id ?? null,
    titulo: certification.titulo.trim(),
    descripcion: normalizeText(certification.descripcion),
    preguntas: certification.preguntas.map(normalizeCertificationQuestion),
    porcentaje_aprobacion: Number(certification.porcentaje_aprobacion),
    duracion_maxima_minutos: Number(certification.duracion_maxima_minutos),
    created_at: certification.created_at ?? undefined,
  };

  if (certification.id) {
    const { data, error } = await supabase
      .from(CERTIFICACIONES_TABLE)
      .update(payload)
      .eq("id", certification.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapCertificationItem(data);
  }

  const { data, error } = await supabase
    .from(CERTIFICACIONES_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapCertificationItem(data);
}

export async function deleteLearningItem(item) {
  if (item.tipo === LEARNING_TYPES.CAPACITACION) {
    const resources = await fetchResourcesForCapacitacion(item.id);
    await deleteCapacitacionChildren(item.id);
    await removeLearningFiles(resources);
  }

  const table =
    item.tipo === LEARNING_TYPES.CERTIFICACION
      ? CERTIFICACIONES_TABLE
      : CAPACITACIONES_TABLE;

  const { error } = await supabase.from(table).delete().eq("id", item.id);

  if (error) {
    throw error;
  }
}
