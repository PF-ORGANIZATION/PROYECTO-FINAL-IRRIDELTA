import { supabase } from "../supabaseClient";

export const CERTIFICATION_REQUESTS_TABLE = "certification_requests";

export const CERTIFICATION_REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

function normalizeRequest(item) {
  return {
    ...item,
    status: item.status ?? CERTIFICATION_REQUEST_STATUS.PENDING,
  };
}

export async function fetchCertificationRequests() {
  const { data, error } = await supabase
    .from(CERTIFICATION_REQUESTS_TABLE)
    .select("*")
    .order("requested_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeRequest);
}

export async function fetchUserCertificationRequest(certificationId, userId) {
  if (!certificationId || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from(CERTIFICATION_REQUESTS_TABLE)
    .select("*")
    .eq("certification_id", certificationId)
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeRequest(data) : null;
}

export async function createCertificationRequest({
  certification,
  requesterName,
  examResult,
  userId,
}) {
  const trimmedRequesterName = requesterName.trim();

  if (!trimmedRequesterName) {
    throw new Error("El nombre y apellido es obligatorio.");
  }

  if (!userId) {
    throw new Error("Debes iniciar sesion para solicitar el certificado.");
  }

  const now = new Date().toISOString();
  const payload = {
    certification_id: certification.id,
    capacitacion_id: certification.capacitacion_id ?? null,
    certification_title: certification.titulo,
    capacitacion_title: certification.capacitacion_titulo ?? certification.titulo,
    requester_name: trimmedRequesterName,
    user_id: userId,
    status: CERTIFICATION_REQUEST_STATUS.PENDING,
    rejection_reason: null,
    exam_percentage: Number(examResult?.percentage ?? 0),
    exam_approved_at: now,
    requested_at: now,
    reviewed_at: null,
  };

  const { data, error } = await supabase
    .from(CERTIFICATION_REQUESTS_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return normalizeRequest(data);
}

export async function approveCertificationRequest(requestId) {
  const { data, error } = await supabase
    .from(CERTIFICATION_REQUESTS_TABLE)
    .update({
      status: CERTIFICATION_REQUEST_STATUS.APPROVED,
      rejection_reason: null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return normalizeRequest(data);
}

export async function rejectCertificationRequest(requestId, reason) {
  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    throw new Error("El motivo de rechazo es obligatorio.");
  }

  const { data, error } = await supabase
    .from(CERTIFICATION_REQUESTS_TABLE)
    .update({
      status: CERTIFICATION_REQUEST_STATUS.REJECTED,
      rejection_reason: trimmedReason,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return normalizeRequest(data);
}
