# Facebook events on the band website

## Intent and scope
Show the band's upcoming performances and a browsable recent show history using its authorized Facebook Page. The user explicitly requested implementation after connecting Meta and configuring the production variables in Vercel. Continue within that authorization; publication still requires a separate push request.

Keep the existing navy, cream and muted gold identity, typography, hero, video, contact and footer. Put upcoming and past shows together after About, followed by the existing Blues Deluxe history feature. The user clarified that both groups should feature event posters integrated into the page. Keep current hero and About Facebook destinations as requested previously. Each event opens its own Facebook event.

## Approach
Use the existing Next.js App Router with a server-only loader and cached Graph API reads. This gives custom, accessible layouts and real dates; a Facebook embed would constrain the design and a post-text parser would infer dates unnecessarily. No new service or dependency is needed.

The actual Graph Page ID is `1813541058730407`; the public profile URL has a different ID and stays unchanged. Read the existing private token from server environment variables only. Cache successful reads for 900 seconds and paginate through a bounded number of results. Never forward Graph pagination URLs, credentials or raw error bodies to the browser or logs.

Normalize public event fields only: ID, title, start/end times, venue/location, cover, canonical Facebook URL. Drop malformed dates and canceled entries. Deduplicate and sort. Format dates in America/New_York. Missing end times must not leave months-old shows in Upcoming; classify older calendar dates as past without inventing end times. Keep same-day events without an end visible for that day.

## Presentation and resilience
Upcoming shows use an editorial date/poster/details arrangement, with no enclosing cards or filled gold buttons. Past shows use a touch-scrollable, keyboard-accessible carousel with optional previous/next controls. Respect reduced motion and retain the 1400px container and responsive gutters. Keep the manually verified WUML feature when it is absent from this Page's event feed, and avoid showing it twice in the carousel.

Missing credentials or a Meta outage must not break the homepage or claim there are no shows. Show a short Facebook fallback link. A genuine empty successful feed can say dates are being announced. Covers get fixed aspect ratios and a graceful missing-image fallback.

## Validation and production boundary
Test date partitioning, sorting, canceled/malformed records, pagination, authentication placement and failure behavior. Run TypeScript and a production build, check real authenticated data privately, and inspect mobile/desktop layouts and carousel interactions. Do not commit tokens or expose environment values. Token longevity is not yet verified; storing it in Vercel does not extend its lifetime.
