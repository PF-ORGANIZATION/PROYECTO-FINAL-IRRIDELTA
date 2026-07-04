import EmbeddingWorker from "./embeddingWorker.js?worker";

export function buildKbChunksWithEmbeddings({
  fileName,
  fullText,
  onInfo,
  onProgress,
}) {
  return new Promise((resolve, reject) => {
    const worker = new EmbeddingWorker();

    const terminate = () => {
      worker.terminate();
    };

    worker.onmessage = (event) => {
      const {
        status,
        progress,
        message,
        rowsToInsert,
      } = event.data;

      if (status === "info") {
        onInfo?.(message);
        return;
      }

      if (status === "progress") {
        onProgress?.({ progress, message });
        return;
      }

      if (status === "done") {
        terminate();
        resolve(rowsToInsert || []);
        return;
      }

      if (status === "error") {
        terminate();
        reject(new Error(message || "Error generando embeddings."));
      }
    };

    worker.onerror = (error) => {
      terminate();
      reject(new Error(error?.message || "Error crítico en el procesamiento."));
    };

    worker.postMessage({ fullText, fileName });
  });
}
