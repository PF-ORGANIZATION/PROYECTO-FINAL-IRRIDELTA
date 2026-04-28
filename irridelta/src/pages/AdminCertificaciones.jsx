import React, { useEffect, useState } from "react";
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

function AdminCertificaciones() {
  const [certificationRequests, setCertificationRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("todos");
  const [rejectingRequestId, setRejectingRequestId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

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
    <section className="min-h-screen bg-gray-100 px-6 py-6 md:px-12 lg:px-24">
      <header className="mb-8 border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Solicitudes de Certificacion
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Aproba o rechaza certificados solicitados despues de aprobar la prueba final.
            </p>
          </div>

          <div className="rounded-2xl bg-white px-5 py-4 text-sm shadow">
            <span className="font-semibold text-gray-900">Pendientes:</span>{" "}
            <span className="font-bold text-amber-700">{pendingRequestsCount}</span>
          </div>
        </div>
      </header>

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Solicitudes recibidas
            </h2>
            <p className="mt-1 text-sm text-gray-600">
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
        <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-md">
          Cargando solicitudes...
        </div>
      )}

      {!requestsLoading && filteredRequests.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-md">
          No hay solicitudes con ese filtro.
        </div>
      )}

      {!requestsLoading && filteredRequests.length > 0 && (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <article
              key={request.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900">
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

                  <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-2">
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
                          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {request.status === CERTIFICATION_REQUEST_STATUS.PENDING && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(request)}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingRequestId(request.id);
                          setRejectionReason("");
                        }}
                        className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Rechazar
                      </button>
                    </>
                  )}

                  {request.status === CERTIFICATION_REQUEST_STATUS.APPROVED && (
                    <>
                      <button
                        type="button"
                        onClick={() => downloadCertificatePng(getDownloadData(request))}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
                      >
                        PNG
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadCertificatePdf(getDownloadData(request))}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        PDF
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminCertificaciones;
