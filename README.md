# Forge (web)

A v0-style "describe it → get an app" builder. Research: [`../docs/reverse-engineering/v0-analysis.md`](../docs/reverse-engineering/v0-analysis.md). Plan: [`../docs/implementation-plan.md`](../docs/implementation-plan.md).

**Phase 1 (current):** complete UI with a **mock** generation engine. No API keys needed. Chats are stored in your browser's `localStorage`.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Layout

| Path | What |
|---|---|
| `src/app/globals.css` | Design tokens (light/dark scales, alpha ramp, type scale, shadows, motion) |
| `src/app/page.tsx` | Landing: hero + composer + suggestion chips, templates, features |
| `src/app/chat/[id]/page.tsx` | Workspace route |
| `src/components/composer/` | Tiptap prompt composer, model picker |
| `src/components/workspace/` | Header, chat panel, assistant turns (steps, version cards), preview + code panels |
| `src/components/ui/` | Button, segmented tabs, menu |
| `src/lib/store.ts` | Client chat store (localStorage) |
| `src/lib/mock-engine.ts` | Streams fake steps → files → summary, in the same shape the real engine will use |
| `src/lib/mock-templates.ts` | Canned projects (contact form, tasks, loan calculator, landing page) |
| `src/lib/brand.ts` | Product name (placeholder "Forge") |

## Notes

- Previews render in an iframe with `srcDoc` + `sandbox` **without** `allow-same-origin`, so generated code gets an opaque origin and can't touch the app. Phase 2 moves previews to a separate domain.
- Next.js 16 with Cache Components is enabled. Read `node_modules/next/dist/docs/` before changing routing or data fetching (see `AGENTS.md`).
