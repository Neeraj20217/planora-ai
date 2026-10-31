"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { ArrowLeft } from "lucide-react";

export function AccessForm() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [errorAction, setErrorAction] = useState<string | null>(null);
  useEffect(() => {
    if (error && !busy && errorAction === "redeem") input.current?.focus();
  }, [error, busy, errorAction]);
  async function submit(action: "redeem" | "logout" | "trial") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError(false);
    setErrorAction(action);
    const code = input.current?.value ?? "";
    // Keep the code out of component state and clear it on every attempt.
    if (input.current) input.current.value = "";
    try {
      const response = await fetch(`/api/access/${action}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "redeem" ? { code } : {}),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const code = payload?.error?.code;
        const unavailable = code === "ACCESS_UNAVAILABLE" || response.status >= 500;
        const denied = code === "BOT_DENIED" || code === "ORIGIN" || code === "CLIENT_IP";
        const message = action === "logout"
          ? "Sign out could not be confirmed. Please try again when secure access is available. This browser may still have an active session."
          : unavailable
            ? "Secure generation access is currently unavailable or disabled. Try later, or create an event and explore an offline reference plan."
            : denied
              ? "The access check could not verify this browser request. Use the official site in a normal browser, or contact the organizer."
              : response.status === 429
                ? "The evaluation, invite, or service limit has been reached. Wait before retrying or contact the organizer. Signing out does not reset allowances."
                : action === "trial"
                  ? "Evaluation access could not be started. Try later or contact the organizer. Offline reference plans remain available."
                  : "Access could not be completed. Your invite may be invalid, expired or already used. Check it with the organizer.";
        setError(true);
        setMessage(message);
        return;
      }
      setMessage(
        action === "redeem"
          ? "Generation access granted for this browser until the session expires. You can create an event now."
          : action === "trial"
            ? "Evaluation access granted: up to 2 generation requests during this 8-hour session. You can create an event now."
            : "Signed out. This session can no longer generate plans.",
      );
    } catch {
      setError(true);
      setMessage(action === "logout"
        ? "Sign out could not be confirmed because the request failed or timed out. Please retry; this browser may still have an active session."
        : "Access could not be completed because the request failed or timed out. Please try later; offline reference plans remain available.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page-wrap guide-page">
      <Link href="/" className="back-link">
        <ArrowLeft aria-hidden="true" size={16} /> Return to saved events
      </Link>
      <h1>Generation access</h1>
      <p className="intro">
        Enter the single-use invite supplied by the organizer, or start an
        instant evaluation session for PromptWars Challenge 05 without an
        invite code.
      </p>
      <form
        aria-busy={busy}
        className="access-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit("redeem");
        }}
      >
        <div className="field">
          <label htmlFor="invite-code">Invite code (required)</label>
          <input
            ref={input}
            id="invite-code"
            type="password"
            required
            maxLength={256}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="invite-help access-message"
            aria-invalid={(error && errorAction === "redeem") || undefined}
            disabled={busy}
          />
          <p id="invite-help" className="field-hint access-help">
            Do not share this code. Enter an organizer invite for extended access,
            or click Start evaluation session below for an 8-hour trial (up to 2 generation requests).
          </p>
        </div>
        <div className="access-actions">
          <button
            className="button button-primary"
            disabled={busy}
            type="submit"
          >
            {busy ? "Please wait…" : "Redeem invite"}
          </button>
          <button
            className="button button-secondary"
            disabled={busy}
            type="button"
            onClick={() => void submit("trial")}
          >
            Start evaluation session
          </button>
          <button
            className="button button-secondary"
            disabled={busy}
            type="button"
            onClick={() => void submit("logout")}
          >
            Sign out
          </button>
        </div>
        <p
          id="access-message"
          role={error ? "alert" : "status"}
          className={`access-message ${error ? "access-message-error" : message ? "access-message-success" : ""}`}
        >
          {message}
        </p>
      </form>
      <p className="access-nav-links">
        <Link href="/events/new">Create an event</Link> ·{" "}
        <Link href="/">Return to saved events</Link>
      </p>
    </section>
  );
}
