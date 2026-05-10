import React from "react";
import {
  Award,
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
import { generateSlug } from "../services/learningContentService";
import {
  formatEstimatedDuration,
  getLearningEstimatedMinutes,
} from "../utils/learningDuration";
import styles from "./LearningItemPreviewCard.module.css";

function getShortDescription(description) {
  if (!description) {
    return "Capacitacion disponible para clientes de IRRIDELTA.";
  }

  const normalizedDescription = description.trim();

  if (normalizedDescription.length <= 180) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, 177).trim()}...`;
}

function LearningItemPreviewCard({ item, progress, onDetailClick = null }) {
  if (!item) {
    return null;
  }

  const moduleCount = item.modulos?.length ?? 0;
  const hasCertification = Boolean(item.certificacion);
  const estimatedDuration = formatEstimatedDuration(getLearningEstimatedMinutes(item));
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
        <span className={styles.eyebrow}>Capacitacion tecnica</span>
        <span className={`${styles.statusBadge} ${styles[progressData.status]}`}>
          <StatusIcon className={styles.statusIcon} aria-hidden="true" />
          {LEARNING_PROGRESS_LABELS[progressData.status]}
        </span>
      </div>

      <div className={styles.content}>
        <h2 className={styles.title}>{item.titulo}</h2>
        <p className={styles.description}>{getShortDescription(item.descripcion)}</p>
      </div>

      <div className={styles.metaList}>
        <span className={styles.metaItem}>
          <Clock3 className={styles.metaIcon} aria-hidden="true" />
          {moduleCount === 1 ? "1 modulo" : `${moduleCount} modulos`} · {estimatedDuration}
        </span>
        {hasCertification && (
          <span className={styles.metaItem}>
            <Award className={styles.metaIcon} aria-hidden="true" />
            Certificado disponible
          </span>
        )}
      </div>

      <div className={styles.progressBlock}>
        <div className={styles.progressHeader}>
          <span>
            {progressData.completedModules}/{progressData.totalModules} modulos completados
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
          <Link to={`/capacitaciones/${generateSlug(item.titulo)}`} className={styles.detailLink}>
            {detailLabel}
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        )}
      </footer>
    </article>
  );
}

export default LearningItemPreviewCard;
