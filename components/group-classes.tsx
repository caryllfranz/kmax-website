import { ArrowUpRight, MessageCircle } from "lucide-react";
import styles from "./group-classes.module.css";

const facebook = "https://www.facebook.com/KMAXFitness";

const classes = [
  "MAXFIT",
  "Cardio Blast Dance",
  "HIIT",
  "S45",
  "Yoga",
  "ABS-OLUTELY FIT",
  "MMA Strike",
];

const coaches = ["Coach Hazel", "Coach Michelle"];

export default function GroupClasses() {
  return (
    <>
      <section id="classes" className={styles.classes} aria-labelledby="classes-heading">
        <div className={styles.wrap}>
          <div className={styles.intro} data-reveal>
            <div>
              <span className={styles.eyebrow}>Group classes</span>
              <h2 id="classes-heading">Train together.<br /><span>Go further.</span></h2>
            </div>
            <p>
              These classes appeared on KMAX&apos;s November 2026 calendar.
              Ask the team for the current schedule and how to join.
            </p>
          </div>

          <div className={styles.listHeading}>
            <span>From the November 2026 calendar</span>
            <span>Current times: ask KMAX</span>
          </div>
          <ol className={styles.classList} aria-label="Classes featured on the November 2026 calendar">
            {classes.map((className, index) => (
              <li key={className} className={styles.classRow} data-reveal>
                <span className={styles.classNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div className={styles.classInfo}>
                  <h3>{className}</h3>
                  <span>Group class</span>
                </div>
                <a href={facebook} target="_blank" rel="noopener noreferrer">
                  Ask about class <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>

          <div className={styles.classFooter} data-reveal>
            <div className={styles.registration}>
              <MessageCircle size={23} aria-hidden="true" />
              <p>
                Class registration happens in KMAX&apos;s existing Messenger group chat.
                Message the Facebook page to ask how to join.
              </p>
            </div>
            <a href={facebook} target="_blank" rel="noopener noreferrer" className={styles.lightButton}>
              Message KMAX <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section id="coaches" className={styles.coaches} aria-labelledby="coaches-heading">
        <div className={styles.wrap}>
          <div className={styles.coachIntro} data-reveal>
            <span className={styles.eyebrow}>The people behind the classes</span>
            <h2 id="coaches-heading">Meet the <span>coaches.</span></h2>
            <p>Get to know the KMAX team. More coach details are coming soon.</p>
          </div>
          <div className={styles.coachList}>
            {coaches.map((coach, index) => (
              <article key={coach} className={styles.coach} data-reveal>
                <span className={styles.coachNumber} aria-hidden="true">0{index + 1}</span>
                <div className={styles.coachBody}>
                  <span>KMAX coach</span>
                  <h3>{coach}</h3>
                </div>
                <span className={styles.coachAccent} aria-hidden="true" />
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
