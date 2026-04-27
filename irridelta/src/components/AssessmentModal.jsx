import React, { useEffect } from "react";
import { X } from "lucide-react";
import AssessmentEditor from "./AssessmentEditor";
import { MAX_QUESTIONS, QUESTION_TYPES, buildQuestion } from "../utils/assessments";

function AssessmentModal({
  isOpen,
  title,
  description,
  value,
  onChange,
  onClose,
  countFieldKey = null,
  countFieldLabel = "Cantidad de preguntas a mostrar",
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const canAddQuestions = value.preguntas.length < MAX_QUESTIONS;

  const handleAddQuestion = (type) => {
    if (!canAddQuestions) {
      return;
    }

    onChange({
      ...value,
      preguntas: [...value.preguntas, buildQuestion(type)],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Cerrar editor de evaluación"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/65"
      />

      <div className="relative z-10 flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">
              Editor de evaluación
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">{title}</h2>
            {description && (
              <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto bg-gray-50 px-6 py-6">
          <AssessmentEditor
            title={title}
            description={description}
            value={value}
            onChange={onChange}
            countFieldKey={countFieldKey}
            countFieldLabel={countFieldLabel}
            showQuestionToolbar={false}
            showHeader={false}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleAddQuestion(QUESTION_TYPES.MULTIPLE_CHOICE)}
              disabled={!canAddQuestions}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow transition duration-200 hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              Agregar multiple choice
            </button>

            <button
              type="button"
              onClick={() => handleAddQuestion(QUESTION_TYPES.TRUE_FALSE)}
              disabled={!canAddQuestions}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow transition duration-200 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              Agregar verdadero/falso
            </button>

            <span className="text-sm text-gray-500">
              {value.preguntas.length} / {MAX_QUESTIONS} preguntas
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-blue-700"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssessmentModal;
