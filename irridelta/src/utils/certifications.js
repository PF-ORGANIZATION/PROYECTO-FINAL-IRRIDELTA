export function getCertificationQuestionPoolSize(certification) {
  return Array.isArray(certification?.preguntas)
    ? certification.preguntas.length
    : 0;
}

export function getCertificationExamQuestionCount(certification) {
  const questionPoolSize = getCertificationQuestionPoolSize(certification);

  if (questionPoolSize === 0) {
    return 0;
  }

  const configuredQuestionCount = Number(
    certification?.cantidad_preguntas_examen
  );

  if (!Number.isFinite(configuredQuestionCount) || configuredQuestionCount < 1) {
    return questionPoolSize;
  }

  return Math.min(configuredQuestionCount, questionPoolSize);
}

export function getCertificationPassingScore(certification) {
  const passingScore = Number(certification?.porcentaje_aprobacion);

  if (!Number.isFinite(passingScore)) {
    return 0;
  }

  return Math.min(Math.max(passingScore, 0), 100);
}

export function getMinimumCorrectAnswers(totalQuestions, passingScore) {
  if (totalQuestions <= 0) {
    return 0;
  }

  const normalizedPassingScore = Math.min(
    Math.max(Number(passingScore) || 0, 0),
    100
  );

  return Math.min(
    totalQuestions,
    Math.max(1, Math.ceil((totalQuestions * normalizedPassingScore) / 100))
  );
}

export function getCertificationDurationMinutes(certification) {
  const durationMinutes = Number(certification?.duracion_maxima_minutos);

  if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
    return 0;
  }

  return durationMinutes;
}

export function formatDurationLabel(durationMinutes) {
  if (!durationMinutes || durationMinutes < 1) {
    return "Sin limite";
  }

  return durationMinutes === 1
    ? "1 minuto"
    : `${durationMinutes} minutos`;
}

export function formatCountdown(totalSeconds) {
  const safeTotalSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeTotalSeconds / 60);
  const seconds = safeTotalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}
