import Image from "next/image";
import {
  ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Dumbbell,
  MapPin, MessageCircle, Sparkles, UsersRound,
} from "lucide-react";
import FunRun from "@/components/fun-run";
import GroupClasses from "@/components/group-classes";
import MotionEffects from "@/components/motion-effects";
import PublicShell from "@/components/public-shell";

const facebook = "https://www.facebook.com/KMAXFitness";
const messenger = "https://m.me/KMAXFitness";
const maps = "https://www.google.com/maps/search/?api=1&query=KMAX+Fitness+Gym%2C+57+King+Christian+Ext%2C+Novaliches%2C+Quezon+City";
const reviews = "https://www.google.com/search?q=kmaxfitness#lrd=0x3397b13b32bd52fd:0xb437bc764ba71eb8,1,,,,";
const mapEmbed = "https://www.google.com/maps?q=KMAX+Fitness+Gym%2C+57+King+Christian+Ext%2C+Novaliches%2C+Quezon+City&output=embed";

const services = [
  { id: "facilities", title: "Gym access", description: "Make room for your own training routine in a gym built around showing up and moving forward.", link: "Ask about the gym", href: facebook, icon: Dumbbell },
  { id: "programs", title: "Group classes", description: "Move alongside your neighbors. Explore class names from a past KMAX calendar and ask for the latest lineup.", link: "Explore classes", href: "#classes", icon: UsersRound },
  { id: "membership", title: "Membership", description: "Thinking about joining? The team can share current membership options and help you get started.", link: "Ask about membership", href: facebook, icon: MessageCircle },
  { id: "coaching", title: "Coaches", description: "Get to know the people behind the sessions. Meet Coach Hazel and Coach Michelle below.", link: "Meet the coaches", href: "#coaches", icon: Sparkles },
  { id: "community", title: "Community", description: "This is a place to train together, find your rhythm, and keep each other moving.", link: "See the community", href: "#reviews", icon: UsersRound },
  { id: "events", title: "Fun run", description: "Be part of KMAX's 10th Anniversary Fun Run on April 27, 2027.", link: "Event details", href: "#fun-run", icon: CalendarDays },
];

const marqueeWords = ["Strength", "Cardio", "Group classes", "Community", "Fun run", "Move together"];

