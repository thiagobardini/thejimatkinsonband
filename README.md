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

Deploy to a Next.js-compatible host. The homepage remains available without Facebook credentials, with a link to the band's latest dates on Facebook. The production origin for social sharing is detected automatically on Vercel; on other hosts, set the optional `SITE_URL` environment variable to the site's full public origin, including `https://`.

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

Brand images and fonts are local; Facebook event covers load from the URLs supplied by the authorized Page. Includes reduced motion support, visible keyboard focus, a skip link, an accessible mobile menu and a keyboard/touch-friendly show carousel.

The live video has a separate stage-smoke effect behind its frame. It follows the actual YouTube playback state, including muted playback, and fades away when paused, buffering, finished, unavailable, offscreen or in a hidden tab. It is an atmospheric animation rather than an audio visualizer. Rendering is capped for mobile and disabled for reduced motion. Smoke fades to the section’s dark color near the frame, while a shallow, pointer-inert vignette softens the image perimeter; the center stays sharp and the smaller bottom fade preserves captions. Smoke does not cover the video, controls or surrounding text.

## Automatic Facebook events

Upcoming shows and a carousel of recent past shows share one poster-led section after About. The desktop/mobile “Live shows” menu links, the hero’s next-show ticker (or “Upcoming shows” when no show is announced) and About “Find our next show” scroll to this section (`#shows`). The existing Blues Deluxe feature remains in History below it. Event posters and “See the event” link directly to their individual Facebook events; social links and the unavailable-feed fallback keep their external destinations. The shows heading has no separate Facebook listing link.

When a show is upcoming, the hero’s bottom strip becomes a scrolling text announcement with the nearest show’s title, venue (or location), and Eastern date/time from the same feed as the cards. It replaces the generic hero show link, pauses on hover/focus, includes a pause/resume control, and wraps as static text for reduced motion. Without an upcoming show, the original hero links and Massachusetts footer return. There is no second Facebook request or separate schedule to maintain. On mobile, the hero fills the dynamic visible viewport while photo spacing uses the stable small viewport height. When mobile browser controls change the hero height, the entire next-show strip, including its top divider, eases to its new position with one shared transform; ordinary scrolling and desktop layouts do not trigger that movement. Reduced motion disables this repositioning animation. The show strip keeps safe-area clearance and uses smaller body typography. Desktop keeps the schedule at the left of the announcement and keeps a discreet pause control at the right, without a circular down arrow. Mobile retains its metadata row and full-width announcement. Compact-height layouts reduce spacing further; the announcement stays in normal document flow and the About section begins after the hero.

The server reads the Page's `/events` endpoint using these variables, privately in the root `.env.local` during development or in the project's Vercel Environment Variables for Production:

| Variable | Value |
| --- | --- |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Authorized Page token; use the Vercel **Secret** type |
| `FACEBOOK_PAGE_ID` | `1813541058730407` (default) |
| `FACEBOOK_GRAPH_VERSION` | `v26.0` (default) |

Never prefix the token with `NEXT_PUBLIC_`. The server-only adapter does not pass credentials, raw Graph responses or pagination URLs to client components. Only selected public display fields reach the browser. The App ID and Login Configuration ID are not required for this read-only feed.

Successful reads and the homepage revalidate after 900 seconds. Refresh is triggered by visits after the cache interval, so the first visitor can receive the previous version while regeneration runs; this is not an instant webhook or a scheduled import. A new Vercel deployment is required after changing environment variables.

Reads are bounded to three pages of 50 records, then deduplicated and sorted. The interface shows at most six upcoming shows in a horizontal carousel, nearest show first. Each upcoming slide fills the container with its date, large poster and details; a single show keeps that same featured layout without navigation arrows. Twenty recent past shows appear in a separate poster carousel, not a complete archive. Both support touch scrolling and keyboard navigation. Posters reserve their dimensions and show a subtle loading indicator until ready; failed or missing covers have a styled fallback. Canceled events are omitted when Facebook returns that field. Dates and times use `America/New_York`; an event without an end stays upcoming on its calendar date and becomes past the next day, without an invented end time. Unavailable or malformed responses fall back to Facebook rather than claiming there are no events.

Facebook credentials can expire or be revoked; saving them in Vercel does not extend their lifetime. Validate the Page token's expiration in Meta before relying on unattended updates, and replace the Vercel Secret and redeploy when reauthorizing.

