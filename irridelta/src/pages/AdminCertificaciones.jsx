import React, { useEffect, useState } from "react";
import {
  CERTIFICATION_QUESTION_TYPES,
  LEARNING_TYPES,
  deleteLearningItem,
  fetchLearningItems,
  saveCertification,
} from "../services/learningContentService";
import { formatDurationLabel } from "../utils/certifications";

const MAX_QUESTIONS = 100;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const MAX_DURATION_MINUTES = 600;

function buildQuestion(type = CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE) {
  const questionId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (type === CERTIFICATION_QUESTION_TYPES.TRUE_FALSE) {
    return {
      id: questionId,
      tipo: CERTIFICATION_QUESTION_TYPES.TRUE_FALSE,
      enunciado: "",
      opciones: ["Verdadero", "Falso"],
      respuesta_correcta: 0,
    };
  }

  return {
    id: questionId,
    tipo: CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE,
    enunciado: "",
    opciones: ["", "", "", ""],
    respuesta_correcta: 0,
  };
}

function getInitialForm() {
  return {
    id: null,
    titulo: "",
    descripcion: "",
    cantidad_preguntas_examen: 1,
    porcentaje_aprobacion: 70,
    duracion_maxima_minutos: 30,
    preguntas: [buildQuestion()],
  };
}