export default function Home() {
  return (
    <PublicShell>
      <MotionEffects />
      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Your community gym</span>
              <h1 id="hero-title">Build<br />your <span>max.</span></h1>
              <p className="hero-lead">A place to move, train, and grow with your community. Whatever your starting point, there&apos;s a place for you here.</p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={facebook} target="_blank" rel="noopener noreferrer">Start your journey <ArrowRight size={19} aria-hidden="true" /></a>
                <a className="btn btn-ghost" href="#classes">View classes <ArrowDown size={17} aria-hidden="true" /></a>
              </div>
              <div className="hero-pills" aria-label="At KMAX">
                <span><i aria-hidden="true" />Community gym</span>
                <span><i aria-hidden="true" />Group classes</span>
                <span><i aria-hidden="true" />Move together</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-ring" aria-hidden="true" />
              <div className="hero-frame">
                <Image className="hero-photo" src="/images/community/kmax-group-session.webp" alt="A group training together inside KMAX's gym" fill sizes="(max-width: 700px) 90vw, (max-width: 980px) 46vw, 540px" preload />
                <Image className="hero-mark" src="/images/kmax-mark.svg" alt="" width={1360} height={890} sizes="100px" />
              </div>
              <a className="float-card float-card-event" href="#fun-run">
                <span className="float-icon"><CalendarDays size={21} aria-hidden="true" /></span>
                <span><strong>10th Anniversary Fun Run</strong><small>April 27, 2027 · 5K &amp; 10K</small></span>
              </a>
              <a className="float-card float-card-chat" href={messenger} target="_blank" rel="noopener noreferrer">
                <span className="float-icon"><MessageCircle size={21} aria-hidden="true" /></span>
                <span><strong>Questions?</strong><small>Chat on Messenger</small></span>
              </a>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((copy) => <div className="marquee-set" key={copy}>{marqueeWords.map((word) => <span key={word}>{word}</span>)}</div>)}
          </div>
        </div>

        <section id="about" className="services-section" aria-labelledby="services-title">
          <div className="wrap">
            <div className="section-heading" data-reveal>
              <div><span className="eyebrow">What we offer</span><h2 id="services-title">Everything you need<br />to keep moving.</h2></div>
              <p>Find your place at KMAX. Explore the gym, the people, and the ways to train together, then message the team for the latest details.</p>
            </div>
            <div className="service-grid" id="services">
              {services.map((service, index) => {
                const Icon = service.icon;
                const external = service.href.startsWith("https://");
                return (
                  <article className="service-card" id={service.id} key={service.id} data-reveal style={{ transitionDelay: `${(index % 3) * 90}ms` }}>
                    <span className="service-number" aria-hidden="true">0{index + 1}</span>
                    <span className="service-icon"><Icon size={28} strokeWidth={1.8} aria-hidden="true" /></span>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                    <a href={service.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {service.link} {external ? <ArrowUpRight size={17} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}
                    </a>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <GroupClasses />
        <FunRun />

        <section className="reviews" id="reviews" aria-labelledby="reviews-title">
          <div className="wrap">
            <div className="section-heading" data-reveal>
              <div><span className="eyebrow">The KMAX community</span><h2 id="reviews-title">Real people.<br />Real experiences.</h2></div>
              <p>Hear directly from the people who visit KMAX. Explore their public reviews and connect with the community.</p>
            </div>
            <div className="review-grid">
              <article className="review-feature" data-reveal>
                <span className="review-kicker">Community voices</span>
                <div><h3>Good energy<br />goes a long way.</h3><p>See what visitors have shared about KMAX on Google.</p></div>
                <a className="btn btn-review" href={reviews} target="_blank" rel="noopener noreferrer">Read Google reviews <ArrowUpRight size={18} aria-hidden="true" /></a>
              </article>
              <div className="review-stack">
                <article className="review-card" data-reveal>
                  <span className="review-icon"><MapPin size={25} aria-hidden="true" /></span>
                  <div><h3>Find us on Google</h3><p>Browse reviews and see where to find the gym.</p></div>
                  <a href={maps} target="_blank" rel="noopener noreferrer">Open Maps <ArrowUpRight size={17} aria-hidden="true" /></a>
                </article>
                <article className="review-card" data-reveal>
                  <span className="review-icon"><MessageCircle size={25} aria-hidden="true" /></span>
                  <div><h3>Follow along</h3><p>Catch updates and community moments on KMAX&apos;s official Facebook page.</p></div>
                  <a href={facebook} target="_blank" rel="noopener noreferrer">Visit Facebook <ArrowUpRight size={17} aria-hidden="true" /></a>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="visit" id="visit" aria-labelledby="visit-title">
          <div className="wrap visit-grid">
            <div className="visit-copy" data-reveal>
              <span className="eyebrow">Come by</span>
              <h2 id="visit-title">Find your<br />way here.</h2>
              <p>57 King Christian Ext, Novaliches, Quezon City. Find us on the map or message the team before your visit.</p>
              <div className="visit-actions">
                <a className="btn btn-blue" href={maps} target="_blank" rel="noopener noreferrer">Open Google Maps <ArrowUpRight size={18} aria-hidden="true" /></a>
                <a className="text-link" href={facebook} target="_blank" rel="noopener noreferrer">Contact KMAX <ArrowUpRight size={18} aria-hidden="true" /></a>
              </div>
            </div>
            <div className="map-frame" data-reveal><iframe title="Map of KMAX Fitness Gym in Quezon City" src={mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div>
          </div>
        </section>

        {/* <section className="closing" aria-labelledby="closing-title">
          <div className="wrap closing-inner" data-reveal>
            <div><span className="eyebrow">Decide. Commit. Achieve.</span><h2 id="closing-title">Your first rep<br />starts here.</h2></div>
            <a className="btn btn-white" href={facebook} target="_blank" rel="noopener noreferrer">Message KMAX <ArrowUpRight size={18} aria-hidden="true" /></a>
          </div>
        </section> */}
      </main>
      <a className="chat-fab" href={messenger} target="_blank" rel="noopener noreferrer" aria-label="Chat with KMAX on Messenger">
        <MessageCircle size={23} aria-hidden="true" /><span>Chat with us</span>
      </a>
    </PublicShell>
  );
}
