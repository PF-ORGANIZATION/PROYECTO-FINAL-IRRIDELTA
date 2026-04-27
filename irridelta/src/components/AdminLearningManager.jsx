import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  CircleCheck,
  Download,
  Eye,
  FileQuestion,
  Globe,
  Layers3,
  ListChecks,
  Save,
} from "lucide-react";
import { ALLOWED_RESOURCE_EXTENSIONS, RESOURCE_TYPES, saveLearningItem } from "../services/learningContentService";
import {
  createEmptyModule,
  isFinalAssessmentConfigured,
  isModuleAssessmentConfigured,
} from "../utils/adminCapacitacionesForm";
import AssessmentModal from "./AssessmentModal";
import AssessmentSummaryCard from "./AssessmentSummaryCard";
import CapacitacionPreviewModal from "./CapacitacionPreviewModal";
import ModuleCard from "./ModuleCard";
import {
  buildImportedQuestion,
  getQuestionFingerprint,
  isQuestionEmpty,
  isQuestionReadyForImport,
} from "../utils/assessments";

const EDITOR_TABS = {
  GENERAL: "general",
  MODULES: "modules",
  FINAL: "final",
};

function getFileExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function getGeneralSectionComplete(form) {
  return Boolean(form.titulo.trim());
}

function getModulesSectionComplete(form) {
  return (
    form.modulos.length > 0 &&
    form.modulos.every(
      (module) => module.titulo.trim() && isModuleAssessmentConfigured(module)
    )
  );
}

function getFinalAssessmentSectionComplete(form) {
  return isFinalAssessmentConfigured(form.certificacion);
}

function getPublishBlockInfo(form) {
  if (!getGeneralSectionComplete(form)) {
    return {
      tab: EDITOR_TABS.GENERAL,
      message: "Completa los datos generales antes de publicar.",
    };
  }

  if (!getModulesSectionComplete(form)) {
    return {
      tab: EDITOR_TABS.MODULES,
      message: "Completa todos los modulos y sus pruebas antes de publicar.",
    };
  }

  if (!getFinalAssessmentSectionComplete(form)) {
    return {
      tab: EDITOR_TABS.FINAL,
      message: "Completa la evaluacion final antes de publicar.",
    };
  }

  return null;
}

