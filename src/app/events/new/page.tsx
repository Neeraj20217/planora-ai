import type { Metadata } from "next";
import { EventForm } from "@/components/events/event-form";
import { todayInIndia } from "@/lib/domain/date";

export const metadata: Metadata = { title: "Create an event" };
// A date minimum must not be frozen at build time.
export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return <EventForm initialToday={todayInIndia()} />;
}
