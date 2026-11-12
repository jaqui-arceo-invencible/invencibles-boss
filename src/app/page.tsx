import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/guards";

export const instant = false;

export default async function Home() {
  await requireMember();
  redirect("/app");
}
