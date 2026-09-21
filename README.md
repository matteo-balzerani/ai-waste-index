# AI Waste Index public application

Public Next.js application for the AI Waste Index MVP. The product evaluates estimated avoidable compute; it
does not judge content quality, usefulness, truth or value.

## Status

The local Text flow is implemented: paste text, analyse it through the authenticated estimator service, and
view score, class, estimated ranges and methodology disclosure in IT/EN. URL and Screenshot remain input
shells until their extraction steps. Quota infrastructure is deferred until deployment is selected; this
version is for loopback-only local demonstration, not production.

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
stored in a cookie or browser storage. Both routes render a matching HTML `lang` attribute and read the configured text limit on the server at
request time. Only that non-secret limit is passed to the input UI. Stable API warning/error codes already have entries in both dictionaries, ready for the later public
schema and route steps.

## Contract schemas

Shared Zod schemas under `src/contracts/` validate analysis input, public and estimator results, extraction preview
responses and code-only error envelopes. All wire objects are strict. Text limits are supplied explicitly by the
caller and use Unicode code points. Environmental metric schemas require finite non-negative values ordered as
`low <= value <= high`; malformed values are rejected without repair or fallback. The schemas contain only the
public black-box wire contract and no scoring or calibration behaviour.

## Text analysis and input modes

The landing page provides keyboard-operable Text, URL and Screenshot tabs in both locales. Draft text and URLs
exist only in React component memory; selected files remain browser-local. Changing mode or navigating clears the
active draft, including back-forward cache restoration. The application does not use cookies, browser storage, query parameters or history state for content/results.
The Next.js development debug channel is disabled because it otherwise persists document diagnostics in IndexedDB;
browser console forwarding to the development terminal is also disabled.

Direct text submits to `/api/analyze` without intermediate confirmation. The route bounds raw body bytes and
receipt time, validates Unicode/schema, calls the estimator once, and returns only validated public fields or
safe error codes with no-store headers. The UI prevents duplicate submissions, cancels abandoned requests,
and ignores stale completions. Result values and bounds are formatted with `Intl`; class comes directly from
the estimator. Methodology versions beginning with `stub-` visibly identify demonstration values. Refresh,
language navigation, back/forward restoration and starting again discard the result.

URL extraction and browser OCR belong to later steps. The screenshot control does not upload or process files.
Sharing actions are also deferred to a later milestone.

## Estimator client

`src/server/estimator/` contains the generic black-box HTTP client. Its modules carry the `server-only` marker,
send only confirmed text plus source/locale metadata, authenticate with `X-Estimator-Key`, and validate every
success or error response before returning public result fields. The client makes one request with no retry or
fallback, applies one total timeout, bounds streamed response bytes before buffering, propagates cancellation,
requires the contract's no-store headers and maps upstream failures to safe public codes.

Copy `.env.example` to a local ignored environment file and replace its deliberately invalid placeholder key.
Estimator settings are mandatory positive/valid values: `ESTIMATOR_BASE_URL`, `ESTIMATOR_API_KEY`,
`ESTIMATOR_TIMEOUT_MS`, `MAX_ESTIMATOR_RESPONSE_BYTES` and `MAX_ANALYSIS_TEXT_CHARS`. Never expose them through
`NEXT_PUBLIC_*`. No estimator call occurs during page rendering or build.

## Running the local text demo

Start an independently configured local estimator service on `127.0.0.1:8787`, with a matching credential and
`MAX_ANALYSIS_TEXT_CHARS=50000`. Its raw JSON limit must accommodate escaped text plus the request envelope;
`MAX_REQUEST_BODY_BYTES=1000000` accommodates the example settings on both services.

In this application, copy `.env.example` to `.env.local`, replace the placeholder estimator credential with
that same local credential, then run `npm run dev`. Open `http://127.0.0.1:3000/it` or `/en`.

The additional mandatory settings are `MAX_REQUEST_BODY_BYTES`, `REQUEST_BODY_TIMEOUT_MS` and the explicit
`APP_ENV=local-demo` opt-in. The dev command binds to `127.0.0.1`. Only development/test runtime can admit
local-demo work; the estimator destination must be numeric loopback (`127.0.0.1` or `::1`). Do not publish or
tunnel this demo. No rate limiter is implemented yet. Production, missing/unknown modes, or a nonlocal demo
estimator return 503 `GUARD_UNAVAILABLE` before estimator work; production builds do not enable this exception.
Missing/invalid request configuration yields a safe technical error and disables UI submission.

## Browser tests

Install Chromium with `npx playwright install chromium`. With the local app and estimator running, execute
`npm run test:e2e` (or set `E2E_BASE_URL` for another loopback port). Tests cover real text submissions in both
locales, estimate display, error/cancellation states, and loss of results on refresh/language/back-forward
navigation. They use synthetic content and do not record screenshots, video or traces. Unit/integration tests
use arbitrary structural contract fixtures, never estimator-derived expected values.

## Data and integration boundaries

The application has no account, result history or application database. Content and results are transient and must
not be written to browser storage, logs or server-side persistence. Estimator integration uses only the documented
black-box HTTP contract from server-only code and environment-provided credentials. No browser code imports the
client.
