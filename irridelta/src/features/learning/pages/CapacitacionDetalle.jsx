import React from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronLeft,
  Lock,
  PlayCircle,
} from "lucide-react";
import {
  isCapacitacionCompleted,
  isModuleUnlocked,
  isResourceCompleted,
} from "../services/learningProgressService";
import { generateSlug } from "../services/learningContentService";
import useCapacitacionProgress from "../hooks/useCapacitacionProgress";
import {
  getModuleRoute,
  isModuleCompleted,
} from "../utils/learningRuntime";
import { LEARNING_PROGRESS_STATUS_ORDER } from "../utils/learningProgressStatus";
import { USER_ROLES } from "../../auth/authRoles";
import { useSessionStore } from "../../../store/sessionStore";
import styles from "./CapacitacionDetalle.module.css";

function getModuleResourceSummary(module) {
  const resources = module?.recursos ?? [];
  const videoCount = resources.filter((resource) => resource.tipo === "youtube").length;

  if (resources.length === 0) {
    return "Sin recursos";
  }

  if (videoCount > 0 && videoCount === resources.length) {
    return videoCount === 1 ? "1 video" : `${videoCount} videos`;
  }

  return resources.length === 1 ? "1 recurso" : `${resources.length} recursos`;
}

function CapacitacionDetalle() {
  const { capacitacionSlug } = useParams();
  const role = useSessionStore((state) => state.role);
  const onlyPublished = role !== USER_ROLES.ADMIN;
  const {
    capacitacion,
    completedResourceIds,
    loading,
    loadingProgress,
    loadingExamAttempts,
    error,
    progressError,
    examAttemptsError,
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
  const orderedModules = modules
    .map((module, moduleIndex) => {
      const moduleCompleted = isModuleCompleted(
        module,
        completedResourceIds
      );
      const moduleStarted = (module.recursos ?? []).some((resource) =>
        isResourceCompleted(resource, completedResourceIds, module.id)
      );
      const statusOrder = moduleCompleted
        ? LEARNING_PROGRESS_STATUS_ORDER.completado
        : moduleStarted
        ? LEARNING_PROGRESS_STATUS_ORDER["en-progreso"]
        : LEARNING_PROGRESS_STATUS_ORDER.pendiente;

      return {
        module,
        moduleIndex,
        statusOrder,
      };
    })
    .sort((currentModule, nextModule) => {
      if (currentModule.statusOrder !== nextModule.statusOrder) {
        return currentModule.statusOrder - nextModule.statusOrder;
      }

      return currentModule.moduleIndex - nextModule.moduleIndex;
    });
  const pageTitle = capacitacion
    ? `${capacitacion.titulo} | Capacitaciones | IRRIDELTA`
    : "Detalle de capacitacion | IRRIDELTA";

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
                <div className="mb-6 border-b-2 border-gray-200 pb-4">
                  <h2 className="learning-section-title">Contenido del curso</h2>
                </div>

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
                  <div className="grid gap-5">
                    {orderedModules.map(({ module, moduleIndex }) => {
                      const moduleUnlocked = isModuleUnlocked(
                        moduleIndex,
                        modules,
                        completedResourceIds
                      );
                      const moduleCompleted = isModuleCompleted(
                        module,
                        completedResourceIds
                      );
                      const modulePath = getModuleRoute(generateSlug(capacitacion.titulo), moduleIndex);
                      const moduleStarted = (module.recursos ?? []).some((resource) =>
                        isResourceCompleted(resource, completedResourceIds, module.id)
                      );
                      const moduleActionLabel = moduleCompleted
                        ? "Revisar"
                        : moduleStarted
                        ? "Continuar"
                        : "Comenzar";
                      const examReady = Array.isArray(module.preguntas)
                        ? module.preguntas.length > 0
                        : false;

                      return (
                        <article
                          key={module.id ?? `${capacitacion.id}-${moduleIndex}`}
                          className={`learning-card transition duration-200 hover:-translate-y-1 hover:shadow-md ${
                            moduleCompleted
                              ? "border-green-300 bg-gray-50"
                              : moduleUnlocked
                              ? "border-gray-200 bg-white"
                              : "border-gray-200 bg-gray-100"
                          }`}
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                                  Modulo {moduleIndex + 1}
                                </span>

                                {moduleCompleted && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                    <CheckCircle2 size={12} />
                                    Completado
                                  </span>
                                )}

                                {!moduleCompleted && moduleUnlocked && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                    <PlayCircle size={12} />
                                    En progreso
                                  </span>
                                )}

                                {!moduleUnlocked && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                                    <Lock size={12} />
                                    Bloqueado
                                  </span>
                                )}
                              </div>

                              <h3 className="mt-3 text-2xl font-bold text-gray-900">
                                {module.titulo}
                              </h3>

                              {module.descripcion && (
                                <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                                  {module.descripcion}
                                </p>
                              )}

                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <p className="text-sm text-gray-600">
                                  {getModuleResourceSummary(module)}
                                  {examReady ? " + evaluacion" : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex w-full flex-col gap-3 lg:w-auto">
                              {moduleUnlocked ? (
                                <Link
                                  to={modulePath}
                                  className="learning-button"
                                >
                                  {moduleActionLabel}
                                  <ArrowRight size={16} />
                                </Link>
                              ) : (
                                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
                                  Completa el modulo anterior para continuar.
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {certification && (
              <section className={styles.section}>
                {certification && !learningStateReady ? (
                  <div className="learning-empty">
                    Cargando estado de certificacion...
                  </div>
                ) : certification ? (
                  <div
                    className={`${styles.finalCertificationCard} ${
                      capacitacionCompleted
                        ? styles.finalCertificationAvailable
                        : styles.finalCertificationLocked
                    }`}
                  >
                    <div className={styles.finalCertificationInner}>
                      <div className={styles.finalCertificationIcon}>
                        <Award size={30} aria-hidden="true" />
                      </div>
                      <div className={styles.finalCertificationContent}>
                        <div className={styles.finalCertificationHeader}>
                          <span className={styles.finalCertificationBadge}>
                            {capacitacionCompleted
                              ? "Certificacion disponible"
                              : "Bloqueada"}
                          </span>
                        </div>

                        <h2 className={styles.finalCertificationTitle}>
                          {capacitacionCompleted
                            ? "Certificacion final disponible"
                            : "Certificacion final"}
                        </h2>

                        <p className={styles.finalCertificationText}>
                          {capacitacionCompleted
                            ? "Ya podes acceder al examen final para obtener tu certificado."
                            : "Completa todos los modulos para habilitar el examen final."}
                        </p>

                        <div className={styles.finalCertificationActions}>
                          {capacitacionCompleted ? (
                            <Link
                              to={`/certificaciones/${certification.id}`}
                              className={styles.finalCertificationButton}
                            >
                              <Award size={18} />
                              Ir al examen final
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className={styles.finalCertificationButtonDisabled}
                            >
                              <Lock size={18} />
                              Examen bloqueado
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default CapacitacionDetalle;
