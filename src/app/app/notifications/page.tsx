import { PageHeader } from "@/components/design/page-header";
import { markAllNotificationsRead, openNotification } from "@/app/app/notifications/actions";
import { loadNotices } from "@/lib/notices/feed";

export const instant = false;

export default async function NotificationsPage() {
  const notices = await loadNotices();
  const unread = notices.some((notice) => !notice.read);
  return <main className="admin-page">
    <PageHeader title="Avisos" backHref="/app" />
    {unread ? <form action={markAllNotificationsRead}><button type="submit" className="community-quiet">Marcar todos como leídos</button></form> : null}
    {notices.length === 0 ? <p className="empty-copy">Cuando alguien te escriba o comente, el aviso aparecerá aquí.</p> : <ul className="conversation-list">
      {notices.map((notice) => <li key={notice.id}>
        <form action={openNotification}>
          <input type="hidden" name="notification_id" value={notice.id} />
          <button type="submit" className={notice.read ? "notice-row" : "notice-row unread"}>
            <strong>{notice.title}</strong>
            {notice.body ? <span>{notice.body}</span> : null}
            <small>{notice.when}</small>
          </button>
        </form>
      </li>)}
    </ul>}
  </main>;
}
