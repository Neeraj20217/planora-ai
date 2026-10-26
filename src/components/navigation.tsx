"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "My events" },
  { href: "/events/new", label: "Create an event" },
  { href: "/guide", label: "Planning guide" },
];

export function Navigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="main-nav">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
