import {
  PREVIEW_SIGNED_URL_SECONDS,
} from "./kbConfig";
import { countKbChunks } from "./kbDocumentsService";
import {
  buildKbFilePreview,
  fetchKbFileSize,
} from "./kbFileReaderService";
import { createKbSignedUrl } from "./kbStorageService";

export async function getKbDocumentPreview(sourceFile) {
  const chunkCount = await countKbChunks(sourceFile.id);
  const preview = {
    file: sourceFile,
    chunkCount,
    fileSize: null,
    pageCount: null,
    previewUrl: null,
    textPreview: null,
  };

  if (!sourceFile.storage_path) {
    return preview;
  }

  const signedUrl = await createKbSignedUrl(
    sourceFile.storage_path,
    PREVIEW_SIGNED_URL_SECONDS
  );

  if (!signedUrl) {
    return preview;
  }

  const [fileSize, contentPreview] = await Promise.all([
    fetchKbFileSize(signedUrl),
    buildKbFilePreview({ signedUrl, fileName: sourceFile.nombre }),
  ]);

  return {
    ...preview,
    fileSize,
    ...contentPreview,
  };
}
