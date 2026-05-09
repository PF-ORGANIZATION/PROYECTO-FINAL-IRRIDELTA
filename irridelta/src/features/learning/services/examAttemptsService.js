import { supabase } from "../../../supabaseClient";

const EXAM_ATTEMPTS_TABLE = "exam_attempts";
const DEFAULT_MAX_ATTEMPTS = 3;

export const EXAM_TYPES = {
  MODULO: "modulo",
  FINAL: "final",
};

export const EXAM_ATTEMPT_STATUS = {
  STARTED: "iniciado",
  COMPLETED: "completado",
  ABANDONED: "abandonado",
};

export async function getCurrentExamUserId() {
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

function applyExamFilters(query, params) {
  let nextQuery = query
    .eq("tipo_examen", params.tipoExamen)
    .eq("capacitacion_id", params.capacitacionId);

  if (params.moduloId) {
    nextQuery = nextQuery.eq("modulo_id", params.moduloId);
  }

  if (params.certificacionId) {
    nextQuery = nextQuery.eq("certificacion_id", params.certificacionId);
  }

  return nextQuery;
}

export async function fetchExamAttempts(params) {
  const userId = await getCurrentExamUserId();
  const query = applyExamFilters(
    supabase
      .from(EXAM_ATTEMPTS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("intento_numero", { ascending: true }),
    params
  );

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getAttemptSummary(params) {
  const allAttempts = await fetchExamAttempts(params);
  const attempts = params.attemptsSince
    ? allAttempts.filter(
        (attempt) =>
          new Date(attempt.fecha_inicio ?? attempt.created_at ?? 0).getTime() >=
          new Date(params.attemptsSince).getTime()
      )
    : allAttempts;
  const maxAttempts = allAttempts[0]?.max_intentos ?? DEFAULT_MAX_ATTEMPTS;
  const usedAttempts = attempts.length;
  const remainingAttempts = Math.max(maxAttempts - usedAttempts, 0);
  const bestCompletedAttempt = attempts
    .filter((attempt) => attempt.estado === EXAM_ATTEMPT_STATUS.COMPLETED)
    .sort((a, b) => Number(b.porcentaje ?? 0) - Number(a.porcentaje ?? 0))[0];
  const approvedAttempt = attempts.find(
    (attempt) =>
      attempt.estado === EXAM_ATTEMPT_STATUS.COMPLETED && attempt.aprobado
  );

  return {
    attempts,
    allAttempts,
    maxAttempts,
    usedAttempts,
    remainingAttempts,
    canStart: remainingAttempts > 0,
    hasPerfectScore: Number(bestCompletedAttempt?.porcentaje ?? 0) >= 100,
    hasApprovedAttempt: Boolean(approvedAttempt),
  };
}

export async function startExamAttempt(params) {
  const userId = await getCurrentExamUserId();
  const summary = await getAttemptSummary(params);
  const allAttempts = summary.allAttempts ?? summary.attempts;

  if (!summary.canStart) {
    throw new Error("No quedan intentos disponibles.");
  }

  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    capacitacion_id: params.capacitacionId,
    modulo_id: params.moduloId ?? null,
    certificacion_id: params.certificacionId ?? null,
    tipo_examen: params.tipoExamen,
    intento_numero: allAttempts.length + 1,
    max_intentos: summary.maxAttempts,
    estado: EXAM_ATTEMPT_STATUS.STARTED,
    porcentaje: null,
    aprobado: null,
    fecha_inicio: now,
    fecha_fin: null,
  };

  const { data, error } = await supabase
    .from(EXAM_ATTEMPTS_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function completeExamAttempt(attemptId, { porcentaje, aprobado }) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(EXAM_ATTEMPTS_TABLE)
    .update({
      estado: EXAM_ATTEMPT_STATUS.COMPLETED,
      porcentaje,
      aprobado,
      fecha_fin: now,
    })
    .eq("id", attemptId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function abandonExamAttempt(attemptId) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(EXAM_ATTEMPTS_TABLE)
    .update({
      estado: EXAM_ATTEMPT_STATUS.ABANDONED,
      fecha_fin: now,
    })
    .eq("id", attemptId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
