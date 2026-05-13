import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronLeft,
  Download,
  ExternalLink,
  FileText,
  Lightbulb,
  Lock,
  PlayCircle,
} from "lucide-react";
import { USER_ROLES } from "../../auth/authRoles";
import { useSessionStore } from "../../../store/sessionStore";
import ModuleExam from "../components/ModuleExam";
import YouTubePlayer from "../components/YouTubePlayer";
import useCapacitacionProgress from "../hooks/useCapacitacionProgress";
import { RESOURCE_TYPES } from "../services/learningContentService";
import {
  EXAM_ATTEMPT_STATUS,
  EXAM_TYPES,
} from "../services/examAttemptsService";
import {
  isCapacitacionCompleted,
  isModuleUnlocked,
  isResourceCompleted,
  isResourceUnlocked,
} from "../services/learningProgressService";
import {
  areModuleResourcesCompleted,
  getResourceExtension,
  getResourceHref,
  getResourceLabel,
  isModuleCompleted,
  isVideoResource,
} from "../utils/learningRuntime";
import styles from "./CapacitacionDetalle.module.css";

function buildLessons(modules) {
  return modules.flatMap((module, moduleIndex) =>
    (module.recursos ?? [])
      .map((resource, resourceIndex) => ({
        module,
        moduleIndex,
        resource,
        resourceIndex,
      }))
      .filter((lesson) => isVideoResource(lesson.resource))
  );
}

function getModuleLessonResources(module) {
  return (module?.recursos ?? [])
    .map((resource, resourceIndex) => ({ resource, resourceIndex }))
    .filter(({ resource }) => isVideoResource(resource));
}

function getModuleFileResources(module) {
  return (module?.recursos ?? []).filter(
    (resource) =>
      resource?.tipo === RESOURCE_TYPES.ARCHIVO && !isVideoResource(resource)
  );
}

function isLessonCompleted(lesson, completedResourceIds) {
  return isResourceCompleted(
    lesson?.resource,
    completedResourceIds,
    lesson?.module?.id
  );
}

function isLessonUnlocked(lesson, modules, completedResourceIds) {
  return isResourceUnlocked(
    lesson.moduleIndex,
    lesson.resourceIndex,
    modules,
    completedResourceIds
  );
}

function getNextPendingLesson(lessons, modules, completedResourceIds) {
  return (
    lessons.find((lesson) =>
      isLessonUnlocked(lesson, modules, completedResourceIds) &&
      !isLessonCompleted(lesson, completedResourceIds)
    ) ??
    lessons.find((lesson) =>
      isLessonUnlocked(lesson, modules, completedResourceIds)
    ) ??
    lessons[0] ??
    null
  );
}

function getLessonByPosition(lessons, activeLesson, fallbackLesson) {
  return (
    lessons.find(
      (lesson) =>
        lesson.moduleIndex === activeLesson?.moduleIndex &&
        lesson.resourceIndex === activeLesson?.resourceIndex
    ) ?? fallbackLesson
  );
}

function hasCompletedModuleAssessment({ moduleId, examAttempts }) {
  if (!moduleId) {
    return false;
  }

  return (
    (examAttempts ?? []).some(
      (attempt) =>
        attempt.modulo_id === moduleId &&
        attempt.tipo_examen === EXAM_TYPES.MODULO &&
        attempt.estado === EXAM_ATTEMPT_STATUS.COMPLETED
    )
  );
}

function getLearningHighlights(activeModule, activeResource) {
  const lessonTitle = activeResource ? getResourceLabel(activeResource, "") : "";
  const moduleTitle = activeModule?.titulo ?? "este modulo";
  const highlightTitle = lessonTitle || moduleTitle;
  const normalizedLessonTitle = highlightTitle.toLowerCase();
  const normalizedModuleTitle = moduleTitle.toLowerCase();

  return [
    highlightTitle
      ? `Que es ${normalizedLessonTitle} y por que es importante.`
      : `Conceptos principales de ${normalizedModuleTitle}.`,
    `Como se relaciona con ${normalizedModuleTitle}.`,
    "Que puntos conviene recordar antes de avanzar o rendir la autoevaluacion.",
  ];
}

