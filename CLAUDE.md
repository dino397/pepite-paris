# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (port 8080)
npm run build        # Production build → dist/
npm run lint         # ESLint
npm run test         # Vitest (run once)
npm run test:watch   # Vitest (watch mode)
```

For GitHub Pages deployment, the build uses `--base=/pepite-paris/`.

## Architecture

**Pépite** is a personalized family weekend activity recommender for Paris. React 18 SPA backed by Supabase.

### Frontend Stack
- React 18 + Vite 5 + TypeScript (strict null checks OFF)
- Tailwind CSS with a custom "Ghibli" color palette (`ghibli-sky`, `ghibli-meadow`, `ghibli-petal`, `ghibli-gold`, etc.)
- shadcn/ui components in `src/components/ui/`
- Fonts: Lora (display), Nunito (body), Fraunces (brand logo)
- Path alias: `@/` → `src/`

### State Machine (src/pages/Index.tsx)
The app has a single route (`/`) with a state machine: `loading → auth → onboarding → app`. Transitions are driven by `supabase.auth.onAuthStateChange`. A 6-second timeout falls back to `auth` if session check hangs.

### Main Components
- `AuthForm` — Email/password + Google SSO (via `@lovable.dev/cloud-auth-js`)
- `OnboardingForm` — 5-step wizard (name/city, children, transport, preferences, newsletter). Saves to `family_profiles`, `children`, `newsletter_subscribers`
- `WeekendNewsletter` (~1200 lines) — Main app view. Fetches weather from Open-Meteo, calls `generate-activities` Edge Function, falls back to `mockActivities` if the function fails. Sections: weather strip, agenda, "pépite de la semaine", then categorized activity cards (cinema, theatre, expo, activite)
- `MapPage` — Leaflet map with activity markers
- `ActivityCard` — Renders a single activity with poster, tags, booking link, travel times

### Data Flow
1. `scrape-activities` Edge Function scrapes 40+ Parisian cultural sources via Firecrawl API, extracts structured data via Gemini LLM, stores in `scraped_activities`
2. `generate-activities` Edge Function reads user profile + scraped activities, generates 6 personalized recommendations via Gemini, caches in `newsletter_cache` with key `activities-{userId}-{weekStartDate}`
3. `generate-newsletter` does the same for the newsletter format (different Gemini model)
4. Frontend calls `generate-activities` on load; on failure, displays mock data from `src/data/mockActivities.ts`

### Database (Supabase PostgreSQL)
Tables: `family_profiles`, `children`, `agenda_events`, `newsletter_cache`, `newsletter_subscribers`, `scraped_activities`, `scrape_runs`. All user-facing tables enforce RLS (row-level security) scoped to `auth.uid()`. Scraped data tables have public read access.

### Edge Functions (supabase/functions/, Deno runtime)
- `generate-activities` — Auth via `getClaims()` (local JWT, no network). Uses `LOVABLE_API_KEY` → Lovable AI Gateway → `google/gemini-2.5-flash`
- `generate-newsletter` — Auth via `getUser()` (network call, known timeout risk). Uses `google/gemini-3-flash-preview`
- `scrape-activities` — No auth (public). Uses `FIRECRAWL_API_KEY` for scraping + Gemini for extraction. Priority-based source rotation (daily/even-days/weekend-only)

### Environment Variables
Frontend (in `.env`, prefixed `VITE_`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

Edge Function secrets (Supabase dashboard): `LOVABLE_API_KEY`, `FIRECRAWL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

### Known Issues
- `generate-newsletter` uses `auth.getUser()` (network call) instead of `getClaims()` — should be migrated
- Sunday week-start calculation bug in all 3 edge functions: `getDay()=0` yields next Monday instead of current Monday
- `scrape-activities` has no authentication — publicly callable
- Cache key in `generate-newsletter` doesn't include user_id prefix (inconsistent with `generate-activities`)

### Deployment
GitHub Pages via Actions workflow (`.github/workflows/deploy-pages.yml`). Builds with `--base=/pepite-paris/` and copies `index.html` to `404.html` for SPA routing. Supabase env vars are injected in the workflow.
