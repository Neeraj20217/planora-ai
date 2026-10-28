import type { Metadata } from "next";
import { AccessForm } from "@/components/access-form";
export const metadata: Metadata = { title: "Generation access" };
export default function AccessPage() {
  return <AccessForm />;
}
