import Image from "next/image";
import { BandLogo } from "@/components/band-logo";
import { HeroPhoto } from "@/components/hero-photo";
import { HeroAtmosphere } from "@/components/hero-atmosphere";
import { Icon } from "@/components/icon";
import { MagneticLink } from "@/components/magnetic-link";
import { MobileMenu } from "@/components/mobile-menu";
import { band, bluesDeluxeSession, socialLinks } from "@/lib/band";
import bluesDeluxeArtwork from "../../public/images/blues-deluxe-2026-10-24.jpg";
import legacyLogo from "../../public/brand/band-legacy-logo.png";
import { ContactLinks } from "@/components/contact-links";
import { LivePerformance } from "@/components/live-performance";
import { SectionReveal } from "@/components/section-reveal";
import { StudioCredit } from "@/components/studio-credit";
import { BandEvents } from "@/components/band-events";
import { getBandEvents } from "@/lib/facebook";
import { partitionEvents } from "@/lib/facebook-events";

export const revalidate = 900;

export default async function Home() {
  const feed = await getBandEvents();
  const { upcoming, past } = partitionEvents(feed.events);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="site-header relative mx-auto flex max-w-[1400px] items-center justify-between px-5 md:px-10 lg:px-16">
        <a href="#" aria-label="The Jim Atkinson Band, home" className="brand">
          <BandLogo variant="header" />
        </a>
        <nav aria-label="Main navigation" className="hidden items-center gap-9 lg:flex">
          <a className="nav-link" href="#the-band">The band</a>
          <a className="nav-link" href="#history">Our history</a>
          <a className="nav-link" href="#shows">Live shows</a>
        </nav>
        <a href="#contact" className="header-contact hidden items-center gap-5 lg:inline-flex">Get in touch <Icon name="arrowUpRight" size={19} /></a>
        <MobileMenu />
      </header>

      <main id="main">
        <section aria-labelledby="hero-title" className="hero relative mx-auto max-w-[1400px]">
          <div className="hero-visual"><HeroPhoto /></div>
          <HeroAtmosphere />
          <div className="hero-copy px-5 md:px-10 lg:px-16">
            <p className="eyebrow hero-eyebrow intro-reveal flex items-center gap-3"><span className="short-rule" /><span className="hidden md:inline">A LITTLE GRIT. A WHOLE LOT OF SOUL.</span><span className="md:hidden">MASSACHUSETTS · EST. 2017</span></p>
            <h1 id="hero-title" className="hero-title intro-reveal">
              <span className="hero-music-genres block font-display uppercase">Blues. Rock.</span>
              <span className="hero-music-rhythms block">Roots Music.</span>
            </h1>
            <div className="hero-description intro-reveal">
              <p className="hero-subline">Good music. Good company.</p>
            </div>
            <div className="hero-actions intro-reveal flex flex-wrap items-center gap-x-6 gap-y-3">
              <MagneticLink href={band.emailHref} className="hero-booking inline-flex items-center gap-3"><span>Book the band</span><Icon name="arrowUpRight" size={18} /></MagneticLink>
              <a href="#shows" className="hero-shows inline-flex items-center gap-2">Upcoming shows <Icon name="arrowDown" size={16} /></a>
            </div>
            <div className="hero-community">
              <div className="est-seal" aria-label="Making music in Massachusetts since 2017"><span>EST.</span><strong>2017</strong><span><span className="hidden md:inline">MASSACHUSETTS</span><span className="md:hidden">MA</span></span></div>
              <div className="hero-socials intro-reveal">
                <nav aria-label="Watch and follow the band" className="social-channels flex flex-wrap items-center gap-x-5">
                  <a href="#watch" aria-label="Watch us play — live performance" className="social-channel inline-flex items-center gap-2"><Icon name="youtube" size={18} /><span>Watch us play</span></a>
                  {socialLinks.filter((social) => social.icon !== "youtube").map((social) => (
                    <a key={social.name} className="social-channel inline-flex items-center gap-2" href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.name} — The Jim Atkinson Band (opens in a new tab)`}>
                      <Icon name={social.icon} size={18} /><span>{social.name}</span>
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </div>
          <div className="photo-note"><span className="photo-note-rule" /><span className="eyebrow">REAL PEOPLE.<br />REAL LIVE MUSIC.</span></div>
          <div className="hero-bottom flex flex-wrap items-center justify-between gap-4 px-5 md:px-10 lg:px-16">
            <p className="flex items-center gap-2.5"><Icon name="location" size={16} /> Central & Eastern Massachusetts</p>
            <a href="#the-band" className="discover-link flex items-center gap-3">GET TO KNOW THE BAND <Icon name="arrowDown" size={16} /></a>
          </div>
        </section>

        <SectionReveal>
        <section id="the-band" aria-labelledby="about-title" className="about-section mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-5 md:grid-cols-[1fr_1.1fr] md:gap-16 md:px-10 lg:px-16">
          <div>
            <p className="eyebrow section-label"><span className="accent-dot" /> A LITTLE ABOUT US</p>
            <h2 id="about-title" className="section-title font-display uppercase">Rooted in blues.<br /><span className="muted-heading">Made for a good time.</span></h2>
          </div>
          <div className="about-copy">
            <span className="about-emblem"><Image src={legacyLogo} alt="Jim Atkinson Band JAB emblem" unoptimized /></span>
            <p>Since 2017, The Jim Atkinson Band has been bringing people together through a unique blend of blues, rock, and roots music, with a little something extra.</p>
            <p>From the first note to the last encore, we play for music lovers of all ages. You’ll find us on stages across Central and Eastern Massachusetts.</p>
            <a href="#shows" className="inline-link inline-flex items-center gap-4">Find our next show <Icon name="arrowDown" size={19} /></a>
          </div>
        </section>
        </SectionReveal>

        <SectionReveal>
          <BandEvents events={upcoming} pastEvents={past} status={feed.status} />
        </SectionReveal>

        <SectionReveal>
        <section id="history" aria-labelledby="history-title" className="history-section mx-auto max-w-[1400px] px-5 md:px-10 lg:px-16">
          <div className="history-heading flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow section-label"><span className="accent-dot" /> FROM THE BAND’S HISTORY</p>
              <h2 id="history-title" className="section-title font-display uppercase">From the stage to the airwaves.</h2>
            </div>
            <span className="history-edition">THE LATEST CHAPTER / 2026</span>
          </div>
          <article className="history-feature grid grid-cols-1 gap-8 md:grid-cols-[1.15fr_1fr] md:gap-12">
            <a href={bluesDeluxeSession.eventHref} target="_blank" rel="noopener noreferrer" className="history-artwork" aria-label="View the Blues Deluxe performance announcement on Facebook (opens in a new tab)">
              <Image src={bluesDeluxeArtwork} alt="Original Blues Deluxe announcement artwork featuring the four members of The Jim Atkinson Band in blue tones." sizes="(max-width: 767px) 100vw, 55vw" placeholder="blur" />
              <span className="artwork-caption">THE ORIGINAL ANNOUNCEMENT <Icon name="arrowUpRight" size={16} /></span>
            </a>
            <div className="history-copy">
              <div className="session-meta flex flex-wrap items-center gap-x-4 gap-y-2"><span className="past-performance">PAST PERFORMANCE</span><time dateTime={bluesDeluxeSession.date}>{bluesDeluxeSession.dateLabel}</time></div>
              <h3 className="session-title font-display">Live on <span>Blues Deluxe.</span></h3>
              <p className="session-location">{bluesDeluxeSession.station}<span> / </span>{bluesDeluxeSession.location}</p>
              <p className="session-description">An afternoon of blues on the air. On October 24, 2026, we played live on “Blues Deluxe” at WUML in Lowell, from {bluesDeluxeSession.timeLabel}.</p>
              <a href={bluesDeluxeSession.eventHref} target="_blank" rel="noopener noreferrer" className="button button-secondary session-button">See the event <Icon name="arrowUpRight" size={18} /></a>
            </div>
          </article>
        </section>
        </SectionReveal>

        <LivePerformance />

        <SectionReveal>
        <section id="contact" aria-labelledby="contact-title" className="contact-section">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-5 md:grid-cols-[1fr_1.1fr] md:gap-16 md:px-10 lg:px-16">
            <div>
              <p className="eyebrow section-label"><span className="accent-dot" /> LET’S GET SOMETHING GOING</p>
              <h2 id="contact-title" className="section-title font-display uppercase">Your stage.<br />Our kind of night.</h2>
              <p className="contact-description">Have a venue, an event, or just a question?<br />We’d love to hear from you.</p>
            </div>
            <ContactLinks />
          </div>
        </section>
        </SectionReveal>
      </main>

      <footer className="site-footer mx-auto max-w-[1400px] px-5 md:px-10 lg:px-16">
        <div className="footer-main flex flex-col items-center gap-5">
          <a href="#" aria-label="The Jim Atkinson Band, back to top" className="footer-brand"><BandLogo variant="footer" /></a>
          <div className="footer-socials">
            <p className="eyebrow footer-label">KEEP UP WITH THE BAND</p>
            <nav aria-label="Social media" className="flex flex-wrap justify-center gap-x-7 gap-y-1">
              {socialLinks.map((social) => <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">{social.name}<Icon name="arrowUpRight" size={14} /></a>)}
            </nav>
          </div>
        </div>
        <div className="footer-bottom flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} The Jim Atkinson Band.</p>
          <p>Central & Eastern Massachusetts · Since 2017</p>
        </div>
        <StudioCredit />
      </footer>
    </>
  );
}
