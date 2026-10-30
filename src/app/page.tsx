import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  IndianRupee,
  CalendarClock,
  CheckSquare,
  Lightbulb,
} from "lucide-react";
import { SavedEvents } from "@/components/events/saved-events";

export default function Home() {
  return (
    <div className="page-wrap home-page">
      <section className="welcome-section" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <div className="hero-kicker">
            <span className="hero-badge">
              <Sparkles aria-hidden="true" size={14} /> Powered by Google Gemini
            </span>
          </div>
          <h1 id="welcome-title">
            AI-powered celebration planning,
            <br />
            structured for clarity.
          </h1>
          <p className="intro">
            Planora AI is a Gemini-powered planning assistant for weddings,
            birthdays, and community events. Turn your date, guest count, and
            budget into an actionable blueprint with exact finances in INR,
            scheduled timelines, and curated vendor checklists.
          </p>
          <div className="welcome-actions">
            <Link href="/events/new" className="button button-primary">
              Create an event <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link href="/guide" className="button button-secondary">
              Explore planning guide
            </Link>
          </div>
          <div className="hero-highlights" aria-label="Core planning benefits">
            <div className="highlight-item">
              <Sparkles aria-hidden="true" size={15} />
              <span>AI-generated plans</span>
            </div>
            <div className="highlight-item">
              <IndianRupee aria-hidden="true" size={15} />
              <span>Budget breakdowns</span>
            </div>
            <div className="highlight-item">
              <CalendarClock aria-hidden="true" size={15} />
              <span>Preparation timelines</span>
            </div>
            <div className="highlight-item">
              <CheckSquare aria-hidden="true" size={15} />
              <span>Vendor checklists</span>
            </div>
            <div className="highlight-item">
              <Lightbulb aria-hidden="true" size={15} />
              <span>Personalized ideas</span>
            </div>
          </div>
        </div>
        <aside className="planner-note" aria-label="Celebration types and capabilities">
          <p className="note-title">Designed for three celebration types</p>
          <ul className="verticals-list">
            <li>
              <strong>Weddings</strong> — Multi-day ceremony sequencing, catering scale, accessibility, and vendor roles.
            </li>
            <li>
              <strong>Birthdays</strong> — Milestone pacing, entertainment, theme styling, and party timelines.
            </li>
            <li>
              <strong>Community Events</strong> — Neighborhood logistics, permits, crowd safety, and volunteer coordination.
            </li>
          </ul>
          <p className="note-footer">
            Start with your date, guest count, and comfortable budget to generate a tailored blueprint in seconds.
          </p>
        </aside>
      </section>
      <section className="events-section" aria-labelledby="events-title">
        <div className="section-heading">
          <h2 id="events-title">Your events</h2>
          <span className="quiet">Saved privately in this browser</span>
        </div>
        <SavedEvents />
      </section>
    </div>
  );
}
