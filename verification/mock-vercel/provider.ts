import "server-only";
import { proposalSchema } from "@/lib/schemas/plan";
import type { ProposalProvider } from "@/lib/ai/generate";

export const MOCK_LABEL = "TEST ONLY — deterministic mock, no live AI";
// No I/O, credentials, tools, prompt instructions or externally supplied behavior.
const response = JSON.stringify(
  proposalSchema.parse({
    overview: MOCK_LABEL,
    recommendations: [
      {
        suggestion: "Confirm an accessible space before making arrangements.",
        rationale: "This fixed test suggestion is unverified.",
      },
    ],
    priorities: [
      {
        category: "venue",
        weight: 40,
        rationale: "Fixed test allowance; obtain real quotes.",
      },
      {
        category: "catering",
        weight: 60,
        rationale: "Fixed test allowance; confirm dietary needs.",
      },
    ],
    tasks: [
      {
        key: "confirm-space",
        title: "Check access, capacity and availability",
        leadDays: 7,
        priority: "high",
        dependsOn: [],
      },
    ],
    vendors: [
      {
        category: "venue",
        essential: true,
        rationale: "Test checklist only; no availability checked.",
      },
    ],
    ideas: [
      {
        suggestion: "Invite guests to contribute a shared-memory card.",
        rationale: "Fixed test idea, not personalized live output.",
      },
    ],
    savings: [
      {
        suggestion:
          "Consider borrowed decorations after checking availability.",
        rationale: "Fixed test suggestion, not a verified saving.",
      },
    ],
    assumptions: ["All output is a deterministic test fixture."],
    warnings: [
      MOCK_LABEL,
      "No bookings, vendor availability or prices have been verified.",
    ],
  }),
);

export function geminiProvider(): ProposalProvider {
  return async (_prompt, signal) => {
    if (signal.aborted) throw new Error("Mock request aborted");
    return response;
  };
}
