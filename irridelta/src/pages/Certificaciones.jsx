import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  LEARNING_TYPES,
  fetchLearningItems,
} from "../services/learningContentService";
import {
  formatDurationLabel,
  getCertificationDurationMinutes,
  getCertificationExamQuestionCount,
  getCertificationPassingScore,
  getMinimumCorrectAnswers,
} from "../utils/certifications";

function Certificaciones() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedCertification, setSelectedCertification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadItems = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchLearningItems(LEARNING_TYPES.CERTIFICACION, {
          onlyPublished: true,
        });

        if (!ignore) {
          setItems(data);
        }
      } catch (loadError) {
        if (!ignore) {
          console.error("No se pudieron cargar las certificaciones", loadError);
          setError(
            "No se pudieron cargar las certificaciones. Revisa que el esquema nuevo este creado en Supabase."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadItems();

    return () => {
      ignore = true;
    };
  }, []);

  const closeConditionsModal = () => {
    setSelectedCertification(null);
  };

  const openConditionsModal = (certification) => {
    setSelectedCertification(certification);
  };

  const handleAcceptConditions = () => {
    if (!selectedCertification) {
      return;
    }

    navigate(`/certificaciones/${selectedCertification.id}`);
  };

  const selectedExamQuestionCount = getCertificationExamQuestionCount(
    selectedCertification
  );
  const selectedPassingScore = getCertificationPassingScore(
    selectedCertification
  );
  const selectedMinimumCorrectAnswers = getMinimumCorrectAnswers(
    selectedExamQuestionCount,
    selectedPassingScore
  );
  const selectedDurationMinutes = getCertificationDurationMinutes(
    selectedCertification
  );

  return (
    <>
      <Helmet>
        <title>Certificaciones | IRRIDELTA</title>
      </Helmet>

      <section className="min-h-[70vh] bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold tracking-wide text-gray-900 md:text-6xl">
              &iexcl;CERTIFICACIONES!
            </h1>
          </header>

          {loading && (
            <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow">
              Cargando certificaciones...
            </div>
          )}

          {!loading && error && (
            <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow">
              Todavia no hay certificaciones publicadas.
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              {items.map((item) => {
                const examQuestionCount = getCertificationExamQuestionCount(item);
                const passingScore = getCertificationPassingScore(item);
                const minimumCorrectAnswers = getMinimumCorrectAnswers(
                  examQuestionCount,
                  passingScore
                );
                const durationMinutes = getCertificationDurationMinutes(item);

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl bg-white p-6 shadow-md transition duration-200 hover:shadow-lg"
                  >
                    <h2 className="text-2xl font-bold text-gray-900">
                      {item.titulo}
                    </h2>

                    {item.descripcion && (
                      <p className="mt-3 text-sm leading-6 text-gray-600">
                        {item.descripcion}
                      </p>
                    )}

                    <div className="mt-5 grid gap-2 text-sm text-gray-500">
                      <p>
                        Preguntas disponibles:{" "}
                        {Array.isArray(item.preguntas) ? item.preguntas.length : 0}
                      </p>
                      <p>Preguntas del examen: {examQuestionCount}</p>
                      <p>
                        Minimo de respuestas correctas: {minimumCorrectAnswers}
                      </p>
                      <p>Aprobacion: {passingScore}%</p>
                      <p>Tiempo maximo: {formatDurationLabel(durationMinutes)}</p>
                    </div>

                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => openConditionsModal(item)}
                        className="inline-flex rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-blue-600"
                      >
                        Realizar certificacion
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {selectedCertification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={closeConditionsModal}
            className="absolute inset-0 bg-slate-900/65"
          />

          <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">
                Condiciones del examen
              </p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">
                {selectedCertification.titulo}
              </h2>
              {selectedCertification.descripcion && (
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {selectedCertification.descripcion}
                </p>
              )}
            </div>

            <div className="grid gap-4 rounded-2xl bg-gray-50 p-5 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Cantidad de preguntas
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {selectedExamQuestionCount}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Minimo correcto
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {selectedMinimumCorrectAnswers} respuestas
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Porcentaje para aprobar
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {selectedPassingScore}%
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Tiempo maximo
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {formatDurationLabel(selectedDurationMinutes)}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-slate-700">
              Debes completar el examen dentro del tiempo configurado y alcanzar
              el minimo de respuestas correctas para obtener la certificacion.
              Tus respuestas quedan guardadas durante la resolucion y, si el
              tiempo se agota, el sistema enviara automaticamente lo que tengas
              contestado hasta ese momento.
            </div>

            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeConditionsModal}
                className="rounded-lg bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-300"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleAcceptConditions}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow transition duration-200 hover:bg-blue-700"
              >
                Aceptar y comenzar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Certificaciones;
