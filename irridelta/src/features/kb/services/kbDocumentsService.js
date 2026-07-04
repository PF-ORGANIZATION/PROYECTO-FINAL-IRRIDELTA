import { supabase } from "../../../supabaseClient";

export async function fetchKbSourceFiles() {
  const { data, error } = await supabase
    .from("archivos_fuente")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function findKbSourceFileByName(fileName) {
  const { data, error } = await supabase
    .from("archivos_fuente")
    .select("id, storage_path")
    .eq("nombre", fileName)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertKbSourceFile({ nombre, storagePath }) {
  const { data, error } = await supabase
    .from("archivos_fuente")
    .insert({
      nombre,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteKbSourceFile(id) {
  const { error } = await supabase
    .from("archivos_fuente")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function updateKbSourceFileActive(id, activo) {
  const { error } = await supabase
    .from("archivos_fuente")
    .update({ activo })
    .eq("id", id);

  if (error) throw error;
}

export async function countKbChunks(archivoId) {
  const { count, error } = await supabase
    .from("documentos_kb")
    .select("*", { count: "exact", head: true })
    .eq("archivo_id", archivoId);

  if (error) throw error;
  return count ?? 0;
}

export async function insertKbChunks(rows) {
  const { error } = await supabase.from("documentos_kb").insert(rows);
  if (error) throw error;
}
