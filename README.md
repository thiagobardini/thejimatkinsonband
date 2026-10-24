# The Jim Atkinson Band

A responsive homepage built with Next.js App Router, TypeScript, Tailwind CSS v4, and Framer Motion. Features the band's photograph, email booking, Instagram messaging, and social links.

## Development

```sh
npm ci
npm run dev
```

Open the local URL printed by Next.js, usually `http://127.0.0.1:3000`.

## Production

```sh
npm run build
npm start
```

Deploy to a Next.js-compatible host. No environment variables are required to run the homepage. The production origin for social sharing is detected automatically on Vercel; on other hosts, set the optional `SITE_URL` environment variable to the site's full public origin, including `https://`.

## Content

- Contact and social URLs: `src/lib/band.ts`
- Homepage: `src/app/page.tsx`
- Styling: `src/app/globals.css`
- Supplied photograph: `public/images/jim-atkinson-band.jpg`
- Blues Deluxe performance history and verified event URL: `src/lib/band.ts`
- Original October 24, 2026 announcement artwork: `public/images/blues-deluxe-2026-10-24.jpg`
- Official transparent logos: `public/brand/` (wordmark in the navigation, centered circular emblem in the footer)
- Logo component and sizing: `src/components/band-logo.tsx` and `src/app/globals.css`
- Favicon, Apple touch icon, and 1200×630 sharing images: generated from the official artwork by `src/lib/brand-images.tsx` and the App Router metadata image routes.

Images and fonts are local. Includes reduced motion support, visible keyboard focus, a skip link, and an accessible mobile menu. Events link to the band's Facebook page.
