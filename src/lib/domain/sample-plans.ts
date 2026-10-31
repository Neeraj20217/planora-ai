import { composePlan } from "./plan";
import { proposalSchema, type EventPlan, type Proposal } from "@/lib/schemas/plan";
import type { EventDetails, EventType } from "@/types";
import { todayInIndia } from "./date";

const SAMPLE_PROPOSALS: Record<EventType, Proposal> = {
  birthday: proposalSchema.parse({
    overview:
      "A vibrant celebration bringing together family and friends with wholesome dining, music, photography and thoughtful details for an unforgettable birthday.",
    recommendations: [
      {
        suggestion: "Book the space and catering before confirming custom decor",
        rationale: "Guest comfort and refreshments define the experience; finalize logistics before novelty spending.",
      },
      {
        suggestion: "Plan a dedicated photo backdrop with natural lighting",
        rationale: "Creates memorable guest takeaways without excessive stage or production costs.",
      },
    ],
    priorities: [
      { category: "catering", weight: 45, rationale: "Hearty multi-course food and beverages tailored to all age groups." },
      { category: "venue", weight: 20, rationale: "Private celebration hall or garden area with parking and audio setup." },
      { category: "photography", weight: 15, rationale: "Coverage of key moments, cake cutting, and family group portraits." },
      { category: "entertainment", weight: 10, rationale: "Sound system, playlist coordination, and interactive games." },
    ],
    tasks: [
      { key: "venue-booking", title: "Select and confirm celebration venue", leadDays: 21, priority: "high", dependsOn: [] },
      { key: "catering-menu", title: "Finalize birthday menu and cake flavor", leadDays: 14, priority: "high", dependsOn: ["venue-booking"] },
      { key: "photo-brief", title: "Share shot list with photographer", leadDays: 7, priority: "normal", dependsOn: ["venue-booking"] },
      { key: "music-playlist", title: "Compile celebration playlist and games", leadDays: 3, priority: "normal", dependsOn: [] },
    ],
    vendors: [
      { category: "venue", essential: true, rationale: "Adequate seating, cooling, and power backup." },
      { category: "catering", essential: true, rationale: "Reliable food safety and timely service." },
      { category: "photography", essential: false, rationale: "Preserves lasting memories." },
      { category: "entertainment", essential: false, rationale: "Maintains high party energy." },
    ],
    ideas: [
      { suggestion: "Memory wall of photos", rationale: "Highlights milestones and sparks nostalgic conversations among guests." },
      { suggestion: "Signature mocktail greeting", rationale: "Sets a festive and welcoming tone as guests arrive." },
    ],
    savings: [
      { suggestion: "Digital animated invitations", rationale: "Saves printing and courier costs while enabling instant RSVPs." },
    ],
    assumptions: ["Indoor or shaded outdoor venue available in city limits."],
    warnings: ["Confirm guest dietary restrictions at least 5 days in advance."],
  }),
  wedding: proposalSchema.parse({
    overview:
      "A grand and structured wedding celebration balancing tradition, guest hospitality, photography, and smooth ritual coordination.",
    recommendations: [
      {
        suggestion: "Secure the ceremonial venue and catering contract simultaneously",
        rationale: "Wedding dates in peak seasons book out quickly; locking venue and food guarantees your baseline.",
      },
      {
        suggestion: "Appoint dedicated point persons for vendor coordination",
        rationale: "Ensures the couple and parents remain stress-free on the event day.",
      },
    ],
    priorities: [
      { category: "catering", weight: 40, rationale: "Multi-meal hospitality and ceremonial feasts." },
      { category: "venue", weight: 25, rationale: "Ceremony hall, guest dressing suites, and mandap space." },
      { category: "decoration", weight: 15, rationale: "Stage, entrance florals, and ceremonial backdrop." },
      { category: "photography", weight: 10, rationale: "Traditional and candid multi-camera documentation." },
    ],
    tasks: [
      { key: "wedding-venue", title: "Book wedding mandap and banquet hall", leadDays: 90, priority: "high", dependsOn: [] },
      { key: "caterer-tasting", title: "Tasting session and feast menu finalization", leadDays: 60, priority: "high", dependsOn: ["wedding-venue"] },
      { key: "decor-theme", title: "Approve stage and mandap floral design", leadDays: 45, priority: "normal", dependsOn: ["wedding-venue"] },
      { key: "photo-team", title: "Lock photography team and pre-wedding schedule", leadDays: 30, priority: "high", dependsOn: ["wedding-venue"] },
    ],
    vendors: [
      { category: "venue", essential: true, rationale: "Hosts guests and rituals." },
      { category: "catering", essential: true, rationale: "Cornerstone of guest hospitality." },
      { category: "decoration", essential: true, rationale: "Creates traditional and photographic ambience." },
      { category: "photography", essential: true, rationale: "Preserves once-in-a-lifetime memories." },
    ],
    ideas: [
      { suggestion: "Live traditional welcome music (Shehnai/Nadaswaram)", rationale: "Creates immediate cultural resonance upon arrival." },
      { suggestion: "Personalized favor boxes with local sweets", rationale: "Warm, culturally authentic gesture of gratitude." },
    ],
    savings: [
      { suggestion: "Utilize seasonal local blooms for mandap floral work", rationale: "Lowers decor costs significantly compared to imported flowers." },
    ],
    assumptions: ["Guest count includes ceremony and reception attendees."],
    warnings: ["Account for local sound ordinance deadlines (typically 10 PM)."],
  }),
  community: proposalSchema.parse({
    overview:
      "An inclusive community gathering focused on shared activities, volunteer coordination, crowd flow, and accessible public hospitality.",
    recommendations: [
      {
        suggestion: "Verify municipal permissions, sanitation, and safety clearances early",
        rationale: "Public and community gatherings must meet civic regulations before announcements.",
      },
      {
        suggestion: "Establish clear volunteer shifts and responsibilities",
        rationale: "Smooth crowd management and cleanup depend on organized community volunteers.",
      },
    ],
    priorities: [
      { category: "logistics", weight: 35, rationale: "Sound equipment, crowd barriers, seating, and volunteer vests." },
      { category: "catering", weight: 30, rationale: "Accessible refreshments, water stations, and snacks for all." },
      { category: "venue", weight: 20, rationale: "Community center, park, or civic ground permit fees." },
      { category: "entertainment", weight: 10, rationale: "Local cultural performances, speeches, or sports gear." },
    ],
    tasks: [
      { key: "civic-permits", title: "Obtain local civic and park permissions", leadDays: 30, priority: "high", dependsOn: [] },
      { key: "equipment-rental", title: "Reserve PA system, microphones and shade tents", leadDays: 20, priority: "high", dependsOn: ["civic-permits"] },
      { key: "volunteer-call", title: "Host volunteer briefing and assign roles", leadDays: 10, priority: "high", dependsOn: ["civic-permits"] },
      { key: "signage-setup", title: "Prepare directional and accessibility signage", leadDays: 3, priority: "normal", dependsOn: ["equipment-rental"] },
    ],
    vendors: [
      { category: "venue", essential: true, rationale: "Approved public space." },
      { category: "logistics", essential: true, rationale: "Safety, power, sanitation, and equipment." },
      { category: "catering", essential: false, rationale: "Water stations and simple refreshments." },
      { category: "entertainment", essential: false, rationale: "Cultural stage or sports engagement." },
    ],
    ideas: [
      { suggestion: "Interactive community wall for suggestions and memories", rationale: "Fosters connection and pride in the neighbourhood." },
      { suggestion: "Eco-friendly zero-waste cleanup drive at closing", rationale: "Promotes civic responsibility and leaves the venue spotless." },
    ],
    savings: [
      { suggestion: "Partner with local civic groups for in-kind sound gear", rationale: "Reduces equipment rental budget through community lending." },
    ],
    assumptions: ["Basic municipal electricity and water connections are accessible."],
    warnings: ["Ensure clearly marked first-aid and drinking water stations."],
  }),
};

