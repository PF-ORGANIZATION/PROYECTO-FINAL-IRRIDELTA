import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CERTIFICATION_REQUEST_STATUS,
  createCertificationRequest,
  fetchUserCertificationRequest,
} from "../services/certificationRequestService";
import { fetchCertificationById } from "../../learning/services/learningContentService";
import { useSessionStore } from "../../../store/sessionStore";
import {
  downloadCertificatePdf,
  downloadCertificatePng,
} from "../utils/certificateDownloads";
import {
  formatCountdown,
  formatDurationLabel,
  getCertificationDurationMinutes,
  getCertificationExamQuestionCount,
  getCertificationPassingScore,
  getMinimumCorrectAnswers,
} from "../utils/certifications";
import {
  abandonExamAttempt,
  completeExamAttempt,
  EXAM_TYPES,
  getAttemptSummary,
  startExamAttempt,
} from "../../learning/services/examAttemptsService";
import styles from "./CertificationExam.module.css";

function shuffleQuestions(items) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[randomIndex]] = [
      shuffledItems[randomIndex],
      shuffledItems[index],
    ];
  }

  return shuffledItems;
}

function buildExam(certification) {
  const sourceQuestions = Array.isArray(certification?.preguntas)
    ? certification.preguntas
    : [];
  const totalQuestions = getCertificationExamQuestionCount(certification);

  return shuffleQuestions(sourceQuestions).slice(0, totalQuestions);
}

function countAnsweredQuestions(examQuestions, answers) {
  return examQuestions.reduce(
    (total, question) =>
      total + (answers[question.id] === undefined ? 0 : 1),
    0
  );
}