Upcoming shows and their individual shared pages show compact Going and Interested totals from the same authorized Facebook feed. Each total is its own external link with an arrow, alongside Share; there is no separate Facebook label or RSVP row. Totals use the existing 900-second revalidation interval; unknown or unsupported counts are omitted, while an explicit zero is preserved. These are Facebook responses, not physical attendance. The totals link to the individual Facebook event, where visitors choose and confirm their own response; clicking on this site does not register an RSVP or preselect a response. Share opens a dialog and restores focus to its trigger; pointer activation avoids automatic selection outlines while keyboard focus stays visible. Each shares a public `/shows/[id]` page with its own canonical URL, title, Eastern date/time, venue, and event-specific Open Graph/Twitter image. The image routes refresh the poster from the same Facebook feed and serve a same-origin PNG, with a branded event card if no poster is available. External poster reads are bounded and restricted to Facebook CDN hosts. Sharing offers WhatsApp, SMS/Messages, copying the link, and the device's native share sheet when available. Instagram uses file sharing where supported; visitors can also save the poster and add the copied event URL to their story. Available apps and link previews depend on the receiving platform. Past cards keep their existing Facebook links; shared event pages remain readable while the event remains in the feed. No production database or additional event schedule is introduced.

Event addresses in upcoming shows, individual shared pages and the Share dialog open a compact choice of Google Maps, Waze or Apple Maps, using the venue and address supplied by Facebook. Selecting a provider opens a separate tab or its installed map app; the band page keeps its URL and scroll position. The chooser supports Escape and outside dismissal. These are standard map URLs without an API key or a location permission prompt; an in-app browser may control how external tabs and apps are presented. Past carousel cards keep their full-card Facebook destination.

Implementation: `src/lib/event-sharing.ts`, `src/lib/event-location.ts`, `src/components/event-location.tsx`, `src/components/event-share.tsx`, `src/app/shows/[id]/`, `src/lib/facebook-events.ts`, `src/lib/facebook.ts`, `src/components/band-events.tsx`, `src/components/hero-next-show.tsx`, `src/components/past-events-carousel.tsx` and `src/components/band-events.module.css`.

```sh
npm test
npm run typecheck
npm run build -- --webpack
```

The native Node tests require a Node version that can import erasable TypeScript syntax (Node 22.18+).

## Optional Facebook read diagnostic

This local script checks authorized access to the band's Page, up to ten of its own posts, and up to ten events from its `/events` endpoint. It does not change Facebook content, enable a production feed, or require credentials for the homepage to run.

Privately add `FACEBOOK_PAGE_ACCESS_TOKEN` to `.env.local` in the repository root, not inside `src`. That file is ignored by Git. Use a Page access token authorized for the dedicated band app and Page; never use a `NEXT_PUBLIC_` variable for the token, commit it, or paste it into chat. The defaults are the verified Graph API Page ID `1813541058730407` and Graph API `v26.0`; optional overrides are `FACEBOOK_PAGE_ID` and `FACEBOOK_GRAPH_VERSION`. Use the Page ID returned by the API, which can differ from the identifier in the public Facebook profile URL. The site's public social links remain separate from this diagnostic setting.

Run with a Node.js version supporting `--env-file-if-exists`:

```sh
node --env-file-if-exists=.env.local scripts/check-facebook.mjs
```

The script sends only GET requests, authenticates through the Authorization header, and uses a 15-second timeout per request. It prints selected public fields and availability indicators, not raw responses, tokens, or pagination URLs. If extended post fields fail, it may retry basic fields once and reports that post event attachments were not validated. Posts and events are checked independently after Page verification, so a post failure does not skip the events check. Error `190` can indicate an invalid or expired token, or a wrong token type; the New Pages Experience can require a Page token where a valid User token is insufficient. Exit codes are `0` when both reads succeed (including empty or basic-only results), `1` if any read fails, and `2` for missing or invalid configuration. Individual results remain visible on partial success.

In the posts report, an event attachment, Facebook event URL, or `created_event` status is evidence of an announcement, not verified show dates. `publishedAt` is the post's publication time; dates inferred from posts remain `null`. Unpublished posts are omitted, an unavailable publication flag is marked as unknown, and repeated post IDs are deduplicated.

The separate events report uses `id,name,start_time,end_time,place,cover,description`, preserving dates and UTC offsets actually returned by Facebook. It includes sanitized venue, cover and description fields, and counts upcoming, ongoing, past and timing-unknown events relative to the reported check time. A started event without a known end time is not automatically marked past. This authorized Page's `/events` endpoint returned real events in the live validation; access still must be checked for each app/token configuration. Each report covers only one page of at most ten results, without following pagination: neither successful reads nor empty results establish a complete archive or guarantee that every event is accessible.
