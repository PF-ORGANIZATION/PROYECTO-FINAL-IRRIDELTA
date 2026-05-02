import React from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Lock,
  PlayCircle,
} from "lucide-react";
import {
  isCapacitacionCompleted,
  isModuleUnlocked,
} from "../services/learningProgressService";
import useCapacitacionProgress from "../hooks/useCapacitacionProgress";
import {
  getModuleRoute,
  isModuleCompleted,
} from "../utils/learningRuntime";
import styles from "./CapacitacionDetalle.module.css";

function CapacitacionDetalle() {
  const { capacitacionId } = useParams();
  const {
    capacitacion,
    completedResourceIds,
    loading,
    loadingProgress,
    error,
    progressError,
  } = useCapacitacionProgress(capacitacionId, { onlyPublished: true });

  const modules = capacitacion?.modulos ?? [];
  const certification = capacitacion?.certificacion ?? null;
  const completedModulesCount = modules.filter((module) =>
    isModuleCompleted(module, completedResourceIds)
  ).length;
  const totalResources = modules.reduce(
    (total, module) => total + (module?.recursos?.length ?? 0),
    0
  );
  const completedResourcesCount = modules.reduce(
    (total, module) =>
      total +
      (module?.recursos ?? []).filter((resource) =>
        completedResourceIds.has(resource.id)
      ).length,
    0
  );
  const overallProgressPercentage =
    totalResources > 0
      ? Math.round((completedResourcesCount / totalResources) * 100)
      : 0;
  const capacitacionCompleted = isCapacitacionCompleted(
    modules,
    completedResourceIds
  );
  const pageTitle = capacitacion
    ? `${capacitacion.titulo} | Capacitaciones | IRRIDELTA`
    : "Detalle de capacitacion | IRRIDELTA";

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className={styles.page}>
        <div className={styles.inner}>
          <Link to="/capacitaciones" className={styles.backLink}>
            <ChevronLeft size={18} aria-hidden="true" />
            Volver a capacitaciones
          </Link>

          {loading && (
            <div className={styles.feedbackCard}>Cargando capacitacion...</div>
          )}

          {!loading && error && <div className="alert-error">{error}</div>}

          {!loading && !error && !capacitacion && (
            <div className={styles.feedbackCard}>
              No encontramos la capacitacion solicitada.
            </div>
          )}

          {!loading && !error && capacitacion && (
            <>
              <article className={styles.hero}>
                <div className={styles.heroTopRow}>
                  <span className={styles.heroEyebrow}>Ruta de capacitacion</span>
                  <span className={styles.heroStatus}>
                    {capacitacionCompleted ? "Completada" : "Activa"}
                  </span>
                </div>
                <h1 className={styles.title}>{capacitacion.titulo}</h1>

                {capacitacion.descripcion && (
                  <p className={styles.description}>{capacitacion.descripcion}</p>
                )}

                <div className={styles.metaRow}>
                  <span className={styles.badge}>
                    <BookOpen size={16} aria-hidden="true" />
                    {modules.length === 1 ? "1 modulo" : `${modules.length} modulos`}
                  </span>

                  <span className={styles.badge}>
                    <Award size={16} aria-hidden="true" />
                    {certification ? "Con certificacion" : "Sin certificacion"}
                  </span>

                  {capacitacion.created_at && (
                    <span className={styles.badge}>
                      <CalendarDays size={16} aria-hidden="true" />
                      Publicado el{" "}
                      {new Date(capacitacion.created_at).toLocaleDateString("es-AR")}
                    </span>
                  )}

                  {loadingProgress && (
                    <span className={styles.badge}>Cargando progreso...</span>
                  )}
                </div>
              </article>

              <section className={styles.summaryGrid}>
                <article className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>Avance general</p>
                  <div className={styles.summaryValueRow}>
                    <strong className={styles.summaryValue}>
                      {overallProgressPercentage}%
                    </strong>
                    <span className={styles.summaryHelper}>
                      {completedResourcesCount}/{totalResources} recursos
                    </span>
                  </div>
                </article>

                <article className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>Modulos completados</p>
                  <div className={styles.summaryValueRow}>
                    <strong className={styles.summaryValue}>
                      {completedModulesCount}/{modules.length}
                    </strong>
                    <span className={styles.summaryHelper}>
                      Cada modulo se recorre en una pantalla dedicada.
                    </span>
                  </div>
                </article>

                <article className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>Certificacion final</p>
                  <div className={styles.summaryValueRow}>
                    <strong className={styles.summaryValue}>
                      {certification ? "Disponible" : "No incluida"}
                    </strong>
                    <span className={styles.summaryHelper}>
                      {certification
                        ? "Se habilita al completar toda la capacitacion."
                        : "Esta ruta no incluye examen final."}
                    </span>
                  </div>
                </article>
              </section>

              {progressError && (
                <div className="alert-error mt-4">{progressError}</div>
              )}

              <section className={styles.section}>
                <div className="mb-6 flex items-center justify-between border-b-2 border-gray-200 pb-4">
                  <h2 className={styles.sectionTitle}>Modulos</h2>
                  <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                    <BookOpen size={16} />
                    {modules.length} {modules.length === 1 ? "modulo" : "modulos"}
                  </span>
                </div>

                {modules.length === 0 && (
                  <p className={styles.emptyText}>
                    Esta capacitacion todavia no tiene modulos publicados.
                  </p>
                )}

                {modules.length > 0 && (
                  <div className="grid gap-5">
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
                      const modulePath = getModuleRoute(capacitacion.id, moduleIndex);
                      const resourceCount = module.recursos?.length ?? 0;
                      const examReady = Array.isArray(module.preguntas)
                        ? module.preguntas.length > 0
                        : false;

                      return (
                        <article
                          key={module.id ?? `${capacitacion.id}-${moduleIndex}`}
                          className={`rounded-2xl border p-6 shadow-sm transition ${
                            moduleCompleted
                              ? "border-green-200 bg-green-50"
                              : "border-gray-200 bg-white"
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
                                    Completo
                                  </span>
                                )}

                                {!moduleCompleted && moduleUnlocked && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                    <PlayCircle size={12} />
                                    En curso
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
                                <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                  <span className="font-semibold text-gray-900">
                                    Recursos:
                                  </span>{" "}
                                  {resourceCount}
                                </div>
                                <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                  <span className="font-semibold text-gray-900">
                                    Examen:
                                  </span>{" "}
                                  {examReady ? "Disponible" : "Sin configurar"}
                                </div>
                                <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                  <span className="font-semibold text-gray-900">
                                    Estado:
                                  </span>{" "}
                                  {moduleCompleted
                                    ? "Completado"
                                    : moduleUnlocked
                                    ? "Disponible"
                                    : "Pendiente"}
                                </div>
                              </div>
                            </div>

                            <div className="flex w-full flex-col gap-3 lg:w-auto">
                              {moduleUnlocked ? (
                                <Link
                                  to={modulePath}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-green-700"
                                >
                                  Abrir modulo
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

              <section className={styles.section}>
                {certification ? (
                  <div className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-8 shadow-md">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 rounded-xl bg-green-500 p-3">
                        <Award size={28} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900">
                          Certificacion disponible
                        </h2>
                        <p className="mt-2 leading-relaxed text-gray-700">
                          Al completar todos los modulos, podras acceder al examen
                          final para obtener tu certificado.
                          {!capacitacionCompleted &&
                            " Completa todos los recursos para habilitarlo."}
                        </p>

                        <div className="mt-6">
                          {capacitacionCompleted ? (
                            <Link
                              to={`/certificaciones/${certification.id}`}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-bold text-white shadow-md transition-colors hover:bg-green-700"
                            >
                              <Award size={18} />
                              Realizar examen final
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-gray-300 px-6 py-3 font-bold text-gray-700"
                            >
                              <Lock size={18} />
                              Examen bloqueado
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-8">
                    <p className="text-center font-medium text-gray-600">
                      Esta capacitacion no tiene certificacion asociada.
                    </p>
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
