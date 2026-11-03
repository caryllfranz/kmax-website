import type { SupabaseClient } from "@supabase/supabase-js";

const chunkSize = 500;

// The RPC returns one JSON object, so a PostgREST row cap cannot truncate its counts.
export async function fetchGroupClassCounts(client: SupabaseClient, sessionIds: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(sessionIds)];
  const counts: Record<string, number> = {};
  for (let start = 0; start < ids.length; start += chunkSize) {
    const chunk = ids.slice(start, start + chunkSize);
    const { data, error } = await client.rpc("group_class_attendance_counts", { p_session_ids: chunk });
    if (error || !data || typeof data !== "object" || Array.isArray(data)) throw new Error("Could not load attendance counts");
    for (const id of chunk) {
      const count: unknown = data[id];
      if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) throw new Error("Invalid attendance count");
      counts[id] = count;
    }
  }
  return counts;
}
