"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./public-chrome.module.css";

type NavigationLink = { href: string; label: string };

export function BrandWordmark() {
  return (
    <Link href="/" className={styles.brand} aria-label="KMAX Fitness Gym home">
      <span className={styles.badge}>
        <Image src="/images/kmax-mark.svg" alt="" width={40} height={26} className={styles.logo} />
      </span>
      <span className={styles.brandText}>
        <strong>KMAX</strong>
        <span>FITNESS GYM</span>
      </span>
    </Link>
  );
}

export default function PublicHeader({ links }: { links: NavigationLink[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 30);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.headerInner}>
        <BrandWordmark />
        <nav className={styles.desktopNav} aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
        </nav>
        <a
          className={styles.headerCta}
          href="https://www.facebook.com/KMAXFitness"
          target="_blank"
          rel="noopener noreferrer"
        >
          Message us <ArrowUpRight size={17} aria-hidden="true" />
        </a>
        <button
          type="button"
          className={styles.menuToggle}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
        </button>
      </div>
      <nav
        id="mobile-navigation"
        className={styles.mobileNav}
        aria-label="Mobile navigation"
        hidden={!menuOpen}
      >
        {links.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
            {link.label}<ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        ))}
        <a
          className={styles.mobileCta}
          href="https://www.facebook.com/KMAXFitness"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMenuOpen(false)}
        >
          Message us <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </nav>
    </header>
  );
}
