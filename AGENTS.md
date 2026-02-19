# AGENTS.md

## Build & Development Commands

| Command | Purpose |
|---------|---------|
| `bun install` | Install dependencies (auto-runs build via postinstall) |
| `bun run dev` | Start dev server (vite watch + devvit playtest) |
| `bun run build` | Production build to dist/ |
| `bun run type-check` | TypeScript composite build check (all 3 projects) |
| `bun run check` | Svelte-specific type checking (client only) |
| `bun run deploy` | Build and upload to Devvit |
| `bun run launch` | Full release pipeline (build + deploy + publish) |

**Before committing:** `bun run type-check`

---

## Testing & Linting

**Testing:** No test runner configured. `pnpm test` is broken (circular reference). Do not add tests without explicit instruction.

**Linting:** No linter (eslint/biome) or formatter (prettier/biome) configured. Do not add without explicit instruction.

---

## Architecture

Devvit app inside Reddit posts as a sandboxed webview.

```
src/
├── client/    # Svelte 5 + Tailwind CSS 4
├── server/    # Hono.js routes (serverless)
└── shared/    # Shared TypeScript
```

Data flow: `User → Svelte → fetch('/api/...') → Hono → Redis/Reddit API → UI`

**Key packages:** Svelte 5.x, Tailwind CSS 4.x, Hono, TypeScript 5.x, Vite 8.x-beta, @devvit/web 0.12.x, Bun (runtime & package manager)

---

## Hard Constraints

| # | Rule | Why |
|---|------|-----|
| 1 | Svelte 5 runes ONLY (`$state`, `$derived`, `$effect`) | Svelte 4 won't compile |
| 2 | Tailwind CSS ONLY -- no `<style>` blocks | Consistency |
| 3 | Server routes: `/api/*` (public) or `/internal/*` (triggers) | Devvit routing |
| 4 | No `localStorage`/`sessionStorage` in client | Sandboxed webview |
| 5 | No direct external `fetch()` from client | Must proxy through server |
| 6 | Named exports only (no `export default`) | Tree-shaking |
| 7 | No scrolling in inline views | Broken UX on Reddit |
| 8 | No long-running processes / `setInterval` | 30s max timeout |
| 9 | Redis: 500MB, 1000 cmd/sec, 4MB payload | Platform limits |

---

## Code Style

### TypeScript

- **`strict: true`** with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`
- Index access returns `T | undefined` -- always handle it
- Use `const` by default, `let` only if reassigned, never `var`
- Prefer `unknown` over `any`, narrow with `instanceof`
- Use `as const` for literal arrays/objects
- Explicit return types on exported functions
- Arrow functions: `const foo = (): void => {}`
- Keep functions ≤30 lines

### Naming

| Type | Convention | Example |
|------|-----------|---------|
| Variables/functions | camelCase | `getUserScore` |
| Constants | SCREAMING_SNAKE | `MAX_ATTEMPTS` |
| Types/interfaces | PascalCase | `GameState` |
| Svelte components | PascalCase | `GameBoard.svelte` |
| Non-component files | kebab-case | `game-logic.ts` |
| API routes | kebab-case | `/api/game-state` |
| Redis keys | colon-delimited | `user:{userId}:stats` |

### Imports

```typescript
import { Hono } from 'hono'
import type { Context } from 'hono'
import { context, redis, reddit } from '@devvit/web/server'
import { createPost } from './post'
import './app.css'
import App from './App.svelte'  // Exception: .svelte files
```

### Error Handling

```typescript
try {
  const result = await doThing()
  return c.json({ status: 'success', data: result })
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return c.json({ status: 'error', message }, 500)
}

const { subredditName } = context
if (!subredditName) throw new Error('subredditName is required')
```

**Response shapes:** Success: `{ status: 'success', data: {...} }`, Error: `{ status: 'error', message: '...' }`

---

## Server Patterns

Routes in `src/server/index.ts` using Hono. Triggers map to `/internal/*`.

```typescript
import { Hono } from 'hono'
import { context, redis, reddit, createServer, getServerPort } from '@devvit/web/server'

const app = new Hono()
app.get('/api/game/:id', async (c) => { ... })
app.post('/internal/menu/post-create', async (c) => { ... })

const port = getServerPort()
createServer(app.fetch, { port })
```

**Redis keys:** `{entity}:{id}:{field}` (e.g., `user:t2_abc:stats`)

**Context:** `context.userId`, `context.postId`, `context.subredditId`, `context.subredditName`

---

## Svelte / Client Patterns

- Use Svelte 5 runes: `$state()`, `$derived()`, `$effect()`
- Mount with `mount()` from `'svelte'`
- Tailwind only, mobile-first (`text-sm md:text-base`)
- No scrolling: `h-full`, `overflow-hidden`, `flex`; never `overflow-y-auto`
- Test at minimum 320x320px viewport

---

## Git Conventions

**Branches:** `feat/short-description`, `fix/short-description`, `chore/...`

**Commits:** `type(scope): imperative description` (max 72 chars)
```
feat(game): add difficulty selector
fix(timer): stop when puzzle completed
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

---

## Where to Put New Code

- Svelte reusable → `src/client/components/`
- Svelte page-level → `src/client/views/`
- Client utility → `src/client/lib/`
- API endpoint → `src/server/routes/` or `src/server/index.ts`
- Shared types → `src/shared/`
- Server utility → `src/server/lib/`

---

## Supplemental Docs

Detailed guides in `agent_docs/`: `database.md`, `reddit.md`, `code-patterns.md`, `style-guide.md`, `workflow.md`, `troubleshooting.md`
