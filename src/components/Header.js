"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  function navClass(href) {
    const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
    return `navLink${active ? " navLinkActive" : ""}`;
  }

  return (
    <header className="appHeader">
      <nav className="navRow">
        <Link href="/" className={navClass("/")}>
          ITEMLOOP
        </Link>
        <span className="navPipe">|</span>

        <Link href="/my-items" className={navClass("/my-items")}>
          My Items
        </Link>
        <span className="navPipe">|</span>
        
        <Link href="/messages" className={navClass("/messages")}>
          Messages
        </Link>
        <span className="navPipe">|</span>

        <Link href="/profile" className={navClass("/profile")}>
          Profile
        </Link>
      </nav>
    </header>
  );
}
