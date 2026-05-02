import React from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Lock } from "lucide-react";
import ModuleExam from "../components/ModuleExam";
import useCapacitacionProgress from "../hooks/useCapacitacionProgress";
import { isModuleUnlocked } from "../services/learningProgressService";
import { getModuleRoute, parseModuleIndex } from "../utils/learningRuntime";

function CapacitacionModuloExam() {
  const { capacitacionId, moduloIndex: moduloIndexParam } = useParams();
  const navigate = useNavigate();
  const moduleIndex = parseModuleIndex(moduloIndexParam);
  const { capacitacion, completedResourceIds, loading, error } =
    useCapacitacionProgress(capacitacionId, { onlyPublished: true });

  const modules = capacitacion?.modulos ?? [];
  const module = moduleIndex >= 0 ? modules[moduleIndex] : null;
  const moduleUnlocked =
    moduleIndex >= 0
      ? isModuleUnlocked(moduleIndex, modules, completedResourceIds)
      : false;
  const modulePath =
    moduleIndex >= 0 ? getModuleRoute(capacitacionId, moduleIndex) : null;
  const pageTitle = module
    ? `Examen | ${module.titulo} | IRRIDELTA`
    : "Examen de modulo | IRRIDELTA";

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className="min-h-[70vh] bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          {modulePath && (
            <Link
              to={modulePath}
              className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-600"
            >
              <ChevronLeft size={18} />
              Volver al modulo
            </Link>
          )}

          {loading && (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-md">
              Cargando examen...
            </div>
          )}

          {!loading && error && <div className="alert-error">{error}</div>}

          {!loading && !error && !module && (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-md">
              No encontramos el examen del modulo solicitado.
            </div>
          )}

          {!loading && !error && module && !moduleUnlocked && (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-md">
              <div className="mx-auto mb-4 inline-flex rounded-full bg-gray-100 p-4">
                <Lock size={30} className="text-gray-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Este examen todavia esta bloqueado
              </h1>
              <p className="mt-3 text-gray-600">
                Primero debes desbloquear el modulo para poder rendirlo.
              </p>
            </div>
          )}

          {!loading && !error && module && moduleUnlocked && (
            <ModuleExam
              module={module}
              isUnlocked={moduleUnlocked}
              isCompleted={false}
              disabled={!moduleUnlocked}
              variant="standalone"
              courseTitle={capacitacion?.titulo}
              onExit={() => navigate(modulePath)}
            />
          )}
        </div>
      </section>
    </>
  );
}

export default CapacitacionModuloExam;
