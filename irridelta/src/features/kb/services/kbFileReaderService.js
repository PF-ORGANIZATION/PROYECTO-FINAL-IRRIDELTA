import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { TEXT_PREVIEW_CHARS } from "./kbConfig";
import { isPdfFile } from "./kbFileUtils";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

async function withPdfDocument(source, callback) {
  const loadingTask = pdfjsLib.getDocument(source);
  const pdf = await loadingTask.promise;

  try {
    return await callback(pdf);
  } finally {
    await pdf.destroy?.();
  }
}

export async function extractTextFromKbFile(file) {
  if (!isPdfFile(file)) {
    return file.text();
  }

  const arrayBuffer = await file.arrayBuffer();
  return withPdfDocument({ data: arrayBuffer }, async (pdf) => {
    let text = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      text += `${pageText}\n`;
    }

    return text;
  });
}

export async function fetchKbFileSize(signedUrl) {
  try {
    const response = await fetch(signedUrl, { method: "HEAD" });
    const contentLength = response.headers.get("content-length");
    return contentLength ? parseInt(contentLength, 10) : null;
  } catch {
    return null;
  }
}

export async function buildKbFilePreview({ signedUrl, fileName }) {
  if (isPdfFile(fileName)) {
    return buildPdfPreview(signedUrl);
  }

  return buildTextPreview(signedUrl);
}

async function buildPdfPreview(signedUrl) {
  try {
    const response = await fetch(signedUrl);
    const arrayBuffer = await response.arrayBuffer();

    return withPdfDocument({ data: arrayBuffer }, async (pdf) => {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement("canvas");
      const maxWidth = 600;
      const scale = maxWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });
      const canvasContext = canvas.getContext("2d");

      if (!canvasContext) {
        return { pageCount: pdf.numPages, previewUrl: null, textPreview: null };
      }

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      await page.render({ canvasContext, viewport: scaledViewport }).promise;

      return {
        pageCount: pdf.numPages,
        previewUrl: canvas.toDataURL("image/png"),
        textPreview: null,
      };
    });
  } catch (error) {
    console.error("Error generando preview PDF:", error);
    return { pageCount: null, previewUrl: null, textPreview: null };
  }
}

async function buildTextPreview(signedUrl) {
  try {
    const response = await fetch(signedUrl);
    const text = await response.text();

    return {
      pageCount: null,
      previewUrl: null,
      textPreview: text.slice(0, TEXT_PREVIEW_CHARS),
    };
  } catch {
    return { pageCount: null, previewUrl: null, textPreview: null };
  }
}
