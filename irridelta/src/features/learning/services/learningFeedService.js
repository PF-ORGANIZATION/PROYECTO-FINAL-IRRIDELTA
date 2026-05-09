import { supabase } from "../../../supabaseClient";

export const LEARNING_FEED_VIEWS = {
  USER_CAPACITACIONES: "user-capacitaciones",
  ADMIN_CAPACITACIONES: "admin-capacitaciones",
  USER_CERTIFICACIONES: "user-certificaciones",
};

export const LEARNING_FEED_LIMIT = 8;

export async function fetchLearningFeed({
  view,
  cursor = null,
  limit = LEARNING_FEED_LIMIT,
  search = "",
  status = "todos",
} = {}) {
  const { data, error } = await supabase.functions.invoke("learning-feed", {
    body: {
      view,
      cursor,
      limit,
      search,
      status,
    },
  });

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return {
    items: data?.items ?? [],
    total: Number(data?.total ?? 0),
    nextCursor: data?.nextCursor ?? null,
    hasMore: Boolean(data?.hasMore),
  };
}
