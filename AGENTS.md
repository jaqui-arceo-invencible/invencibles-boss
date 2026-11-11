# AGENTS.md — Invencibles Boss

## Product context
Invencibles Boss is a private learning and coaching platform for a community of women entrepreneurs. It supports invited members, editable learning content, private resources, progress tracking and community features. It is an independent training platform, not an online store or an official Farmasi system.

## Stack and structure
- Next.js App Router, React, strict TypeScript, Tailwind CSS.
- shadcn/ui is the preferred component foundation; Lucide React is the icon set.
- Supabase Cloud provides Auth, PostgreSQL, Storage and later Realtime.
- Netlify hosts the site; GitHub is the private source repository; npm manages packages.
- Application routes live in `src/app`; shared shell components in `src/components/layout`; feature components in `src/components/features`; copied shadcn components in `src/components/ui`; Supabase helpers in `src/lib/supabase`; shared utilities in `src/lib`; types in `src/types`; SQL migrations in `supabase/migrations`; technical decisions in `docs/`.

## Code conventions
- Prefer small, typed React components and server components by default. Add `"use client"` only for browser interactions.
- Use semantic HTML, accessible names, visible focus, keyboard operation and responsive mobile-first layouts.
- Use existing design-system components and dependencies before writing replacements. Do not add dependencies for one-off needs without documenting why.
- Keep product copy in Spanish unless the user requests otherwise. Do not create or imply official brand marks.
- Keep TypeScript strict; avoid `any`, unchecked casts and suppressions unless documented.

## Security and Supabase
- Treat the app as private. Public self-registration is not the intended product flow; future accounts must be provisioned through verified invitations.
- Authorize on the server and enforce access in PostgreSQL RLS. Hiding a link or button is not authorization.
- Use separate browser and server Supabase clients from `@supabase/ssr`, with cookie sessions and the framework request proxy for token refresh. Verify claims with the Supabase-supported method before trusting a session.
- Never expose service-role keys, database passwords, SMTP credentials or other privileged secrets to browser code or Git. Only the project URL and publishable/anon key may use `NEXT_PUBLIC_`.
- Keep Storage buckets private. Serve files only after membership checks, using short-lived signed URLs where appropriate.
- Roles are scoped to an active `team_memberships` row; never trust a role supplied by a client.
- Do not create partial production tables/policies. Every migration must be versioned, reviewed, safe to re-run where possible, and paired with complete RLS policies and verification.
- Do not apply migrations to production, modify authentication/security settings, or perform destructive cloud operations without explicit authorization.

## Components and responsive behavior
- Reuse shadcn/ui primitives (including Sidebar, Sheet, Card, Button, Dialog and Form) when appropriate.
- Maintain separate member-portal and administration route groups/layouts. Desktop admin navigation may collapse; mobile navigation should use an accessible Sheet/Drawer.
- Account for narrow viewports, loading/empty/error states, keyboard use, reduced motion and contrast.

## Verification
- Before reporting a change complete, run the relevant type check, lint and production build if the environment can install dependencies. Record commands and results in the plan. Do not claim checks passed if dependency or network problems prevented them.
- For UI changes, inspect at mobile and desktop widths when a browser is available.

## Database and production changes
- Place ordered SQL files in `supabase/migrations` using timestamp prefixes and descriptive names.
- Never edit an already applied migration; add a follow-up migration.
- Document schema, constraints, indexes, RLS policies and rollback considerations. Use a staging project before production where feasible.
- Netlify builds from `main`; use environment-specific values in Netlify's secret environment-variable manager, not in committed files.
