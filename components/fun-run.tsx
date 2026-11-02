import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import styles from "./fun-run.module.css";

export default function FunRun() {
  return (
    <section className={styles.section} id="fun-run" aria-labelledby="fun-run-title">
      <div className={styles.inner}>
        <div className={styles.kicker}>
          <span>Community event</span>
          <span>10 years of KMAX</span>
        </div>
        <div className={styles.intro}>
          <div className={styles.heading}>
            <h2 id="fun-run-title" className={styles.title}>
              10TH ANNIVERSARY<br />
              <span>FUN RUN</span>
            </h2>
            <p className={styles.description}>
              Celebrate KMAX&apos;s 10th anniversary with the community. For
              registration, contact KMAX on Facebook or Messenger.
            </p>
          </div>

          <div className={styles.eventDetails} aria-label="Event details">
            <div className={styles.detail}>
              <CalendarDays size={24} strokeWidth={1.8} aria-hidden="true" />
              <div>
                <span className={styles.label}>Date &amp; time</span>
                <strong>April 27, 2027</strong>
                <span>Time TBA</span>
              </div>
            </div>
            <div className={styles.detail}>
              <MapPin size={24} strokeWidth={1.8} aria-hidden="true" />
              <div>
                <span className={styles.label}>Venue</span>
                <strong>Kingspoint SB Court</strong>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.runDetails}>
          <div className={styles.raceHeader}>
            <span className={styles.label}>Race categories</span>
            <h3>Choose your distance.</h3>
          </div>
          <div className={styles.races} aria-label="Race categories and fees">
            <div className={styles.race}>
              <strong>5K</strong>
              <span>₱1,000</span>
            </div>
            <div className={styles.race}>
              <strong>10K</strong>
              <span>₱1,300</span>
            </div>
          </div>
          <div className={styles.inclusions}>
            <h3>Each registration includes</h3>
            <ul>
              <li>Race shirt</li>
              <li>Race bib</li>
              <li>Medal</li>
            </ul>
          </div>
          <a
            href="https://www.facebook.com/KMAXFitness"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.action}
          >
            Register through Facebook <ArrowUpRight size={19} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
