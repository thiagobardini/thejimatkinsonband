# Facebook Events Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Track completion here; the user has explicitly requested implementation in this session. No push or production deployment is included.

**Goal:** Add upcoming Facebook shows and a recent past-event carousel without changing the existing homepage composition.

**Architecture:** A testable Graph read/normalization module produces public event DTOs. A server-only Next.js adapter supplies credentials and 900-second caching. Server-rendered sections and a small client carousel render dates and posters.

**Tech Stack:** Existing Next.js 16.4.3, React 19, TypeScript, CSS Modules, native Node tests.

**Spec:** `docs/superpowers/specs/2026-10-27-facebook-events-design.md`

## Global constraints
- Keep private tokens server-only and out of Git, logs, client props and URLs.
- Keep current public Facebook links and the verified Blues Deluxe feature.
- No new dependencies, broad homepage redesign or push.
- Use America/New_York dates, 900-second successful-read caching and bounded pagination.

## Review focus
- Missing end times, timezone boundaries and overnight shows must sort and partition correctly.
- Expired tokens, HTTP/JSON errors and later pagination failure must produce an honest fallback.
- Pagination cannot follow arbitrary URLs or leak credentials.
- Missing and failed cover images must retain usable event links.
- Mobile carousel must fit the page, work by touch/keyboard and respect reduced motion.

## Task 1: Facebook event data (backend agent)
**Files:** `src/lib/facebook-events.ts`, `src/lib/facebook.ts`, `tests/facebook-events.test.mjs`.
**Interface:** `BandEvent` with `id`, `title`, `startsAt`, `endsAt`, `venue`, `location`, `coverUrl`, `eventUrl`; `getBandEvents()` returns `{ status: 'connected' | 'unavailable' | 'unconfigured', events: BandEvent[] }`. `partitionEvents(events, now)` returns upcoming/past sorted arrays.
- [x] Write and run failing native Node tests for normalization, Eastern dates, sorting, malformed/canceled events, paging and failures.
- [x] Implement the pure transport/normalizer and private server adapter using installed Next.js docs.
- [x] Run the tests and a safe real read; report only IDs/counts/dates, never credentials.

## Task 2: Event sections and carousel (root)
**Files:** `src/components/band-events.tsx`, `src/components/past-events-carousel.tsx`, `src/components/band-events.module.css`, `src/app/page.tsx`.
**Consumes:** Task 1 DTOs. Format dates and times on the server; only public display fields reach the carousel.
- [x] Add an upcoming section after About with event-specific Facebook links and honest empty/error states.
- [x] Add a compact past-show carousel in the same shows section, excluding the existing Blues Deluxe feature's event ID.
- [x] Keep all other sections and Facebook destinations unchanged. Preserve existing Facebook navigation destinations rather than replacing them.
- [x] Verify desktop/mobile layout and native carousel controls/keyboard scrolling. Image fallback implemented; live cover images loaded in browser.

## Task 3: Integrate, verify and review (root + independent reviewer)
**Files:** `README.md`, `package.json` test command if useful, completed task files.
- [x] Document production variables, cache freshness, historical result limits and token renewal limitation.
- [x] Run all new tests, typecheck, webpack production build and diff checks; inspect public HTML for secrets privately.
- [x] Request an independent code review and inspect final preview. No P1/P2 findings; improved accessible event names to include visible time/venue.
- [x] Present the local result and explicitly retain the publication boundary. Preview: `http://localhost:3001/#shows`; no push or deploy.

## Progress
- Planning: complete. Local branch `codex/facebook-events`; existing diagnostic changes retained.
- Task 1: complete — 13 native tests pass; authenticated read returned 141 events (1 upcoming, 140 past), including supported cancellation fields.
- Task 2: complete — poster-led upcoming/past section after About; original WUML history remains below. Mobile/desktop page widths matched 320/393/1440 viewports. Native next control advances; End disables next; Home returns to the beginning.
- Browser regression fixed: absolutely positioned screen-reader notices escaped the scrolling rail and widened the page to 4843px. Positioning event links relatively keeps those notices inside their link; the same browser measurement then returned 1440px at a 1440px viewport, and 393/320px on mobile.
- Task 3: verification complete — webpack build succeeds with homepage ISR 15m, TypeScript passes and no private token was found in 111 generated static/server-app output files.
- Credential renewal: with explicit user authorization and the user's Meta password confirmation, extended the User token through the official debugger, then obtained the Page token from that authorization. Meta verified the correct Page/app/scopes, `Valid: True` and `Expires: Never`. Saved the Page token only in ignored `.env.local` (0600) and the Vercel Production Secret. The earlier temporary token was replaced, not represented as revoked. The new value applies on the next deployment; no push or production redeployment was performed.
