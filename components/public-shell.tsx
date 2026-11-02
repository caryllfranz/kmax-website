import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import PublicHeader, { BrandWordmark } from "@/components/public-header";
import styles from "./public-chrome.module.css";

const links = [
  { href: "/#about", label: "Services" },
  { href: "/#classes", label: "Group classes" },
  { href: "/#membership", label: "Membership" },
  { href: "/#fun-run", label: "Fun run" },
  { href: "/#reviews", label: "Reviews" },
  { href: "/#visit", label: "Visit" },
];

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.siteShell}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <PublicHeader links={links} />
      {children}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <BrandWordmark />
            <p>Your community gym. A place to move, grow, and show up together.</p>
            <p className={styles.footerMantra}>Decide. Commit. Achieve.</p>
          </div>
          <div className={styles.footerGroup}>
            <h2>Explore</h2>
            <nav aria-label="Footer navigation">
              {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
            </nav>
          </div>
          <div className={styles.footerGroup}>
            <h2>Connect</h2>
            <p>Questions about the gym, classes, or the fun run? We&apos;d love to hear from you.</p>
            <a href="https://www.facebook.com/KMAXFitness" target="_blank" rel="noopener noreferrer">
              KMAX on Facebook <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>KMAX Fitness Gym</span>
          <span>Made for our community.</span>
        </div>
      </footer>
    </div>
  );
}
