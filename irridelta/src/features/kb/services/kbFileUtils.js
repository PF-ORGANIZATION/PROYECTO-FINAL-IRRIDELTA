import {
  ALLOWED_EXTENSIONS,
  MANUAL_UPLOAD_PREFIX,
} from "./kbConfig";

export function getFileExtension(fileName = "") {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension && extension !== fileName.toLowerCase() ? `.${extension}` : "";
}

export function getFileTypeLabel(fileName = "") {
  const extension = getFileExtension(fileName).replace(".", "");
  return extension || "txt";
}

export function isAllowedKbFile(file) {
  return ALLOWED_EXTENSIONS.includes(getFileExtension(file?.name));
}

export function isPdfFile(fileOrName) {
  const fileName = typeof fileOrName === "string" ? fileOrName : fileOrName?.name;
  const fileType = typeof fileOrName === "string" ? "" : fileOrName?.type;
  return fileType === "application/pdf" || getFileExtension(fileName) === ".pdf";
}

export function formatFileSize(bytes) {
  if (!bytes) return "Desconocido";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function buildManualUploadName(now = new Date()) {
  const timestamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `${MANUAL_UPLOAD_PREFIX}_${timestamp}.txt`;
}

export function buildStoragePath(fileName, timestamp = Date.now()) {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `kb/${timestamp}_${safeFileName}`;
}

export function sanitizeDocumentText(text) {
  return text.replace(/\0/g, "");
}