function AdminCertificaciones() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(getInitialForm());

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchLearningItems(LEARNING_TYPES.CERTIFICACION);
      setItems(data);
    } catch (loadError) {
      console.error("No se pudieron cargar las certificaciones", loadError);
      setError(
        "No se pudieron cargar las certificaciones. Revisa el esquema nuevo en Supabase."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(getInitialForm());
    setFormError("");
  };

  const updateQuestion = (questionId, updater) => {
    setForm((currentForm) => ({
      ...currentForm,
      preguntas: currentForm.preguntas.map((question) =>
        question.id === questionId ? updater(question) : question
      ),
    }));
  };

  const handleQuestionTypeChange = (questionId, nextType) => {
    updateQuestion(questionId, (question) => {
      if (nextType === CERTIFICATION_QUESTION_TYPES.TRUE_FALSE) {
        return {
          ...question,
          tipo: CERTIFICATION_QUESTION_TYPES.TRUE_FALSE,
          opciones: ["Verdadero", "Falso"],
          respuesta_correcta: 0,
        };
      }

      const fallbackOptions =
        question.tipo === CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE &&
        question.opciones.length >= MIN_OPTIONS
          ? question.opciones
          : ["", "", "", ""];

      return {
        ...question,
        tipo: CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE,
        opciones: fallbackOptions,
        respuesta_correcta: 0,
      };
    });
  };

  const handleAddQuestion = (type) => {
    setForm((currentForm) => {
      if (currentForm.preguntas.length >= MAX_QUESTIONS) {
        return currentForm;
      }

      return {
        ...currentForm,
        preguntas: [...currentForm.preguntas, buildQuestion(type)],
      };
    });
  };

  const handleDeleteQuestion = (questionId) => {
    setForm((currentForm) => {
      if (currentForm.preguntas.length === 1) {
        return currentForm;
      }

      const nextQuestions = currentForm.preguntas.filter(
        (question) => question.id !== questionId
      );

      return {
        ...currentForm,
        preguntas: nextQuestions,
        cantidad_preguntas_examen: Math.min(
          currentForm.cantidad_preguntas_examen,
          nextQuestions.length
        ),
      };
    });
  };

  const handleAddOption = (questionId) => {
    updateQuestion(questionId, (question) => {
      if (
        question.tipo !== CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE ||
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
        question.tipo !== CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE ||
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

  const validateForm = () => {
    if (!form.titulo.trim()) {
      return "El titulo es obligatorio.";
    }

    if (form.preguntas.length === 0) {
      return "Debes cargar al menos una pregunta.";
    }

    if (form.preguntas.length > MAX_QUESTIONS) {
      return `No puedes superar ${MAX_QUESTIONS} preguntas.`;
    }

    if (
      Number(form.cantidad_preguntas_examen) < 1 ||
      Number(form.cantidad_preguntas_examen) > form.preguntas.length
    ) {
      return "La cantidad de preguntas del examen debe estar entre 1 y la cantidad total cargada.";
    }

    if (
      Number(form.porcentaje_aprobacion) < 1 ||
      Number(form.porcentaje_aprobacion) > 100
    ) {
      return "El porcentaje de aprobacion debe estar entre 1 y 100.";
    }

    if (
      Number(form.duracion_maxima_minutos) < 1 ||
      Number(form.duracion_maxima_minutos) > MAX_DURATION_MINUTES
    ) {
      return `La duracion maxima debe estar entre 1 y ${MAX_DURATION_MINUTES} minutos.`;
    }

    for (let index = 0; index < form.preguntas.length; index += 1) {
      const question = form.preguntas[index];

      if (!question.enunciado.trim()) {
        return `La pregunta ${index + 1} no tiene enunciado.`;
      }

      if (question.tipo === CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE) {
        if (question.opciones.length < MIN_OPTIONS) {
          return `La pregunta ${index + 1} debe tener al menos ${MIN_OPTIONS} opciones.`;
        }

        const hasEmptyOption = question.opciones.some((option) => !option.trim());

        if (hasEmptyOption) {
          return `La pregunta ${index + 1} tiene opciones vacias.`;
        }
      }
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);

    try {
      await saveCertification({
        ...form,
        cantidad_preguntas_examen: Number(form.cantidad_preguntas_examen),
        porcentaje_aprobacion: Number(form.porcentaje_aprobacion),
        duracion_maxima_minutos: Number(form.duracion_maxima_minutos),
      });

      await loadItems();
      resetForm();
    } catch (saveError) {
      console.error("No se pudo guardar la certificacion", saveError);
      setFormError(
        "No se pudo guardar la certificacion. Revisa que la tabla tenga las columnas nuevas."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    const questions = Array.isArray(item.preguntas) && item.preguntas.length > 0
      ? item.preguntas.map((question, index) => ({
          id: question.id ?? `pregunta-${index + 1}`,
          tipo:
            question.tipo === CERTIFICATION_QUESTION_TYPES.TRUE_FALSE
              ? CERTIFICATION_QUESTION_TYPES.TRUE_FALSE
              : CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE,
          enunciado: question.enunciado ?? "",
          opciones:
            question.tipo === CERTIFICATION_QUESTION_TYPES.TRUE_FALSE
              ? ["Verdadero", "Falso"]
              : question.opciones ?? ["", ""],
          respuesta_correcta: Number(question.respuesta_correcta ?? 0),
        }))
      : [buildQuestion()];

    setForm({
      id: item.id,
      titulo: item.titulo ?? "",
      descripcion: item.descripcion ?? "",
      cantidad_preguntas_examen:
        Number(item.cantidad_preguntas_examen) > 0
          ? Number(item.cantidad_preguntas_examen)
          : questions.length,
      porcentaje_aprobacion:
        Number(item.porcentaje_aprobacion) > 0
          ? Number(item.porcentaje_aprobacion)
          : 70,
      duracion_maxima_minutos:
        Number(item.duracion_maxima_minutos) > 0
          ? Number(item.duracion_maxima_minutos)
          : 30,
      preguntas: questions,
    });
    setFormError("");
  };

  const handleDelete = async (item) => {
    const shouldDelete = window.confirm(
      `Seguro que quieres eliminar la certificacion "${item.titulo}"?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteLearningItem(item);
      await loadItems();

      if (form.id === item.id) {
        resetForm();
      }
    } catch (deleteError) {
      console.error("No se pudo eliminar la certificacion", deleteError);
      setError("No se pudo eliminar la certificacion.");
    }
  };

  return (
    <section className="min-h-screen bg-gray-100 px-6 py-6 md:px-12 lg:px-24">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">Panel de Certificaciones</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configura preguntas multiple choice o verdadero/falso, la cantidad a
          rendir, el porcentaje de aprobacion y el tiempo maximo de examen.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold">
            {form.id ? "Editar certificacion" : "Nueva certificacion"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Titulo"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="w-full rounded border p-3"
                required
              />

              <input
                type="number"
                min="1"
                max="100"
                placeholder="% de aprobacion"
                value={form.porcentaje_aprobacion}
                onChange={(e) =>
                  setForm({
                    ...form,
                    porcentaje_aprobacion: Number(e.target.value),
                  })
                }
                className="w-full rounded border p-3"
                required
              />
            </div>

            <textarea
              placeholder="Descripcion breve"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="min-h-[110px] w-full rounded border p-3"
            />

            <div className="grid gap-4 rounded-lg border bg-gray-50 p-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Cantidad de preguntas que rendira el cliente
                </label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(form.preguntas.length, 1)}
                  value={form.cantidad_preguntas_examen}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cantidad_preguntas_examen: Number(e.target.value),
                    })
                  }
                  className="w-full rounded border p-3"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Duracion maxima del examen en minutos
                </label>
                <input
                  type="number"
                  min="1"
                  max={MAX_DURATION_MINUTES}
                  value={form.duracion_maxima_minutos}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      duracion_maxima_minutos: Number(e.target.value),
                    })
                  }
                  className="w-full rounded border p-3"
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  handleAddQuestion(CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE)
                }
                disabled={form.preguntas.length >= MAX_QUESTIONS}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow transition duration-200 hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Agregar multiple choice
              </button>

              <button
                type="button"
                onClick={() =>
                  handleAddQuestion(CERTIFICATION_QUESTION_TYPES.TRUE_FALSE)
                }
                disabled={form.preguntas.length >= MAX_QUESTIONS}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow transition duration-200 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                Agregar verdadero/falso
              </button>

              <span className="self-center text-sm text-gray-500">
                {form.preguntas.length} / {MAX_QUESTIONS} preguntas
              </span>
            </div>

            <div className="space-y-4">
              {form.preguntas.map((question, index) => (
                <article
                  key={question.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Pregunta {index + 1}
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      <select
                        value={question.tipo}
                        onChange={(e) =>
                          handleQuestionTypeChange(question.id, e.target.value)
                        }
                        className="rounded border px-3 py-2 text-sm"
                      >
                        <option value={CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE}>
                          Multiple choice
                        </option>
                        <option value={CERTIFICATION_QUESTION_TYPES.TRUE_FALSE}>
                          Verdadero/Falso
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(question.id)}
                        disabled={form.preguntas.length === 1}
                        className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-red-300"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

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

                        {question.tipo ===
                        CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE ? (
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

                  {question.tipo ===
                    CERTIFICATION_QUESTION_TYPES.MULTIPLE_CHOICE && (
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
                </article>
              ))}
            </div>

            {formError && (
              <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                {formError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-green-600 px-5 py-2 text-white shadow transition duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
              >
                {saving
                  ? "Guardando..."
                  : form.id
                    ? "Actualizar certificacion"
                    : "Guardar certificacion"}
              </button>

              {form.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg bg-gray-500 px-5 py-2 text-white shadow"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold">Certificaciones cargadas</h2>

          {loading && <p className="text-gray-600">Cargando certificaciones...</p>}

          {!loading && items.length === 0 && (
            <p className="text-gray-600">Todavia no hay certificaciones cargadas.</p>
          )}

          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-lg bg-gray-50 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {item.titulo}
                    </h3>
                    {item.descripcion && (
                      <p className="mt-2 text-sm text-gray-600">
                        {item.descripcion}
                      </p>
                    )}

                    <div className="mt-3 space-y-1 text-sm text-gray-500">
                      <p>
                        Preguntas cargadas: {Array.isArray(item.preguntas) ? item.preguntas.length : 0}
                      </p>
                      <p>
                        Preguntas por examen: {item.cantidad_preguntas_examen ?? 0}
                      </p>
                      <p>
                        Aprobacion: {item.porcentaje_aprobacion ?? 0}%
                      </p>
                      <p>
                        Tiempo maximo: {formatDurationLabel(item.duracion_maxima_minutos)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="rounded-lg bg-yellow-500 px-4 py-1 text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="rounded-lg bg-red-500 px-4 py-1 text-white"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminCertificaciones;
