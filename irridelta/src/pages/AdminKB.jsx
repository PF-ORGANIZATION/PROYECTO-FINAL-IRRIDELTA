import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { pipeline, env } from "@xenova/transformers";
import * as pdfjsLib from "pdfjs-dist";
// El "?url" al final es clave para que Vite lo trate como un archivo estático
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'; 

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// 1. Deshabilitamos la búsqueda local del modelo para que vaya directo al Hub
env.allowLocalModels = false;

// 2. Le indicamos explícitamente de dónde bajar los binarios WASM de ONNX
// Esto evita el error del módulo dinámico .jsep.mjs
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

// Configuramos el worker de PDF.js apuntando a un CDN para evitar problemas de empaquetado con Vite
//pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Deshabilitamos la búsqueda de modelos en el sistema de archivos local para forzar el uso de HuggingFace Hub
env.allowLocalModels = false;

// Singleton para evitar recargar el modelo de IA en cada renderizado
class PipelineSingleton {
  static task = "feature-extraction";
  static model = "Supabase/gte-small";
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

function AdminKB() {
  const [file, setFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

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

      setStatus("Dividiendo el texto en fragmentos (chunks)...");
      const chunks = chunkText(fullText);
      const total = chunks.length;

      setStatus("Cargando modelo de IA (gte-small)...");
      const extractor = await PipelineSingleton.getInstance();

      const fileName = file ? file.name : "carga_manual";
      
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
      setTimeout(() => setStatus(""), 4000);
    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="min-h-[80vh] bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
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
    </section>
  );
}
export default AdminKB;