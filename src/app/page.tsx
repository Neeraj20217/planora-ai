import Link from "next/link";
import { ArrowRight, CalendarHeart, Plus } from "lucide-react";

export default function Home() {
  return (
    <div className="page-wrap home-page">
      <section className="welcome-section" aria-labelledby="welcome-title">
        <div>
          <h1 id="welcome-title">
            Good moments
            <br />
            start with a little planning.
          </h1>
          <p className="intro">
            Bring your people together. We’ll help you start with the details,
            so you can focus on what makes it yours.
          </p>
          <Link href="/events/new" className="button button-primary">
            Create your first event <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
        <aside className="planner-note">
          <p className="note-title">Room for every kind of celebration.</p>
          <ul>
            <li>A wedding full of meaning.</li>
            <li>A birthday that feels just right.</li>
            <li>A community coming together.</li>
          </ul>
          <p>
            Start with your date, your people, and a budget you’re comfortable
            with.
          </p>
        </aside>
      </section>
      <section className="events-section" aria-labelledby="events-title">
        <div className="section-heading">
          <h2 id="events-title">Your events</h2>
          <span className="quiet">A fresh start</span>
        </div>
        <div className="empty-events">
          <CalendarHeart aria-hidden="true" size={38} strokeWidth={1.25} />
          <h3>Your next celebration starts here.</h3>
          <p>
            No saved events yet. You can create and review an event brief now.
            <br className="desktop-break" /> Saving events will be available in
            a future update.
          </p>
          <Link href="/events/new" className="button button-secondary">
            <Plus aria-hidden="true" size={17} /> Create an event
          </Link>
        </div>
      </section>
    </div>
  );
}
