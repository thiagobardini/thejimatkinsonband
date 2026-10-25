export const band = {
  name: "The Jim Atkinson Band",
  email: "jimatkinsonband@gmail.com",
  emailHref: "mailto:jimatkinsonband@gmail.com?subject=Let%27s%20book%20The%20Jim%20Atkinson%20Band",
  instagram: "https://www.instagram.com/thejimatkinsonband/",
  instagramMessage: "https://ig.me/m/thejimatkinsonband",
  facebook: "https://www.facebook.com/profile.php?id=100063041748866",
  events: "https://www.facebook.com/profile.php?id=100063041748866&sk=upcoming_hosted_events",
  youtube: "https://www.youtube.com/@TheJimAtkinsonBand",
} as const;

export const socialLinks = [
  { name: "Instagram", href: band.instagram, icon: "instagram" },
  { name: "Facebook", href: band.facebook, icon: "facebook" },
  { name: "YouTube", href: band.youtube, icon: "youtube" },
] as const;

export const bluesDeluxeSession = {
  title: "The Jim Atkinson Band on Blues Deluxe",
  date: "2026-10-24",
  dateLabel: "October 24, 2026",
  timeLabel: "3–6 PM Eastern",
  station: "WUML 91.5 FM",
  location: "Lowell, Massachusetts",
  eventHref: "https://www.facebook.com/events/2041463496559169/",
} as const;
