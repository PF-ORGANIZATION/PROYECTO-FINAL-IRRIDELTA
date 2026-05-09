import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;

const VIEWS = {
  USER_CAPACITACIONES: "user-capacitaciones",
  ADMIN_CAPACITACIONES: "admin-capacitaciones",
  USER_CERTIFICACIONES: "user-certificaciones",
} as const;

const STATUS = {
  ALL: "todos",
  PENDING: "pendiente",
  IN_PROGRESS: "en-progreso",
  COMPLETED: "completado",
  PUBLISHED: "publicadas",
  DRAFT: "borradores",
} as const;

type FeedView = typeof VIEWS[keyof typeof VIEWS];

type FeedPayload = {
  view?: FeedView;
  limit?: number;
  cursor?: string | number | null;
  search?: string;
  status?: string;
};

type ResourceRow = {
  id: string;
};

type ModuleRow = {
  id: string;
  modulo_recursos?: ResourceRow[] | null;
};

type CertificationRow = {
  id: string;
  titulo?: string | null;
  descripcion?: string | null;
  capacitacion_id?: string | null;
  cantidad_preguntas_examen?: number | null;
  porcentaje_aprobacion?: number | null;
  duracion_maxima_minutos?: number | null;
  created_at?: string | null;
};

type CapacitacionRow = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  publicada?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  capacitacion_modulos?: ModuleRow[] | null;
  certificaciones?: CertificationRow[] | null;
};

