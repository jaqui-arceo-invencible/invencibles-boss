# AGENTS.md — Invencibles Boss

## Product context
Invencibles Boss is a private learning and coaching platform for a community of women entrepreneurs. It supports invited members, editable learning content, private resources, progress tracking and community features. It is an independent training platform, not an online store or an official Farmasi system.

## Stack and structure
- Next.js App Router, React, strict TypeScript, Tailwind CSS.
- shadcn/ui is the preferred component foundation; Lucide React is the icon set.
- Supabase Cloud provides Auth, PostgreSQL, Storage and later Realtime.
- Netlify remains linked to the private repo; pnpm is preferred for local development.
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
- The user explicitly requested local-first development and no further Netlify deployments to avoid costs. Do not push to `main` or trigger Netlify until asked; `main` has auto-publishing enabled.
- Use `SUPABASE_SERVICE_ROLE_KEY` only from `server-only` modules or one-off protected scripts. Never include it in browser bundles, logs, commits, or screenshots.

## Components and responsive behavior
- Reuse shadcn/ui primitives (including Sidebar, Sheet, Card, Button, Dialog and Form) when appropriate.
- Maintain separate member-portal and administration route groups/layouts. Desktop admin navigation may collapse; mobile navigation should use an accessible Sheet/Drawer.
- Account for narrow viewports, loading/empty/error states, keyboard use, reduced motion and contrast.

## Verification
- Before reporting a change complete, run the relevant type check, lint and production build if the environment can install dependencies. Record commands and results in the plan. Do not claim checks passed if dependency or network problems prevented them.
- For UI changes, inspect at mobile and desktop widths when a browser is available.

## Database and production changes
- Place ordered SQL files in `supabase/migrations` using timestamp prefixes and descriptive names.
- Phase 2 migrations `20261111190000_phase_2_cms.sql`, `20261111203000_phase_2_published_metadata.sql`, and `20261111210000_phase_2_resource_deletion.sql` were applied manually in Supabase SQL Editor on 2026-11-11; register all three in CLI migration history before a future `db push`.
- Never edit an already applied migration; add a follow-up migration.
- Document schema, constraints, indexes, RLS policies and rollback considerations. Use a staging project before production where feasible.
- Netlify builds from `main`; use environment-specific values in Netlify's secret environment-variable manager, not in committed files.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
