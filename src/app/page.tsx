import Image from "next/image";
import { HeroPhoto } from "@/components/hero-photo";
import { Icon } from "@/components/icon";
import { MagneticLink } from "@/components/magnetic-link";
import { MobileMenu } from "@/components/mobile-menu";
import { band, bluesDeluxeSession, socialLinks } from "@/lib/band";
import bluesDeluxeArtwork from "../../public/images/blues-deluxe-2026-10-24.jpg";

function RecordMark({ small = false }: { small?: boolean }) {
  return <span className={`record-mark${small ? " record-mark-small" : ""}`} aria-hidden="true"><span /></span>;
}

function Equalizer() {
  return <span className="equalizer" aria-hidden="true"><i /><i /><i /><i /><i /></span>;
}

export default function Home() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="site-header relative mx-auto flex max-w-[1400px] items-center justify-between px-5 md:px-10 lg:px-16">
        <a href="#" aria-label="The Jim Atkinson Band, home" className="brand flex items-center gap-3">
          <RecordMark small />
          <span>THE JIM ATKINSON<span className="block brand-bottom">BAND<span className="brand-period">.</span></span></span>
        </a>
        <nav aria-label="Main navigation" className="hidden items-center gap-9 md:flex">
          <a className="nav-link" href="#the-band">The band</a>
          <a className="nav-link" href="#history">Our history</a>
          <a className="nav-link flex items-center gap-2" href={band.events} target="_blank" rel="noopener noreferrer">Live shows <Icon name="arrowUpRight" size={15} /></a>
        </nav>
        <a href="#contact" className="header-contact hidden items-center gap-5 md:inline-flex">Get in touch <Icon name="arrowUpRight" size={19} /></a>
        <MobileMenu />
      </header>

      <main id="main">
        <section aria-labelledby="hero-title" className="hero relative mx-auto max-w-[1400px]">
          <div className="hero-visual"><HeroPhoto /></div>
          <div className="hero-copy relative px-5 md:px-10 lg:px-16">
            <p className="eyebrow hero-eyebrow intro-reveal flex items-center gap-3"><span className="short-rule" /> A LITTLE GRIT. A WHOLE LOT OF SOUL.</p>
            <h1 id="hero-title" className="hero-title intro-reveal font-display uppercase">
              <span className="block">The Jim</span>
              <span className="block">Atkinson</span>
              <span className="block"><span className="band-title">Band</span><span className="title-period">.</span></span>
            </h1>
            <div className="hero-description intro-reveal">
              <p className="genre-line">Blues. Rock. New Orleans rhythms.</p>
              <p className="hero-subline">Good music. Good company. Since 2017.</p>
            </div>
            <div className="hero-actions intro-reveal flex flex-wrap items-center gap-x-7 gap-y-4">
              <MagneticLink href={band.emailHref} className="button button-primary">Book the band <Icon name="arrowUpRight" size={19} /></MagneticLink>
              <a href={band.instagram} target="_blank" rel="noopener noreferrer" aria-label="Message The Jim Atkinson Band on Instagram (opens in a new tab)" className="button button-secondary"><Icon name="instagram" size={20} /> Instagram</a>
            </div>
            <div className="hero-socials intro-reveal flex items-center gap-5">
              <span className="eyebrow follow-label">FOLLOW THE SOUND</span>
              {socialLinks.map((social) => (
                <a key={social.name} className="social-icon" href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`The Jim Atkinson Band on ${social.name} (opens in a new tab)`}><Icon name={social.icon} size={20} /></a>
              ))}
            </div>
          </div>
          <div className="photo-note"><span className="photo-note-rule" /><span className="eyebrow">REAL PEOPLE.<br />REAL LIVE MUSIC.</span></div>
          <div className="est-seal" aria-label="Making music since 2017"><span>EST.</span><strong>2017</strong><span>MASSACHUSETTS</span></div>
          <div className="hero-bottom flex flex-wrap items-center justify-between gap-4 px-5 md:px-10 lg:px-16">
            <p className="flex items-center gap-2.5"><Icon name="location" size={16} /> Central & Eastern Massachusetts</p>
            <a href="#the-band" className="discover-link flex items-center gap-3">GET TO KNOW THE BAND <Icon name="arrowDown" size={16} /></a>
          </div>
        </section>

        <section className="sound-strip" aria-label="Our sound">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 md:px-10 lg:px-16">
            <p className="flex items-center gap-3"><Equalizer /><span>GOOD MUSIC. GOOD COMPANY.</span></p>
            <a href={band.youtube} target="_blank" rel="noopener noreferrer" className="strip-listen flex items-center gap-3"><span>WATCH US PLAY</span><span className="play-circle"><Icon name="play" size={12} /></span></a>
          </div>
        </section>

        <section id="the-band" aria-labelledby="about-title" className="about-section mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-5 md:grid-cols-[1fr_1.1fr] md:gap-16 md:px-10 lg:px-16">
          <div>
            <p className="eyebrow section-label"><span className="accent-dot" /> A LITTLE ABOUT US</p>
            <h2 id="about-title" className="section-title font-display uppercase">Rooted in blues.<br /><span className="muted-heading">Made for a good time.</span></h2>
          </div>
          <div className="about-copy">
            <p>Since 2017, The Jim Atkinson Band has been bringing people together through a unique blend of blues, rock, New Orleans rhythms, and a little something extra.</p>
            <p>From the first note to the last encore, we play for music lovers of all ages. You’ll find us on stages across Central and Eastern Massachusetts.</p>
            <a href={band.events} target="_blank" rel="noopener noreferrer" className="inline-link inline-flex items-center gap-4">Find our next show on Facebook <Icon name="arrowUpRight" size={19} /></a>
          </div>
        </section>

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

        <section id="contact" aria-labelledby="contact-title" className="contact-section">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-5 md:grid-cols-[1fr_1.1fr] md:gap-16 md:px-10 lg:px-16">
            <div>
              <p className="eyebrow section-label"><span className="accent-dot" /> LET’S GET SOMETHING GOING</p>
              <h2 id="contact-title" className="section-title font-display uppercase">Your stage.<br />Our kind of night.</h2>
              <p className="contact-description">Have a venue, an event, or just a question?<br />We’d love to hear from you.</p>
            </div>
            <div className="contact-options">
              <a href={band.emailHref} className="contact-row group">
                <span><span className="contact-label">BOOKINGS & GOOD CONVERSATIONS</span><span className="contact-email">{band.email}</span></span>
                <span className="contact-arrow"><Icon name="arrowUpRight" size={25} /></span>
              </a>
              <a href={band.instagram} target="_blank" rel="noopener noreferrer" className="contact-row contact-instagram">
                <span className="flex items-center gap-3"><Icon name="instagram" size={22} /><span>More of an Instagram person?<span className="contact-label block">SEND US A MESSAGE</span></span></span>
                <Icon name="arrowUpRight" size={22} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer mx-auto flex max-w-[1400px] flex-col justify-between gap-7 px-5 md:flex-row md:items-center md:px-10 lg:px-16">
        <div className="flex items-center gap-3"><RecordMark small /><p>© {new Date().getFullYear()} The Jim Atkinson Band.</p></div>
        <nav aria-label="Social media" className="flex flex-wrap gap-6">
          {socialLinks.map((social) => <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">{social.name}<Icon name="arrowUpRight" size={13} /></a>)}
        </nav>
      </footer>
    </>
  );
}