type ProgressRow = {
  capacitacion_id: string;
  modulo_id: string;
  recurso_id: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clampLimit(value: unknown) {
  const limit = Number(value ?? DEFAULT_LIMIT);

  if (!Number.isFinite(limit) || limit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function parseOffset(cursor: unknown) {
  const offset = Number(cursor ?? 0);

  if (!Number.isFinite(offset) || offset < 0) {
    return 0;
  }

  return Math.floor(offset);
}

function getUserRole(user: any) {
  return typeof user?.app_metadata?.role === "string"
    ? user.app_metadata.role.toLowerCase()
    : null;
}

function normalizeSearch(search: unknown) {
  return typeof search === "string" ? search.trim() : "";
}

function buildProgressByCapacitacion(progressRows: ProgressRow[]) {
  return progressRows.reduce<Record<string, Set<string>>>((acc, row) => {
    if (!row.capacitacion_id || !row.modulo_id || !row.recurso_id) {
      return acc;
    }

    acc[row.capacitacion_id] = acc[row.capacitacion_id] ?? new Set<string>();
    acc[row.capacitacion_id].add(`${row.modulo_id}:${row.recurso_id}`);
    return acc;
  }, {});
}

function getCapacitacionProgress(
  item: CapacitacionRow,
  progressByCapacitacion: Record<string, Set<string>>
) {
  const modules = item.capacitacion_modulos ?? [];
  const completedKeys = progressByCapacitacion[item.id] ?? new Set<string>();
  const startedModules = modules.filter((module) =>
    (module.modulo_recursos ?? []).some((resource) =>
      completedKeys.has(`${module.id}:${resource.id}`)
    )
  ).length;
  const completedModules = modules.filter((module) => {
    const resources = module.modulo_recursos ?? [];
    return resources.every((resource) => completedKeys.has(`${module.id}:${resource.id}`));
  }).length;
  const totalModules = modules.length;
  const progressPercentage =
    totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  const status =
    totalModules === 0 || (completedModules === 0 && startedModules === 0)
      ? STATUS.PENDING
      : completedModules >= totalModules
        ? STATUS.COMPLETED
        : STATUS.IN_PROGRESS;

  return {
    completedModules,
    totalModules,
    progressPercentage,
    status,
  };
}

function mapCapacitacionFeedItem(
  item: CapacitacionRow,
  progressByCapacitacion: Record<string, Set<string>>
) {
  const modules = item.capacitacion_modulos ?? [];
  const certification = item.certificaciones?.[0] ?? null;

  return {
    id: item.id,
    titulo: item.titulo,
    descripcion: item.descripcion,
    publicada: Boolean(item.publicada),
    created_at: item.created_at,
    updated_at: item.updated_at,
    tipo: "capacitacion",
    modulos: modules.map((module) => ({
      id: module.id,
      recursos: module.modulo_recursos ?? [],
    })),
    certificacion: certification ? { id: certification.id } : null,
    progress: getCapacitacionProgress(item, progressByCapacitacion),
  };
}

function mapCertificationFeedItem(item: CapacitacionRow) {
  const certification = item.certificaciones?.[0];

  if (!certification) {
    return null;
  }

  return {
    id: certification.id,
    titulo: certification.titulo,
    descripcion: certification.descripcion,
    capacitacion_id: item.id,
    capacitacion_titulo: item.titulo,
    created_at: certification.created_at,
    cantidad_preguntas_examen: certification.cantidad_preguntas_examen,
    porcentaje_aprobacion: certification.porcentaje_aprobacion,
    duracion_maxima_minutos: certification.duracion_maxima_minutos,
    tipo: "certificacion",
  };
}

async function fetchProgressRows(supabaseAdmin: any, userId: string, capacitacionIds: string[]) {
  if (capacitacionIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("progreso_recursos")
    .select("capacitacion_id, modulo_id, recurso_id")
    .eq("user_id", userId)
    .eq("completado", true)
    .in("capacitacion_id", capacitacionIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

function applySearch(query: any, search: string) {
  if (!search) {
    return query;
  }

  const escapedSearch = search.replaceAll("%", "\\%").replaceAll("_", "\\_");
  return query.or(`titulo.ilike.%${escapedSearch}%,descripcion.ilike.%${escapedSearch}%`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Supabase Edge Function env vars are not configured.");
    }

    const payload = (await req.json()) as FeedPayload;
    const view = payload.view;
    const limit = clampLimit(payload.limit);
    const offset = parseOffset(payload.cursor);
    const search = normalizeSearch(payload.search);
    const status = payload.status ?? STATUS.ALL;
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!view || !Object.values(VIEWS).includes(view)) {
      return jsonResponse({ error: "Vista de feed invalida." }, 400);
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user?.id) {
      return jsonResponse({ error: "Usuario no autenticado." }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const isAdmin = getUserRole(user) === "admin";

    if (view === VIEWS.ADMIN_CAPACITACIONES && !isAdmin) {
      return jsonResponse({ error: "No autorizado." }, 403);
    }

    if (view === VIEWS.USER_CAPACITACIONES) {
      let query = supabaseAdmin
        .from("capacitaciones")
        .select(
          `
          id,
          titulo,
          descripcion,
          publicada,
          created_at,
          updated_at,
          capacitacion_modulos(id, modulo_recursos(id)),
          certificaciones(id)
        `
        )
        .eq("publicada", true)
        .order("created_at", { ascending: false });

      query = applySearch(query, search);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const capacitaciones = (data ?? []) as CapacitacionRow[];
      const progressRows = await fetchProgressRows(
        supabaseAdmin,
        user.id,
        capacitaciones.map((item) => item.id)
      );
      const progressByCapacitacion = buildProgressByCapacitacion(progressRows);
      let feedItems = capacitaciones.map((item) =>
        mapCapacitacionFeedItem(item, progressByCapacitacion)
      );

      if (status !== STATUS.ALL) {
        feedItems = feedItems.filter((item) => item.progress.status === status);
      }

      const items = feedItems.slice(offset, offset + limit);
      const nextOffset = offset + limit;

      return jsonResponse({
        items,
        total: feedItems.length,
        nextCursor: nextOffset < feedItems.length ? String(nextOffset) : null,
        hasMore: nextOffset < feedItems.length,
      });
    }

    if (view === VIEWS.ADMIN_CAPACITACIONES) {
      let query = supabaseAdmin
        .from("capacitaciones")
        .select(
          `
          id,
          titulo,
          descripcion,
          publicada,
          created_at,
          updated_at,
          capacitacion_modulos(id, modulo_recursos(id)),
          certificaciones(id)
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      if (status === STATUS.PUBLISHED) {
        query = query.eq("publicada", true);
      } else if (status === STATUS.DRAFT) {
        query = query.eq("publicada", false);
      }

      query = applySearch(query, search);
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const capacitaciones = (data ?? []) as CapacitacionRow[];
      const progressRows = await fetchProgressRows(
        supabaseAdmin,
        user.id,
        capacitaciones.map((item) => item.id)
      );
      const progressByCapacitacion = buildProgressByCapacitacion(progressRows);
      const items = capacitaciones.map((item) =>
        mapCapacitacionFeedItem(item, progressByCapacitacion)
      );

      const nextOffset = offset + limit;
      return jsonResponse({
        items,
        total: count ?? items.length,
        nextCursor: nextOffset < (count ?? 0) ? String(nextOffset) : null,
        hasMore: nextOffset < (count ?? 0),
      });
    }

    if (view === VIEWS.USER_CERTIFICACIONES) {
      let query = supabaseAdmin
        .from("capacitaciones")
        .select(
          `
          id,
          titulo,
          descripcion,
          publicada,
          created_at,
          capacitacion_modulos(id, modulo_recursos(id)),
          certificaciones(
            id,
            titulo,
            descripcion,
            capacitacion_id,
            cantidad_preguntas_examen,
            porcentaje_aprobacion,
            duracion_maxima_minutos,
            created_at
          )
        `
        )
        .eq("publicada", true)
        .order("created_at", { ascending: false });

      query = applySearch(query, search);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const capacitaciones = ((data ?? []) as CapacitacionRow[]).filter(
        (item) => (item.certificaciones ?? []).length > 0
      );
      const progressRows = await fetchProgressRows(
        supabaseAdmin,
        user.id,
        capacitaciones.map((item) => item.id)
      );
      const progressByCapacitacion = buildProgressByCapacitacion(progressRows);
      const completedCertifications = capacitaciones
        .filter((item) => getCapacitacionProgress(item, progressByCapacitacion).status === STATUS.COMPLETED)
        .map(mapCertificationFeedItem)
        .filter(Boolean);
      const items = completedCertifications.slice(offset, offset + limit);
      const nextOffset = offset + limit;

      return jsonResponse({
        items,
        total: completedCertifications.length,
        nextCursor:
          nextOffset < completedCertifications.length ? String(nextOffset) : null,
        hasMore: nextOffset < completedCertifications.length,
      });
    }

    return jsonResponse({ error: "Vista de feed no soportada." }, 400);
  } catch (error) {
    console.error("learning-feed error", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el feed de aprendizaje.",
      },
      500
    );
  }
});
