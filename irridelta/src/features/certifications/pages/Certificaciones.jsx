import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Clock3 } from "lucide-react";
import {
  LEARNING_TYPES,
  fetchLearningItems,
} from "../../learning/services/learningContentService";
import {
  fetchUserLearningProgress,
  getCompletedResourceIds,
  isCapacitacionCompleted,
} from "../../learning/services/learningProgressService";
import {
  getCertificationDurationMinutes,
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
        const data = await fetchLearningItems(LEARNING_TYPES.CAPACITACION, {
          onlyPublished: true,
        });
        const progressEntries = await Promise.all(
          data.map(async (item) => {
            const progress = await fetchUserLearningProgress(item.id);
            return [item.id, progress];
          })
        );
        const progressByItemId = Object.fromEntries(progressEntries);
        const availableCertifications = data
          .filter((item) => {
            if (!item.certificacion) {
              return false;
            }

            const completedResourceIds = getCompletedResourceIds(
              progressByItemId[item.id] ?? []
            );

            return isCapacitacionCompleted(item.modulos, completedResourceIds);
          })
          .map((item) => ({
            ...item.certificacion,
            capacitacion_titulo: item.titulo,
          }));

        if (!ignore) {
          setItems(availableCertifications);
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

      <section className="learning-page">
        <div className="learning-container">
          <header className="learning-header">
            <h1 className="learning-title normal-case">Certificaciones</h1>
            <p className="learning-subtitle">
              Accede a los examenes finales habilitados por tus capacitaciones completadas.
            </p>
          </header>

          {loading && (
            <div className="learning-empty">
              Cargando certificaciones...
            </div>
          )}

          {!loading && error && (
            <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="learning-empty">
              <h2 className="learning-empty-title">
                Todavia no tenes certificaciones disponibles.
              </h2>
              <p className="learning-empty-text">
                Completa una capacitacion con certificado para habilitar su
                examen final.
              </p>
              <button
                type="button"
                onClick={() => navigate("/capacitaciones")}
                className="learning-button mt-6"
              >
                Ir a capacitaciones
              </button>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="learning-grid-2">
              {items.map((item) => {
                const durationMinutes = getCertificationDurationMinutes(item);

                return (
                  <article
                    key={item.id}
                    className="learning-card"
                  >
                    <h2 className="learning-section-title">
                      {item.titulo}
                    </h2>

                    {item.descripcion && (
                      <p className="learning-muted mt-3">
                        {item.descripcion}
                      </p>
                    )}

                    <div className="learning-pill mt-5">
                      <Clock3 size={16} aria-hidden="true" />
                      {durationMinutes}
                    </div>

                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => navigate(`/certificaciones/${item.id}`)}
                        className="learning-button"
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
