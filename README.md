# Invencibles Boss

Aplicación privada de capacitación y acompañamiento para la comunidad Invencibles Boss. No es una tienda ni un sistema oficial de Farmasi.

## Stack
Next.js App Router · TypeScript · Tailwind CSS · shadcn/ui · Supabase · Netlify · npm.

## Requisitos y ejecución
Se requiere Node.js 20.9 o posterior y npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Define en `.env.local` (no la subas a Git):

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública/publishable del proyecto.

Scripts: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`.

## Documentación
- [Plan maestro](docs/CODEX_PLAN.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Catálogo de bibliotecas](docs/UI_LIBRARIES.md)
- [Configuración para el equipo](docs/SETUP.md)
- [Instrucciones permanentes para agentes](AGENTS.md)

La infraestructura externa (GitHub, Supabase y Netlify) se marca como pendiente hasta verificar su creación y conexión.