export function getSamplePlan(
  eventType: EventType,
  overrides?: Partial<EventDetails>,
  now = new Date(),
): EventPlan {
  const proposal = SAMPLE_PROPOSALS[eventType] ?? SAMPLE_PROPOSALS.birthday;
  const futureDate = new Date(now.getTime() + 45 * 86400 * 1000);
  const dateStr = todayInIndia(futureDate);

  const defaultDetails: EventDetails = {
    eventType,
    name:
      eventType === "wedding"
        ? "Sample Wedding Celebration"
        : eventType === "birthday"
          ? "Sample Birthday Celebration"
          : "Sample Community Gathering",
    date: dateStr,
    location: "Bengaluru",
    guests: eventType === "wedding" ? 300 : eventType === "birthday" ? 40 : 150,
    budgetPaise:
      eventType === "wedding"
        ? 150_000_000
        : eventType === "birthday"
          ? 5_000_000
          : 2_500_000,
    currency: "INR",
    timezone: "Asia/Kolkata",
    theme:
      eventType === "wedding"
        ? "Traditional & Elegant"
        : eventType === "birthday"
          ? "Garden Gathering"
          : "Neighbourhood Connect",
    preferences: "Verified reference sample for evaluation",
    specialRequirements: "Step-free accessibility",
    ...overrides,
  };

  const plan = composePlan(
    defaultDetails,
    proposal,
    "sample-offline-reference",
    now,
  );

  return {
    ...plan,
    provenance: "test-fixture",
  };
}
