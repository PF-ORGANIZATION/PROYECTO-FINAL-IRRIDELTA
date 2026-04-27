import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { getEmbedder } from "../services/embeddingService";
import * as pdfjsLib from "pdfjs-dist";
import { Trash2, Download, FileText } from "lucide-react";
// El "?url" al final es clave para que Vite lo trate como un archivo estático
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'; 

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function AdminKB() {
  const [file, setFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  
  const [filesList, setFilesList] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Validación de archivos
  const ALLOWED_EXTENSIONS = [".pdf", ".md", ".txt"];
  const MAX_SIZE_MB = 10;

  useEffect(() => {
    fetchFilesList();
  }, []);

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

  // Chunking simple (1000 caracteres, 200 de overlap), respetando los espacios
  const chunkText = (text, chunkSize = 1000, overlap = 200) => {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
      let end = i + chunkSize;
      // Intentar no cortar palabras a la mitad
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(" ", end);
        if (lastSpace > i + overlap) {
          end = lastSpace;
        }
      }
      chunks.push(text.slice(i, end));
      i = end - overlap;
    }
    return chunks;
  };

  const handleProcess = async (e) => {
    e.preventDefault();

    // Validación de tipo y tamaño del archivo
    if (file) {
      const ext = "." + file.name.split(".").pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        alert(`Tipo de archivo no soportado. Solo se permiten: ${ALLOWED_EXTENSIONS.join(", ")}`);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`El archivo no debe superar ${MAX_SIZE_MB}MB.`);
        return;
      }
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setStatus("Extrayendo texto...");

      let fullText = manualText.trim();

      if (file) {
        const fileText = await extractTextFromFile(file);
        fullText = (fullText + "\n\n" + fileText).trim();
      }

      if (!fullText) {
        alert("Por favor, ingresa texto o sube un archivo.");
        return;
      }

      // 1. SANITIZACIÓN CRÍTICA: Remover caracteres nulos que rompen PostgreSQL
      fullText = fullText.replace(/\0/g, "");

      setStatus("Subiendo archivo al storage...");
      let archivoId = null;
      const fileName = file ? file.name : `Carga_Manual_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
      const storagePath = `kb/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

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
      archivoId = insertedFile.id;

      setStatus("Dividiendo el texto en fragmentos (chunks)...");
      const chunks = chunkText(fullText);
      const total = chunks.length;

      setStatus("Cargando modelo de IA (gte-small)...");
      const extractor = await getEmbedder();

      
      // Array para almacenar todos los registros antes de subir
      const rowsToInsert = [];

      for (let i = 0; i < total; i++) {
        setStatus(`Procesando vector ${i + 1} de ${total}...`);
        const chunk = chunks[i];

        // Generar Embedding localmente
        const output = await extractor(chunk, { pooling: "mean", normalize: true });
        const embedding = Array.from(output.data);

        // Agregamos al lote en lugar de subirlo inmediatamente
        rowsToInsert.push({
          archivo_id: archivoId,
          contenido: chunk,
          metadata: { source: fileName, chunk_index: i },
          embedding: embedding,
        });

        // Actualizamos la barra de progreso
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      setStatus("Subiendo todos los fragmentos a Supabase...");

      // 2. INSERCIÓN MASIVA (Batch Insert): Un solo viaje a la base de datos
      const { error } = await supabase.from("documentos_kb").insert(rowsToInsert);

      if (error) throw error;

      setStatus("¡Base de conocimientos actualizada con éxito!");
      setManualText("");
      setFile(null);
      fetchFilesList();
      setTimeout(() => setStatus(""), 4000);
    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.message);
    } finally {
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
            <input type="file" accept=".pdf,.md,.txt" onChange={(e) => setFile(e.target.files[0])} disabled={isProcessing} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 transition duration-150" />
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
    </section>
  );
}
export default AdminKB;