function AdminLearningManager({
  form,
  setForm,
  title,
  onBack,
  onSaveSuccess,
  onSaveAndExitSuccess,
}) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [activeTab, setActiveTab] = useState(EDITOR_TABS.GENERAL);
  const [activeModuleAssessmentIndex, setActiveModuleAssessmentIndex] = useState(null);
  const [isFinalAssessmentModalOpen, setIsFinalAssessmentModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [finalImportMessage, setFinalImportMessage] = useState("");
  const [moduleRemovalRequest, setModuleRemovalRequest] = useState(null);
  const submitModeRef = useRef("stay");
  const saveMenuRef = useRef(null);
  const publishBlockInfo = getPublishBlockInfo(form);
  const isPublishDisabled = !form.publicada && Boolean(publishBlockInfo);

  useEffect(() => {
    if (!isSaveMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!saveMenuRef.current?.contains(event.target)) {
        setIsSaveMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isSaveMenuOpen]);

  const currentModuleAssessment = useMemo(() => {
    if (activeModuleAssessmentIndex === null) {
      return null;
    }

    return form.modulos[activeModuleAssessmentIndex] ?? null;
  }, [activeModuleAssessmentIndex, form.modulos]);

  const sectionStatuses = [
    {
      id: EDITOR_TABS.GENERAL,
      icon: Layers3,
      title: "Datos generales",
      complete: getGeneralSectionComplete(form),
    },
    {
      id: EDITOR_TABS.MODULES,
      icon: ListChecks,
      title: "Modulos",
      complete: getModulesSectionComplete(form),
    },
    {
      id: EDITOR_TABS.FINAL,
      icon: FileQuestion,
      title: "Evaluacion final",
      complete: getFinalAssessmentSectionComplete(form),
    },
  ];

  const updateModule = (moduleIndex, changes) => {
    setForm((currentForm) => ({
      ...currentForm,
      modulos: currentForm.modulos.map((module, index) =>
        index === moduleIndex ? { ...module, ...changes } : module
      ),
    }));
  };

  const updateFinalCertification = (changes) => {
    setForm((currentForm) => ({
      ...currentForm,
      certificacion: {
        ...currentForm.certificacion,
        ...changes,
      },
    }));
  };

  const importModuleQuestionsToFinal = () => {
    const existingQuestions = form.certificacion.preguntas ?? [];
    const importableQuestions = form.modulos
      .flatMap((module) => module.preguntas ?? [])
      .filter(isQuestionReadyForImport);

    if (importableQuestions.length === 0) {
      setFinalImportMessage("No hay preguntas de modulos listas para importar.");
      return;
    }

    const existingFingerprints = new Set(
      existingQuestions
        .filter((question) => !isQuestionEmpty(question))
        .map(getQuestionFingerprint)
    );

    const newQuestions = importableQuestions
      .filter((question) => !existingFingerprints.has(getQuestionFingerprint(question)))
      .map(buildImportedQuestion);

    if (newQuestions.length === 0) {
      setFinalImportMessage("No hay preguntas nuevas para importar.");
      return;
    }

    const shouldReplaceInitialBlankQuestion =
      existingQuestions.length === 1 && isQuestionEmpty(existingQuestions[0]);

    updateFinalCertification({
      preguntas: shouldReplaceInitialBlankQuestion
        ? newQuestions
        : [...existingQuestions, ...newQuestions],
    });

    setFinalImportMessage(
      `Se importaron ${newQuestions.length} pregunta${newQuestions.length === 1 ? "" : "s"} desde los modulos.`
    );
  };

  const addModule = () => {
    setForm((currentForm) => ({
      ...currentForm,
      modulos: [
        ...currentForm.modulos.map((module) => ({
          ...module,
          isCollapsed: true,
        })),
        createEmptyModule(currentForm.modulos.length),
      ],
    }));
  };

  const removeModule = (moduleIndex) => {
    setForm((currentForm) => {
      const nextModules = currentForm.modulos.filter(
        (_module, index) => index !== moduleIndex
      );

      return {
        ...currentForm,
        modulos: nextModules.length > 0 ? nextModules : [createEmptyModule()],
      };
    });
  };

  const requestModuleRemoval = (moduleIndex) => {
    const module = form.modulos[moduleIndex];

    setModuleRemovalRequest({
      index: moduleIndex,
      title: module?.titulo?.trim() || `Modulo ${moduleIndex + 1}`,
    });
  };

  const cancelModuleRemoval = () => {
    setModuleRemovalRequest(null);
  };

  const confirmModuleRemoval = () => {
    if (moduleRemovalRequest === null) {
      return;
    }

    removeModule(moduleRemovalRequest.index);
    setModuleRemovalRequest(null);
  };

  const handlePublishToggle = () => {
    if (form.publicada) {
      setFormError("");
      setForm((current) => ({ ...current, publicada: false }));
      return;
    }

    const blockInfo = getPublishBlockInfo(form);

    if (blockInfo) {
      setActiveTab(blockInfo.tab);
      setFormError(blockInfo.message);
      return;
    }

    setFormError("");
    setForm((current) => ({ ...current, publicada: true }));
  };

  const toggleModuleCollapse = (moduleIndex) => {
    setForm((currentForm) => ({
      ...currentForm,
      modulos: currentForm.modulos.map((module, index) =>
        index === moduleIndex
          ? { ...module, isCollapsed: !module.isCollapsed }
          : module
      ),
    }));
  };

  const handleFilesChange = (moduleIndex, fileList) => {
    const files = Array.from(fileList ?? []);
    const invalidFile = files.find(
      (file) => !ALLOWED_RESOURCE_EXTENSIONS.includes(getFileExtension(file.name))
    );

    if (invalidFile) {
      setFormError(
        `El archivo "${invalidFile.name}" no tiene un formato permitido. Formatos permitidos: ${ALLOWED_RESOURCE_EXTENSIONS.join(", ")}.`
      );
      return;
    }

    setFormError("");
    setForm((currentForm) => ({
      ...currentForm,
      modulos: currentForm.modulos.map((module, index) =>
        index === moduleIndex
          ? {
              ...module,
              selectedFiles: [...(module.selectedFiles ?? []), ...files],
            }
          : module
      ),
    }));
  };

  const removeSelectedFile = (moduleIndex, fileIndex) => {
    setForm((currentForm) => ({
      ...currentForm,
      modulos: currentForm.modulos.map((module, index) =>
        index === moduleIndex
          ? {
              ...module,
              selectedFiles: module.selectedFiles.filter(
                (_file, selectedIndex) => selectedIndex !== fileIndex
              ),
            }
          : module
      ),
    }));
  };

  const removeExistingResource = (moduleIndex, resourceId) => {
    setForm((currentForm) => ({
      ...currentForm,
      modulos: currentForm.modulos.map((module, index) => {
        if (index !== moduleIndex) {
          return module;
        }

        const removedResource = module.recursos.find(
          (resource) => resource.id === resourceId
        );
        const nextModule = {
          ...module,
          recursos: module.recursos.filter(
            (resource) => resource.id !== resourceId
          ),
        };

        if (removedResource?.tipo !== RESOURCE_TYPES.YOUTUBE) {
          return nextModule;
        }

        return {
          ...nextModule,
          youtubeLinksText: module.youtubeLinksText
            .split(/\r?\n/)
            .map((link) => link.trim())
            .filter((link) => link && link !== removedResource.youtube_url)
            .join("\n"),
        };
      }),
    }));
  };

  const validateForm = () => {
    if (!form.titulo.trim()) {
      setActiveTab(EDITOR_TABS.GENERAL);
      return "El titulo es obligatorio.";
    }

    if (!form.certificacion.titulo.trim()) {
      setActiveTab(EDITOR_TABS.FINAL);
      return "La prueba final debe tener un titulo.";
    }

    if (form.modulos.length === 0) {
      setActiveTab(EDITOR_TABS.MODULES);
      return "La capacitacion debe tener al menos un modulo.";
    }

    const moduleWithoutTitle = form.modulos.find(
      (module) => !module.titulo.trim()
    );

    if (moduleWithoutTitle) {
      setActiveTab(EDITOR_TABS.MODULES);
      return "Todos los modulos deben tener titulo.";
    }

    if (form.publicada) {
      const blockInfo = getPublishBlockInfo(form);

      if (blockInfo) {
        setActiveTab(blockInfo.tab);
        return blockInfo.message;
      }
    }

    return "";
  };

  const persistForm = async (mode = "stay") => {
    setFormError("");
    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);

    try {
      const savedItem = await saveLearningItem({
        ...form,
        certificacion: {
          ...form.certificacion,
          titulo:
            form.certificacion.titulo.trim() ||
            `Evaluacion final - ${form.titulo.trim()}`,
        },
      });

      if (mode === "exit") {
        onSaveAndExitSuccess(savedItem);
        return;
      }

      onSaveSuccess(savedItem);
    } catch (saveError) {
      console.error("No se pudo guardar la capacitacion", saveError);
      setFormError(
        saveError?.message
          ? `No se pudo guardar el contenido: ${saveError.message}`
          : "No se pudo guardar el contenido. Revisa permisos de base de datos y storage."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await persistForm(submitModeRef.current);
  };

  const triggerSave = async (mode) => {
    submitModeRef.current = mode;
    setIsSaveMenuOpen(false);
    await persistForm(mode);
  };

  const renderGeneralTab = () => (
    <section className="rounded-2xl bg-white p-6 shadow-md">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Datos generales</h3>
          <p className="mt-1 text-sm text-gray-600">
            Configura la informacion principal y el estado de publicacion.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            getGeneralSectionComplete(form)
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {getGeneralSectionComplete(form) ? "Completo" : "Pendiente"}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Titulo
          </label>
          <input
            type="text"
            placeholder="Titulo de la capacitacion"
            value={form.titulo}
            onChange={(e) => setForm((current) => ({ ...current, titulo: e.target.value }))}
            className="w-full rounded border p-3"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Descripcion
          </label>
          <textarea
            placeholder="Descripcion breve"
            value={form.descripcion}
            onChange={(e) =>
              setForm((current) => ({ ...current, descripcion: e.target.value }))
            }
            className="min-h-[140px] w-full rounded border p-3"
          />
        </div>
      </div>
    </section>
  );

  const renderModulesTab = () => (
    <section className="space-y-4 rounded-2xl bg-white p-6 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Modulos</h3>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              getModulesSectionComplete(form)
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {getModulesSectionComplete(form) ? "Completo" : "Pendiente"}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {form.modulos.map((module, moduleIndex) => (
          <ModuleCard
            key={module.clientId}
            module={module}
            index={moduleIndex}
            canRemove={form.modulos.length > 1}
            onToggle={() => toggleModuleCollapse(moduleIndex)}
            onRemove={() => requestModuleRemoval(moduleIndex)}
            onUpdate={(changes) => updateModule(moduleIndex, changes)}
            onFilesChange={(fileList) => handleFilesChange(moduleIndex, fileList)}
            onRemoveSelectedFile={(fileIndex) =>
              removeSelectedFile(moduleIndex, fileIndex)
            }
            onRemoveExistingResource={(resourceId) =>
              removeExistingResource(moduleIndex, resourceId)
            }
            onEditAssessment={() => setActiveModuleAssessmentIndex(moduleIndex)}
          />
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={addModule}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow transition duration-200 hover:bg-green-700"
        >
          Agregar modulo
        </button>
      </div>
    </section>
  );

  const renderFinalTab = () => (
    <section className="rounded-2xl bg-white p-6 shadow-md">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Evaluacion final</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            getFinalAssessmentSectionComplete(form)
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {getFinalAssessmentSectionComplete(form) ? "Completo" : "Pendiente"}
        </span>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <input
          type="text"
          placeholder="Titulo de la prueba final"
          value={form.certificacion.titulo}
          onChange={(e) => updateFinalCertification({ titulo: e.target.value })}
          className="w-full rounded border p-3"
          required
        />
      </div>

      <textarea
        placeholder="Descripcion de la prueba final"
        value={form.certificacion.descripcion}
        onChange={(e) =>
          updateFinalCertification({ descripcion: e.target.value })
        }
        className="mb-4 min-h-[120px] w-full rounded border p-3"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={importModuleQuestionsToFinal}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow transition duration-200 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Importar preguntas de modulos
        </button>

        {finalImportMessage && (
          <p className="text-sm text-slate-600">{finalImportMessage}</p>
        )}
      </div>

      <AssessmentSummaryCard
        title="Prueba final obligatoria"
        questionCount={form.certificacion.preguntas?.length ?? 0}
        questionCountToShow={form.certificacion.cantidad_preguntas_examen ?? 0}
        passingScore={form.certificacion.porcentaje_aprobacion ?? null}
        durationMinutes={form.certificacion.duracion_maxima_minutos ?? null}
        isConfigured={getFinalAssessmentSectionComplete(form)}
        onEdit={() => setIsFinalAssessmentModalOpen(true)}
        description=""
        showStatus={false}
        showMetrics
      />
    </section>
  );

  return (
    <section className="min-h-screen bg-gray-100 px-6 py-6 md:px-12 lg:px-24">
      <header className="mb-8 border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow transition duration-200 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  form.publicada
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {form.publicada ? "Publicada" : "Borrador"}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold text-gray-900">{title}</h1>
            <p className="mt-2 text-sm text-gray-600">
              Primero gestionas la capacitacion. Despues editas cada evaluacion en vistas enfocadas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow transition duration-200 hover:bg-slate-50"
            >
              <Eye className="h-4 w-4" />
              Ver
            </button>

            <button
              type="button"
              aria-pressed={form.publicada}
              onClick={handlePublishToggle}
              disabled={isPublishDisabled}
              title={
                isPublishDisabled
                  ? publishBlockInfo.message
                  : undefined
              }
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold shadow transition duration-200 ${
                form.publicada
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : isPublishDisabled
                    ? "cursor-not-allowed bg-gray-100 text-gray-400 hover:bg-gray-100"
                    : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Globe className="h-4 w-4" />
              {form.publicada ? "Publicada" : "Publicar"}
            </button>

            <div ref={saveMenuRef} className="relative flex">
              <button
                type="button"
                onClick={() => triggerSave("stay")}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-l-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <Save className="h-4 w-4" />
                {saving ? "Guardando..." : "Guardar"}
              </button>

              <button
                type="button"
                onClick={() => setIsSaveMenuOpen((current) => !current)}
                disabled={saving}
                aria-haspopup="menu"
                aria-expanded={isSaveMenuOpen}
                className="inline-flex items-center rounded-r-lg border-l border-white/20 bg-blue-600 px-3 py-3 text-white shadow transition duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <ChevronDown className="h-4 w-4" />
              </button>

              {isSaveMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+0.6rem)] z-30 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => triggerSave("stay")}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <Save className="h-4 w-4 text-blue-600" />
                    Guardar cambios
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerSave("exit")}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <CircleCheck className="h-4 w-4 text-slate-700" />
                    Guardar y salir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <nav className="sticky top-20 z-20 rounded-2xl bg-white p-3 shadow-md">
          <div className="flex flex-wrap gap-2">
            {sectionStatuses.map((section) => {
              const Icon = section.icon;
              const isActive = activeTab === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveTab(section.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.title}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      isActive
                        ? "bg-white/15 text-white"
                        : section.complete
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {section.complete ? "Completo" : "Pendiente"}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {activeTab === EDITOR_TABS.GENERAL && renderGeneralTab()}
        {activeTab === EDITOR_TABS.MODULES && renderModulesTab()}
        {activeTab === EDITOR_TABS.FINAL && renderFinalTab()}

        {formError && (
          <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
            {formError}
          </div>
        )}
      </form>

      <AssessmentModal
        isOpen={currentModuleAssessment !== null}
        title={
          currentModuleAssessment
            ? `Prueba del ${currentModuleAssessment.titulo.trim() || "módulo"}`
            : ""
        }
        description="Edita preguntas, cantidad a mostrar, porcentaje de aprobación y duración de la prueba del módulo."
        value={currentModuleAssessment ?? createEmptyModule(0)}
        onChange={(changes) => {
          if (activeModuleAssessmentIndex !== null) {
            updateModule(activeModuleAssessmentIndex, changes);
          }
        }}
        onClose={() => setActiveModuleAssessmentIndex(null)}
        countFieldKey="cantidad_preguntas_a_mostrar"
        countFieldLabel="Cantidad de preguntas a mostrar en la prueba"
      />

      <AssessmentModal
        isOpen={isFinalAssessmentModalOpen}
        title={form.certificacion.titulo || "Prueba final obligatoria"}
        description="Configura la evaluación final de la capacitación en una vista amplia y enfocada."
        value={form.certificacion}
        onChange={updateFinalCertification}
        onClose={() => setIsFinalAssessmentModalOpen(false)}
        countFieldKey="cantidad_preguntas_examen"
        countFieldLabel="Cantidad de preguntas a mostrar en la prueba final"
      />
      <CapacitacionPreviewModal
        item={isPreviewOpen ? form : null}
        onClose={() => setIsPreviewOpen(false)}
      />

      {moduleRemovalRequest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Cancelar eliminacion de modulo"
            onClick={cancelModuleRemoval}
            className="absolute inset-0 bg-slate-900/65"
          />

          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900">
                  Quitar modulo
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Vas a quitar "{moduleRemovalRequest.title}" junto con su contenido y preguntas.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={cancelModuleRemoval}
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow transition duration-200 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModuleRemoval}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition duration-200 hover:bg-red-700"
              >
                Quitar modulo
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminLearningManager;
