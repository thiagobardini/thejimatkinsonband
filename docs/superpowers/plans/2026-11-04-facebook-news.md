# Facebook Latest News Implementation Plan

**Goal:** Add the Page's public posts as a minimal Latest news section, including photos, shared links and text notices, with incremental loading.

**Architecture:** Next.js Server Component fetches the first six posts directly through a server-only adapter. A small Client Component owns a horizontal, keyboard/touch-friendly rail; IntersectionObserver loads subsequent pages from a fixed same-origin Route Handler. Graph authentication and pagination stay on the server. Facebook data revalidates after 300 seconds.

**Placement and design:** Between History and the live video. Preserve the existing ink, paper, gold, Oswald and Outfit styles. Flat editorial items, discreet date and external link, no engagement counters or Facebook widget. Images reserve space, load lazily and handle failure. Text-only posts remain first-class; do not exclude event promotion posts, per the user's correction. Horizontal pagination preserves access to the rest of the homepage.

## Tasks

- [x] Backend: normalize safe public fields and attachments; fetch six records per page; wrap opaque authenticated pagination; implement GET /api/news. Test content variants, errors, credential exclusion and cursor safety before implementation.
- [x] Pagination: append older posts without duplicates; coalesce requests; support retry, empty batches, end-of-feed, cancellation and cursor loops. Test before implementation.
- [x] UI: render the initial server content; observe the end of the rail; expose quiet Previous/Next and Load more controls; retain content on errors. Integrate after History without changing Events, video or contact.
- [x] Verification: 56 tests, typecheck, production build and diff check pass. Real Meta reads and local API pagination verified (4 valid initial items, 5 subsequent, no overlap; invalid cursor 400). Desktop arrows and mobile keyboard End both triggered automatic append from 4 to 9. Images load and links open a new tab. Independent review findings fixed and scoped rereview clean. Browser screenshots were unavailable; UI dimensions and behavior verified through the browser DOM, not a captured visual review.

## Checks that matter

- Shared posts can have an image or title only in nested attachments.
- A plain notice must not receive an invented photo or event date.
- Invalid credentials or pagination errors must not leak credentials or remove already loaded posts.
- Infinite loading must be driven by browsing the rail, not download the archive as soon as the page loads.
- Mobile touch scrolling and keyboard navigation must preserve access to all following sections.
