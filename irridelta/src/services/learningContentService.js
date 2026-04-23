import { supabase } from "../supabaseClient";

export const CAPACITACIONES_TABLE = "capacitaciones";
export const CERTIFICACIONES_TABLE = "certificaciones";

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

function mapCapacitacionItem(item) {
  return {
    ...item,
    tipo: LEARNING_TYPES.CAPACITACION,
  };
}

function mapCertificationItem(item) {
  return {
    ...item,
    tipo: LEARNING_TYPES.CERTIFICACION,
  };
}

export async function fetchLearningItems(type) {
  if (type === LEARNING_TYPES.CAPACITACION) {
    const { data, error } = await supabase
      .from(CAPACITACIONES_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapCapacitacionItem);
  }

  if (type === LEARNING_TYPES.CERTIFICACION) {
    const { data, error } = await supabase
      .from(CERTIFICACIONES_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapCertificationItem);
  }

  throw new Error("Tipo de contenido no soportado");
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

  return mapCertificationItem(data);
}

export async function saveLearningItem(item) {
  const now = new Date().toISOString();
  const payload = {
    titulo: item.titulo.trim(),
    descripcion: normalizeText(item.descripcion),
    updated_at: now,
  };

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

    return mapCapacitacionItem(data);
  }

  const { data, error } = await supabase
    .from(CAPACITACIONES_TABLE)
    .insert([{ ...payload, created_at: item.created_at ?? now }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapCapacitacionItem(data);
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
  const table =
    item.tipo === LEARNING_TYPES.CERTIFICACION
      ? CERTIFICACIONES_TABLE
      : CAPACITACIONES_TABLE;

  const { error } = await supabase.from(table).delete().eq("id", item.id);

  if (error) {
    throw error;
  }
}
