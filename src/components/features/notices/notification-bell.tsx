"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { RealtimeRefresh } from "@/components/features/notices/realtime-refresh";

export function NotificationBell({ userId, count }: { userId: string; count: number }) {
  const label = count > 0 ? `Avisos, ${count} sin leer` : "Avisos";
  return <>
    <RealtimeRefresh channel={`notices-${userId}`} table="notifications" filter={`recipient_id=eq.${userId}`} />
    <Link href="/app/notifications" className="notice-bell" aria-label={label}>
      <Bell size={20} aria-hidden="true" />
      {count > 0 ? <span>{count > 9 ? "9+" : count}</span> : null}
    </Link>
  </>;
}
