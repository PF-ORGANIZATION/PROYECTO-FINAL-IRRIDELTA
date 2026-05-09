import React from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ModuleExam from "../components/ModuleExam";
import useCapacitacionProgress from "../hooks/useCapacitacionProgress";
import {
  isModuleUnlocked,
} from "../services/learningProgressService";
import {
  areModuleResourcesCompleted,
} from "../utils/learningRuntime";
import { getModuleRoute, parseModuleIndex } from "../utils/learningRuntime";
import { generateSlug } from "../services/learningContentService";
import { USER_ROLES } from "../../auth/authRoles";
import { useSessionStore } from "../../../store/sessionStore";

function CapacitacionModuloExamen() {
  const { capacitacionSlug, moduloIndex: moduloIndexParam } = useParams();
  const moduleIndex = parseModuleIndex(moduloIndexParam);
  const role = useSessionStore((state) => state.role);
  const onlyPublished = role !== USER_ROLES.ADMIN;
  const {
    capacitacion,
    completedResourceIds,
    loading,
    error,
  } = useCapacitacionProgress(capacitacionSlug, { onlyPublished });

  const modules = capacitacion?.modulos ?? [];
  const module = moduleIndex >= 0 ? modules[moduleIndex] : null;
  const moduleUnlocked =
    moduleIndex >= 0
      ? isModuleUnlocked(moduleIndex, modules, completedResourceIds)
      : false;
  const moduleResourcesCompleted =
    areModuleResourcesCompleted(module, completedResourceIds);
  const modulePath = getModuleRoute(generateSlug(capacitacion?.titulo), moduleIndex);
  const moduleHasAssessment =
    module && Array.isArray(module.preguntas) && module.preguntas.length > 0;

  const pageTitle = module
    ? `Examen - ${module.titulo} | ${capacitacion?.titulo ?? "Capacitacion"} | IRRIDELTA`
    : "Examen | IRRIDELTA";

  if (loading) {
    return (
      <section className="page-wrapper">
        <div className="container-main">
          <div className="card text-center py-12">Cargando examen...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-wrapper">
        <div className="container-main">
          <div className="alert-error">{error}</div>
        </div>
      </section>
    );
  }

  if (!module) {
    return (
      <section className="page-wrapper">
        <div className="container-main">
          <div className="card text-center py-12">
            No encontramos el módulo solicitado.
          </div>
        </div>
      </section>
    );
  }

  if (!moduleUnlocked) {
    return (
      <section className="page-wrapper">
        <div className="container-main">
          <div className="card text-center py-12">
            Este módulo todavía está bloqueado. Completa los módulos anteriores para acceder al examen.
          </div>
        </div>
      </section>
    );
  }

  if (!moduleResourcesCompleted) {
    return (
      <section className="page-wrapper">
        <div className="container-main">
          <div className="card text-center py-12">
            Completa todos los recursos del módulo antes de realizar el examen.
          </div>
        </div>
      </section>
    );
  }

  if (!moduleHasAssessment) {
    return (
      <section className="page-wrapper">
        <div className="container-main">
          <div className="card text-center py-12">
            Este módulo no tiene examen configurado.
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className="page-wrapper">
        <div className="container-main">
          <Link
            to={modulePath}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-600"
          >
            <ArrowLeft size={18} />
            Volver al módulo
          </Link>

          <ModuleExam
            module={module}
            isUnlocked={moduleResourcesCompleted}
            variant="standalone"
            courseTitle={capacitacion?.titulo}
          />
        </div>
      </section>
    </>
  );
}

export default CapacitacionModuloExamen;