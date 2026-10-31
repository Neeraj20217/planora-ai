import Link from "next/link";
import { ArrowUpRight, ArrowRight, Sparkles, IndianRupee, CalendarClock, CheckSquare, Flower2, CakeSlice, Users, ShieldCheck } from "lucide-react";
import { SavedEvents } from "@/components/events/saved-events";

const celebrations = [
  { type: "wedding", number: "01", title: "Wedding", subtitle: "For your forever kind of day.", description: "Bring the ceremony, the people and every thoughtful detail together.", Icon: Flower2 },
  { type: "birthday", number: "02", title: "Birthday", subtitle: "Another year. A little more magic.", description: "Make space for good food, favourite people and a celebration that feels like you.", Icon: CakeSlice },
  { type: "community", number: "03", title: "Community Event", subtitle: "Good things happen together.", description: "Turn a shared idea into a welcoming gathering, with the practical details in place.", Icon: Users },
];

export default function Home() {
  return (
    <div className="page-wrap home-page atelier-home">
      <section className="atelier-hero" aria-labelledby="welcome-title">
        <div className="atelier-hero-copy">
          <p className="atelier-eyebrow"><span /> A thoughtful space for gathering</p>
          <h1 id="welcome-title">Make room for<br />the <em>celebration.</em></h1>
          <p className="atelier-intro">You bring the occasion. We help bring it together.<br className="desktop-break" /> Shape your budget, timeline and little details into a plan worth looking forward to.</p>
          <div className="atelier-actions">
            <Link href="/events/new" className="button button-primary">Create an event <ArrowUpRight aria-hidden="true" size={18} /></Link>
            <Link href="/guide" className="atelier-guide">See how it works <ArrowRight aria-hidden="true" size={16} /></Link>
          </div>
          <p className="atelier-footnote"><Sparkles aria-hidden="true" size={14} /> Gemini-powered planning. Your decisions, always.</p>
        </div>
        <aside className="atelier-still-life" aria-label="A little structure, a lovely celebration">
          <div className="atelier-orbit" aria-hidden="true" />
          <div className="atelier-invitation">
            <Flower2 aria-hidden="true" size={52} strokeWidth={1} />
            <span className="invitation-kicker">THE PLANORA WAY</span>
            <p>A little structure.<br /><em>A lovely celebration.</em></p>
            <span className="invitation-rule" />
            <span className="invitation-bottom">Thoughtfully planned. Beautifully yours.</span>
          </div>
          <div className="atelier-seal" aria-hidden="true">Made for<br /><strong>real moments</strong></div>
          <p className="still-life-caption">Less juggling. More looking forward.</p>
        </aside>
      </section>
      <section className="celebrations-section" aria-labelledby="celebrations-title">
        <div className="atelier-section-heading"><div><p className="atelier-eyebrow">Every occasion has a story</p><h2 id="celebrations-title">What are we celebrating?</h2></div><p>Big milestones. Small joys. Start here.</p></div>
        <div className="celebration-grid">
          {celebrations.map(({ type, number, title, subtitle, description, Icon }) => (
            <Link key={type} href="/events/new" className={"celebration-card celebration-" + type} aria-label={"Plan a " + title.toLowerCase()}>
              <div className="celebration-art" aria-hidden="true"><span className="celebration-number">{number}</span><Icon size={62} strokeWidth={1} /><span className="celebration-motif" /></div>
              <div className="celebration-copy"><div className="celebration-title"><h3>{title}</h3><ArrowUpRight aria-hidden="true" size={22} /></div><p className="celebration-subtitle">{subtitle}</p><p>{description}</p><span className="celebration-link">Start planning <ArrowRight aria-hidden="true" size={15} /></span></div>
            </Link>
          ))}
        </div>
      </section>
      <section className="atelier-benefits" aria-label="Core planning benefits">
        <div className="benefits-intro"><Sparkles aria-hidden="true" size={20} /><h2>A clear plan.<br />A lighter mind.</h2></div>
        {[{ Icon: IndianRupee, title: "Every rupee, considered", text: "Clear INR allocations, with room for the unexpected." }, { Icon: CalendarClock, title: "The right thing, at the right time", text: "A preparation timeline that turns details into next steps." }, { Icon: CheckSquare, title: "The details, together", text: "Vendor checklists and ideas shaped around your occasion." }].map(({ Icon, title, text }) => <div className="atelier-benefit" key={title}><Icon aria-hidden="true" size={21} strokeWidth={1.5} /><h3>{title}</h3><p>{text}</p></div>)}
      </section>
      <section className="events-section atelier-events" aria-labelledby="events-title">
        <div className="atelier-section-heading"><div><p className="atelier-eyebrow">Pick up where you left off</p><h2 id="events-title">Your events</h2></div><span className="storage-label"><ShieldCheck aria-hidden="true" size={16} /> Saved privately in this browser</span></div>
        <SavedEvents />
      </section>
    </div>
  );
}
