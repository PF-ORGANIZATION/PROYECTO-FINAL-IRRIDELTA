import React, { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Award,
  BookOpenCheck,
  ChevronRight,
  Clock3,
  FileCheck2,
} from "lucide-react";
import {
  LEARNING_FEED_VIEWS,
  fetchLearningFeed,
} from "../../learning/services/learningFeedService";
import { CERTIFICATION_REQUEST_STATUS } from "../services/certificationRequestService";
import {
  formatDurationLabel,
  getCertificationDurationMinutes,
} from "../utils/certifications";
import catalogStyles from "../../learning/components/LearningCatalog.module.css";
import cardStyles from "../../learning/components/LearningItemPreviewCard.module.css";

function getCertificationCardState(item) {
  const requestStatus = item.certificationRequest?.status;

  if (requestStatus === CERTIFICATION_REQUEST_STATUS.APPROVED) {
    return {
      badge: "Certificado aprobado",
      button: "Ver certificado",
      statusClass: "certificado",
    };
  }

  if (requestStatus === CERTIFICATION_REQUEST_STATUS.PENDING) {
    return {
      badge: "Pendiente de aprobacion",
      button: "Ver solicitud",
      statusClass: "certificacion-en-revision",
    };
  }

  if (requestStatus === CERTIFICATION_REQUEST_STATUS.REJECTED) {
    return {
      badge: "Solicitud rechazada",
      button: "Revisar solicitud",
      statusClass: "en-progreso",
    };
  }

  return {
    badge: "Lista para rendir",
    button: "Rendir examen final",
    statusClass: "pendiente-certificar",
  };
}

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
              <div className={catalogStyles.grid}>
                {items.map((item) => {
                  const durationMinutes = getCertificationDurationMinutes(item);
                  const cardState = getCertificationCardState(item);
                  const title =
                    item.titulo ??
                    item.capacitacion_titulo ??
                    "Certificacion final";
                  const description =
                    item.descripcion ??
                    `Evaluacion final de ${item.capacitacion_titulo ?? "la capacitacion"}.`;

                  return (
                    <article
                      key={item.id}
                      className={cardStyles.card}
                    >
                      <div className={cardStyles.topRow}>
                        <span className={cardStyles.eyebrow}>
                          Certificacion final
                        </span>
                        <span
                          className={`${cardStyles.statusBadge} ${cardStyles[cardState.statusClass]}`}
                        >
                          <FileCheck2
                            className={cardStyles.statusIcon}
                            aria-hidden="true"
                          />
                          {cardState.badge}
                        </span>
                      </div>

                      <div className={cardStyles.content}>
                        <h2 className={cardStyles.title}>
                          {title}
                        </h2>
                        <p className={cardStyles.description}>
                          {description}
                        </p>
                      </div>

                      <div className={cardStyles.metaList}>
                        <span className={cardStyles.metaItem}>
                          <Clock3
                            className={cardStyles.metaIcon}
                            aria-hidden="true"
                          />
                          {formatDurationLabel(durationMinutes)}
                        </span>
                        <span className={cardStyles.metaItem}>
                          <Award
                            className={cardStyles.metaIcon}
                            aria-hidden="true"
                          />
                          Certificado disponible
                        </span>
                        {item.capacitacion_titulo && (
                          <span className={cardStyles.metaItem}>
                            <BookOpenCheck
                              className={cardStyles.metaIcon}
                              aria-hidden="true"
                            />
                            {item.capacitacion_titulo}
                          </span>
                        )}
                      </div>

                      <div className={cardStyles.progressBlock}>
                        <div className={cardStyles.progressHeader}>
                          <span>Capacitacion completa</span>
                          <span className={cardStyles.progressValue}>
                            100%
                          </span>
                        </div>
                        <div
                          className={cardStyles.progressTrack}
                          role="progressbar"
                          aria-valuenow="100"
                          aria-valuemin="0"
                          aria-valuemax="100"
                          aria-label="Capacitacion completa"
                        >
                          <span
                            className={cardStyles.progressBar}
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>

                      <footer className={cardStyles.footer}>
                        <button
                          type="button"
                          onClick={() => navigate(`/certificaciones/${item.id}`)}
                          className={cardStyles.detailLink}
                        >
                          {cardState.button}
                          <ChevronRight size={18} aria-hidden="true" />
                        </button>
                      </footer>
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