function CertificationExam() {
  const { certificationId } = useParams();
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const [certification, setCertification] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [certificateRequest, setCertificateRequest] = useState(null);
  const [requesterName, setRequesterName] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [uiError, setUiError] = useState("");
  const [stage, setStage] = useState("exam");
  const [examStarted, setExamStarted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [attemptSummary, setAttemptSummary] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [attemptError, setAttemptError] = useState("");
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [savingAttempt, setSavingAttempt] = useState(false);

  const examQuestionCount = examQuestions.length;
  const passingScore = getCertificationPassingScore(certification);
  const minimumCorrectAnswers = getMinimumCorrectAnswers(
    examQuestionCount,
    passingScore
  );
  const answeredQuestions = countAnsweredQuestions(examQuestions, answers);
  const durationMinutes = getCertificationDurationMinutes(certification);
  const remainingAttempts = attemptSummary?.remainingAttempts ?? 3;
  const maxAttempts = attemptSummary?.maxAttempts ?? 3;
  const canStartAttempt = !attemptSummary || attemptSummary.canStart;

  const getFinalAttemptParams = () => {
    if (!certification?.id || !certification?.capacitacion_id) {
      return null;
    }

    return {
      tipoExamen: EXAM_TYPES.FINAL,
      capacitacionId: certification.capacitacion_id,
      certificacionId: certification.id,
    };
  };

  function resetExamState(nextCertification) {
    const generatedExam = buildExam(nextCertification);

    if (generatedExam.length === 0) {
      setLoadError("Esta certificacion no tiene preguntas configuradas.");
      setExamQuestions([]);
      setAnswers({});
      setResult(null);
      setRequestMessage("");
      setRequestError("");
      setStage("exam");
      setExamStarted(false);
      setSecondsRemaining(null);
      return;
    }

    setLoadError("");
    setExamQuestions(generatedExam);
    setAnswers({});
    setResult(null);
    setRequestMessage("");
    setRequestError("");
    setUiError("");
    setStage("exam");
    setExamStarted(false);
    setSecondsRemaining(null);
    setActiveAttempt(null);
  }

  async function refreshAttemptSummary() {
    const params = getFinalAttemptParams();

    if (!params) {
      setAttemptSummary(null);
      return;
    }

    const summary = await getAttemptSummary(params);
    setAttemptSummary(summary);
  }

  async function finishExam({ isTimeExpired = false } = {}) {
    if (!certification || examQuestions.length === 0) {
      return;
    }

    const correctAnswers = examQuestions.reduce((total, question) => {
      return total +
        (Number(answers[question.id]) === Number(question.respuesta_correcta)
          ? 1
          : 0);
    }, 0);

    const percentage =
      examQuestions.length > 0
        ? Math.round((correctAnswers / examQuestions.length) * 100)
        : 0;

    setUiError("");
    setSavingAttempt(true);

    try {
      if (activeAttempt?.id) {
        await completeExamAttempt(activeAttempt.id, {
          porcentaje: percentage,
          aprobado: correctAnswers >= minimumCorrectAnswers,
        });
        await refreshAttemptSummary();
      }
    } catch (error) {
      console.error("No se pudo completar el intento final", error);
      setAttemptError("No se pudo guardar el resultado del intento.");
    } finally {
      setSavingAttempt(false);
    }

    setStage("result");
    setExamStarted(false);
    setActiveAttempt(null);
    setResult({
      correctAnswers,
      answeredQuestions: countAnsweredQuestions(examQuestions, answers),
      totalQuestions: examQuestions.length,
      percentage,
      passed: correctAnswers >= minimumCorrectAnswers,
      passingScore,
      minimumCorrectAnswers,
      isTimeExpired,
    });
  }

  useEffect(() => {
    let ignore = false;

    const loadCertification = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const data = await fetchCertificationById(certificationId);

        if (ignore) {
          return;
        }

        setCertification(data);
        resetExamState(data);
      } catch (error) {
        if (!ignore) {
          console.error("No se pudo cargar la certificacion", error);
          setLoadError("No se pudo cargar la certificacion.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadCertification();

    return () => {
      ignore = true;
    };
  }, [certificationId]);

  useEffect(() => {
    let ignore = false;

    const loadAttemptSummary = async () => {
      const params = getFinalAttemptParams();

      if (!params) {
        setAttemptSummary(null);
        setLoadingAttempts(false);
        return;
      }

      setLoadingAttempts(true);
      setAttemptError("");

      try {
        const summary = await getAttemptSummary(params);

        if (!ignore) {
          setAttemptSummary(summary);
        }
      } catch (error) {
        if (!ignore) {
          console.error("No se pudieron cargar los intentos finales", error);
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
  }, [certification?.id, certification?.capacitacion_id]);

  useEffect(() => {
    let ignore = false;

    const loadCertificateRequest = async () => {
      if (!certificationId || !user?.id) {
        setCertificateRequest(null);
        return;
      }

      try {
        const request = await fetchUserCertificationRequest(certificationId, user.id);

        if (!ignore) {
          setCertificateRequest(request);
        }
      } catch (error) {
        if (!ignore) {
          console.error("No se pudo cargar la solicitud de certificado", error);
        }
      }
    };

    loadCertificateRequest();

    return () => {
      ignore = true;
    };
  }, [certificationId, user?.id]);

  useEffect(() => {
    if (
      loading ||
      !examStarted ||
      !certification ||
      examQuestions.length === 0 ||
      stage === "result" ||
      result ||
      secondsRemaining === null ||
      secondsRemaining <= 0
    ) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSecondsRemaining((currentSeconds) =>
        currentSeconds === null ? currentSeconds : Math.max(currentSeconds - 1, 0)
      );
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    certification,
    examQuestions.length,
    examStarted,
    loading,
    result,
    secondsRemaining,
    stage,
  ]);

  useEffect(() => {
    if (
      loading ||
      !examStarted ||
      !certification ||
      examQuestions.length === 0 ||
      stage === "result" ||
      result ||
      secondsRemaining !== 0
    ) {
      return;
    }

    finishExam({ isTimeExpired: true });
  }, [
    answers,
    certification,
    examQuestions,
    examStarted,
    loading,
    result,
    secondsRemaining,
    stage,
  ]);

  const handleAnswerChange = (questionId, answerIndex) => {
    if (!examStarted || stage === "result") {
      return;
    }

    const nextAnswers = {
      ...answers,
      [questionId]: answerIndex,
    };
    const answeredBefore = answeredQuestions;
    const answeredAfter = countAnsweredQuestions(examQuestions, nextAnswers);

    setAnswers(nextAnswers);
    setUiError("");

    if (
      stage === "exam" &&
      answeredBefore < examQuestions.length &&
      answeredAfter === examQuestions.length
    ) {
      setStage("review");
    }
  };

  const handleGoBackToQuestions = () => {
    setStage("exam");
    setUiError("");
  };

  const handleRestartExam = async () => {
    if (!certification) {
      return;
    }

    if (examStarted && activeAttempt?.id) {
      setSavingAttempt(true);

      try {
        await abandonExamAttempt(activeAttempt.id);
        await refreshAttemptSummary();
      } catch (error) {
        console.error("No se pudo abandonar el intento final", error);
        setAttemptError("No se pudo registrar el intento abandonado.");
      } finally {
        setSavingAttempt(false);
      }
    }

    resetExamState(certification);
  };

  const handleStartExam = async () => {
    const nextDurationMinutes = getCertificationDurationMinutes(certification);
    const params = getFinalAttemptParams();

    setAttemptError("");
    setSavingAttempt(true);

    try {
      const attempt = params ? await startExamAttempt(params) : null;

      setActiveAttempt(attempt);
    } catch (error) {
      console.error("No se pudo iniciar el intento final", error);
      setAttemptError(error?.message || "No se pudo iniciar el intento.");
      setSavingAttempt(false);
      return;
    }

    setStage("exam");
    setUiError("");
    setResult(null);
    setSecondsRemaining(
      nextDurationMinutes > 0 ? nextDurationMinutes * 60 : null
    );
    setExamStarted(true);
    setSavingAttempt(false);
  };

  const handleGoBack = async () => {
    if (examStarted && activeAttempt?.id) {
      setSavingAttempt(true);

      try {
        await abandonExamAttempt(activeAttempt.id);
        await refreshAttemptSummary();
      } catch (error) {
        console.error("No se pudo abandonar el intento final", error);
        setAttemptError("No se pudo registrar el intento abandonado.");
      } finally {
        setSavingAttempt(false);
      }
    }

    navigate("/certificaciones");
  };

  const handleSubmitCertificateRequest = async (event) => {
    event.preventDefault();

    if (!result?.passed || !certification) {
      return;
    }

    setRequestError("");
    setRequestMessage("");
    setIsSubmittingRequest(true);

    try {
      const request = await createCertificationRequest({
        certification,
        requesterName,
        examResult: result,
        userId: user?.id,
      });

      setCertificateRequest(request);
      setRequesterName("");
      setRequestMessage(
        "Solicitud enviada. Un administrador debe aprobarla antes de que puedas descargar el certificado."
      );
    } catch (error) {
      console.error("No se pudo solicitar el certificado", error);
      setRequestError(
        error?.message || "No se pudo enviar la solicitud de certificado."
      );
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const getCertificateDownloadData = () => ({
    requesterName: certificateRequest?.requester_name || requesterName,
    certificationTitle: certification?.titulo,
    capacitacionTitle:
      certificateRequest?.capacitacion_title || certification?.capacitacion_titulo,
    approvedAt: certificateRequest?.reviewed_at,
  });

  const timerBadgeClass =
    secondsRemaining !== null && secondsRemaining <= 60
      ? styles.timerBadgeWarning
      : styles.timerBadgeNormal;

  return (
    <>
      <Helmet>
        <title>Examen de Certificacion | IRRIDELTA</title>
      </Helmet>

      <section className="min-h-[70vh] bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <button
              type="button"
              onClick={handleGoBack}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Volver a certificaciones
            </button>
          </div>

          {loading && (
            <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow">
              Cargando examen...
            </div>
          )}

          {!loading && loadError && (
            <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
              {loadError}
            </div>
          )}

          {!loading && !loadError && certification && examQuestions.length > 0 && (
            !examStarted && !result ? (
              <div className={styles.disclaimerOverlay}>
                <section className={styles.disclaimerModal}>
                  <p className={styles.disclaimerEyebrow}>
                    Condiciones del examen
                  </p>
                  <h1 className={styles.disclaimerTitle}>
                    {certification.titulo}
                  </h1>
                  {certification.descripcion && (
                    <p className={styles.disclaimerText}>
                      {certification.descripcion}
                    </p>
                  )}

                  <div className={styles.disclaimerGrid}>
                    <div className={styles.disclaimerItem}>
                      <span>Cantidad de preguntas</span>
                      <strong>{examQuestionCount}</strong>
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
                      <strong>{formatDurationLabel(durationMinutes)}</strong>
                    </div>
                  </div>

                  <div className={styles.disclaimerNotice}>
                    <p>
                      El tiempo comienza cuando presiones Aceptar y comenzar.
                    </p>
                    <p>
                      No se puede abandonar y retomar luego. Si el tiempo se
                      agota, el sistema enviara automaticamente lo que tengas
                      contestado hasta ese momento.
                    </p>
                    <p>
                      Intentos disponibles: {remainingAttempts} de {maxAttempts}.
                    </p>
                  </div>

                  {attemptError && (
                    <p className={styles.disclaimerError}>{attemptError}</p>
                  )}

                  {!canStartAttempt && (
                    <p className={styles.disclaimerError}>
                      Ya usaste los {maxAttempts} intentos disponibles.
                    </p>
                  )}

                  <div className={styles.disclaimerActions}>
                    <button
                      type="button"
                      className={styles.disclaimerPrimary}
                      disabled={loadingAttempts || savingAttempt || !canStartAttempt}
                      onClick={handleStartExam}
                    >
                      {canStartAttempt ? "Aceptar y comenzar" : "Intentos agotados"}
                    </button>
                    <button
                      type="button"
                      className={styles.disclaimerSecondary}
                      onClick={() => navigate(-1)}
                    >
                      Volver
                    </button>
                  </div>
                </section>
              </div>
            ) : (
            <div className="rounded-2xl bg-white p-6 shadow-md">
              <header className="border-b pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {certification.titulo}
                    </h1>
                    {certification.descripcion && (
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                        {certification.descripcion}
                      </p>
                    )}
                  </div>

                  <div
                    className={`${styles.timerBadge} ${timerBadgeClass}`}
                  >
                    {secondsRemaining === null
                      ? "Tiempo restante: Sin limite"
                      : `Tiempo restante: ${formatCountdown(secondsRemaining)}`}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-gray-600 md:grid-cols-4">
                  <p>Preguntas del examen: {examQuestionCount}</p>
                  <p>Aprobacion minima: {passingScore}%</p>
                  <p>Minimo correcto: {minimumCorrectAnswers}</p>
                  <p>Duracion: {formatDurationLabel(durationMinutes)}</p>
                </div>

                <div className="mt-4 inline-flex rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                  Respuestas guardadas: {answeredQuestions} / {examQuestionCount}
                </div>
              </header>

              {uiError && (
                <div className="mt-6 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                  {uiError}
                </div>
              )}

              {stage === "exam" && !result && (
                <div className="mt-8 space-y-8">
                  {examQuestions.map((question, questionIndex) => (
                    <article
                      key={question.id}
                      className="rounded-lg border border-gray-200 p-5"
                    >
                      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {questionIndex + 1}. {question.enunciado}
                        </h2>

                        <span
                          className={`${styles.questionBadge} ${
                            answers[question.id] === undefined
                              ? styles.questionBadgePending
                              : styles.questionBadgeAnswered
                          }`}
                        >
                          {answers[question.id] === undefined
                            ? "Pendiente"
                            : "Respuesta guardada"}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {question.opciones.map((option, optionIndex) => (
                          <label
                            key={`${question.id}-${optionIndex}`}
                            className={styles.questionOption}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              checked={answers[question.id] === optionIndex}
                              onChange={() =>
                                handleAnswerChange(question.id, optionIndex)
                              }
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </article>
                  ))}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setStage("review")}
                      disabled={answeredQuestions !== examQuestionCount}
                      className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      Ir a revision
                    </button>

                    <button
                      type="button"
                      onClick={handleRestartExam}
                      disabled={savingAttempt}
                      className="rounded-lg bg-gray-500 px-6 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-gray-600"
                    >
                      Reiniciar
                    </button>
                  </div>
                </div>
              )}

              {stage === "review" && !result && (
                <div className="mt-8 space-y-6">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Revision previa al envio
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Cada pregunta del examen tiene una respuesta guardada. Si
                      estas conforme, envia ahora. Si quieres revisar algo,
                      vuelve a las preguntas antes de entregar.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {examQuestions.map((question, questionIndex) => {
                      const selectedOptionIndex = answers[question.id];
                      const selectedOption =
                        selectedOptionIndex === undefined
                          ? null
                          : question.opciones[selectedOptionIndex];

                      return (
                        <article
                          key={`${question.id}-review`}
                          className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                Pregunta {questionIndex + 1}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-gray-600">
                                {question.enunciado}
                              </p>
                            </div>

                            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              Respuesta guardada
                            </span>
                          </div>

                          {selectedOption && (
                            <div className="mt-4 rounded-xl border border-green-100 bg-white px-4 py-3 text-sm text-gray-700">
                              Seleccion actual: {selectedOption}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleGoBackToQuestions}
                      className="rounded-lg bg-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-300"
                    >
                      Volver a las preguntas
                    </button>

                    <button
                      type="button"
                      onClick={() => finishExam()}
                      disabled={savingAttempt}
                      className="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-green-700"
                    >
                      {savingAttempt ? "Guardando..." : "Enviar examen"}
                    </button>
                  </div>
                </div>
              )}

              {result && (
                <div
                  className={`${styles.resultContainer} ${
                    result.passed
                      ? styles.resultContainerPassed
                      : styles.resultContainerFailed
                  }`}
                >
                  <p className="text-lg font-semibold">
                    {result.passed ? "Aprobado" : "No aprobado"}
                  </p>
                  <p className="mt-2">
                    Respuestas correctas: {result.correctAnswers} /{" "}
                    {result.totalQuestions}
                  </p>
                  <p className="mt-1">
                    Respuestas contestadas: {result.answeredQuestions} /{" "}
                    {result.totalQuestions}
                  </p>
                  <p className="mt-1">Resultado: {result.percentage}%</p>
                  <p className="mt-1">
                    Minimo requerido: {result.minimumCorrectAnswers} respuestas
                    correctas ({result.passingScore}%)
                  </p>

                  {result.isTimeExpired && (
                    <p className="mt-3 font-semibold">
                      El tiempo del examen se agoto y se envio automaticamente
                      con las respuestas guardadas.
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    {result.percentage < 100 && canStartAttempt && (
                      <button
                        type="button"
                        onClick={handleRestartExam}
                        className="rounded-lg bg-gray-800 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-gray-900"
                      >
                        Rendir nuevamente
                      </button>
                    )}

                    {result.percentage < 100 && !canStartAttempt && (
                      <span className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-600">
                        Intentos agotados
                      </span>
                    )}

                    <Link
                      to="/certificaciones"
                      className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-gray-800 shadow transition duration-200 hover:bg-gray-100"
                    >
                      Volver al listado
                    </Link>
                  </div>

                  {result.passed && (
                    <div className="mt-6 rounded-2xl border border-green-200 bg-white p-5 text-gray-800">
                      <h2 className="text-xl font-bold text-gray-900">
                        Certificado
                      </h2>

                      {!certificateRequest && (
                        <form
                          onSubmit={handleSubmitCertificateRequest}
                          className="mt-4 space-y-4"
                        >
                          <p className="text-sm text-gray-600">
                            Completa tu nombre y apellido. La solicitud queda
                            pendiente hasta que un administrador la apruebe.
                          </p>
                          <input
                            type="text"
                            placeholder="Nombre y apellido"
                            value={requesterName}
                            onChange={(event) =>
                              setRequesterName(event.target.value)
                            }
                            className="w-full rounded border p-3"
                            required
                          />
                          <button
                            type="submit"
                            disabled={isSubmittingRequest}
                            className="rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                          >
                            {isSubmittingRequest
                              ? "Enviando..."
                              : "Obtener certificado"}
                          </button>
                        </form>
                      )}

                      {certificateRequest?.status ===
                        CERTIFICATION_REQUEST_STATUS.PENDING && (
                        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                          Tu solicitud esta pendiente de aprobacion.
                        </p>
                      )}

                      {certificateRequest?.status ===
                        CERTIFICATION_REQUEST_STATUS.REJECTED && (
                        <form
                          onSubmit={handleSubmitCertificateRequest}
                          className="mt-4 space-y-4"
                        >
                          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                            <p className="font-semibold">
                              Tu solicitud fue rechazada.
                            </p>
                            {certificateRequest.rejection_reason && (
                              <p className="mt-1">
                                Motivo: {certificateRequest.rejection_reason}
                              </p>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="Nombre y apellido"
                            value={requesterName}
                            onChange={(event) =>
                              setRequesterName(event.target.value)
                            }
                            className="w-full rounded border p-3"
                            required
                          />
                          <button
                            type="submit"
                            disabled={isSubmittingRequest}
                            className="rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                          >
                            {isSubmittingRequest
                              ? "Reenviando..."
                              : "Volver a solicitar"}
                          </button>
                        </form>
                      )}

                      {certificateRequest?.status ===
                        CERTIFICATION_REQUEST_STATUS.APPROVED && (
                        <div className="mt-4">
                          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                            Tu certificado fue aprobado. Ya podes descargarlo.
                          </p>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                downloadCertificatePng(getCertificateDownloadData())
                              }
                              className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-slate-900"
                            >
                              Descargar PNG
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                downloadCertificatePdf(getCertificateDownloadData())
                              }
                              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-blue-700"
                            >
                              Descargar PDF
                            </button>
                          </div>
                        </div>
                      )}

                      {requestMessage && (
                        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                          {requestMessage}
                        </p>
                      )}

                      {requestError && (
                        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                          {requestError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            )
          )}
        </div>
      </section>
    </>
  );
}

export default CertificationExam;
