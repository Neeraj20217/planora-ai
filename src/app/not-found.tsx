import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-wrap guide-page">
      <h1>This page isn’t on the guest list.</h1>
      <p className="intro">
        The address may have changed. Your event workspace is a good place to
        start.
      </p>
      <Link href="/" className="button button-primary">
        Back to my events
      </Link>
    </div>
  );
}
