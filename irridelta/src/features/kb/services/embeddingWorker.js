// src/pages/embeddingWorker.js
// Web Worker para vectorización en segundo plano.
// Recibe texto plano, lo fragmenta y genera embeddings sin bloquear el hilo principal.

import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
env.backends.onnx.wasm.wasmPaths =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

// Fragmentación mejorada: respeta párrafos y oraciones para mantener coherencia semántica
const chunkText = (text, chunkSize = 1000, overlap = 200) => {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    let end = i + chunkSize;
    if (end < text.length) {
      // Intenta cortar en el último punto o salto de línea (simular capítulos/párrafos)
      const lastBreak = Math.max(
        text.lastIndexOf("\n", end),
        text.lastIndexOf(". ", end)
      );
      if (lastBreak > i + overlap) {
        end = lastBreak + 1;
      }
    }
    chunks.push(text.slice(i, end));
    i = end - overlap;
  }
  return chunks;
};

let extractorInstance = null;

// Escuchamos el mensaje desde React
self.onmessage = async (event) => {
  const { fullText, fileName } = event.data;

  try {
    const chunks = chunkText(fullText);
    const total = chunks.length;

    self.postMessage({
      status: "info",
      message: "Cargando modelo de IA en segundo plano...",
    });

    if (!extractorInstance) {
      extractorInstance = await pipeline(
        "feature-extraction",
        "Supabase/gte-small"
      );
    }

    const rowsToInsert = [];

    for (let i = 0; i < total; i++) {
      const chunk = chunks[i];
      const output = await extractorInstance(chunk, {
        pooling: "mean",
        normalize: true,
      });

      rowsToInsert.push({
        contenido: chunk,
        metadata: { source: fileName, chunk_index: i },
        embedding: Array.from(output.data),
      });

      // Reportamos el progreso a React en tiempo real
      self.postMessage({
        status: "progress",
        progress: Math.round(((i + 1) / total) * 100),
        message: `Procesando vector ${i + 1} de ${total}...`,
      });
    }

    // Enviamos todos los vectores listos de vuelta a React
    self.postMessage({ status: "done", rowsToInsert });
  } catch (error) {
    self.postMessage({ status: "error", message: error.message });
  }
};
