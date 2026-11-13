import { ReportForm } from "@/components/features/community/report-form";

export const instant = false;

export default async function CommunityReportPage({ searchParams }: { searchParams: Promise<{ post?: string; comment?: string; message?: string; conversation?: string }> }) {
  const params = await searchParams;
  return <ReportForm postId={params.post ?? ""} commentId={params.comment ?? ""} messageId={params.message ?? ""} conversationId={params.conversation ?? ""} />;
}
