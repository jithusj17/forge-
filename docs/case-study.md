# Case study: rebuilding an AI app builder from its public UI

## Goal

Build a credible, deployable "prompt → working app" product in the style of v0, as a portfolio piece. The aim was to show product sense, front-end craft and full-stack engineering, not just a chat box wired to an LLM.

## 1. Research: studying the reference product

I started by reverse-engineering v0's publicly reachable interface with [REA](https://github.com/morluto/rea), driving headless Chrome through scripted scenarios and recording evidence for each observation. Every finding was labelled as **observed** (screenshot, DOM, accessibility tree), **static** (read from shipped CSS) or **inferred**.

What I learned shaped the build:

- **Design system.** A monochrome Geist palette with a 10-step gray scale, an alpha ramp for borders and hovers, and an accent scale used only for status. Headings use tight negative tracking (about −4% of font size). Dark mode separates surfaces with 1px borders rather than shadows.
- **Composer.** A rich-text editor (not a `<textarea>`) with a model picker, a send button disabled while empty, and a drag-to-attach overlay.
- **Workspace.** A resizable split with a 320px chat column, a header with an icon-only Preview/Code toggle and a browser-style address bar, and Chat/Preview tabs below 1280px.
- **Agent transparency.** Each assistant turn is a collapsible "Worked for Xs" section: thought, explored files, a versioned file card, cost, then a summary.
- **Isolation.** Previews run on a separate origin in a sandboxed iframe, with an in-browser runtime driven by a service worker.
- **Access model.** Private chats are auth-gated; shared chats render read-only with "Duplicate".

The full research report lives outside this repository. Forge uses its own name, logo, copy and illustrations.

## 2. Architecture decisions

| Decision | Why |
|---|---|
| **NDJSON event stream** (`user`, `assistant`, `step`, `step-update`, `text`, `version`, `done`, `error`) | One protocol for both engines. The client applies events to local state; the server applies the same reducer (`applyToMessage`) to persist the final message. |
| **Two engines behind one interface** | The Claude engine for real output and a demo engine for a zero-cost public demo. Reviewers can try the product without an API key. |
| **Manual streaming tool loop** instead of a framework | Full control over stop reasons, path validation, partial-input streaming (file names show up while being written) and cost accounting. |
| **Key precedence: visitor key → capped server key → demo** | Keeps a public deployment safe from runaway spend while still allowing real generations. |
| **libSQL + Drizzle** | SQLite file locally (zero setup), Turso in production, typed queries and SQL migrations. |
| **Better Auth with an anonymous plugin** | One-click guest accounts lower the barrier for reviewers. Linking moves a guest's chats to their GitHub account. |
| **Sandpack for React previews** | A real bundler on a separate origin, with no infrastructure to run. |
| **Server-side authorization in the data layer** | Every read and write goes through `getChatForViewer` / `getOwnedChat`, so visibility rules can't be bypassed by the UI. |

## 3. Problems worth mentioning

- **Prerendering vs. rich-text editors.** With Next.js 16 Cache Components, Tiptap's use of `Math.random()` during render broke the static prerender of the landing page. Fix: mount the editor only after hydration and render a static placeholder in the shell, which keeps the page fully static.
- **A prefill animation that erased the prompt.** Replaying a CSS highlight by changing a React `key` remounted the editor and threw away the text that had just been set. Moving the key to a sibling overlay fixed it, and an end-to-end test now covers it.
- **Two layouts, one mounted.** Hiding the mobile or desktop layout with CSS still mounted both: two editors and two live preview iframes. A `useSyncExternalStore` media-query hook now renders exactly one, and a layout test asserts it.
- **Framework-preserved routes in tests.** Cache Components keeps recently visited routes mounted but hidden (React `<Activity>`), so text and iframe queries matched hidden copies. The tests target visible nodes only; role queries already ignore hidden content.
- **Auth rate limits in CI.** Better Auth's stricter sign-in limits tripped the end-to-end suite, which creates many guests from one IP. Rate limiting stays on by default and is disabled only in the e2e environment through an explicit flag.
- **Testing an LLM loop without spending money.** The Claude engine is tested against a local HTTP server that speaks the real SSE wire format. It covers thinking blocks, streamed tool input, a path-traversal attempt that must be rejected, the follow-up turn and cost calculation.

## 4. Quality

- **Unit tests (Vitest):** the stream parser (chunk and UTF-8 boundaries), the event reducer, path normalization, template selection and HTML escaping, the export format, and the Claude tool loop against the fake API.
- **End-to-end tests (Playwright):** landing and prefill, the sign-in gate, guest build → preview → code → follow-up → restore → reload persistence, private vs. unlisted visibility, read-only view and duplicate, and responsive layout at two widths.
- **CI:** lint, typecheck, unit, build and e2e on every push.

## 5. What I'd do next

- An editable code view with diffs, and per-file history
- Publishing a version to a real deployment (Vercel API)
- Image attachments sent to Claude as vision input
- Prompt caching across turns of a conversation, with usage analytics
- An eval set for generation quality, using the demo templates as golden references
