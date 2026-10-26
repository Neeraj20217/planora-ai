import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Planning guide" };

export default function GuidePage() {
  return (
    <article className="page-wrap guide-page">
      <h1>
        A little structure.
        <br />
        More room to celebrate.
      </h1>
      <p className="intro">
        A useful event brief starts with a few honest estimates. You can refine
        the details before you’re ready to plan.
      </p>
      <div className="guide-content">
        <section>
          <h2>Start with the essentials</h2>
          <p>
            Choose a wedding, birthday, or community event. Add a name, a date,
            a location, and the number of people you hope to bring together.
            Dates use India time.
          </p>
        </section>
        <section>
          <h2>Choose a comfortable budget</h2>
          <p>
            Enter your total in Indian rupees, without commas. You can include
            up to two decimal places, and a zero budget is welcome. This is your
            intended budget, not a vendor quotation.
          </p>
        </section>
        <section>
          <h2>Make space for everyone</h2>
          <p>
            Add a theme or favourite activities if you have them in mind. Note
            dietary needs, accessibility, or quiet-space requirements without
            including sensitive personal details.
          </p>
        </section>
        <section>
          <h2>Review before moving on</h2>
          <p>
            The current version lets you check and edit your brief. It isn’t
            saved when you leave or refresh this page. AI recommendations, saved
            events, budget tracking, timelines, and vendor checklists are
            planned for later updates.
          </p>
        </section>
      </div>
      <Link href="/events/new" className="button button-primary">
        Create an event <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </article>
  );
}
