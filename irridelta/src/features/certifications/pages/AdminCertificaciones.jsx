import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  CERTIFICATION_REQUEST_STATUS,
  approveCertificationRequest,
  fetchCertificationRequests,
  rejectCertificationRequest,
} from "../services/certificationRequestService";
import {
  downloadCertificatePdf,
  downloadCertificatePng,
} from "../utils/certificateDownloads";

const STATUS_LABELS = {
  [CERTIFICATION_REQUEST_STATUS.PENDING]: "Pendiente",
  [CERTIFICATION_REQUEST_STATUS.APPROVED]: "Aprobada",
  [CERTIFICATION_REQUEST_STATUS.REJECTED]: "Rechazada",
};

function formatExamDuration(seconds) {
  const totalSeconds = Number(seconds);

  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "-";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds} s`;
  }

  return `${minutes} min ${remainingSeconds.toString().padStart(2, "0")} s`;
}

function getAnswerDetails(request) {
  const details = request.exam_attempt?.respuestas_detalle;

  return Array.isArray(details) ? details : [];
}

function getCorrectAnswerCount(details) {
  return details.filter((detail) => detail.correcta).length;
}

function ExamPreviewModal({ request, onClose }) {
  if (!request) {
    return null;
  }

  const answerDetails = getAnswerDetails(request);
  const correctAnswers = getCorrectAnswerCount(answerDetails);
  const durationSeconds = request.exam_attempt?.duracion_segundos;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Cerrar detalle del examen"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/65"
      />

      <div className="learning-card relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden p-0">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-700">
              Previsualizacion de examen
            </p>
            <h2 className="learning-section-title mt-2">
              {request.requester_name}
            </h2>
            <p className="learning-muted mt-1">
              {request.capacitacion_title || request.certification_title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Cerrar modal de examen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto bg-gray-50 p-6">
          <div className="mb-5 grid gap-3 text-sm text-gray-700 md:grid-cols-3">
            <p className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <span className="font-semibold text-gray-900">Resultado:</span>{" "}
              {request.exam_percentage ?? 0}%
            </p>
            <p className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <span className="font-semibold text-gray-900">Tiempo:</span>{" "}
              {formatExamDuration(durationSeconds)}
            </p>
            <p className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <span className="font-semibold text-gray-900">Respuestas:</span>{" "}
              {correctAnswers} / {answerDetails.length} correctas
            </p>
          </div>

          <div className="space-y-3">
            {answerDetails.map((detail, index) => (
              <article
                key={`${request.id}-${detail.question_id ?? index}`}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">
                      Pregunta {detail.question_number ?? index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {detail.enunciado}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      detail.correcta
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {detail.correcta ? "Correcta" : "Incorrecta"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <p className="rounded-lg bg-gray-50 px-4 py-3 text-gray-700">
                    <span className="font-semibold text-gray-900">
                      Respondio:
                    </span>{" "}
                    {detail.respuesta_usuario ?? "Sin responder"}
                  </p>
                  <p className="rounded-lg bg-green-50 px-4 py-3 text-gray-700">
                    <span className="font-semibold text-gray-900">
                      Correcta:
                    </span>{" "}
                    {detail.respuesta_correcta ?? "-"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="learning-button-secondary"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminCertificaciones() {
  const [certificationRequests, setCertificationRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("todos");
  const [rejectingRequestId, setRejectingRequestId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedExamRequest, setSelectedExamRequest] = useState(null);

  useEffect(() => {
    loadCertificationRequests();
  }, []);

  const loadCertificationRequests = async () => {
    setRequestsLoading(true);
    setRequestsError("");

    try {
      const data = await fetchCertificationRequests();
      setCertificationRequests(data);
    } catch (loadError) {
      console.error("No se pudieron cargar las solicitudes", loadError);
      setRequestsError(
        "No se pudieron cargar las solicitudes de certificacion. Revisa que la tabla exista en Supabase."
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  const filteredRequests = certificationRequests.filter((request) => {
    return requestStatusFilter === "todos" || request.status === requestStatusFilter;
  });

  const pendingRequestsCount = certificationRequests.filter(
    (request) => request.status === CERTIFICATION_REQUEST_STATUS.PENDING
  ).length;

  const updateRequestInState = (nextRequest) => {
    setCertificationRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === nextRequest.id ? nextRequest : request
      )
    );
  };

  const handleApproveRequest = async (request) => {
    try {
      const nextRequest = await approveCertificationRequest(request.id);
      updateRequestInState(nextRequest);
    } catch (approveError) {
      console.error("No se pudo aprobar la solicitud", approveError);
      setRequestsError("No se pudo aprobar la solicitud.");
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      const nextRequest = await rejectCertificationRequest(
        request.id,
        rejectionReason
      );
      updateRequestInState(nextRequest);
      setRejectingRequestId(null);
      setRejectionReason("");
    } catch (rejectError) {
      console.error("No se pudo rechazar la solicitud", rejectError);
      setRequestsError(
        rejectError?.message || "No se pudo rechazar la solicitud."
      );
    }
  };

  const getDownloadData = (request) => ({
    requesterName: request.requester_name,
    certificationTitle: request.certification_title,
    capacitacionTitle: request.capacitacion_title,
    approvedAt: request.reviewed_at,
  });

  return (
    <section className="learning-page">
      <div className="learning-container">
      <header className="learning-header mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="learning-title">
              Solicitudes de Certificacion
            </h1>
            <p className="learning-subtitle">
              Aproba o rechaza certificados solicitados despues de aprobar la prueba final.
            </p>
          </div>

          <div className="learning-stat min-w-[180px]">
            <span className="font-semibold text-gray-900">Pendientes:</span>{" "}
            <span className="font-bold text-amber-700">{pendingRequestsCount}</span>
          </div>
        </div>
      </header>

      <div className="learning-card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="learning-section-title">
              Solicitudes recibidas
            </h2>
            <p className="learning-muted mt-1">
              Revisa nombre, capacitacion, resultado y estado de aprobacion.
            </p>
          </div>

          <select
            value={requestStatusFilter}
            onChange={(e) => setRequestStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <option value="todos">Todas</option>
            <option value={CERTIFICATION_REQUEST_STATUS.PENDING}>Pendientes</option>
            <option value={CERTIFICATION_REQUEST_STATUS.APPROVED}>Aprobadas</option>
            <option value={CERTIFICATION_REQUEST_STATUS.REJECTED}>Rechazadas</option>
          </select>
        </div>
      </div>

      {requestsError && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {requestsError}
        </div>
      )}

      {requestsLoading && (
        <div className="learning-empty">
          Cargando solicitudes...
        </div>
      )}

      {!requestsLoading && filteredRequests.length === 0 && (
        <div className="learning-empty">
          No hay solicitudes con ese filtro.
        </div>
      )}

      {!requestsLoading && filteredRequests.length > 0 && (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const answerDetails = getAnswerDetails(request);
            const correctAnswers = getCorrectAnswerCount(answerDetails);
            const durationSeconds = request.exam_attempt?.duracion_segundos;

            return (
              <article
                key={request.id}
                className="learning-card"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="learning-section-title">
                    {request.requester_name}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      request.status === CERTIFICATION_REQUEST_STATUS.APPROVED
                        ? "bg-green-100 text-green-700"
                        : request.status === CERTIFICATION_REQUEST_STATUS.REJECTED
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {STATUS_LABELS[request.status] ?? request.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
                  <p className="rounded-xl bg-gray-50 px-4 py-3">
                    <span className="font-semibold text-gray-900">
                      Capacitacion:
                    </span>{" "}
                    {request.capacitacion_title || request.certification_title}
                  </p>
                  <p className="rounded-xl bg-gray-50 px-4 py-3">
                    <span className="font-semibold text-gray-900">
                      Resultado:
                    </span>{" "}
                    {request.exam_percentage ?? 0}%
                  </p>
                  <button
                    type="button"
                    disabled={answerDetails.length === 0}
                    onClick={() => setSelectedExamRequest(request)}
                    className="learning-button-secondary h-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Ver examen
                  </button>

                  <p className="rounded-xl bg-gray-50 px-4 py-3">
                    <span className="font-semibold text-gray-900">
                      Solicitado:
                    </span>{" "}
                    {request.requested_at
                      ? new Date(request.requested_at).toLocaleString("es-AR")
                      : "-"}
                  </p>
                  <p className="rounded-xl bg-gray-50 px-4 py-3">
                    <span className="font-semibold text-gray-900">
                      Revisado:
                    </span>{" "}
                    {request.reviewed_at
                      ? new Date(request.reviewed_at).toLocaleString("es-AR")
                      : "-"}
                  </p>
                  {request.status === CERTIFICATION_REQUEST_STATUS.PENDING ? (
                    <button
                      type="button"
                      onClick={() => handleApproveRequest(request)}
                      className="learning-button h-full"
                    >
                      Aprobar
                    </button>
                  ) : request.status === CERTIFICATION_REQUEST_STATUS.APPROVED ? (
                    <button
                      type="button"
                      onClick={() => downloadCertificatePng(getDownloadData(request))}
                      className="learning-button-secondary h-full"
                    >
                      PNG
                    </button>
                  ) : (
                    <span aria-hidden="true" className="hidden md:block" />
                  )}

                  <p className="rounded-xl bg-gray-50 px-4 py-3">
                    <span className="font-semibold text-gray-900">
                      Tiempo:
                    </span>{" "}
                    {formatExamDuration(durationSeconds)}
                  </p>
                  <p className="rounded-xl bg-gray-50 px-4 py-3">
                    <span className="font-semibold text-gray-900">
                      Respuestas:
                    </span>{" "}
                    {answerDetails.length > 0
                      ? `${correctAnswers} / ${answerDetails.length} correctas`
                      : "Sin detalle guardado"}
                  </p>
                  {request.status === CERTIFICATION_REQUEST_STATUS.PENDING ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingRequestId(request.id);
                        setRejectionReason("");
                      }}
                      className="h-full rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Rechazar
                    </button>
                  ) : request.status === CERTIFICATION_REQUEST_STATUS.APPROVED ? (
                    <button
                      type="button"
                      onClick={() => downloadCertificatePdf(getDownloadData(request))}
                      className="learning-button-secondary h-full"
                    >
                      PDF
                    </button>
                  ) : (
                    <span aria-hidden="true" className="hidden md:block" />
                  )}
                </div>

                {request.rejection_reason && (
                  <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span className="font-semibold">Motivo:</span>{" "}
                    {request.rejection_reason}
                  </p>
                )}

                {rejectingRequestId === request.id && (
                  <div className="mt-4 space-y-3 rounded-xl border border-red-100 bg-red-50 p-4">
                    <label className="block text-sm font-semibold text-red-800">
                      Motivo del rechazo
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="min-h-[90px] w-full rounded border border-red-200 p-3 text-gray-800"
                      placeholder="Ej: corregir nombre y apellido"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(request)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Confirmar rechazo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingRequestId(null);
                          setRejectionReason("");
                        }}
                        className="learning-button-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

            </article>
            );
          })}
        </div>
      )}

      <ExamPreviewModal
        request={selectedExamRequest}
        onClose={() => setSelectedExamRequest(null)}
      />
      </div>
    </section>
  );
}

export default AdminCertificaciones;