function getFileTypeLabel(resource) {
  const extension = getResourceExtension(resource);

  if (!extension) {
    return "Archivo";
  }

  const normalizedExtension = extension.toLowerCase();

  if (normalizedExtension === "pdf") {
    return "PDF";
  }

  if (["xls", "xlsx", "csv"].includes(normalizedExtension)) {
    return "Excel";
  }

  if (["doc", "docx"].includes(normalizedExtension)) {
    return "Documento";
  }

  if (["ppt", "pptx"].includes(normalizedExtension)) {
    return "Presentacion";
  }

  return normalizedExtension.toUpperCase();
}

function CourseHeader({
  capacitacion,
  completedModulesCount,
  loadingExamAttempts,
  loadingProgress,
  overallProgressPercentage,
  totalModules,
}) {
  return (
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
  );
}

function ModuleStatusBadge({ locked, completed }) {
  if (completed) {
    return (
      <span
        className={`${styles.sidebarModuleState} ${styles.sidebarModuleStateCompleted}`}
      >
        <CheckCircle2 size={12} />
        Completado
      </span>
    );
  }

  if (locked) {
    return (
      <span
        className={`${styles.sidebarModuleState} ${styles.sidebarModuleStateLocked}`}
      >
        <Lock size={12} />
        Bloqueado
      </span>
    );
  }

  return (
    <span
      className={`${styles.sidebarModuleState} ${styles.sidebarModuleStateProgress}`}
    >
      <PlayCircle size={12} />
      En progreso
    </span>
  );
}

function SidebarLessonButton({
  completedResourceIds,
  isActive,
  modules,
  module,
  moduleIndex,
  onSelectLesson,
  resource,
  resourceIndex,
}) {
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
  const lessonLabel = `${moduleIndex + 1}.${resourceIndex + 1}`;
  const resourceLabel = getResourceLabel(resource, module.titulo);

  return (
    <button
      type="button"
      className={`${styles.sidebarLesson} ${
        isActive ? styles.sidebarLessonActive : ""
      } ${resourceCompleted ? styles.sidebarLessonCompleted : ""}`}
      disabled={!resourceUnlocked}
      onClick={() => onSelectLesson(moduleIndex, resourceIndex)}
    >
      <span className={styles.lessonIcon}>
        {resourceUnlocked ? <PlayCircle size={15} /> : <Lock size={14} />}
      </span>
      <span className={styles.lessonName}>
        {lessonLabel} {resourceLabel}
      </span>
    </button>
  );
}

