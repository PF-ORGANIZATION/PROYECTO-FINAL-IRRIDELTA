import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  XCircle,
} from "lucide-react";
import { QUESTION_TYPES } from "../../certifications/utils/assessments";

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function ModuleExam({
  module,
  isUnlocked = false,
  isCompleted = false,
  onComplete,
  disabled = false,
  variant = "accordion",
  courseTitle = "",
  onExit = null,
}) {
  const isStandalone = variant === "standalone";
  const [isExpanded, setIsExpanded] = useState(isStandalone);
  const [answers, setAnswers] = useState({});
  const [examStarted, setExamStarted] = useState(false);
  const [result, setResult] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [timerStarted, setTimerStarted] = useState(false);

  if (!module?.preguntas || module.preguntas.length === 0) {
    return isStandalone ? (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-md">
        Este modulo no tiene examen configurado.
      </div>
    ) : null;
  }

  const assessment = module;
  const passingScore = Number(assessment.porcentaje_aprobacion ?? 70);
  const durationMinutes = Number(assessment.duracion_maxima_minutos ?? 30);
  const questionCount = Math.min(
    Number(assessment.cantidad_preguntas_a_mostrar ?? assessment.preguntas.length),
    assessment.preguntas.length
  );
  const minimumCorrectAnswers = Math.ceil((questionCount * passingScore) / 100);
  const showIntro = !examStarted && !result && isUnlocked && (isStandalone || isExpanded);
  const canShowHeaderToggle =
    !isStandalone && !examStarted && !result && isUnlocked && !isCompleted;
  const wrapperClass = isStandalone
    ? "rounded-2xl border border-gray-200 bg-white shadow-md"
    : "mt-6 rounded-xl border border-gray-200 bg-white shadow-sm";
  const actionPrimaryClass =
    "rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700";

  useEffect(() => {
    if (!timerStarted || secondsRemaining === null) {
      return undefined;
    }

    if (secondsRemaining <= 0) {
      finishExam({ isTimeExpired: true });
      setTimerStarted(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSecondsRemaining((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsRemaining, timerStarted]);

  function formatTime(seconds) {
    if (seconds === null) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function startExam() {
    const selectedQuestions = shuffleArray(assessment.preguntas)
      .slice(0, questionCount)
      .map((question) => ({
        ...question,
        opciones_shuffled:
          question.tipo === QUESTION_TYPES.TRUE_FALSE
            ? question.opciones
            : shuffleArray(question.opciones ?? []),
      }));

    setExamQuestions(selectedQuestions);
    setAnswers({});
    setResult(null);
    setSecondsRemaining(durationMinutes * 60);
    setExamStarted(true);
    setTimerStarted(true);
  }

  function finishExam({ isTimeExpired = false } = {}) {
    if (examQuestions.length === 0) return;

    const correctAnswers = examQuestions.reduce((total, question) => {
      const userAnswer = answers[question.id];
      const correctIndex = question.opciones_shuffled.findIndex(
        (option) => option === question.opciones[question.respuesta_correcta]
      );

      return total + (Number(userAnswer) === correctIndex ? 1 : 0);
    }, 0);

    const percentage = Math.round((correctAnswers / examQuestions.length) * 100);
    const passed = correctAnswers >= minimumCorrectAnswers;

    setTimerStarted(false);
    setResult({
      correctAnswers,
      answeredQuestions: Object.keys(answers).length,
      totalQuestions: examQuestions.length,
      percentage,
      passed,
      passingScore,
      minimumCorrectAnswers,
      isTimeExpired,
    });
    setExamStarted(false);

    if (passed && onComplete) {
      onComplete({ percentage, passed });
    }
  }

  function handleAnswerChange(questionId, optionIndex) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  }

  function resetExam() {
    setExamStarted(false);
    setResult(null);
    setAnswers({});
    setSecondsRemaining(null);
    setTimerStarted(false);
    setExamQuestions([]);
  }

  const isTimeWarning = secondsRemaining !== null && secondsRemaining < 300;
  const isTimeDanger = secondsRemaining !== null && secondsRemaining < 60;

  return (
    <div className={wrapperClass}>
      {isStandalone ? (
        <div className="border-b border-gray-200 px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                Evaluacion del modulo
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                {module.titulo}
              </h1>
              {courseTitle && (
                <p className="mt-2 text-sm font-medium text-gray-500">
                  {courseTitle}
                </p>
              )}
            </div>

            {onExit && !examStarted && (
              <button
                type="button"
                onClick={onExit}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Volver al modulo
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !examStarted && !result && setIsExpanded(!isExpanded)}
          disabled={disabled || examStarted || result !== null}
          className="flex w-full items-center justify-between px-6 py-4 hover:bg-gray-50 disabled:cursor-not-allowed"
          style={disabled || examStarted || result ? { opacity: 0.7 } : {}}
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">Examen del modulo</span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                <CheckCircle size={14} />
                Aprobado
              </span>
            )}
            {!isUnlocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                <AlertCircle size={14} />
                Bloqueado
              </span>
            )}
          </div>
          {canShowHeaderToggle && (
            <span className="text-sm text-gray-600">
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          )}
        </button>
      )}

      {showIntro && (
        <div className={isStandalone ? "px-6 py-6" : "border-t border-gray-200 px-6 py-4"}>
          <div className="mb-4 space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-semibold">{questionCount} preguntas</span> de{" "}
              {assessment.preguntas.length}
            </p>
            <p>
              <span className="font-semibold">Porcentaje de aprobacion:</span>{" "}
              {passingScore}%
            </p>
            <p>
              <span className="font-semibold">Duracion maxima:</span>{" "}
              {durationMinutes} minutos
            </p>
          </div>

          {isStandalone && (
            <div className="mb-5 rounded-xl bg-gray-50 px-4 py-4 text-sm leading-6 text-gray-600">
              Responde en una sola sesion. Si sales de esta pantalla antes de
              terminar, el intento no quedara guardado.
            </div>
          )}

          <div className={`flex ${isStandalone ? "flex-col gap-3 sm:flex-row" : ""}`}>
            <button
              type="button"
              onClick={startExam}
              className={`${isStandalone ? "flex-1" : "w-full"} ${actionPrimaryClass}`}
            >
              Iniciar examen
            </button>

            {isStandalone && onExit && (
              <button
                type="button"
                onClick={onExit}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Volver al modulo
              </button>
            )}
          </div>
        </div>
      )}

      {examStarted && (
        <div className={isStandalone ? "px-6 py-6" : "border-t border-gray-200 px-6 py-4"}>
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 ${
              isTimeDanger
                ? "bg-red-100 text-red-700"
                : isTimeWarning
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            <Clock size={18} />
            <span className="font-semibold">
              Tiempo restante: {formatTime(secondsRemaining)}
            </span>
          </div>

          <div className="mb-6 space-y-6">
            {examQuestions.map((question, questionIndex) => (
              <div key={question.id} className="rounded-lg border border-gray-200 p-4">
                <p className="mb-3 font-semibold text-gray-900">
                  {questionIndex + 1}. {question.enunciado}
                </p>
                <div className="space-y-2">
                  {(question.opciones_shuffled ?? []).map((option, optionIndex) => (
                    <label
                      key={optionIndex}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={optionIndex}
                        checked={answers[question.id] === optionIndex}
                        onChange={() => handleAnswerChange(question.id, optionIndex)}
                        className="h-4 w-4"
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => finishExam()}
              className={`flex-1 ${actionPrimaryClass}`}
            >
              Finalizar examen
            </button>
            {isStandalone && onExit ? (
              <button
                type="button"
                onClick={onExit}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Salir
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setExamStarted(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Pausar
              </button>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className={isStandalone ? "px-6 py-6" : "border-t border-gray-200 px-6 py-4"}>
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-center ${
              result.passed ? "bg-green-100" : "bg-red-100"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {result.passed ? (
                <>
                  <CheckCircle size={24} className="text-green-700" />
                  <span className="text-lg font-bold text-green-700">
                    Aprobado - {result.percentage}%
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={24} className="text-red-700" />
                  <span className="text-lg font-bold text-red-700">
                    No aprobado - {result.percentage}%
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-gray-600">Respuestas correctas</p>
              <p className="text-xl font-bold text-gray-900">
                {result.correctAnswers}/{result.totalQuestions}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-gray-600">Porcentaje requerido</p>
              <p className="text-xl font-bold text-gray-900">
                {result.passingScore}%
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-gray-600">Tu resultado</p>
              <p className="text-xl font-bold text-gray-900">
                {result.percentage}%
              </p>
            </div>
          </div>

          {result.isTimeExpired && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              El tiempo se acabo antes de que terminaras.
            </div>
          )}

          <div className={`flex ${isStandalone ? "flex-col gap-3 sm:flex-row" : ""}`}>
            <button
              type="button"
              onClick={resetExam}
              className={`${isStandalone ? "flex-1" : "w-full"} rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50`}
            >
              Intentar de nuevo
            </button>

            {isStandalone && onExit && (
              <button
                type="button"
                onClick={onExit}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700"
              >
                Volver al modulo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModuleExam;
