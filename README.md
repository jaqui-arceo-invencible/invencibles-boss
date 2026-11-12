# Invencibles Boss

Academia privada de capacitación y acompañamiento para la comunidad Invencibles Boss. No es una tienda ni un sistema oficial de Farmasi.

## Stack
Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase Auth/PostgreSQL y pnpm para desarrollo local.

## Inicio local
Necesitas Node.js 20.9+ y pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Configura `.env.local` (no se sube a Git):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (local: `http://localhost:3000`)
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; necesaria para acciones administrativas)

Comprobaciones: `pnpm typecheck`, `pnpm lint`, `pnpm build`.

## Documentación
- [Plan](docs/CODEX_PLAN.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Setup](docs/SETUP.md)
- [Autenticación](docs/AUTHENTICATION.md)
- [Roles y permisos](docs/ROLES_AND_PERMISSIONS.md)
- [Flujo de invitación](docs/INVITATION_FLOW.md)
- [Informe de Fase 1](docs/PHASE_1_REPORT.md)

## Estado
Fase 1 en verificación local. Contiene pantallas y lógica de login, recuperación, aceptación de invitación, onboarding y administración. Antes de usar administración aplica la migración y prepara la primera administradora. No publicar a `main`: Netlify tiene autodeploy activo y la usuaria pidió evitar nuevos despliegues.

## CMS local
Con la migración de Fase 2 aplicada, abre `http://localhost:3000/admin/modules` con una cuenta administradora. Los diez módulos iniciales están en borrador. Crea una lección, añade bloques y guarda; publica la lección y después el módulo para verla en `/app/academy`. La biblioteca privada está en `/admin/library`. Consulta `docs/PHASE_2_REPORT.md` para estado y limitaciones.
