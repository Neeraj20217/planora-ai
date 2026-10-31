"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, FileText } from "lucide-react";
import type { EventDetails } from "@/types";
import type { EventPlan } from "@/lib/schemas/plan";
import { ApiResponseError, accessResponseSchema, planResponseSchema, fetchApi, readApiResponse, retryAfterMs, cooldownMessage } from "@/lib/api-response";
import { getSamplePlan } from "@/lib/domain/sample-plans";

class UserPlanningError extends Error {}

export function GenerationPanel({
  details,
  onGenerated,
}: {
  details: EventDetails;
  onGenerated: (plan: EventPlan) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function generate() {
    if (pending) return;
    if (Date.now() < retryAt) {
      setError(
        cooldownMessage(retryAt),
      );
      return;
    }
    controller.current = new AbortController();
    const signal = AbortSignal.any([
      controller.current.signal,
      AbortSignal.timeout(50_000),
    ]);
    setPending(true);
    setError("");
    try {
      let response = await fetchApi("/api/plans/generate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: details }),
        signal,
      });
      const applyCooldown = (res: Response) => {
        const delay = retryAfterMs(res);
        if (delay > 0) setRetryAt(Date.now() + delay);
      };
      applyCooldown(response);
      let payload = await readApiResponse(response, planResponseSchema);
      if (!payload.ok) {
        if (response.status === 401 && payload.error.code === "SESSION_REQUIRED") {
          const trialRes = await fetchApi("/api/access/trial", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: "{}",
            signal,
          });
          applyCooldown(trialRes);
          const trial = await readApiResponse(trialRes, accessResponseSchema);
          if (trial.ok) {
            response = await fetchApi("/api/plans/generate", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ brief: details }),
                signal,
              });
            applyCooldown(response);
            payload = await readApiResponse(response, planResponseSchema);
          } else {
            payload = trial;
          }
        }
      }
      if (!payload.ok) {
        // Never render arbitrary provider/internal error text.
        const messages: Record<string, string> = {
          NOT_CONFIGURED:
            "AI planning is not configured on this server. Your brief is unchanged.",
          ENDPOINT_DISABLED:
            "AI planning is disabled on this server. Your brief is unchanged.",
          INVALID_INPUT:
            "Check your event details, including the date, then review again.",
          PAYLOAD_LIMIT:
            "Your brief is too large. Shorten preferences and requirements.",
          TIMEOUT:
            "Generation timed out. Your brief is unchanged; please retry.",
          INVALID_PLAN:
            "The AI response could not be validated. No plan was saved; please retry.",
          LOCAL_LIMIT:
            "Too many planning requests. Please wait a minute before retrying.",
          PROVIDER_LIMIT:
            "The AI provider is busy or quota is exhausted. Please wait before retrying.",
          SESSION_REQUIRED:
            "Generation access is missing or expired. Click Start Evaluation Session on the access page or enter an organizer invite code.",
          ACCESS_LIMIT:
            "Your generation allowance or the daily service cap was reached. Please wait or contact the organizer.",
          ACCESS_UNAVAILABLE:
            "Hosted generation is disabled or secure access is unavailable. Your brief is unchanged.",
          BOT_DENIED:
            "The access check could not verify this request. Your brief is unchanged; contact the organizer.",
        };
        throw new UserPlanningError(
          messages[payload.error.code] ??
            "AI planning is unavailable right now. Your brief is unchanged; please try again later.",
        );
      }
      const plan = payload.data.plan;
      if (JSON.stringify(plan.details) !== JSON.stringify(details))
        throw new UserPlanningError(
          "The response did not match your event details. No plan was saved; please retry.",
        );
      onGenerated(plan);
    } catch (issue) {
      if (controller.current?.signal.aborted) return;
      setError(
        signal.aborted
          ? "Generation timed out. Your brief is unchanged; please retry."
          : issue instanceof ApiResponseError && issue.kind === "network"
            ? "Could not reach the planning service. Check your connection and try again. Your brief is unchanged."
          : issue instanceof UserPlanningError
            ? issue.message
            : "The response could not be validated. No plan was saved; please retry.",
      );
    } finally {
      if (!controller.current?.signal.aborted) setPending(false);
    }
  }
  return (
    <section
      className="generation-panel"
      aria-labelledby="generate-title"
      aria-busy={pending}
    >
      <h2 id="generate-title">Turn these details into a plan</h2>
      <p>
        Generate a budget, timeline, vendor checklist and personalized ideas.
        Choosing Generate plan sends this brief to Google Gemini. Avoid
        sensitive personal information.
      </p>
      <div className="generation-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={generate}
          disabled={pending}
        >
          <Sparkles aria-hidden="true" size={18} />
          {pending ? "Planning your celebration…" : "Generate plan"}
        </button>
      </div>
      {pending ? (
        <p role="status">
          Generating and checking your plan. This may take up to 45 seconds.
          Keep this page open.
        </p>
      ) : null}
      <div className="generation-fallback">
          {error ? <p className="error-summary" role="alert">{error}</p> : null}
          <div style={{ marginTop: "12px" }}>
            <button
              type="button"
              className="button button-secondary"
              disabled={pending}
              onClick={() => onGenerated(getSamplePlan(details.eventType, details))}
            >
              <FileText aria-hidden="true" size={18} />
              Explore sample plan (offline reference)
            </button>
          </div>
        </div>
    </section>
  );
}

