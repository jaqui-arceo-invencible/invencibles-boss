"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RealtimeRefresh({ channel, table, filter }: { channel: string; table: string; filter: string }) {
  const router = useRouter();
  const seen = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    const subscription = supabase
      .channel(channel)
      .on("postgres_changes", { event: "*", schema: "public", table, filter }, () => {
        router.refresh();
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        if (seen.current) router.refresh();
        seen.current = true;
      });
    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [channel, filter, router, table]);

  return null;
}