function SidebarModule({
  activeModuleIndex,
  activeResourceIndex,
  capacitacionId,
  completedResourceIds,
  module,
  moduleIndex,
  modules,
  onSelectLesson,
}) {
  const moduleUnlocked = isModuleUnlocked(
    moduleIndex,
    modules,
    completedResourceIds
  );
  const moduleCompleted = isModuleCompleted(module, completedResourceIds);
  const lessonResources = getModuleLessonResources(module);

  return (
    <article
      className={`${styles.sidebarModule} ${
        moduleIndex === activeModuleIndex ? styles.sidebarModuleActive : ""
      } ${!moduleUnlocked ? styles.sidebarModuleLocked : ""}`}
    >
      <div className={styles.sidebarModuleHeader}>
        <div className={styles.sidebarModuleTopRow}>
          <span>Modulo {moduleIndex + 1}</span>
          <ModuleStatusBadge
            completed={moduleCompleted}
            locked={!moduleUnlocked}
          />
        </div>
        <h2>{module.titulo}</h2>
      </div>

      {moduleUnlocked && (
        <div className={styles.sidebarLessons}>
          {lessonResources.map(({ resource, resourceIndex }) => (
            <SidebarLessonButton
              key={resource.id ?? `${capacitacionId}-${moduleIndex}-${resourceIndex}`}
              completedResourceIds={completedResourceIds}
              isActive={
                moduleIndex === activeModuleIndex &&
                resourceIndex === activeResourceIndex
              }
              module={module}
              moduleIndex={moduleIndex}
              modules={modules}
              onSelectLesson={onSelectLesson}
              resource={resource}
              resourceIndex={resourceIndex}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function CertificationSidebarCard({ capacitacionCompleted, certification }) {
  if (!certification) {
    return null;
  }

  if (capacitacionCompleted) {
    return (
      <Link
        to={`/certificaciones/${certification.id}`}
        className={`${styles.sidebarCertification} ${styles.sidebarCertificationAvailable}`}
      >
        <Award size={22} />
        <div>
          <h2>Certificacion final</h2>
          <p>Disponible</p>
        </div>
      </Link>
    );
  }

  return (
    <article className={styles.sidebarCertification}>
      <Award size={22} />
      <div>
        <h2>Certificacion final</h2>
        <p>Bloqueada</p>
      </div>
    </article>
  );
}

function CourseSidebar({
  activeModuleIndex,
  activeResourceIndex,
  capacitacion,
  capacitacionCompleted,
  certification,
  completedResourceIds,
  modules,
  onSelectLesson,
}) {
  return (
    <aside className={styles.lessonSidebar}>
      <div className={styles.sidebarCourseCard}>
        <div className={styles.sidebarHeader}>
          <span>Contenido del curso</span>
        </div>

        <div className={styles.sidebarModules}>
          {modules.map((module, moduleIndex) => (
            <SidebarModule
              key={module.id ?? `${capacitacion.id}-${moduleIndex}`}
              activeModuleIndex={activeModuleIndex}
              activeResourceIndex={activeResourceIndex}
              capacitacionId={capacitacion.id}
              completedResourceIds={completedResourceIds}
              module={module}
              moduleIndex={moduleIndex}
              modules={modules}
              onSelectLesson={onSelectLesson}
            />
          ))}
        </div>
      </div>

      <CertificationSidebarCard
        capacitacionCompleted={capacitacionCompleted}
        certification={certification}
      />
    </aside>
  );
}

function LessonContentNotes({ activeModule, activeResource }) {
  return (
    <>
      <div>
        <h3>Sobre esta leccion</h3>
        <p>
          {activeModule?.descripcion ||
            `En esta leccion vas a revisar los conceptos clave de ${
              activeModule?.titulo?.toLowerCase() ?? "este modulo"
            } para aplicarlos en el recorrido de capacitacion.`}
        </p>
      </div>

      <div className={styles.lessonHighlights}>
        <h4>En esta leccion aprenderas:</h4>
        <ul>
          {getLearningHighlights(activeModule, activeResource).map((item) => (
            <li key={item}>
              <CheckCircle2 size={15} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function LessonTip() {
  return (
    <div className={styles.lessonTip}>
      <Lightbulb size={24} aria-hidden="true" />
      <div>
        <span>Consejo</span>
        <p>
          Toma nota de los conceptos principales. Te van a servir para la
          autoevaluacion del modulo.
        </p>
      </div>
    </div>
  );
}

function LessonResources({ resources, onDownloadResource }) {
  if (resources.length === 0) {
    return (
      <div className={styles.lessonResourcesEmpty}>
        Este modulo no tiene recursos descargables cargados.
      </div>
    );
  }

  return (
    <div className={styles.lessonResourcesList}>
      {resources.map((resource) => {
        const resourceHref = getResourceHref(resource);

        return (
          <a
            key={resource.id ?? resource.archivo_url}
            href={resourceHref ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            download={resource.archivo_nombre || undefined}
            className={styles.lessonResourceItem}
            onClick={() => onDownloadResource(resource)}
          >
            <span className={styles.lessonResourceIcon}>
              <FileText size={18} />
            </span>
            <span className={styles.lessonResourceText}>
              <strong>{getResourceLabel(resource)}</strong>
              <small>({getFileTypeLabel(resource)})</small>
            </span>
            <Download size={18} aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

function LessonSupportTabs({
  activeModule,
  activeResource,
  fileResources,
  onDownloadResource,
}) {
  const [activeTab, setActiveTab] = useState("contenido");
  const hasResources = fileResources.length > 0;

  useEffect(() => {
    if (!hasResources && activeTab === "recursos") {
      setActiveTab("contenido");
    }
  }, [activeTab, hasResources]);

  return (
    <section className={styles.lessonLearningNotes}>
      <div
        className={styles.lessonTabs}
        role="tablist"
        aria-label="Material de la leccion"
      >
        <button
          type="button"
          className={activeTab === "contenido" ? styles.lessonTabActive : ""}
          onClick={() => setActiveTab("contenido")}
        >
          Contenido
        </button>
        {hasResources && (
          <button
            type="button"
            className={activeTab === "recursos" ? styles.lessonTabActive : ""}
            onClick={() => setActiveTab("recursos")}
          >
            Recursos
          </button>
        )}
      </div>

      {activeTab === "contenido" && (
        <>
          <LessonContentNotes
            activeModule={activeModule}
            activeResource={activeResource}
          />

          {fileResources.length > 0 && (
            <div className={styles.lessonResourcesHint}>
              Hay {fileResources.length} recurso
              {fileResources.length === 1 ? "" : "s"} disponible
              {fileResources.length === 1 ? "" : "s"} para descargar.
            </div>
          )}

          <LessonTip />
        </>
      )}

      {hasResources && activeTab === "recursos" && (
        <LessonResources
          resources={fileResources}
          onDownloadResource={onDownloadResource}
        />
      )}

    </section>
  );
}

function ModuleAssessmentPanel({
  activeModule,
  activeModuleAssessmentDone,
  activeModuleAttemptParams,
  activeModuleHasAssessment,
  activeModuleResourcesCompleted,
  courseTitle,
  onAssessmentComplete,
}) {
  return (
    <aside className={styles.moduleAssessmentPanel}>
      <div className={styles.moduleAssessmentHeader}>
        <div className={styles.moduleAssessmentTopRow}>
          <span>Chequeo del modulo</span>
          <strong>Opcional</strong>
        </div>
        <h3>{activeModule?.titulo}</h3>
      </div>

      {!activeModuleHasAssessment && (
        <div className={styles.lessonResourcesEmpty}>
          Este modulo no tiene autoevaluacion cargada.
        </div>
      )}

      {activeModuleHasAssessment && !activeModuleResourcesCompleted && (
        <div className={styles.lessonResourcesEmpty}>
          La autoevaluacion se habilita cuando completes los recursos del modulo.
        </div>
      )}

      {activeModuleHasAssessment && activeModuleResourcesCompleted && (
        <ModuleExam
          module={activeModule}
          isCompleted={activeModuleAssessmentDone}
          isUnlocked={activeModuleResourcesCompleted}
          variant="inline"
          courseTitle={courseTitle}
          attemptParams={activeModuleAttemptParams}
          onComplete={onAssessmentComplete}
        />
      )}
    </aside>
  );
}

function LocalVideoPlayer({
  activeModule,
  activeResource,
  activeResourceCompleted,
  activeResourceHref,
  markResourceAsCompleted,
}) {
  const [completionSaved, setCompletionSaved] = useState(activeResourceCompleted);

  useEffect(() => {
    setCompletionSaved(activeResourceCompleted);
  }, [activeResourceCompleted, activeResource?.id]);

  const saveProgress = () => {
    if (completionSaved) {
      return;
    }

    setCompletionSaved(true);
    markResourceAsCompleted(activeModule, activeResource);
  };

  const handleTimeUpdate = (event) => {
    const video = event.currentTarget;

    if (!video.duration) {
      return;
    }

    if (video.currentTime / video.duration >= 0.9) {
      saveProgress();
    }
  };

  return (
    <video
      key={`${activeModule.id}-${activeResource.id}`}
      className={styles.localVideoPlayer}
      src={activeResourceHref}
      controls
      preload="metadata"
      onEnded={saveProgress}
      onTimeUpdate={handleTimeUpdate}
    >
      Tu navegador no puede reproducir este video.
    </video>
  );
}

function LessonResource({
  activeModule,
  activeResource,
  activeResourceCompleted,
  activeResourceHref,
  activeResourceUnlocked,
  loadingProgress,
  markResourceAsCompleted,
  savingResourceId,
  setTrackingReady,
}) {
  if (!activeResourceHref) {
    return (
      <div className={styles.lessonEmpty}>
        Este recurso no tiene un enlace configurado.
      </div>
    );
  }

  if (!activeResourceUnlocked) {
    return (
      <div className={styles.lessonEmpty}>
        <Lock size={30} />
        <strong>Leccion bloqueada</strong>
        <span>Completa la leccion anterior para continuar.</span>
      </div>
    );
  }

  if (activeResource.tipo === "youtube") {
    return (
      <YouTubePlayer
        key={`${activeModule.id}-${activeResource.id}`}
        youtubeUrl={activeResourceHref}
        onComplete={() => markResourceAsCompleted(activeModule, activeResource)}
        onTrackingReady={(isReady) =>
          setTrackingReady(activeResource.id, isReady)
        }
      />
    );
  }

  if (isVideoResource(activeResource)) {
    return (
      <LocalVideoPlayer
        activeModule={activeModule}
        activeResource={activeResource}
        activeResourceCompleted={activeResourceCompleted}
        activeResourceHref={activeResourceHref}
        markResourceAsCompleted={markResourceAsCompleted}
      />
    );
  }

  return (
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
          disabled={savingResourceId === activeResource.id || loadingProgress}
          onClick={() => markResourceAsCompleted(activeModule, activeResource)}
        >
          {savingResourceId === activeResource.id
            ? "Guardando..."
            : "Marcar como visto"}
        </button>
      )}
    </div>
  );
}

function LessonNavigation({
  activeModuleAssessmentDone,
  activeModuleResourcesCompleted,
  activeResourceCompleted,
  capacitacionCompleted,
  certification,
  completedResourceIds,
  modules,
  nextLesson,
  onSelectLesson,
  previousLesson,
}) {
  const canGoNext =
    nextLesson &&
    isResourceUnlocked(
      nextLesson.moduleIndex,
      nextLesson.resourceIndex,
      modules,
      completedResourceIds
    );
  const shouldPulseNext =
    activeResourceCompleted ||
    activeModuleResourcesCompleted ||
    activeModuleAssessmentDone;

  return (
    <div className={styles.lessonNav}>
      {previousLesson ? (
        <button
          type="button"
          className={styles.lessonNavButton}
          onClick={() =>
            onSelectLesson(
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

      {canGoNext ? (
        <button
          type="button"
          className={`${styles.lessonNextButton} ${
            shouldPulseNext ? styles.lessonNextButtonPulse : ""
          }`}
          onClick={() =>
            onSelectLesson(nextLesson.moduleIndex, nextLesson.resourceIndex)
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
          to={`/certificaciones/${certification.id}`}
          className={`${styles.lessonNextButton} ${styles.lessonNextButtonPulse}`}
        >
          Rendir examen final
          <Award size={16} />
        </Link>
      ) : null}
    </div>
  );
}

function CapacitacionDetalle() {
  const { capacitacionSlug } = useParams();
  const role = useSessionStore((state) => state.role);
  const userId = useSessionStore((state) => state.user?.id ?? null);
  const onlyPublished = role !== USER_ROLES.ADMIN;
  const [activeLesson, setActiveLesson] = useState(null);

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
    refreshExamAttempts,
    setTrackingReady,
  } = useCapacitacionProgress(capacitacionSlug, { onlyPublished, userId });

  const modules = useMemo(
    () => capacitacion?.modulos ?? [],
    [capacitacion?.modulos]
  );
  const certification = capacitacion?.certificacion ?? null;
  const lessons = useMemo(() => buildLessons(modules), [modules]);
  const learningStateReady = !loadingProgress && !loadingExamAttempts;
  const totalModules = modules.length;
  const completedModulesCount = modules.filter((module) =>
    isModuleCompleted(module, completedResourceIds)
  ).length;
  const overallProgressPercentage =
    learningStateReady && totalModules > 0
      ? Math.round((completedModulesCount / totalModules) * 100)
      : 0;
  const capacitacionCompleted = isCapacitacionCompleted(
    modules,
    completedResourceIds
  );

  const fallbackLesson = getNextPendingLesson(
    lessons,
    modules,
    completedResourceIds
  );

  useEffect(() => {
    if (activeLesson || !fallbackLesson) {
      return;
    }

    setActiveLesson({
      moduleIndex: fallbackLesson.moduleIndex,
      resourceIndex: fallbackLesson.resourceIndex,
    });
  }, [activeLesson, fallbackLesson]);

  const activeLessonData = getLessonByPosition(
    lessons,
    activeLesson,
    fallbackLesson
  );
  const activeModule = activeLessonData?.module ?? null;
  const activeResource = activeLessonData?.resource ?? null;
  const activeModuleIndex = activeLessonData?.moduleIndex ?? 0;
  const activeResourceIndex = activeLessonData?.resourceIndex ?? 0;
  const activeResourceHref = activeResource
    ? getResourceHref(activeResource)
    : null;
  const activeModuleFileResources = getModuleFileResources(activeModule);
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
    learningStateReady &&
    areModuleResourcesCompleted(activeModule, completedResourceIds);
  const activeModuleHasAssessment =
    activeModule?.preguntas?.length > 0;
  const activeModuleAssessmentDone = hasCompletedModuleAssessment({
    moduleId: activeModule?.id,
    examAttempts,
  });
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
  const pageTitle = capacitacion
    ? `${capacitacion.titulo} | Capacitaciones | IRRIDELTA`
    : "Detalle de capacitacion | IRRIDELTA";

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

  const selectLesson = (moduleIndex, resourceIndex) => {
    setActiveLesson({ moduleIndex, resourceIndex });
  };

  useEffect(() => {
    setActiveLesson(null);
  }, [capacitacion?.id, userId]);

  const refreshModuleAssessments = async () => {
    await refreshExamAttempts();
  };

  const markDownloadResourceAsSeen = (resource) => {
    if (!activeModule?.id || !resource?.id) {
      return;
    }

    markResourceAsCompleted(activeModule, resource);
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className="learning-page">
        <div className={styles.detailContainer}>
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
              <CourseHeader
                capacitacion={capacitacion}
                completedModulesCount={completedModulesCount}
                loadingExamAttempts={loadingExamAttempts}
                loadingProgress={loadingProgress}
                overallProgressPercentage={overallProgressPercentage}
                totalModules={totalModules}
              />

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
                    <CourseSidebar
                      activeModuleIndex={activeModuleIndex}
                      activeResourceIndex={activeResourceIndex}
                      capacitacion={capacitacion}
                      capacitacionCompleted={capacitacionCompleted}
                      certification={certification}
                      completedResourceIds={completedResourceIds}
                      modules={modules}
                      onSelectLesson={selectLesson}
                    />

                    <main className={styles.lessonPanel}>
                      {activeResource ? (
                        <>
                          <div className={styles.lessonPanelHeader}>
                            <h2>
                              {activeModuleIndex + 1}.{activeResourceIndex + 1}{" "}
                              {getResourceLabel(
                                activeResource,
                                activeModule?.titulo
                              )}
                            </h2>
                          </div>

                          <LessonResource
                            activeModule={activeModule}
                            activeResource={activeResource}
                            activeResourceCompleted={activeResourceCompleted}
                            activeResourceHref={activeResourceHref}
                            activeResourceUnlocked={activeResourceUnlocked}
                            loadingProgress={loadingProgress}
                            markResourceAsCompleted={markResourceAsCompleted}
                            savingResourceId={savingResourceId}
                            setTrackingReady={setTrackingReady}
                          />

                          {activeResourceUnlocked && (
                            <LessonSupportTabs
                              activeModule={activeModule}
                              activeResource={activeResource}
                              fileResources={activeModuleFileResources}
                              onDownloadResource={markDownloadResourceAsSeen}
                            />
                          )}

                          <LessonNavigation
                            activeModuleAssessmentDone={activeModuleAssessmentDone}
                            activeModuleResourcesCompleted={
                              activeModuleResourcesCompleted
                            }
                            activeResourceCompleted={activeResourceCompleted}
                            capacitacionCompleted={capacitacionCompleted}
                            certification={certification}
                            completedResourceIds={completedResourceIds}
                            modules={modules}
                            nextLesson={nextLesson}
                            onSelectLesson={selectLesson}
                            previousLesson={previousLesson}
                          />
                        </>
                      ) : (
                        <div className={styles.lessonEmpty}>
                          Esta capacitacion no tiene lecciones cargadas.
                        </div>
                      )}
                    </main>

                    {activeResource && activeResourceUnlocked && (
                      <ModuleAssessmentPanel
                        key={`${activeModule?.id ?? "module"}-${userId ?? "guest"}`}
                        activeModule={activeModule}
                        activeModuleAssessmentDone={activeModuleAssessmentDone}
                        activeModuleAttemptParams={activeModuleAttemptParams}
                        activeModuleHasAssessment={activeModuleHasAssessment}
                        activeModuleResourcesCompleted={
                          activeModuleResourcesCompleted
                        }
                        courseTitle={capacitacion?.titulo}
                        onAssessmentComplete={refreshModuleAssessments}
                      />
                    )}
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
