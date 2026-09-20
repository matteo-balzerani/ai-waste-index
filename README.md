# AI Waste Index public application

Public Next.js application for the AI Waste Index MVP. The product evaluates estimated avoidable compute; it
does not judge content quality, usefulness, truth or value.

## Status

Milestone 2 is complete. Steps 1–5 established the tested Next.js/strict TypeScript foundation, IT/EN
internationalisation, strict public contract schemas, the server-only estimator client and the transient input
shell for Text, URL and Screenshot modes.

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

## Contract schemas

Shared Zod schemas under `src/contracts/` validate analysis input, public and estimator results, extraction preview
responses and code-only error envelopes. All wire objects are strict. Text limits are supplied explicitly by the
caller and use Unicode code points. Environmental metric schemas require finite non-negative values ordered as
`low <= value <= high`; malformed values are rejected without repair or fallback. The schemas contain only the
public black-box wire contract and no scoring or calibration behaviour.

## Input shell

The landing page provides keyboard-operable Text, URL and Screenshot tabs in both locales. Draft text and URLs
exist only in React component memory; selected files remain browser-local. Changing mode or navigating clears the
active draft, including back-forward cache restoration. The shell does not use cookies, browser storage, query
parameters or history state.

This milestone deliberately adds no submit flow. `/api/analyze`, protected URL extraction and browser OCR belong
to later milestones. The current screenshot control does not upload or process its file.

## Estimator client

`src/server/estimator/` contains the generic black-box HTTP client. Its modules carry the `server-only` marker,
send only confirmed text plus source/locale metadata, authenticate with `X-Estimator-Key`, and validate every
success or error response before returning public result fields. The client makes one request with no retry or
fallback, applies one total timeout, bounds streamed response bytes before buffering, propagates cancellation,
requires the contract's no-store headers and maps upstream failures to safe public codes.

Copy `.env.example` to a local ignored environment file and replace its deliberately invalid placeholder key.
All five settings are mandatory positive/valid values: `ESTIMATOR_BASE_URL`, `ESTIMATOR_API_KEY`,
`ESTIMATOR_TIMEOUT_MS`, `MAX_ESTIMATOR_RESPONSE_BYTES` and `MAX_ANALYSIS_TEXT_CHARS`. Never expose them through
`NEXT_PUBLIC_*`. Step 4 adds no public API route and performs no estimator call during page rendering or build.

## Data and integration boundaries

The application has no account, result history or application database. Content and results are transient and must
not be written to browser storage, logs or server-side persistence. Estimator integration uses only the documented
black-box HTTP contract from server-only code and environment-provided credentials. No browser code imports the
client.
