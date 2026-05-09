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

      <section className="page-wrapper">
        <div className="container-main">
          <header className="card mb-8">
            <h1 className="text-3xl font-bold mb-4 border-b pb-4 normal-case">Certificaciones</h1>
            <p className="text-gray-500 mt-2">
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
            <div className="card text-center py-12">
              <h2 className="text-xl font-bold">
                Todavia no tenes certificaciones disponibles.
              </h2>
              <p className="text-gray-500 mt-2 max-w-lg mx-auto">
                Completa una capacitacion con certificado para habilitar su
                examen final.
              </p>
              <button
                type="button"
                onClick={() => navigate("/capacitaciones")}
                className="btn-primary mt-6"
              >
                Ir a capacitaciones
              </button>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map((item) => {
                  const durationMinutes = getCertificationDurationMinutes(item);

                  return (
                    <article
                      key={item.id}
                      className="card"
                    >
                      <h2 className="text-xl font-bold">
                        {item.titulo}
                      </h2>

                      {item.descripcion && (
                        <p className="text-gray-500 mt-3">
                          {item.descripcion}
                        </p>
                      )}

                      <div className="inline-flex items-center gap-1 border rounded-full bg-gray-50 px-3 py-1 text-sm font-semibold text-gray-700 mt-5">
                        <Clock3 size={16} aria-hidden="true" />
                        {durationMinutes}
                      </div>

                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={() => navigate(`/certificaciones/${item.id}`)}
                          className="btn-primary"
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
                    className="btn-secondary"
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
