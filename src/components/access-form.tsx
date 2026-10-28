"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { ArrowLeft } from "lucide-react";

export function AccessForm() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    if (error && !busy) input.current?.focus();
  }, [error, busy]);
  async function submit(action: "redeem" | "logout") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError(false);
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
      if (!response.ok)
        throw new Error(
          "Access could not be completed. Your invite may be invalid, expired or already used, a limit may have been reached, or hosted access may be disabled. Ask the organizer before retrying.",
        );
      setMessage(
        action === "redeem"
          ? "Generation access granted for this browser until the session expires. You can create an event now."
          : "Signed out. This session can no longer generate plans.",
      );
    } catch (failure) {
      setError(true);
      setMessage(
        failure instanceof Error && failure.message.startsWith("Access could")
          ? failure.message
          : "Access could not be completed. Please try later.",
      );
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
        Enter the single-use invite supplied by the organizer. Access expires
        within eight hours and enables limited AI generation, without uploading
        your saved plans.
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
            aria-invalid={error || undefined}
            disabled={busy}
          />
          <p id="invite-help" className="field-hint access-help">
            Do not share this code. It is sent securely to the server and is
            cleared after submission. Hosted access is disabled until release
            approval.
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
