import { supabase } from "../../../supabaseClient";
import { KB_BUCKET } from "./kbConfig";

export async function uploadKbFile(storagePath, file) {
  const { error } = await supabase.storage
    .from(KB_BUCKET)
    .upload(storagePath, file);

  if (error) throw error;
}

export async function uploadKbText(storagePath, text) {
  const txtBlob = new Blob([text], { type: "text/plain" });
  const { error } = await supabase.storage
    .from(KB_BUCKET)
    .upload(storagePath, txtBlob, { contentType: "text/plain" });

  if (error) throw error;
}

export async function removeKbStorageObject(storagePath) {
  if (!storagePath) return;

  const { error } = await supabase.storage
    .from(KB_BUCKET)
    .remove([storagePath]);

  if (error) throw error;
}

export async function createKbSignedUrl(storagePath, expiresInSeconds) {
  const { data, error } = await supabase.storage
    .from(KB_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw error;
  return data?.signedUrl;
}
