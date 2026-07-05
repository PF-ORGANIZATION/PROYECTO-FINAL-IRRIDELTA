import { useCallback, useEffect, useRef, useState } from "react";
import {
  ALLOWED_EXTENSIONS,
  DOWNLOAD_SIGNED_URL_SECONDS,
  MAX_SIZE_MB,
  PENDING_UPLOAD_KEY,
} from "../services/kbConfig";
import {
  deleteKbSourceFile,
  fetchKbSourceFiles,
  findKbSourceFileByName,
  insertKbChunks,
  insertKbSourceFile,
  updateKbSourceFileActive,
} from "../services/kbDocumentsService";
import {
  buildManualUploadName,
  buildStoragePath,
  isAllowedKbFile,
  sanitizeDocumentText,
} from "../services/kbFileUtils";
import { extractTextFromKbFile } from "../services/kbFileReaderService";
import { buildKbChunksWithEmbeddings } from "../services/kbProcessingService";
import { getKbDocumentPreview } from "../services/kbPreviewService";
import {
  createKbSignedUrl,
  removeKbStorageObject,
  uploadKbFile,
  uploadKbText,
} from "../services/kbStorageService";

function isActive(sourceFile) {
  return sourceFile.activo !== false;
}

async function removeKbUploadArtifacts({ archivoId, storagePath }) {
  let cleanupError = null;

  try {
    await removeKbStorageObject(storagePath);
  } catch (error) {
    cleanupError = error;
    console.error("Error eliminando objeto de Storage:", error);
  }

  if (archivoId) {
    try {
      await deleteKbSourceFile(archivoId);
    } catch (error) {
      cleanupError = error;
      console.error("Error eliminando registro de KB:", error);
    }
  }

  if (cleanupError) {
    throw cleanupError;
  }
}

