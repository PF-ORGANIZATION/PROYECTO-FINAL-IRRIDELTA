export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple_choice",
  TRUE_FALSE: "true_false",
};

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MAX_QUESTIONS = 100;
export const MAX_DURATION_MINUTES = 600;
export const DEFAULT_PASSING_SCORE = 70;
export const DEFAULT_DURATION_MINUTES = 30;

export function buildQuestion(type = QUESTION_TYPES.MULTIPLE_CHOICE) {
  const questionId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (type === QUESTION_TYPES.TRUE_FALSE) {
    return {
      id: questionId,
      tipo: QUESTION_TYPES.TRUE_FALSE,
      enunciado: "",
      opciones: ["Verdadero", "Falso"],
      respuesta_correcta: 0,
    };
  }

  return {
    id: questionId,
    tipo: QUESTION_TYPES.MULTIPLE_CHOICE,
    enunciado: "",
    opciones: ["", "", "", ""],
    respuesta_correcta: 0,
  };
}

export function buildAssessment({
  includeQuestionCount = false,
  questionCountKey = "cantidad_preguntas_a_mostrar",
} = {}) {
  const assessment = {
    preguntas: [buildQuestion()],
    porcentaje_aprobacion: DEFAULT_PASSING_SCORE,
    duracion_maxima_minutos: DEFAULT_DURATION_MINUTES,
  };

  if (includeQuestionCount) {
    assessment[questionCountKey] = 1;
  }

  return assessment;
}

export function normalizeQuestionForForm(question, index) {
  const type =
    question?.tipo === QUESTION_TYPES.TRUE_FALSE
      ? QUESTION_TYPES.TRUE_FALSE
      : QUESTION_TYPES.MULTIPLE_CHOICE;

  return {
    id: question?.id ?? `pregunta-${index + 1}`,
    tipo: type,
    enunciado: question?.enunciado ?? "",
    opciones:
      type === QUESTION_TYPES.TRUE_FALSE
        ? ["Verdadero", "Falso"]
        : Array.isArray(question?.opciones) && question.opciones.length >= MIN_OPTIONS
          ? question.opciones
          : ["", "", "", ""],
    respuesta_correcta: Number(question?.respuesta_correcta ?? 0),
  };
}

export function normalizeAssessmentForForm(
  assessment,
  {
    includeQuestionCount = false,
    questionCountKey = "cantidad_preguntas_a_mostrar",
  } = {}
) {
  const questions =
    Array.isArray(assessment?.preguntas) && assessment.preguntas.length > 0
      ? assessment.preguntas.map(normalizeQuestionForForm)
      : [buildQuestion()];

  const normalized = {
    preguntas: questions,
    porcentaje_aprobacion:
      Number(assessment?.porcentaje_aprobacion) > 0
        ? Number(assessment.porcentaje_aprobacion)
        : DEFAULT_PASSING_SCORE,
    duracion_maxima_minutos:
      Number(assessment?.duracion_maxima_minutos) > 0
        ? Number(assessment.duracion_maxima_minutos)
        : DEFAULT_DURATION_MINUTES,
  };

  if (includeQuestionCount) {
    normalized[questionCountKey] =
      Number(assessment?.[questionCountKey]) > 0
        ? Number(assessment[questionCountKey])
        : questions.length;
  }

  return normalized;
}

export function sanitizeQuestionForSave(question, index) {
  const type =
    question.tipo === QUESTION_TYPES.TRUE_FALSE
      ? QUESTION_TYPES.TRUE_FALSE
      : QUESTION_TYPES.MULTIPLE_CHOICE;

  return {
    id: question.id ?? `pregunta-${index + 1}`,
    tipo: type,
    enunciado: question.enunciado.trim(),
    opciones:
      type === QUESTION_TYPES.TRUE_FALSE
        ? ["Verdadero", "Falso"]
        : (question.opciones ?? []).map((option) => option.trim()),
    respuesta_correcta: Number(question.respuesta_correcta ?? 0),
  };
}

export function validateAssessment(
  assessment,
  {
    name = "La evaluacion",
    includeQuestionCount = false,
    questionCountKey = "cantidad_preguntas_a_mostrar",
    questionCountLabel = "La cantidad de preguntas a mostrar",
  } = {}
) {
  const questions = Array.isArray(assessment?.preguntas) ? assessment.preguntas : [];

  if (questions.length === 0) {
    return `${name} debe tener al menos una pregunta.`;
  }

  if (questions.length > MAX_QUESTIONS) {
    return `${name} no puede superar ${MAX_QUESTIONS} preguntas.`;
  }

  if (includeQuestionCount) {
    const questionCount = Number(assessment?.[questionCountKey]);

    if (!Number.isFinite(questionCount) || questionCount < 1 || questionCount > questions.length) {
      return `${questionCountLabel} debe estar entre 1 y la cantidad total cargada.`;
    }
  }

  const passingScore = Number(assessment?.porcentaje_aprobacion);

  if (!Number.isFinite(passingScore) || passingScore < 1 || passingScore > 100) {
    return `El porcentaje de aprobacion de ${name.toLowerCase()} debe estar entre 1 y 100.`;
  }

  const durationMinutes = Number(assessment?.duracion_maxima_minutos);

  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > MAX_DURATION_MINUTES
  ) {
    return `La duracion maxima de ${name.toLowerCase()} debe estar entre 1 y ${MAX_DURATION_MINUTES} minutos.`;
  }

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];

    if (!question.enunciado?.trim()) {
      return `${name}: la pregunta ${index + 1} no tiene enunciado.`;
    }

    if (question.tipo === QUESTION_TYPES.MULTIPLE_CHOICE) {
      if (!Array.isArray(question.opciones) || question.opciones.length < MIN_OPTIONS) {
        return `${name}: la pregunta ${index + 1} debe tener al menos ${MIN_OPTIONS} opciones.`;
      }

      const hasEmptyOption = question.opciones.some((option) => !option.trim());

      if (hasEmptyOption) {
        return `${name}: la pregunta ${index + 1} tiene opciones vacias.`;
      }
    }
  }

  return "";
}

export function isAssessmentComplete(
  assessment,
  {
    includeQuestionCount = false,
    questionCountKey = "cantidad_preguntas_a_mostrar",
  } = {}
) {
  return (
    validateAssessment(assessment, {
      includeQuestionCount,
      questionCountKey,
    }) === ""
  );
}
