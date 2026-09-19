# AI Waste Index public application

Public Next.js application for the AI Waste Index MVP. The product evaluates estimated avoidable compute; it
does not judge content quality, usefulness, truth or value.

## Status

Milestone 2 is in progress. Steps 1–2 established the tested Next.js/strict TypeScript foundation and the IT/EN
internationalisation architecture. Public contract schemas, the server-only estimator client and the interactive
input shell remain assigned to the following Milestone 2 steps.

The repository must not contain scoring logic, estimator fallbacks, proprietary methodology, secrets, user-content
persistence, analytics or admin functionality. The browser will never call the estimator service directly.

## Requirements

- Node.js 22.12 or newer within the Node.js 22 release line;
- npm with the committed lockfile.

Install dependencies with:

```bash
npm ci
```

`.nvmrc` selects Node.js 22 for compatible version managers.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run strict TypeScript checking without emitting files |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run build` | Create the production Next.js build |
| `npm start` | Serve an existing production build |

Vitest uses jsdom and React Testing Library. Tests fail when no matching test files are present. Build output,
coverage, local environment files and local Codex instructions remain untracked.

## Internationalisation

User-facing content and metadata come from validated dictionaries under `src/i18n/`. Supported routes are `/it`
and `/en`. Requests without a locale prefix use `Accept-Language` and fall back to English; the selection is not
stored in a cookie or browser storage. Both routes are statically generated and render a matching HTML `lang`
attribute. Stable API warning/error codes already have entries in both dictionaries, ready for the later public
schema and route steps.

## Data and integration boundaries

The application has no account, result history or application database. Content and results are transient and must
not be written to browser storage, logs or server-side persistence. Future estimator integration will use only the
documented black-box HTTP contract from server-only code and environment-provided credentials.
