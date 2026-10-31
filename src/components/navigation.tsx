"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Menu, Plus } from "lucide-react";

const links = [
  { href: "/", label: "My events" },
  { href: "/guide", label: "Planning guide" },
  { href: "/access", label: "Generation access" },
  { href: "/events/new", label: "Create an event" },
];

export function Navigation() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const items = links.map(({ href, label }) => (
    <Link key={href} href={href} className={href === "/events/new" ? "nav-create" : undefined}
      aria-current={pathname === href || (href === "/" && pathname.startsWith("/events/") && pathname !== "/events/new") ? "page" : undefined}
      onClick={() => { if (menu.current) menu.current.open = false; }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current?.open) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}>
      {href === "/events/new" ? <Plus size={16} aria-hidden="true" /> : null}{label}
    </Link>
  ));
  return (
    <>
      <nav aria-label="Main navigation" className="main-nav desktop-nav">{items}</nav>
      <details ref={menu} className="mobile-nav">
        <summary onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current?.open) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}><Menu size={19} aria-hidden="true" /> Menu</summary>
        <nav aria-label="Mobile navigation">{items}</nav>
      </details>
    </>
  );
}
