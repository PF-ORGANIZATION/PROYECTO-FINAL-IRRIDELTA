import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  MAX_DURATION_MINUTES,
  MAX_OPTIONS,
  MAX_QUESTIONS,
  MIN_OPTIONS,
  QUESTION_TYPES,
  buildQuestion,
} from "../utils/assessments";

function AssessmentEditor({
  value,
  onChange,
  title,
  description,
  countFieldKey = null,
  countFieldLabel = "Cantidad de preguntas a mostrar",
  showQuestionToolbar = true,
  showHeader = true,
}) {
  const [collapsedQuestions, setCollapsedQuestions] = useState({});

  useEffect(() => {
    setCollapsedQuestions((current) => {
      const next = {};

      value.preguntas.forEach((question, index) => {
        next[question.id] = current[question.id] ?? index !== value.preguntas.length - 1;
      });

      return next;
    });
  }, [value.preguntas]);

  const updateAssessment = (changes) => {
    onChange({
      ...value,
      ...changes,
    });
  };

  const updateQuestion = (questionId, updater) => {
    updateAssessment({
      preguntas: value.preguntas.map((question) =>
        question.id === questionId ? updater(question) : question
      ),
    });
  };

  const handleQuestionTypeChange = (questionId, nextType) => {
    updateQuestion(questionId, (question) => {
      if (nextType === QUESTION_TYPES.TRUE_FALSE) {
        return {
          ...question,
          tipo: QUESTION_TYPES.TRUE_FALSE,
          opciones: ["Verdadero", "Falso"],
          respuesta_correcta: 0,
        };
      }

      const fallbackOptions =
        question.tipo === QUESTION_TYPES.MULTIPLE_CHOICE &&
        question.opciones.length >= MIN_OPTIONS
          ? question.opciones
          : ["", "", "", ""];

      return {
        ...question,
        tipo: QUESTION_TYPES.MULTIPLE_CHOICE,
        opciones: fallbackOptions,
        respuesta_correcta: 0,
      };
    });
  };

  const handleAddQuestion = (type) => {
    if (value.preguntas.length >= MAX_QUESTIONS) {
      return;
    }

    updateAssessment({
      preguntas: [...value.preguntas, buildQuestion(type)],
    });
  };

  const toggleQuestionCollapse = (questionId) => {
    setCollapsedQuestions((current) => ({
      ...current,
      [questionId]: !current[questionId],
    }));
  };

  const handleDeleteQuestion = (questionId) => {
    if (value.preguntas.length === 1) {
      return;
    }

    const nextQuestions = value.preguntas.filter(
      (question) => question.id !== questionId
    );
    const changes = { preguntas: nextQuestions };

    if (countFieldKey) {
      changes[countFieldKey] = Math.min(
        Number(value[countFieldKey] ?? nextQuestions.length),
        nextQuestions.length
      );
    }

    updateAssessment(changes);
  };

  const handleAddOption = (questionId) => {
    updateQuestion(questionId, (question) => {
      if (
        question.tipo !== QUESTION_TYPES.MULTIPLE_CHOICE ||
        question.opciones.length >= MAX_OPTIONS
      ) {
        return question;
      }

      return {
        ...question,
        opciones: [...question.opciones, ""],
      };
    });
  };

  const handleRemoveOption = (questionId, optionIndex) => {
    updateQuestion(questionId, (question) => {
      if (
        question.tipo !== QUESTION_TYPES.MULTIPLE_CHOICE ||
        question.opciones.length <= MIN_OPTIONS
      ) {
        return question;
      }

      const nextOptions = question.opciones.filter(
        (_option, index) => index !== optionIndex
      );

      let nextCorrectIndex = question.respuesta_correcta;

      if (nextCorrectIndex === optionIndex) {
        nextCorrectIndex = 0;
      } else if (nextCorrectIndex > optionIndex) {
        nextCorrectIndex -= 1;
      }

      return {
        ...question,
        opciones: nextOptions,
        respuesta_correcta: nextCorrectIndex,
      };
    });
  };

  return (
    <div className="space-y-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
      {showHeader && (
        <div>
          <h5 className="text-base font-semibold text-gray-900">{title}</h5>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}

      <div className={`grid gap-4 ${countFieldKey ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {countFieldKey && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {countFieldLabel}
            </label>
            <input
              type="number"
              min="1"
              max={Math.max(value.preguntas.length, 1)}
              value={value[countFieldKey]}
              onChange={(e) =>
                updateAssessment({
                  [countFieldKey]: Number(e.target.value),
                })
              }
              className="w-full rounded border p-3"
              required
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            % de aprobacion
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={value.porcentaje_aprobacion}
            onChange={(e) =>
              updateAssessment({
                porcentaje_aprobacion: Number(e.target.value),
              })
            }
            className="w-full rounded border p-3"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Duracion maxima en minutos
          </label>
          <input
            type="number"
            min="1"
            max={MAX_DURATION_MINUTES}
            value={value.duracion_maxima_minutos}
            onChange={(e) =>
              updateAssessment({
                duracion_maxima_minutos: Number(e.target.value),
              })
            }
            className="w-full rounded border p-3"
            required
          />
        </div>
      </div>

      {showQuestionToolbar && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleAddQuestion(QUESTION_TYPES.MULTIPLE_CHOICE)}
            disabled={value.preguntas.length >= MAX_QUESTIONS}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow transition duration-200 hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Agregar multiple choice
          </button>

          <button
            type="button"
            onClick={() => handleAddQuestion(QUESTION_TYPES.TRUE_FALSE)}
            disabled={value.preguntas.length >= MAX_QUESTIONS}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow transition duration-200 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            Agregar verdadero/falso
          </button>

          <span className="self-center text-sm text-gray-500">
            {value.preguntas.length} / {MAX_QUESTIONS} preguntas
          </span>
        </div>
      )}

      <div className="space-y-4">
        {value.preguntas.map((question, index) => (
          <article key={question.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <button
                type="button"
                onClick={() => toggleQuestionCollapse(question.id)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
                aria-expanded={!collapsedQuestions[question.id]}
              >
                <ChevronDown
                  className={`mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500 transition-transform duration-200 ${
                    collapsedQuestions[question.id] ? "-rotate-90" : "rotate-0"
                  }`}
                />
                <div className="min-w-0">
                  <h6 className="text-base font-semibold text-gray-900">
                    Pregunta {index + 1}
                  </h6>
                  <p className="mt-1 truncate text-sm text-slate-600">
                    {question.enunciado.trim() || "Sin enunciado"}
                  </p>
                </div>
              </button>

              <div className="flex flex-wrap gap-2">
                <select
                  value={question.tipo}
                  onChange={(e) =>
                    handleQuestionTypeChange(question.id, e.target.value)
                  }
                  className="rounded border px-3 py-2 text-sm"
                >
                  <option value={QUESTION_TYPES.MULTIPLE_CHOICE}>
                    Multiple choice
                  </option>
                  <option value={QUESTION_TYPES.TRUE_FALSE}>
                    Verdadero/Falso
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(question.id)}
                  disabled={value.preguntas.length === 1}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {!collapsedQuestions[question.id] && (
              <>
                <textarea
                  placeholder="Enunciado de la pregunta"
                  value={question.enunciado}
                  onChange={(e) =>
                    updateQuestion(question.id, (currentQuestion) => ({
                      ...currentQuestion,
                      enunciado: e.target.value,
                    }))
                  }
                  className="mb-4 min-h-[90px] w-full rounded border p-3"
                />

                <div className="space-y-3">
                  {question.opciones.map((option, optionIndex) => (
                    <div
                      key={`${question.id}-option-${optionIndex}`}
                      className="flex items-center gap-3"
                    >
                      <input
                        type="radio"
                        name={`correct-${question.id}`}
                        checked={question.respuesta_correcta === optionIndex}
                        onChange={() =>
                          updateQuestion(question.id, (currentQuestion) => ({
                            ...currentQuestion,
                            respuesta_correcta: optionIndex,
                          }))
                        }
                      />

                      {question.tipo === QUESTION_TYPES.MULTIPLE_CHOICE ? (
                        <>
                          <input
                            type="text"
                            placeholder={`Opcion ${optionIndex + 1}`}
                            value={option}
                            onChange={(e) =>
                              updateQuestion(question.id, (currentQuestion) => ({
                                ...currentQuestion,
                                opciones: currentQuestion.opciones.map(
                                  (currentOption, currentOptionIndex) =>
                                    currentOptionIndex === optionIndex
                                      ? e.target.value
                                      : currentOption
                                ),
                              }))
                            }
                            className="flex-1 rounded border p-3"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveOption(question.id, optionIndex)
                            }
                            disabled={question.opciones.length <= MIN_OPTIONS}
                            className="rounded-lg bg-gray-500 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            Quitar
                          </button>
                        </>
                      ) : (
                        <div className="rounded border bg-gray-50 px-4 py-3 text-sm text-gray-700">
                          {option}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {question.tipo === QUESTION_TYPES.MULTIPLE_CHOICE && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => handleAddOption(question.id)}
                      disabled={question.opciones.length >= MAX_OPTIONS}
                      className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      Agregar opcion
                    </button>
                  </div>
                )}
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

export default AssessmentEditor;
