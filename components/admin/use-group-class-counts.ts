"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Session } from "./demo-store";
import { fetchGroupClassCounts } from "./attendance-counts";

type CountState = { key: string; counts: Record<string, number> | null; loading: boolean; error: boolean };

export function useGroupClassCounts(mode: "demo" | "live", sessions: Session[]) {
  const key = JSON.stringify(sessions.filter((session) => session.category === "Group class").map((session) => session.id).sort());
  const [state, setState] = useState<CountState>({ key: "", counts: null, loading: true, error: false });
  const [demoCounts, setDemoCounts] = useState<Record<string, number>>({});
  const generation = useRef(0);
  const activeKey = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (mode === "demo" || activeKey.current !== key) return;
    const current = ++generation.current;
    setState({ key, counts: null, loading: true, error: false });
    try {
      const ids = JSON.parse(key) as string[];
      const counts = ids.length ? await fetchGroupClassCounts(createSupabaseBrowserClient(), ids) : {};
      if (current === generation.current) setState({ key, counts, loading: false, error: false });
    } catch {
      if (current === generation.current) setState({ key, counts: null, loading: false, error: true });
    }
  }, [key, mode]);

  useEffect(() => {
    let active = true;
    activeKey.current = key;
    void Promise.resolve().then(() => { if (active) return refresh(); });
    return () => { active = false; activeKey.current = null; generation.current += 1; };
  }, [key, refresh]);

  const setDemoCount = useCallback((sessionId: string, count: number) => {
    setDemoCounts((previous) => ({ ...previous, [sessionId]: count }));
  }, []);

  if (mode === "demo") return { counts: demoCounts, loading: false, error: false, refresh, setDemoCount };
  return { counts: state.key === key ? state.counts : null, loading: state.key !== key || state.loading, error: state.key === key && state.error, refresh, setDemoCount };
}
