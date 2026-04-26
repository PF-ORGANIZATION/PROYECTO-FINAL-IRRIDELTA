// src/services/embeddingService.js
// Módulo compartido de vectorización — una sola fuente de verdad para
// la configuración del entorno y el singleton del modelo de embeddings.

import { pipeline, env } from "@xenova/transformers";

// Configuramos el entorno de Transformers.js para evitar errores en Vite
env.allowLocalModels = false;
env.backends.onnx.wasm.wasmPaths =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

// Singleton para cargar el modelo de IA una sola vez en el navegador
let instance = null;

/**
 * Devuelve la instancia (singleton) del pipeline de feature-extraction.
 * Opcionalmente recibe un callback de progreso (útil en AdminKB).
 */
export async function getEmbedder(progressCallback = null) {
  if (!instance) {
    instance = pipeline("feature-extraction", "Supabase/gte-small", {
      progress_callback: progressCallback,
    });
  }
  return instance;
}

/**
 * Genera el vector de embedding para un texto dado.
 * Devuelve un Array<number> de 384 dimensiones.
 */
export async function embed(text) {
  const extractor = await getEmbedder();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}
