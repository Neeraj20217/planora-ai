import type { Metadata } from "next";
import { SavedPlan } from "@/components/planner/saved-plan";

export const metadata: Metadata = { title: "Your event plan" };
export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <SavedPlan id={(await params).id} />;
}
