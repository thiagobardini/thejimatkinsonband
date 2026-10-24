"use client";

import Image from "next/image";
import { useState } from "react";
import bandPhoto from "../../public/images/jim-atkinson-band.jpg";

export function HeroPhoto() {
  const [failed, setFailed] = useState(false);
  return (
    <div className="hero-photo">
      {failed ? (
        <div className="photo-fallback h-full w-full" role="img" aria-label="The band performance photo is currently unavailable." />
      ) : (
        <Image src={bandPhoto} alt="The Jim Atkinson Band playing live on an outdoor wooden stage, with bass, saxophone, drums, and guitar." fill preload placeholder="blur" sizes="(max-width: 767px) 100vw, (max-width: 1400px) 70vw, 1000px" className="object-cover" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
