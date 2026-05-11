import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  FileText,
  Lightbulb,
  Lock,
  PlayCircle,
} from "lucide-react";
import {
  isCapacitacionCompleted,
  isModuleUnlocked,
  isResourceUnlocked,
  isResourceCompleted,
} from "../services/learningProgressService";
import useCapacitacionProgress from "../hooks/useCapacitacionProgress";
import {
  areModuleResourcesCompleted,
  getResourceHref,
  getResourceLabel,
  isModuleCompleted,
} from "../utils/learningRuntime";
import ModuleExam from "../components/ModuleExam";
import YouTubePlayer from "../components/YouTubePlayer";
import {
  EXAM_ATTEMPT_STATUS,
  EXAM_TYPES,
} from "../services/examAttemptsService";
import { USER_ROLES } from "../../auth/authRoles";
import { useSessionStore } from "../../../store/sessionStore";
import styles from "./CapacitacionDetalle.module.css";

function CapacitacionDetalle() {
  const { capacitacionSlug } = useParams();
  const role = useSessionStore((state) => state.role);
  const onlyPublished = role !== USER_ROLES.ADMIN;
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeExamModuleId, setActiveExamModuleId] = useState(null);
  const [completedAssessmentModuleIds, setCompletedAssessmentModuleIds] =
    useState(() => new Set());
  const [openResourceKeys, setOpenResourceKeys] = useState(() => new Set());
  const [pendingFinalExamScroll, setPendingFinalExamScroll] = useState(false);
  const finalExamButtonRef = useRef(null);
  const {
    capacitacion,
    completedResourceIds,
    loading,
    loadingProgress,
    loadingExamAttempts,
    error,
    progressError,
    examAttempts,
    examAttemptsError,
    savingResourceId,
    markResourceAsCompleted,
    setTrackingReady,
  } = useCapacitacionProgress(capacitacionSlug, { onlyPublished });

  const modules = capacitacion?.modulos ?? [];
  const certification = capacitacion?.certificacion ?? null;
  const learningStateReady = !loadingProgress && !loadingExamAttempts;
  const totalModules = modules.length;
  const completedModulesCount = modules.filter((module) =>
    isModuleCompleted(module, completedResourceIds)
  ).length;
  const overallProgressPercentage =
    learningStateReady && totalModules > 0
      ? Math.round((completedModulesCount / totalModules) * 100)
      : 0;
  const capacitacionCompleted = isCapacitacionCompleted(modules, completedResourceIds);
  const lessons = modules.flatMap((module, moduleIndex) =>
    (module.recursos ?? []).map((resource, resourceIndex) => ({
      module,
      moduleIndex,
      resource,
      resourceIndex,
    }))
  );
  const fallbackLesson =
    lessons.find((lesson) =>
      isResourceUnlocked(
        lesson.moduleIndex,
        lesson.resourceIndex,
        modules,
        completedResourceIds
      )
    ) ??
    lessons[0] ??
    null;
  const activeLessonData =
    lessons.find(
      (lesson) =>
        lesson.moduleIndex === activeLesson?.moduleIndex &&
        lesson.resourceIndex === activeLesson?.resourceIndex
    ) ??
    fallbackLesson;
  const activeModule = activeLessonData?.module ?? null;
  const activeResource = activeLessonData?.resource ?? null;
  const activeModuleIndex = activeLessonData?.moduleIndex ?? 0;
  const activeResourceIndex = activeLessonData?.resourceIndex ?? 0;
  const activeResourceHref = activeResource ? getResourceHref(activeResource) : null;
  const activeResourceUnlocked = activeLessonData
    ? isResourceUnlocked(
        activeModuleIndex,
        activeResourceIndex,
        modules,
        completedResourceIds
      )
    : false;
  const activeResourceCompleted =
    activeResource && activeModule
      ? isResourceCompleted(activeResource, completedResourceIds, activeModule.id)
      : false;
  const activeModuleResourcesCompleted =
    learningStateReady && areModuleResourcesCompleted(activeModule, completedResourceIds);
  const activeModuleHasAssessment =
    activeModule &&
    Array.isArray(activeModule.preguntas) &&
    activeModule.preguntas.length > 0;
  const activeModuleAssessmentDone = (examAttempts ?? []).some(
    (attempt) =>
      attempt.modulo_id === activeModule?.id &&
      attempt.tipo_examen === EXAM_TYPES.MODULO &&
      attempt.estado === EXAM_ATTEMPT_STATUS.COMPLETED
  ) || completedAssessmentModuleIds.has(activeModule?.id);
  const showActiveModuleExam =
    activeModuleHasAssessment &&
    activeModuleResourcesCompleted &&
    activeExamModuleId === activeModule?.id;
  const activeModuleAttemptParams = useMemo(() => {
    if (!capacitacion?.id || !activeModule?.id) {
      return null;
    }

    return {
      tipoExamen: EXAM_TYPES.MODULO,
      capacitacionId: capacitacion.id,
      moduloId: activeModule.id,
      ignoreAttemptLimit: true,
    };
  }, [activeModule?.id, capacitacion?.id]);
  const activeResourceKey =
    activeModule?.id && activeResource?.id
      ? `${activeModule.id}:${activeResource.id}`
      : null;
  const activeResourceOpened =
    Boolean(activeResourceKey) && openResourceKeys.has(activeResourceKey);
  const showActiveYoutube =
    activeResource?.tipo === "youtube" &&
    activeResourceUnlocked;
  const currentLessonFlatIndex = lessons.findIndex(
    (lesson) =>
      lesson.moduleIndex === activeModuleIndex &&
      lesson.resourceIndex === activeResourceIndex
  );
  const previousLesson =
    currentLessonFlatIndex > 0 ? lessons[currentLessonFlatIndex - 1] : null;
  const nextLesson =
    currentLessonFlatIndex >= 0 && currentLessonFlatIndex < lessons.length - 1
      ? lessons[currentLessonFlatIndex + 1]
      : null;
  const lastLesson = lessons[lessons.length - 1] ?? null;
  const pageTitle = capacitacion
    ? `${capacitacion.titulo} | Capacitaciones | IRRIDELTA`
    : "Detalle de capacitacion | IRRIDELTA";

  const getLearningHighlights = () => {
    const lessonTitle = activeResource ? getResourceLabel(activeResource) : "";
    const moduleTitle = activeModule?.titulo ?? "";

    return [
      lessonTitle
        ? `Que es ${lessonTitle.toLowerCase()} y por que es importante.`
        : `Conceptos principales de ${moduleTitle.toLowerCase()}.`,
      `Como se relaciona con ${moduleTitle.toLowerCase()}.`,
      "Que puntos conviene recordar antes de avanzar o rendir la autoevaluacion.",
    ];
  };

  useEffect(() => {
    if (!pendingFinalExamScroll || !finalExamButtonRef.current) {
      return;
    }

    finalExamButtonRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    setPendingFinalExamScroll(false);
  }, [activeModuleIndex, activeResourceIndex, pendingFinalExamScroll]);

  const selectLesson = (moduleIndex, resourceIndex) => {
    setActiveLesson({ moduleIndex, resourceIndex });
    setActiveExamModuleId(null);
  };

  const markAssessmentDone = (moduleId) => {
    if (!moduleId) {
      return;
    }

    setCompletedAssessmentModuleIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(moduleId);
      return nextIds;
    });
  };

  const openResource = (resource) => {
    if (!activeModule?.id || !resource?.id) {
      return;
    }

    const resourceKey = `${activeModule.id}:${resource.id}`;
    setOpenResourceKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);
      nextKeys.add(resourceKey);
      return nextKeys;
    });
  };

  const scrollToFinalExamButton = () => {
    if (!lastLesson) {
      return;
    }

    setActiveLesson({
      moduleIndex: lastLesson.moduleIndex,
      resourceIndex: lastLesson.resourceIndex,
    });
    setActiveExamModuleId(null);
    setPendingFinalExamScroll(true);
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className="learning-page">
        <div className="learning-container">
          <Link to="/capacitaciones" className={styles.backLink}>
            <ChevronLeft size={18} aria-hidden="true" />
            Volver a capacitaciones
          </Link>

          {loading && (
            <div className="learning-empty">Cargando capacitacion...</div>
          )}

          {!loading && error && <div className="alert-error">{error}</div>}

          {!loading && !error && !capacitacion && (
            <div className="learning-empty">
              No encontramos la capacitacion solicitada.
            </div>
          )}

          {!loading && !error && capacitacion && (
            <>
              <article className="learning-header">
                <h1 className="learning-title">{capacitacion.titulo}</h1>

                {capacitacion.descripcion && (
                  <p className="learning-subtitle">{capacitacion.descripcion}</p>
                )}

                <div className={styles.progressPanel}>
                  <div className={styles.progressPanelHeader}>
                    <p>Progreso del curso: {overallProgressPercentage}% completado</p>
                    <span>
                      {completedModulesCount} de {totalModules} modulos completados
                    </span>
                  </div>
                  <div className={styles.progressTrack}>
                    <span
                      className={styles.progressBar}
                      style={{ width: `${overallProgressPercentage}%` }}
                    />
                  </div>
                  {loadingProgress && (
                    <p className={styles.progressLoading}>Cargando progreso...</p>
                  )}
                  {loadingExamAttempts && (
                    <p className={styles.progressLoading}>Cargando evaluaciones...</p>
                  )}
                </div>
              </article>

              {progressError && (
                <div className="alert-error mt-4">{progressError}</div>
              )}
              {examAttemptsError && (
                <div className="alert-error mt-4">{examAttemptsError}</div>
              )}

              <section className={styles.section}>
                {modules.length === 0 && (
                  <p className={styles.emptyText}>
                    Esta capacitacion todavia no tiene modulos publicados.
                  </p>
                )}

                {modules.length > 0 && !learningStateReady && (
                  <div className="learning-empty">
                    Cargando avance de modulos...
                  </div>
                )}

                {modules.length > 0 && learningStateReady && (
                  <div className={styles.learningShell}>
                    <aside className={styles.lessonSidebar}>
                      <div className={styles.sidebarCourseCard}>
                        <div className={styles.sidebarHeader}>
                          <span>Contenido del curso</span>
                        </div>

                        <div className={styles.sidebarModules}>
                          {modules.map((module, moduleIndex) => {
                            const moduleUnlocked = isModuleUnlocked(
                              moduleIndex,
                              modules,
                              completedResourceIds
                            );
                            const moduleCompleted = isModuleCompleted(
                              module,
                              completedResourceIds
                            );

                          return (
                            <article
                              key={module.id ?? `${capacitacion.id}-${moduleIndex}`}
                              className={`${styles.sidebarModule} ${
                                moduleIndex === activeModuleIndex
                                  ? styles.sidebarModuleActive
                                  : ""
                              } ${
                                !moduleUnlocked ? styles.sidebarModuleLocked : ""
                              }`}
                            >
                              <div className={styles.sidebarModuleHeader}>
                                <div className={styles.sidebarModuleTopRow}>
                                  <span>Modulo {moduleIndex + 1}</span>
                                  {moduleCompleted ? (
                                    <span
                                      className={`${styles.sidebarModuleState} ${styles.sidebarModuleStateCompleted}`}
                                    >
                                      <CheckCircle2 size={12} />
                                      Completado
                                    </span>
                                  ) : moduleUnlocked ? (
                                    <span
                                      className={`${styles.sidebarModuleState} ${styles.sidebarModuleStateProgress}`}
                                    >
                                      <PlayCircle size={12} />
                                      En progreso
                                    </span>
                                  ) : (
                                    <span
                                      className={`${styles.sidebarModuleState} ${styles.sidebarModuleStateLocked}`}
                                    >
                                      <Lock size={12} />
                                      Bloqueado
                                    </span>
                                  )}
                                </div>
                                <h2>{module.titulo}</h2>
                              </div>

                              {moduleUnlocked && (
                              <div className={styles.sidebarLessons}>
                                {(module.recursos ?? []).map(
                                  (resource, resourceIndex) => {
                                      const resourceUnlocked = isResourceUnlocked(
                                        moduleIndex,
                                        resourceIndex,
                                        modules,
                                        completedResourceIds
                                      );
                                      const resourceCompleted = isResourceCompleted(
                                        resource,
                                        completedResourceIds,
                                        module.id
                                      );
                                      const isActive =
                                        moduleIndex === activeModuleIndex &&
                                        resourceIndex === activeResourceIndex;
                                      const lessonLabel = `${moduleIndex + 1}.${
                                        resourceIndex + 1
                                      }`;

                                      return (
                                        <button
                                          key={resource.id ?? resourceIndex}
                                          type="button"
                                          className={`${styles.sidebarLesson} ${
                                            isActive
                                              ? styles.sidebarLessonActive
                                              : ""
                                          } ${
                                            resourceCompleted
                                              ? styles.sidebarLessonCompleted
                                              : ""
                                          }`}
                                          disabled={!resourceUnlocked}
                                          onClick={() =>
                                            selectLesson(
                                              moduleIndex,
                                              resourceIndex
                                            )
                                          }
                                        >
                                          <span className={styles.lessonIcon}>
                                            {resourceUnlocked ? (
                                              <PlayCircle size={15} />
                                            ) : (
                                              <Lock size={14} />
                                            )}
                                          </span>
                                          <span className={styles.lessonName}>
                                            {lessonLabel}{" "}
                                            {getResourceLabel(resource)}
                                          </span>
                                        </button>
                                      );
                                    }
                                  )}
                              </div>
                              )}
                            </article>
                          );
                        })}
                        </div>
                      </div>

                      {certification && (
                        capacitacionCompleted ? (
                          <button
                            type="button"
                            onClick={scrollToFinalExamButton}
                            className={`${styles.sidebarCertification} ${styles.sidebarCertificationAvailable}`}
                          >
                            <Award size={22} />
                            <div>
                              <h2>Certificacion final</h2>
                              <p>Disponible</p>
                            </div>
                          </button>
                        ) : (
                          <article className={styles.sidebarCertification}>
                            <Award size={22} />
                            <div>
                              <h2>Certificacion final</h2>
                              <p>Bloqueada</p>
                            </div>
                          </article>
                        )
                      )}
                    </aside>

                    <main className={styles.lessonPanel}>
                      {activeResource ? (
                        <>
                          <div className={styles.lessonPanelHeader}>
                            <h2>
                              {activeModuleIndex + 1}.{activeResourceIndex + 1}{" "}
                              {getResourceLabel(activeResource)}
                            </h2>
                            <p>{activeModule?.titulo}</p>
                          </div>

                          {!activeResourceHref && (
                            <div className={styles.lessonEmpty}>
                              Este recurso no tiene un enlace configurado.
                            </div>
                          )}

                          {activeResourceHref && !activeResourceUnlocked && (
                            <div className={styles.lessonEmpty}>
                              <Lock size={30} />
                              <strong>Leccion bloqueada</strong>
                              <span>Completa la leccion anterior para continuar.</span>
                            </div>
                          )}

                          {activeResourceHref &&
                            activeResourceUnlocked &&
                            activeResource.tipo === "youtube" &&
                            (showActiveYoutube ? (
                              <YouTubePlayer
                                youtubeUrl={activeResourceHref}
                                onComplete={() =>
                                  markResourceAsCompleted(activeModule, activeResource)
                                }
                                onTrackingReady={(isReady) =>
                                  setTrackingReady(activeResource.id, isReady)
                                }
                                showControls={false}
                              />
                            ) : (
                              <button
                                type="button"
                                className={styles.videoCover}
                                onClick={() => openResource(activeResource)}
                              >
                                <span>
                                  <PlayCircle size={48} />
                                </span>
                              </button>
                            ))}

                          {activeResourceHref &&
                            activeResourceUnlocked &&
                            activeResource.tipo !== "youtube" && (
                              <div className={styles.fileLesson}>
                                <a
                                  href={activeResourceHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.moduleCourseButton}
                                >
                                  <FileText size={16} />
                                  Abrir recurso
                                  <ExternalLink size={15} />
                                </a>
                                {!activeResourceCompleted && (
                                  <button
                                    type="button"
                                    className={styles.markSeenButton}
                                    disabled={
                                      savingResourceId === activeResource.id ||
                                      loadingProgress
                                    }
                                    onClick={() =>
                                      markResourceAsCompleted(
                                        activeModule,
                                        activeResource
                                      )
                                    }
                                  >
                                    {savingResourceId === activeResource.id
                                      ? "Guardando..."
                                      : "Marcar como visto"}
                                  </button>
                                )}
                              </div>
                            )}

                          {activeResourceUnlocked && (
                            <section className={styles.lessonLearningNotes}>
                              <div>
                                <h3>Sobre esta leccion</h3>
                                <p>
                                  {activeModule?.descripcion ||
                                    `En esta leccion vas a revisar los conceptos clave de ${activeModule?.titulo?.toLowerCase() ?? "este modulo"} para aplicarlos en el recorrido de capacitacion.`}
                                </p>
                              </div>

                              <div className={styles.lessonHighlights}>
                                <h4>En esta leccion aprenderas:</h4>
                                <ul>
                                  {getLearningHighlights().map((item) => (
                                    <li key={item}>
                                      <CheckCircle2 size={15} />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className={styles.lessonTip}>
                                <Lightbulb size={24} aria-hidden="true" />
                                <div>
                                  <span>Consejo</span>
                                  <p>
                                    Toma nota de los conceptos principales. Te van a servir para la autoevaluacion del modulo.
                                  </p>
                                </div>
                              </div>
                            </section>
                          )}

                          {activeModuleHasAssessment &&
                            activeModuleResourcesCompleted &&
                            !activeModuleAssessmentDone &&
                            !showActiveModuleExam && (
                              <section className={styles.moduleExamPrompt}>
                                <div>
                                  <span>Evaluacion disponible</span>
                                  <h3>Rendir autoevaluacion del modulo</h3>
                                  <p>
                                    {activeModule?.titulo} ·{" "}
                                    {activeModule?.preguntas?.length ?? 0} preguntas
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className={styles.lessonNextButton}
                                  onClick={() =>
                                    setActiveExamModuleId(activeModule?.id ?? null)
                                  }
                                >
                                  Rendir autoevaluacion
                                  <ArrowRight size={16} />
                                </button>
                              </section>
                            )}

                          {showActiveModuleExam && (
                              <section className={styles.moduleExamPanel}>
                                <ModuleExam
                                  module={activeModule}
                                  isUnlocked={activeModuleResourcesCompleted}
                                  variant="inline"
                                  courseTitle={capacitacion?.titulo}
                                  attemptParams={activeModuleAttemptParams}
                                  onComplete={() => markAssessmentDone(activeModule?.id)}
                                />
                              </section>
                            )}

                          <div className={styles.lessonNav}>
                            {previousLesson ? (
                              <button
                                type="button"
                                className={styles.lessonNavButton}
                                onClick={() =>
                                  selectLesson(
                                    previousLesson.moduleIndex,
                                    previousLesson.resourceIndex
                                  )
                                }
                              >
                                Leccion anterior
                              </button>
                            ) : (
                              <span />
                            )}

                            {nextLesson &&
                            isResourceUnlocked(
                              nextLesson.moduleIndex,
                              nextLesson.resourceIndex,
                              modules,
                              completedResourceIds
                            ) ? (
                          <button
                            type="button"
                            className={`${styles.lessonNextButton} ${
                              activeResourceCompleted ||
                              activeModuleResourcesCompleted ||
                              activeModuleAssessmentDone
                                ? styles.lessonNextButtonPulse
                                : ""
                            }`}
                            onClick={() =>
                              selectLesson(
                                nextLesson.moduleIndex,
                                    nextLesson.resourceIndex
                                  )
                                }
                              >
                                Siguiente leccion
                                <ArrowRight size={16} />
                              </button>
                            ) : nextLesson ? (
                              <p className={styles.nextLockedText}>
                                La siguiente leccion se habilita cuando completes esta.
                              </p>
                            ) : certification && capacitacionCompleted ? (
                              <Link
                                ref={finalExamButtonRef}
                                to={`/certificaciones/${certification.id}`}
                                className={`${styles.lessonNextButton} ${styles.lessonNextButtonPulse}`}
                              >
                                Rendir examen final
                                <Award size={16} />
                              </Link>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <div className={styles.lessonEmpty}>
                          Esta capacitacion no tiene lecciones cargadas.
                        </div>
                      )}
                    </main>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default CapacitacionDetalle;
