"use client";

import { usePathname } from "next/navigation";

export function MessagesFrame({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const inbox = pathname === "/app/messages";
  return <div className={inbox ? "messages-shell inbox" : "messages-shell thread"}>
    <aside className="messages-list-pane">{list}</aside>
    <section className="messages-thread-pane">{children}</section>
  </div>;
}
