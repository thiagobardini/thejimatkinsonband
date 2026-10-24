"use client";

import { ArrowDown, ArrowUpRight, FacebookLogo, InstagramLogo, List, MapPin, Play, X, YoutubeLogo } from "@phosphor-icons/react";

const icons = {
  arrowDown: ArrowDown,
  arrowUpRight: ArrowUpRight,
  facebook: FacebookLogo,
  instagram: InstagramLogo,
  menu: List,
  location: MapPin,
  play: Play,
  close: X,
  youtube: YoutubeLogo,
};

export function Icon({ name, size = 20, className = "" }: {
  name: keyof typeof icons;
  size?: number;
  className?: string;
}) {
  const Component = icons[name];
  return <Component size={size} weight="regular" className={className} aria-hidden="true" />;
}
