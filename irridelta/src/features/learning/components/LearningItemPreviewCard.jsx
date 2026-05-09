import React from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  PlayCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  LEARNING_PROGRESS_ACTION_LABELS,
  LEARNING_PROGRESS_LABELS,
  LEARNING_PROGRESS_STATUS,
} from "../utils/learningProgressStatus";
import styles from "./LearningItemPreviewCard.module.css";

function getShortDescription(description) {
  if (!description) {
    return "Capacitación disponible para clientes de IRRIDELTA.";
  }

  const normalizedDescription = description.trim();

  if (normalizedDescription.length <= 180) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, 177).trim()}...`;
}

function LearningItemPreviewCard({
  item,
  progress,
  showPublishedDate = true,
  onDetailClick = null,
}) {
  if (!item) {
    return null;
  }

  const moduleCount = item.modulos?.length ?? 0;
  const hasCertification = Boolean(item.certificacion);
  const progressData = progress ?? {
    completedModules: 0,
    totalModules: moduleCount,
    progressPercentage: 0,
    status: LEARNING_PROGRESS_STATUS.PENDING,
  };
  const isCompleted = progressData.status === LEARNING_PROGRESS_STATUS.COMPLETED;
  const detailLabel =
    LEARNING_PROGRESS_ACTION_LABELS[progressData.status] ??
    LEARNING_PROGRESS_ACTION_LABELS[LEARNING_PROGRESS_STATUS.PENDING];
  const StatusIcon =
    progressData.status === LEARNING_PROGRESS_STATUS.COMPLETED
      ? CheckCircle2
      : progressData.status === LEARNING_PROGRESS_STATUS.IN_PROGRESS
      ? PlayCircle
      : Clock3;

  return (
    <article
      className={`${styles.card} ${isCompleted ? styles.cardCompleted : ""}`}
    >
      <div className={styles.topRow}>
        <span className={styles.eyebrow}>Capacitación técnica</span>
        <span className={`${styles.statusBadge} ${styles[progressData.status]}`}>
          <StatusIcon className={styles.statusIcon} aria-hidden="true" />
          {LEARNING_PROGRESS_LABELS[progressData.status]}
        </span>
      </div>

      <div className={styles.content}>
        <h2 className={styles.title}>{item.titulo}</h2>
        <p className={styles.description}>{getShortDescription(item.descripcion)}</p>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Avance</span>
          <strong className={styles.summaryValue}>
            {progressData.progressPercentage}%
          </strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Módulos</span>
          <strong className={styles.summaryValue}>{moduleCount}</strong>
        </div>
      </div>

      <div className={styles.metaList}>
        <span className={styles.metaItem}>
          <BookOpen className={styles.metaIcon} aria-hidden="true" />
          {moduleCount === 1 ? "1 módulo" : `${moduleCount} módulos`}
        </span>
        {hasCertification && (
          <span className={styles.metaItem}>
            <Award className={styles.metaIcon} aria-hidden="true" />
            Certificado disponible
          </span>
        )}
        {showPublishedDate && item.created_at && (
          <span className={styles.metaItem}>
            <CalendarDays className={styles.metaIcon} aria-hidden="true" />
            {new Date(item.created_at).toLocaleDateString("es-AR")}
          </span>
        )}
      </div>

      <div className={styles.progressBlock}>
        <div className={styles.progressHeader}>
          <span>
            {progressData.completedModules}/{progressData.totalModules} módulos completados
          </span>
          <span className={styles.progressValue}>
            {progressData.progressPercentage}%
          </span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={progressData.progressPercentage}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label={`Progreso ${progressData.progressPercentage}%`}
        >
          <span
            className={styles.progressBar}
            style={{ width: `${progressData.progressPercentage}%` }}
          />
        </div>
      </div>

      <footer className={styles.footer}>
        {onDetailClick ? (
          <button
            type="button"
            onClick={onDetailClick}
            className={styles.detailLink}
          >
            {detailLabel}
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <Link to={`/capacitaciones/${item.id}`} className={styles.detailLink}>
            {detailLabel}
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        )}
      </footer>
    </article>
  );
}

export default LearningItemPreviewCard;
