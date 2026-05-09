import React, { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Clock3 } from "lucide-react";
import {
  LEARNING_FEED_VIEWS,
  fetchLearningFeed,
} from "../../learning/services/learningFeedService";
import {
  getCertificationDurationMinutes,
} from "../utils/certifications";
import catalogStyles from "../../learning/components/LearningCatalog.module.css";

function Certificaciones() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const loadMoreRef = useRef(null);

  const loadItems = useCallback(async ({ cursor = null, append = false } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const data = await fetchLearningFeed({
        view: LEARNING_FEED_VIEWS.USER_CERTIFICACIONES,
        cursor,
      });

      setItems((currentItems) =>
        append ? [...currentItems, ...data.items] : data.items
      );
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (loadError) {
      console.error("No se pudieron cargar las certificaciones", loadError);
      setError(
        "No se pudieron cargar las certificaciones. Revisa la conexion con Supabase."
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;

    if (!sentinel || !hasMore || loading || loadingMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor) {
          loadItems({ cursor: nextCursor, append: true });
        }
      },
      { rootMargin: "360px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadItems, loading, loadingMore, nextCursor]);

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
            <div className={catalogStyles.skeletonGrid} aria-label="Cargando certificaciones">
              <div className={catalogStyles.skeletonCard} />
              <div className={catalogStyles.skeletonCard} />
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
            <>
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
              <div ref={loadMoreRef} className={catalogStyles.loadMoreSentinel}>
                {loadingMore && (
                  <div className={catalogStyles.skeletonGrid} aria-hidden="true">
                    <div className={catalogStyles.skeletonCard} />
                    <div className={catalogStyles.skeletonCard} />
                  </div>
                )}
                {!loadingMore && hasMore && (
                  <button
                    type="button"
                    className="learning-button-secondary"
                    onClick={() => loadItems({ cursor: nextCursor, append: true })}
                  >
                    Cargar mas
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default Certificaciones;
