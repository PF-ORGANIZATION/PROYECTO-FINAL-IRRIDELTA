import React from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  ExternalLink,
  FileText,
  Lock,
  PlayCircle,
} from "lucide-react";
import YouTubePlayer from "../components/YouTubePlayer";
import useCapacitacionProgress from "../hooks/useCapacitacionProgress";
import {
  isModuleUnlocked,
  isResourceUnlocked,
} from "../services/learningProgressService";
import {
  getModuleExamRoute,
  getModuleRoute,
  getResourceHref,
  getResourceLabel,
  isModuleCompleted,
  parseModuleIndex,
} from "../utils/learningRuntime";

function CapacitacionModulo() {
  const { capacitacionId, moduloIndex: moduloIndexParam } = useParams();
  const moduleIndex = parseModuleIndex(moduloIndexParam);
  const {
    capacitacion,
    completedResourceIds,
    loading,
    loadingProgress,
    error,
    progressError,
    savingResourceId,
    automaticTrackingResourceIds,
    markResourceAsCompleted,
    setTrackingReady,
  } = useCapacitacionProgress(capacitacionId, { onlyPublished: true });

  const modules = capacitacion?.modulos ?? [];
  const module = moduleIndex >= 0 ? modules[moduleIndex] : null;
  const moduleUnlocked =
    moduleIndex >= 0
      ? isModuleUnlocked(moduleIndex, modules, completedResourceIds)
      : false;
  const moduleCompleted = module
    ? isModuleCompleted(module, completedResourceIds)
    : false;
  const previousModulePath =
    moduleIndex > 0 ? getModuleRoute(capacitacionId, moduleIndex - 1) : null;
  const nextModuleIndex = moduleIndex + 1;
  const hasNextModule = nextModuleIndex < modules.length;
  const nextModuleUnlocked = hasNextModule
    ? isModuleUnlocked(nextModuleIndex, modules, completedResourceIds)
    : false;
  const nextModulePath = hasNextModule
    ? getModuleRoute(capacitacionId, nextModuleIndex)
    : null;
  const moduleExamPath =
    module && Array.isArray(module.preguntas) && module.preguntas.length > 0
      ? getModuleExamRoute(capacitacionId, moduleIndex)
      : null;
  const pageTitle = module
    ? `${module.titulo} | ${capacitacion?.titulo ?? "Capacitacion"} | IRRIDELTA`
    : "Modulo | IRRIDELTA";

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className="min-h-[70vh] bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <Link
            to={`/capacitaciones/${capacitacionId}`}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-600"
          >
            <ChevronLeft size={18} />
            Volver al detalle de la capacitacion
          </Link>

          {loading && (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-md">
              Cargando modulo...
            </div>
          )}

          {!loading && error && <div className="alert-error">{error}</div>}

          {!loading && !error && !module && (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-md">
              No encontramos el modulo solicitado.
            </div>
          )}

          {!loading && !error && module && !moduleUnlocked && (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-md">
              <div className="mx-auto mb-4 inline-flex rounded-full bg-gray-100 p-4">
                <Lock size={30} className="text-gray-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Este modulo todavia esta bloqueado
              </h1>
              <p className="mt-3 text-gray-600">
                Completa los modulos anteriores para acceder a este contenido.
              </p>
            </div>
          )}

          {!loading && !error && module && moduleUnlocked && (
            <>
              <article className="rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700">
                        Modulo {moduleIndex + 1}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          moduleCompleted
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {moduleCompleted ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <PlayCircle size={12} />
                        )}
                        {moduleCompleted ? "Completo" : "En progreso"}
                      </span>
                    </div>

                    <h1 className="mt-4 text-3xl font-bold text-gray-900">
                      {module.titulo}
                    </h1>
                    <p className="mt-2 text-sm font-medium text-gray-500">
                      {capacitacion?.titulo}
                    </p>

                    {module.descripcion && (
                      <p className="mt-4 max-w-4xl text-sm leading-7 text-gray-600">
                        {module.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:w-[320px] lg:grid-cols-1">
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">Recursos:</span>{" "}
                      {module.recursos?.length ?? 0}
                    </div>
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">Examen:</span>{" "}
                      {module.preguntas?.length ?? 0} preguntas
                    </div>
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">Estado:</span>{" "}
                      {moduleCompleted ? "Completado" : "Disponible"}
                    </div>
                  </div>
                </div>
              </article>

              {progressError && (
                <div className="alert-error mt-6">{progressError}</div>
              )}

              <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
                <div className="mb-6 flex flex-col gap-3 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Materiales del modulo
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      Recorre los recursos del modulo y marca cada uno como visto
                      para registrar tu avance.
                    </p>
                  </div>

                  {loadingProgress && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                      Actualizando progreso...
                    </span>
                  )}
                </div>

                {!module.recursos?.length && (
                  <div className="rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-600">
                    Este modulo no tiene recursos cargados.
                  </div>
                )}

                {module.recursos?.length > 0 && (
                  <div className="space-y-6">
                    {module.recursos.map((resource, resourceIndex) => {
                      const href = getResourceHref(resource);
                      const isFile = resource.tipo === "archivo";
                      const isYoutube = resource.tipo === "youtube";
                      const resourceUnlocked = isResourceUnlocked(
                        moduleIndex,
                        resourceIndex,
                        modules,
                        completedResourceIds
                      );
                      const resourceCompleted = completedResourceIds.has(resource.id);
                      const hasAutomaticTracking =
                        automaticTrackingResourceIds.has(resource.id);

                      if (!href) {
                        return null;
                      }

                      return (
                        <article
                          key={resource.id ?? `${module.id}-${resourceIndex}`}
                          className={`rounded-2xl border p-5 ${
                            resourceCompleted
                              ? "border-green-200 bg-green-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                Recurso {resourceIndex + 1}
                              </p>
                              <h3 className="mt-1 text-lg font-bold text-gray-900">
                                {getResourceLabel(resource)}
                              </h3>
                            </div>

                            {resourceCompleted ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                <CheckCircle2 size={12} />
                                Completado
                              </span>
                            ) : !resourceUnlocked ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                                <Lock size={12} />
                                Bloqueado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                <Clock3 size={12} />
                                Pendiente
                              </span>
                            )}
                          </div>

                          {isYoutube && resourceUnlocked ? (
                            <YouTubePlayer
                              youtubeUrl={href}
                              onComplete={() =>
                                markResourceAsCompleted(module, resource)
                              }
                              onTrackingReady={(isReady) =>
                                setTrackingReady(resource.id, isReady)
                              }
                            />
                          ) : (
                            <div className="flex flex-wrap items-center gap-3">
                              {resourceUnlocked ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow transition duration-200 ${
                                    isFile
                                      ? "bg-green-600 hover:bg-green-700"
                                      : "bg-red-600 hover:bg-red-700"
                                  }`}
                                >
                                  {isFile ? <FileText size={16} /> : <PlayCircle size={16} />}
                                  Abrir recurso
                                  <ExternalLink size={15} />
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-300 px-4 py-3 text-sm font-semibold text-gray-600"
                                >
                                  {isFile ? <FileText size={16} /> : <PlayCircle size={16} />}
                                  Recurso bloqueado
                                </button>
                              )}
                            </div>
                          )}

                          {resourceUnlocked &&
                            !resourceCompleted &&
                            (!isYoutube || !hasAutomaticTracking) && (
                              <div className="mt-4">
                                <button
                                  type="button"
                                  className="btn-primary text-sm"
                                  disabled={
                                    savingResourceId === resource.id || loadingProgress
                                  }
                                  onClick={() =>
                                    markResourceAsCompleted(module, resource)
                                  }
                                >
                                  {savingResourceId === resource.id
                                    ? "Guardando..."
                                    : "Marcar como visto"}
                                </button>
                              </div>
                            )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Examen del modulo
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      El examen se realiza en una pantalla dedicada para una
                      experiencia mas enfocada.
                    </p>
                  </div>

                  {moduleExamPath ? (
                    <Link
                      to={moduleExamPath}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-green-700"
                    >
                      Ir al examen
                      <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <span className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-600">
                      Este modulo no tiene examen configurado.
                    </span>
                  )}
                </div>
              </section>

              <section className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Navegacion anterior
                  </p>
                  {previousModulePath ? (
                    <Link
                      to={previousModulePath}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-600"
                    >
                      <ArrowLeft size={16} />
                      Volver al modulo anterior
                    </Link>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">
                      Este es el primer modulo de la capacitacion.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Siguiente paso
                  </p>
                  {nextModulePath && nextModuleUnlocked ? (
                    <Link
                      to={nextModulePath}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-600"
                    >
                      Continuar con el siguiente modulo
                      <ArrowRight size={16} />
                    </Link>
                  ) : nextModulePath ? (
                    <p className="mt-3 text-sm text-gray-500">
                      El siguiente modulo se habilita cuando completes este.
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">
                      Este es el ultimo modulo de la capacitacion.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default CapacitacionModulo;
