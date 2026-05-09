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
import {
  abandonExamAttempt,
  completeExamAttempt,
  getCurrentExamUserId,
  getAttemptSummary,
  startExamAttempt,
} from "../services/examAttemptsService";
import styles from "./ModuleExam.module.css";

const RETRY_COOLDOWN_SECONDS = 5 * 60;

function getCooldownStorageKey(attemptParams, userId) {
  if (!attemptParams || !userId) {
    return null;
  }

  return [
    "irridelta",
    "exam-cooldown",
    userId,
    attemptParams.tipoExamen,
    attemptParams.capacitacionId,
    attemptParams.moduloId ?? "final",
  ].join(":");
}

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
  onResultExit = null,
  attemptParams = null,
}) {
  const isStandalone = variant === "standalone";
  const [isExpanded, setIsExpanded] = useState(isStandalone);
  const [answers, setAnswers] = useState({});
  const [examStarted, setExamStarted] = useState(false);
  const [result, setResult] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [attemptSummary, setAttemptSummary] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [attemptError, setAttemptError] = useState("");
  const [loadingAttempts, setLoadingAttempts] = useState(Boolean(attemptParams));
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [attemptUserId, setAttemptUserId] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showCooldownModal, setShowCooldownModal] = useState(false);

  const assessment = module ?? {};
  const questions = assessment.preguntas ?? [];
  const hasQuestions = questions.length > 0;
  const passingScore = Number(assessment.porcentaje_aprobacion ?? 70);
  const durationMinutes = Number(assessment.duracion_maxima_minutos ?? 30);
  const questionCount = Math.min(
    Number(assessment.cantidad_preguntas_a_mostrar ?? questions.length),
    questions.length
  );
  const minimumCorrectAnswers = Math.ceil((questionCount * passingScore) / 100);
  const showIntro = !examStarted && !result && isUnlocked && (isStandalone || isExpanded);
  const canShowHeaderToggle =
    !isStandalone && !examStarted && !result && isUnlocked && !isCompleted;
  const wrapperClass = isStandalone
    ? "rounded-2xl border border-gray-200 bg-white shadow-md"
    : "mt-6 rounded-xl border border-gray-200 bg-white shadow-sm";
  const remainingAttempts = attemptSummary?.remainingAttempts ?? 3;
  const maxAttempts = attemptSummary?.maxAttempts ?? 3;
  const cooldownUnlocked = Boolean(cooldownUntil && cooldownSeconds <= 0);
  const cooldownActive = Boolean(cooldownUntil && cooldownSeconds > 0);
  const attemptsSince = cooldownUnlocked
    ? new Date(cooldownUntil).toISOString()
    : null;
  const canStartAttempt = !attemptSummary || attemptSummary.canStart;
  const attemptsExhausted =
    Boolean(attemptSummary) &&
    !attemptSummary.canStart &&
    !attemptSummary.hasApprovedAttempt &&
    !cooldownActive;

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

  useEffect(() => {
    let ignore = false;

    const loadAttemptUser = async () => {
      if (!attemptParams) {
        setAttemptUserId(null);
        return;
      }

      try {
        const userId = await getCurrentExamUserId();

        if (!ignore) {
          setAttemptUserId(userId);
        }
      } catch (error) {
        if (!ignore) {
          console.error("No se pudo identificar el usuario del examen", error);
          setAttemptError("No se pudo identificar tu usuario.");
        }
      }
    };

    loadAttemptUser();

    return () => {
      ignore = true;
    };
  }, [attemptParams]);

  useEffect(() => {
    let ignore = false;

    const loadAttemptSummary = async () => {
      if (!attemptParams) {
        setAttemptSummary(null);
        setLoadingAttempts(false);
        return;
      }

      setLoadingAttempts(true);
      setAttemptError("");

      try {
        const summary = await getAttemptSummary({
          ...attemptParams,
          attemptsSince,
        });

        if (!ignore) {
          setAttemptSummary(summary);
        }
      } catch (error) {
        if (!ignore) {
          console.error("No se pudieron cargar los intentos del examen", error);
          setAttemptError("No se pudieron cargar tus intentos.");
        }
      } finally {
        if (!ignore) {
          setLoadingAttempts(false);
        }
      }
    };

    loadAttemptSummary();

    return () => {
      ignore = true;
    };
  }, [attemptParams, attemptsSince]);

  useEffect(() => {
    const storageKey = getCooldownStorageKey(attemptParams, attemptUserId);

    if (!storageKey) {
      setCooldownUntil(null);
      setCooldownSeconds(0);
      return;
    }

    const storedValue = window.localStorage.getItem(storageKey);
    const storedUntil = storedValue ? Number(storedValue) : null;

    if (storedUntil && Number.isFinite(storedUntil)) {
      setCooldownUntil(storedUntil);
      setCooldownSeconds(Math.max(Math.ceil((storedUntil - Date.now()) / 1000), 0));
      return;
    }

    setCooldownUntil(null);
    setCooldownSeconds(0);
  }, [attemptParams, attemptUserId]);

  useEffect(() => {
    if (!cooldownUntil) {
      return undefined;
    }

    const updateCooldown = () => {
      const secondsLeft = Math.max(Math.ceil((cooldownUntil - Date.now()) / 1000), 0);
      setCooldownSeconds(secondsLeft);
    };

    updateCooldown();
    const intervalId = window.setInterval(updateCooldown, 1000);

    return () => window.clearInterval(intervalId);
  }, [cooldownUntil]);

  function formatTime(seconds) {
    if (seconds === null) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  if (!hasQuestions) {
    return isStandalone ? (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-md">
        Este modulo no tiene examen configurado.
      </div>
    ) : null;
  }

  async function refreshAttemptSummary() {
    if (!attemptParams) {
      return;
    }

    const summary = await getAttemptSummary({
      ...attemptParams,
      attemptsSince,
    });
    setAttemptSummary(summary);
  }

  async function startExam() {
    setSavingAttempt(true);
    setAttemptError("");

    try {
      const attempt = attemptParams
        ? await startExamAttempt({
            ...attemptParams,
            attemptsSince,
          })
        : null;

      setActiveAttempt(attempt);
    } catch (error) {
      console.error("No se pudo iniciar el intento", error);
      setAttemptError(error?.message || "No se pudo iniciar el intento.");
      setSavingAttempt(false);
      setShowStartModal(false);
      return;
    }

    const selectedQuestions = shuffleArray(questions)
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
    setShowStartModal(false);
    setSavingAttempt(false);
  }

  async function finishExam({ isTimeExpired = false } = {}) {
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
    setSavingAttempt(true);

    try {
      if (activeAttempt?.id) {
        await completeExamAttempt(activeAttempt.id, {
          porcentaje: percentage,
          aprobado: passed,
        });
        await refreshAttemptSummary();
      }
    } catch (error) {
      console.error("No se pudo completar el intento", error);
      setAttemptError("No se pudo guardar el resultado del intento.");
    } finally {
      setSavingAttempt(false);
    }

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
    setActiveAttempt(null);

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
    setActiveAttempt(null);
  }

  function formatCooldown(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  function requestAttemptUnlock() {
    const storageKey = getCooldownStorageKey(attemptParams, attemptUserId);
    const nextCooldownUntil = Date.now() + RETRY_COOLDOWN_SECONDS * 1000;

    if (storageKey) {
      window.localStorage.setItem(storageKey, String(nextCooldownUntil));
    }

    setCooldownUntil(nextCooldownUntil);
    setCooldownSeconds(RETRY_COOLDOWN_SECONDS);
    setShowCooldownModal(true);
  }

  function handleExit() {
    if (examStarted) {
      setShowExitModal(true);
      return;
    }

    onExit?.();
  }

  async function confirmExit() {
    setTimerStarted(false);
    setExamStarted(false);
    setShowExitModal(false);
    setSavingAttempt(true);

    try {
      if (activeAttempt?.id) {
        await abandonExamAttempt(activeAttempt.id);
        await refreshAttemptSummary();
      }
    } catch (error) {
      console.error("No se pudo abandonar el intento", error);
      setAttemptError("No se pudo registrar el intento abandonado.");
    } finally {
      setSavingAttempt(false);
      setActiveAttempt(null);
    }

    onExit?.();
  }

  const isTimeWarning = secondsRemaining !== null && secondsRemaining < 300;
  const isTimeDanger = secondsRemaining !== null && secondsRemaining < 60;

  return (
    <div className={wrapperClass}>
      {isStandalone ? (
        <div className="border-b border-gray-200 px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className={styles.examHeaderText}>
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                Evaluacion
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

            {examStarted && (
              <div
                className={`${styles.timerPill} ${
                  isTimeDanger
                    ? styles.timerDanger
                    : isTimeWarning
                    ? styles.timerWarning
                    : styles.timerNormal
                }`}
              >
                <Clock size={18} />
                {formatTime(secondsRemaining)}
              </div>
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
          {attemptError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {attemptError}
            </div>
          )}
          <div className={styles.examInfoGrid}>
            <div className={styles.examInfoCard}>
              <span>Preguntas</span>
              <strong>{questionCount}</strong>
            </div>
            <div className={styles.examInfoCard}>
              <span>Aprobacion</span>
              <strong>{passingScore}%</strong>
            </div>
            <div className={styles.examInfoCard}>
              <span>Duracion</span>
              <strong>{durationMinutes} min</strong>
            </div>
          </div>

          <div className={styles.introActions}>
            {attemptsExhausted ? (
              <button
                type="button"
                onClick={requestAttemptUnlock}
                className={styles.secondaryAction}
              >
                Solicitar desbloqueo de intentos
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowStartModal(true)}
                disabled={
                  loadingAttempts ||
                  savingAttempt ||
                  !canStartAttempt ||
                  cooldownActive
                }
                className={styles.primaryAction}
              >
                {cooldownActive
                  ? `Podras volver a intentar en ${formatCooldown(cooldownSeconds)}`
                  : "Iniciar examen"}
              </button>
            )}
          </div>
          {attemptsExhausted && (
            <p className={styles.attemptsExhausted}>
              Ya usaste los {maxAttempts} intentos disponibles.
            </p>
          )}
          {cooldownActive && (
            <p className={styles.attemptsExhausted}>
              Intentos agotados. Podras volver a intentar en{" "}
              {formatCooldown(cooldownSeconds)}.
            </p>
          )}
        </div>
      )}

      {examStarted && (
        <div className={isStandalone ? "px-6 py-6" : "border-t border-gray-200 px-6 py-4"}>
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

          <div className={styles.examActions}>
            <button
              type="button"
              onClick={() => finishExam()}
              disabled={savingAttempt}
              className={styles.finishAction}
            >
              {savingAttempt ? "Guardando..." : "Finalizar examen"}
            </button>
            {isStandalone && onExit ? (
              <button
                type="button"
                onClick={handleExit}
                className={styles.exitAction}
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

      {showStartModal && (
        <div className={styles.modalOverlay}>
          <section className={styles.examDisclaimerModal}>
            <p className={styles.disclaimerEyebrow}>Condiciones del examen</p>
            <h2 className={styles.disclaimerTitle}>{module.titulo}</h2>
            <p className={styles.disclaimerText}>
              Antes de iniciar, revisa las condiciones del examen del modulo.
            </p>

            <div className={styles.disclaimerGrid}>
              <div className={styles.disclaimerItem}>
                <span>Cantidad de preguntas</span>
                <strong>{questionCount}</strong>
              </div>
              <div className={styles.disclaimerItem}>
                <span>Minimo correcto</span>
                <strong>{minimumCorrectAnswers} respuestas</strong>
              </div>
              <div className={styles.disclaimerItem}>
                <span>Porcentaje para aprobar</span>
                <strong>{passingScore}%</strong>
              </div>
              <div className={styles.disclaimerItem}>
                <span>Tiempo maximo</span>
                <strong>{durationMinutes} min</strong>
              </div>
            </div>

            <div className={styles.disclaimerNotice}>
              <p>
                El tiempo comienza cuando presiones Comenzar examen. No se puede
                abandonar y retomar luego. Si salis antes de finalizar, el
                intento se considera utilizado.
              </p>
              <p>Intentos disponibles: {remainingAttempts} de {maxAttempts}.</p>
            </div>

            <div className={styles.disclaimerActions}>
              <button
                type="button"
                className={styles.disclaimerSecondary}
                onClick={() => setShowStartModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.disclaimerPrimary}
                disabled={savingAttempt || !canStartAttempt}
                onClick={startExam}
              >
                {savingAttempt ? "Iniciando..." : "Comenzar examen"}
              </button>
            </div>
          </section>
        </div>
      )}

      {showCooldownModal && (
        <div className={styles.modalOverlay}>
          <section className={styles.confirmModal}>
            <h2>Tus intentos estan agotados.</h2>
            <p>
              En 5 minutos se restableceran para que puedas revisar el
              contenido del modulo antes de volver a intentar.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => {
                  setShowCooldownModal(false);
                  onExit?.();
                }}
              >
                Aceptar
              </button>
            </div>
          </section>
        </div>
      )}

      {showExitModal && (
        <div className={styles.modalOverlay}>
          <section className={styles.confirmModal}>
            <h2>Seguro que queres salir del examen?</h2>
            <p>
              Si salis antes de finalizar, se consumira un intento y no podras
              continuar luego.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => setShowExitModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerAction}
                onClick={confirmExit}
              >
                Salir del examen
              </button>
            </div>
          </section>
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
                    Aprobado
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={24} className="text-red-700" />
                  <span className="text-lg font-bold text-red-700">
                    No aprobado
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
            {(!result.passed || result.percentage < 100) &&
              canStartAttempt &&
              !cooldownActive &&
              !attemptsExhausted && (
              <button
                type="button"
                onClick={resetExam}
                className={`${isStandalone ? "flex-1" : "w-full"} rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50`}
              >
                Intentar de nuevo
              </button>
            )}

            {attemptsExhausted && result.percentage < 100 && (
              <button
                type="button"
                onClick={requestAttemptUnlock}
                className={`${isStandalone ? "flex-1" : "w-full"} rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50`}
              >
                Solicitar desbloqueo de intentos
              </button>
            )}

            {isStandalone && onExit && result.passed && (
              <button
                type="button"
                onClick={onResultExit ?? onExit}
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
