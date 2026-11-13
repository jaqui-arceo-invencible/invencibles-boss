import { PageHeader } from "@/components/design/page-header";
import { DirectoryPicker } from "@/components/features/messages/directory-picker";
import { requireMember } from "@/lib/auth/guards";
import { loadDirectory } from "@/lib/messages/inbox";

export const instant = false;

export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const access = await requireMember();
  const params = await searchParams;
  const people = await loadDirectory(access);
  return <>
    <PageHeader title="Nueva conversación" backHref="/app/messages" />
    {params.error ? <p className="form-note" role="status">No pudimos abrir la conversación.</p> : null}
    <DirectoryPicker people={people} />
  </>;
}
