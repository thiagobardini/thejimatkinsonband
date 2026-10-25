import Image from "next/image";
import wordmark from "../../public/brand/band-navbar-logo.png";
import emblem from "../../public/brand/band-emblem.png";

export function BandLogo({ variant }: { variant: "header" | "footer" }) {
  const isHeader = variant === "header";

  return (
    <Image
      src={isHeader ? wordmark : emblem}
      alt="The Jim Atkinson Band"
      className={`brand-logo brand-logo-${variant}`}
      sizes={isHeader ? "(max-width: 767px) 208px, 260px" : "(max-width: 767px) 144px, 176px"}
      preload={isHeader}
    />
  );
}
