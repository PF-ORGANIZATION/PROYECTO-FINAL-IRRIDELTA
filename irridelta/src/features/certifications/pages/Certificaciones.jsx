import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  LEARNING_TYPES,
  fetchLearningItems,
} from "../../learning/services/learningContentService";
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
                        onClick={() => navigate(`/certificaciones/${item.id}`)}
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
    </>
  );
}

export default Certificaciones;
