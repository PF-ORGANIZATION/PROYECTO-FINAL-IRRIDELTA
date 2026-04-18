import { supabase } from "../supabaseClient";

export const LEARNING_TABLE = "formacion_contenidos";
export const LEARNING_BUCKET = "formacion-archivos";

export const LEARNING_TYPES = {
  CAPACITACION: "capacitacion",
  CERTIFICACION: "certificacion",
};

export const CERTIFICATION_QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple_choice",
  TRUE_FALSE: "true_false",
};

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

function normalizeCertificationQuestion(question, index) {
  const type =
    question.tipo === CERTIFICATION_QUESTION_TYPES.TRUE_FALSE
      ? CERTIFICATION_QUESTION_TYPES.TRUE_FALSE
      : CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE;

  const options =
    type === CERTIFICATION_QUESTION_TYPES.TRUE_FALSE
      ? ["Verdadero", "Falso"]
      : (question.opciones ?? []).map((option) => option.trim());

  return {
    id: question.id ?? `pregunta-${index + 1}`,
    tipo: type,
    enunciado: question.enunciado.trim(),
    opciones: options,
    respuesta_correcta: Number(question.respuesta_correcta ?? 0),
  };
}

export async function fetchLearningItems(type) {
  let query = supabase
    .from(LEARNING_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("tipo", type);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchCertificationById(id) {
  const { data, error } = await supabase
    .from(LEARNING_TABLE)
    .select("*")
    .eq("id", id)
    .eq("tipo", LEARNING_TYPES.CERTIFICACION)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function uploadLearningFile(file, type) {
  const safeName = sanitizeFileName(file.name);
  const filePath = `${type}/${Date.now()}-${safeName}`;

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
    filePath,
    fileUrl: data.publicUrl,
    fileName: file.name,
  };
}

async function removeLearningFile(filePath) {
  if (!filePath) {
    return;
  }

  const { error } = await supabase.storage
    .from(LEARNING_BUCKET)
    .remove([filePath]);

  if (error) {
    console.warn("No se pudo eliminar el archivo anterior", error);
  }
}

export async function saveLearningItem(item, selectedFile) {
  let uploadedFile = null;

  if (selectedFile) {
    uploadedFile = await uploadLearningFile(selectedFile, item.tipo);
  }

  const payload = {
    tipo: item.tipo,
    titulo: item.titulo.trim(),
    descripcion: normalizeText(item.descripcion),
    youtube_url: normalizeText(item.youtube_url),
    archivo_url: uploadedFile?.fileUrl ?? item.archivo_url ?? null,
    archivo_path: uploadedFile?.filePath ?? item.archivo_path ?? null,
    archivo_nombre: uploadedFile?.fileName ?? item.archivo_nombre ?? null,
    preguntas: null,
    cantidad_preguntas_examen: null,
    porcentaje_aprobacion: null,
    duracion_maxima_minutos: null,
  };

  if (item.id) {
    const { data, error } = await supabase
      .from(LEARNING_TABLE)
      .update(payload)
      .eq("id", item.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (uploadedFile && item.archivo_path && item.archivo_path !== uploadedFile.filePath) {
      await removeLearningFile(item.archivo_path);
    }

    return data;
  }

  const { data, error } = await supabase
    .from(LEARNING_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveCertification(certification) {
  const payload = {
    tipo: LEARNING_TYPES.CERTIFICACION,
    titulo: certification.titulo.trim(),
    descripcion: normalizeText(certification.descripcion),
    youtube_url: null,
    archivo_url: null,
    archivo_path: null,
    archivo_nombre: null,
    preguntas: certification.preguntas.map(normalizeCertificationQuestion),
    cantidad_preguntas_examen: Number(certification.cantidad_preguntas_examen),
    porcentaje_aprobacion: Number(certification.porcentaje_aprobacion),
    duracion_maxima_minutos: Number(certification.duracion_maxima_minutos),
  };

  if (certification.id) {
    const { data, error } = await supabase
      .from(LEARNING_TABLE)
      .update(payload)
      .eq("id", certification.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from(LEARNING_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteLearningItem(item) {
  const { error } = await supabase
    .from(LEARNING_TABLE)
    .delete()
    .eq("id", item.id);

  if (error) {
    throw error;
  }

  await removeLearningFile(item.archivo_path);
}
