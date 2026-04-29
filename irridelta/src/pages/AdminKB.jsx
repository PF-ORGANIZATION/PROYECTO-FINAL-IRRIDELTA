import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
// El sufijo ?worker es magia de Vite para empaquetarlo como proceso separado
import EmbeddingWorker from './embeddingWorker.js?worker';
import * as pdfjsLib from "pdfjs-dist";
import { Trash2, Download, FileText, UploadCloud, X, Eye, Layers, File, Calendar, HardDrive } from "lucide-react";
// El "?url" al final es clave para que Vite lo trate como un archivo estático
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'; 

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function AdminKB() {
  const [file, setFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null); // { file, meta, chunkCount, previewUrl, pageCount, textPreview }
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  const [filesList, setFilesList] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const fileInputRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const PENDING_UPLOAD_KEY = "kb_pending_upload";

  // Validación de archivos
  const ALLOWED_EXTENSIONS = [".pdf", ".md", ".txt"];
  const MAX_SIZE_MB = 15;

  const validateAndSetFile = useCallback((selectedFile) => {
    if (!selectedFile) return;
    const ext = "." + selectedFile.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      alert(`Tipo de archivo no soportado. Solo se permiten: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return;
    }
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`El archivo no debe superar ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(selectedFile);
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    validateAndSetFile(droppedFile);
  }, [validateAndSetFile]);

  useEffect(() => {
    fetchFilesList();

    // Rollback: si quedó un upload huérfano de un refresh anterior, limpiarlo
    const pending = sessionStorage.getItem(PENDING_UPLOAD_KEY);
    if (pending) {
      try {
        const { archivoId, storagePath } = JSON.parse(pending);
        console.warn("Limpiando upload huérfano:", archivoId);
        // Eliminar storage + archivos_fuente (cascade elimina documentos_kb)
        if (storagePath) {
          supabase.storage.from("kb-files").remove([storagePath]);
        }
        supabase.from("archivos_fuente").delete().eq("id", archivoId);
      } catch (e) {
        console.error("Error limpiando upload huérfano:", e);
      } finally {
        sessionStorage.removeItem(PENDING_UPLOAD_KEY);
      }
    }
  }, []);

  // Advertencia del navegador al intentar cerrar/refrescar durante el procesamiento
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isProcessing) {
        e.preventDefault();
        // Mensaje estándar del navegador (el texto custom se ignora en navegadores modernos)
        e.returnValue = "Hay un procesamiento en curso. Si sales, se perderá el progreso.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProcessing]);

  const fetchFilesList = async () => {
    setIsLoadingList(true);
    try {
      const { data, error } = await supabase
        .from("archivos_fuente")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFilesList(data || []);
    } catch (err) {
      console.error("Error al cargar archivos:", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleDeleteFile = async (id, storagePath) => {
    if (!window.confirm("¿Estás seguro de eliminar este archivo? Se borrarán todos los fragmentos asociados en la base de conocimientos.")) return;
    
    try {
      if (storagePath) {
        await supabase.storage.from("kb-files").remove([storagePath]);
      }
      
      const { error } = await supabase.from("archivos_fuente").delete().eq("id", id);
      if (error) throw error;
      
      fetchFilesList();
    } catch (err) {
      console.error("Error eliminando el archivo:", err);
      alert("Error al eliminar el archivo.");
    }
  };

  const handleDownloadFile = async (storagePath) => {
    if (!storagePath) {
      alert("Esta es una carga manual de texto y no tiene archivo físico asociado.");
      return;
    }

    try {
      const { data, error } = await supabase.storage.from("kb-files").createSignedUrl(storagePath, 60);
      if (error) throw error;
      
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error("Error generando enlace de descarga:", err);
      alert("Error al descargar el archivo.");
    }
  };

  // Extrae el texto del PDF usando pdfjs-dist o usa lectura estándar para TXT/MD
  const extractTextFromFile = async (file) => {
    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        text += pageText + "\n";
      }
      return text;
    } else {
      return await file.text();
    }
  };

  // --- Vista previa / Detalle de archivo ---
  const handlePreviewFile = async (f) => {
    setIsLoadingPreview(true);
    setPreview({ file: f });
    try {
      // Contar chunks asociados
      const { count } = await supabase
        .from("documentos_kb")
        .select("*", { count: "exact", head: true })
        .eq("archivo_id", f.id);

      let fileSize = null;
      let pageCount = null;
      let previewUrl = null;
      let textPreview = null;

      if (f.storage_path) {
        // Obtener URL firmada para descarga/preview
        const { data: urlData } = await supabase.storage
          .from("kb-files")
          .createSignedUrl(f.storage_path, 120);

        if (urlData?.signedUrl) {
          // Obtener tamaño del archivo via HEAD request
          try {
            const headRes = await fetch(urlData.signedUrl, { method: "HEAD" });
            const contentLength = headRes.headers.get("content-length");
            if (contentLength) fileSize = parseInt(contentLength, 10);
          } catch { /* ignorar si HEAD falla */ }

          const ext = f.nombre.split(".").pop().toLowerCase();

          if (ext === "pdf") {
            // Para PDFs: obtener número de páginas y renderizar primera página
            try {
              const res = await fetch(urlData.signedUrl);
              const arrayBuffer = await res.arrayBuffer();
              const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
              pageCount = pdf.numPages;

              // Renderizar primera página a un canvas offscreen y convertir a data URL
              const page = await pdf.getPage(1);
              const viewport = page.getViewport({ scale: 1.0 });
              const canvas = document.createElement("canvas");
              const maxWidth = 600;
              const scale = maxWidth / viewport.width;
              const scaledViewport = page.getViewport({ scale });
              canvas.width = scaledViewport.width;
              canvas.height = scaledViewport.height;
              const ctx = canvas.getContext("2d");
              await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
              previewUrl = canvas.toDataURL("image/png");
            } catch (pdfErr) {
              console.error("Error generando preview PDF:", pdfErr);
            }
          } else {
            // Para TXT/MD: mostrar los primeros 2000 caracteres
            try {
              const res = await fetch(urlData.signedUrl);
              const text = await res.text();
              textPreview = text.slice(0, 2000);
            } catch { /* ignorar */ }
          }
        }
      }

      setPreview({ file: f, chunkCount: count, fileSize, pageCount, previewUrl, textPreview });
    } catch (err) {
      console.error("Error cargando detalle:", err);
      setPreview(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "Desconocido";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleProcess = async (e) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      setProgress(0);
      setStatus("Extrayendo texto del documento (puede demorar en PDFs pesados)...");

      let fullText = manualText.trim();

      if (file) {
        const fileText = await extractTextFromFile(file);
        fullText = (fullText + "\n\n" + fileText).trim();
      }

      if (!fullText) {
        alert("Por favor, ingresa texto o sube un archivo.");
        setIsProcessing(false);
        return;
      }

      // 1. SANITIZACIÓN CRÍTICA: Remover caracteres nulos que rompen PostgreSQL
      fullText = fullText.replace(/\0/g, "");

      setStatus("Verificando duplicados...");
      const fileName = file ? file.name : `Carga_Manual_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
      const storagePath = `kb/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // Validar si ya existe un archivo con el mismo nombre
      const { data: existente } = await supabase
        .from("archivos_fuente")
        .select("id, storage_path")
        .eq("nombre", fileName)
        .maybeSingle();

      if (existente) {
        const reemplazar = window.confirm(
          `Ya existe un documento llamado "${fileName}".\n\n¿Deseas reemplazarlo? Se eliminarán los fragmentos anteriores y se procesará el nuevo archivo.`
        );
        if (!reemplazar) {
          setStatus("");
          setIsProcessing(false);
          return;
        }
        // Eliminar el archivo anterior (storage + DB con cascade a documentos_kb)
        if (existente.storage_path) {
          await supabase.storage.from("kb-files").remove([existente.storage_path]);
        }
        await supabase.from("archivos_fuente").delete().eq("id", existente.id);
      }

      if (file) {
        // Subir el archivo adjunto
        const { error: uploadError } = await supabase.storage
          .from("kb-files")
          .upload(storagePath, file);
        if (uploadError) throw uploadError;
      } else {
        // Generar un .txt a partir del texto pegado para que se pueda descargar/eliminar
        const txtBlob = new Blob([fullText], { type: "text/plain" });
        const { error: uploadError } = await supabase.storage
          .from("kb-files")
          .upload(storagePath, txtBlob, { contentType: "text/plain" });
        if (uploadError) throw uploadError;
      }

      const { data: insertedFile, error: dbError } = await supabase
        .from("archivos_fuente")
        .insert({
          nombre: fileName,
          storage_path: storagePath
        })
        .select()
        .single();

      if (dbError) throw dbError;
      const archivoId = insertedFile.id;

      // Registrar upload en curso para rollback en caso de refresh
      sessionStorage.setItem(PENDING_UPLOAD_KEY, JSON.stringify({ archivoId, storagePath }));

      // 2. Levantamos el Worker para chunking + embedding en segundo plano
      setStatus("Iniciando procesamiento en segundo plano...");
      const worker = new EmbeddingWorker();
      worker.postMessage({ fullText, fileName });

      // 3. Escuchamos las respuestas del worker
      worker.onmessage = async (event) => {
        const { status: workerStatus, progress: workerProgress, message, rowsToInsert } = event.data;

        if (workerStatus === 'info') {
          setStatus(message);
        }
        else if (workerStatus === 'progress') {
          setProgress(workerProgress);
          setStatus(message);
        }
        else if (workerStatus === 'done') {
          try {
            setStatus("Subiendo todos los fragmentos a Supabase...");

            // Inyectar archivo_id en cada registro (el worker no tiene acceso a Supabase)
            const rowsWithArchivo = rowsToInsert.map((row) => ({
              ...row,
              archivo_id: archivoId,
            }));

            // INSERCIÓN MASIVA (Batch Insert): Un solo viaje a la base de datos
            const { error } = await supabase.from("documentos_kb").insert(rowsWithArchivo);
            if (error) throw error;

            // Upload completado exitosamente — limpiar marcador de rollback
            sessionStorage.removeItem(PENDING_UPLOAD_KEY);
            setStatus("¡Base de conocimientos actualizada con éxito!");
            setManualText("");
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            fetchFilesList();
            setTimeout(() => setStatus(""), 4000);
          } catch (insertErr) {
            console.error(insertErr);
            setStatus("Error: " + insertErr.message);
          } finally {
            worker.terminate();
            setIsProcessing(false);
          }
        }
        else if (workerStatus === 'error') {
          console.error("Worker error:", message);
          setStatus("Error: " + message);
          worker.terminate();
          setIsProcessing(false);
        }
      };

      worker.onerror = (err) => {
        console.error("Worker crash:", err);
        setStatus("Error crítico en el procesamiento.");
        worker.terminate();
        setIsProcessing(false);
      };

    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <section className="min-h-[80vh] bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <div className="mx-auto flex max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="bg-green-600 px-6 py-4 shadow-sm">
          <h1 className="text-xl font-bold text-white">Panel de Conocimiento (RAG)</h1>
          <p className="text-sm text-green-100">Carga documentos y genera embeddings localmente</p>
        </header>

        <form onSubmit={handleProcess} className="p-6 space-y-6 bg-gray-50 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subir Archivo (PDF, Markdown, TXT)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.md,.txt"
              onChange={(e) => validateAndSetFile(e.target.files[0])}
              disabled={isProcessing}
              className="hidden"
            />
            {!file ? (
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all duration-200 ${
                  isProcessing
                    ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-100"
                    : isDragging
                    ? "border-green-500 bg-green-50 scale-[1.02] shadow-lg"
                    : "border-gray-300 bg-white hover:border-green-400 hover:bg-green-50/50"
                }`}
              >
                <UploadCloud className={`w-10 h-10 transition-colors duration-200 ${isDragging ? "text-green-600" : "text-gray-400"}`} />
                <div className="text-center">
                  <p className={`text-sm font-semibold transition-colors duration-200 ${isDragging ? "text-green-700" : "text-gray-600"}`}>
                    {isDragging ? "Suelta el archivo aquí" : "Arrastra y suelta tu archivo aquí"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">o haz clic para seleccionar • PDF, MD, TXT • Máx {MAX_SIZE_MB}MB</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800 truncate">{file.name}</p>
                  <p className="text-xs text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="p-1.5 text-green-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Quitar archivo"
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">O carga manual de texto</label>
            <textarea rows="6" value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Escribe o pega tu texto aquí..." disabled={isProcessing} className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 resize-none" />
          </div>
          {status && <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-sm text-gray-600 mb-2 font-medium">{status}</p>{isProcessing && <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-green-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div></div>}</div>}
          <div className="flex justify-end pt-4 border-t border-gray-200"><button type="submit" disabled={isProcessing || (!file && !manualText.trim())} className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">{isProcessing ? "Procesando..." : "Procesar y Subir"}</button></div>
        </form>
      </div>

      {/* --- SECCIÓN DE GESTIÓN DE ARCHIVOS --- */}
      <div className="mx-auto flex max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          Documentos Subidos
        </h2>
        
        {isLoadingList ? (
          <p className="text-gray-500 text-sm">Cargando documentos...</p>
        ) : filesList.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay documentos registrados aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-600">
                  <th className="py-3 px-4 font-semibold">Nombre</th>
                  <th className="py-3 px-4 font-semibold">Fecha de Carga</th>
                  <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {filesList.map((f) => (
                  <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 max-w-[300px] truncate" title={f.nombre}>
                      {f.nombre}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {new Date(f.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 flex justify-end gap-2">
                      <button
                        onClick={() => handlePreviewFile(f)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadFile(f.storage_path)}
                        className={`p-2 rounded-lg transition ${f.storage_path ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                        title={f.storage_path ? "Descargar documento" : "Carga manual sin archivo"}
                        disabled={!f.storage_path}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFile(f.id, f.storage_path)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL DE DETALLE / VISTA PREVIA --- */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800 truncate pr-4">{preview.file.nombre}</h3>
              <button
                onClick={() => setPreview(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingPreview ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm text-gray-500">Cargando detalle del documento...</p>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Metadata Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <HardDrive className="w-5 h-5 text-green-600" />
                    <span className="text-xs text-gray-500">Peso</span>
                    <span className="text-sm font-semibold text-gray-800">{formatFileSize(preview.fileSize)}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <File className="w-5 h-5 text-blue-600" />
                    <span className="text-xs text-gray-500">Tipo</span>
                    <span className="text-sm font-semibold text-gray-800 uppercase">{preview.file.nombre.split(".").pop()}</span>
                  </div>
                  {preview.pageCount != null && (
                    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <span className="text-xs text-gray-500">Páginas</span>
                      <span className="text-sm font-semibold text-gray-800">{preview.pageCount}</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <Layers className="w-5 h-5 text-amber-600" />
                    <span className="text-xs text-gray-500">Chunks</span>
                    <span className="text-sm font-semibold text-gray-800">{preview.chunkCount ?? "—"}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 p-3 col-span-2 sm:col-span-4">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="text-xs text-gray-500">Fecha de carga</span>
                    <span className="text-sm font-semibold text-gray-800">{new Date(preview.file.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Preview */}
                {preview.previewUrl && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Vista previa (página 1)</h4>
                    <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-100">
                      <img
                        src={preview.previewUrl}
                        alt="Vista previa del PDF"
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                )}
                {preview.textPreview && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Vista previa del contenido</h4>
                    <pre className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700 whitespace-pre-wrap break-words max-h-64 overflow-y-auto font-mono">
                      {preview.textPreview}
                      {preview.textPreview.length >= 2000 && "\n\n... (contenido truncado)"}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
export default AdminKB;