export function useAdminKbController() {
  const [file, setFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [filesList, setFilesList] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const fileInputRef = useRef(null);
  const statusTimeoutRef = useRef(null);

  const clearStatusTimeout = useCallback(() => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
  }, []);

  const clearSelectedFile = useCallback(() => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const loadFilesList = useCallback(async () => {
    setIsLoadingList(true);

    try {
      const sourceFiles = await fetchKbSourceFiles();
      setFilesList(sourceFiles);
    } catch (error) {
      console.error("Error al cargar archivos:", error);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const cleanupPendingUpload = useCallback(async () => {
    const pending = sessionStorage.getItem(PENDING_UPLOAD_KEY);
    if (!pending) return;

    try {
      const { archivoId, storagePath } = JSON.parse(pending);
      console.warn("Limpiando upload huérfano:", archivoId);
      await removeKbUploadArtifacts({ archivoId, storagePath });
    } catch (error) {
      console.error("Error limpiando upload huérfano:", error);
    } finally {
      sessionStorage.removeItem(PENDING_UPLOAD_KEY);
    }
  }, []);

  const validateAndSetFile = useCallback((selectedFile) => {
    if (!selectedFile) return;

    if (!isAllowedKbFile(selectedFile)) {
      alert(
        `Tipo de archivo no soportado. Solo se permiten: ${ALLOWED_EXTENSIONS.join(", ")}`
      );
      return;
    }

    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`El archivo no debe superar ${MAX_SIZE_MB}MB.`);
      return;
    }

    setFile(selectedFile);
  }, []);

  const handleDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    validateAndSetFile(event.dataTransfer.files?.[0]);
  }, [validateAndSetFile]);

  useEffect(() => {
    void loadFilesList();
    void cleanupPendingUpload();
  }, [cleanupPendingUpload, loadFilesList]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isProcessing) return;

      event.preventDefault();
      event.returnValue = "Hay un procesamiento en curso. Si sales, se perderá el progreso.";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProcessing]);

  useEffect(() => clearStatusTimeout, [clearStatusTimeout]);

  const handleDeleteFile = useCallback(async (id, storagePath) => {
    if (
      !window.confirm(
        "¿Estás seguro de eliminar este archivo? Se borrarán todos los fragmentos asociados en la base de conocimientos."
      )
    ) {
      return;
    }

    try {
      await removeKbStorageObject(storagePath);
      await deleteKbSourceFile(id);
      await loadFilesList();
    } catch (error) {
      console.error("Error eliminando el archivo:", error);
      alert("Error al eliminar el archivo.");
    }
  }, [loadFilesList]);

  const handleToggleActive = useCallback(async (id, currentActive) => {
    const nextActive = !currentActive;

    try {
      await updateKbSourceFileActive(id, nextActive);

      setFilesList((previousFiles) =>
        previousFiles.map((sourceFile) =>
          sourceFile.id === id
            ? { ...sourceFile, activo: nextActive }
            : sourceFile
        )
      );

      setPreview((previousPreview) => {
        if (previousPreview?.file?.id !== id) return previousPreview;

        return {
          ...previousPreview,
          file: {
            ...previousPreview.file,
            activo: nextActive,
          },
        };
      });
    } catch (error) {
      console.error("Error al cambiar estado del archivo:", error);
      alert("Error al cambiar el estado del archivo.");
    }
  }, []);

  const handleDownloadFile = useCallback(async (storagePath) => {
    if (!storagePath) {
      alert("Esta es una carga manual de texto y no tiene archivo físico asociado.");
      return;
    }

    try {
      const signedUrl = await createKbSignedUrl(
        storagePath,
        DOWNLOAD_SIGNED_URL_SECONDS
      );

      if (!signedUrl) {
        throw new Error("No se pudo generar el enlace firmado.");
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error generando enlace de descarga:", error);
      alert("Error al descargar el archivo.");
    }
  }, []);

  const handlePreviewFile = useCallback(async (sourceFile) => {
    setIsLoadingPreview(true);
    setPreview({ file: sourceFile });

    try {
      const nextPreview = await getKbDocumentPreview(sourceFile);
      setPreview(nextPreview);
    } catch (error) {
      console.error("Error cargando detalle:", error);
      setPreview(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  const rollbackPartialUpload = useCallback(async ({ archivoId, storagePath }) => {
    try {
      await removeKbUploadArtifacts({ archivoId, storagePath });
      sessionStorage.removeItem(PENDING_UPLOAD_KEY);
      await loadFilesList();
    } catch (rollbackError) {
      console.error("Error revirtiendo carga parcial:", rollbackError);
    }
  }, [loadFilesList]);

  const handleProcess = useCallback(async (event) => {
    event.preventDefault();
    clearStatusTimeout();

    let uploadedStoragePath = null;
    let insertedArchivoId = null;

    try {
      setIsProcessing(true);
      setProgress(0);
      setStatus("Extrayendo texto del documento (puede demorar en PDFs pesados)...");

      let fullText = manualText.trim();

      if (file) {
        const fileText = await extractTextFromKbFile(file);
        fullText = `${fullText}\n\n${fileText}`.trim();
      }

      if (!fullText) {
        alert("Por favor, ingresa texto o sube un archivo.");
        setStatus("");
        return;
      }

      fullText = sanitizeDocumentText(fullText);

      setStatus("Verificando duplicados...");
      const fileName = file ? file.name : buildManualUploadName();
      const storagePath = buildStoragePath(fileName);
      const existingFile = await findKbSourceFileByName(fileName);

      if (existingFile) {
        const shouldReplace = window.confirm(
          `Ya existe un documento llamado "${fileName}".\n\n¿Deseas reemplazarlo? Se eliminarán los fragmentos anteriores y se procesará el nuevo archivo.`
        );

        if (!shouldReplace) {
          setStatus("");
          return;
        }

        await removeKbStorageObject(existingFile.storage_path);
        await deleteKbSourceFile(existingFile.id);
      }

      if (file) {
        await uploadKbFile(storagePath, file);
      } else {
        await uploadKbText(storagePath, fullText);
      }

      uploadedStoragePath = storagePath;

      const insertedFile = await insertKbSourceFile({
        nombre: fileName,
        storagePath,
      });
      insertedArchivoId = insertedFile.id;

      sessionStorage.setItem(
        PENDING_UPLOAD_KEY,
        JSON.stringify({ archivoId: insertedArchivoId, storagePath })
      );

      setStatus("Iniciando procesamiento en segundo plano...");
      const rowsToInsert = await buildKbChunksWithEmbeddings({
        fullText,
        fileName,
        onInfo: setStatus,
        onProgress: ({ progress: workerProgress, message }) => {
          setProgress(workerProgress);
          setStatus(message);
        },
      });

      setStatus("Subiendo todos los fragmentos a Supabase...");
      const rowsWithArchivo = rowsToInsert.map((row) => ({
        ...row,
        archivo_id: insertedArchivoId,
      }));

      await insertKbChunks(rowsWithArchivo);

      sessionStorage.removeItem(PENDING_UPLOAD_KEY);
      setStatus("¡Base de conocimientos actualizada con éxito!");
      setManualText("");
      clearSelectedFile();
      await loadFilesList();
      statusTimeoutRef.current = setTimeout(() => setStatus(""), 4000);
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error.message}`);

      if (uploadedStoragePath || insertedArchivoId) {
        await rollbackPartialUpload({
          archivoId: insertedArchivoId,
          storagePath: uploadedStoragePath,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    clearSelectedFile,
    clearStatusTimeout,
    file,
    loadFilesList,
    manualText,
    rollbackPartialUpload,
  ]);

  return {
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
    file,
    fileInputRef,
    filesList,
    handleDeleteFile,
    handleDownloadFile,
    handlePreviewFile,
    handleProcess,
    handleToggleActive,
    isActive,
    isDragging,
    isLoadingList,
    isLoadingPreview,
    isProcessing,
    manualText,
    preview,
    progress,
    setManualText,
    setPreview,
    status,
    clearSelectedFile,
    validateAndSetFile,
  };
}
