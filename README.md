# AI Waste Index public application

## Advanced energy

Advanced estimates energy for one declared text generation. Select a provider/model,
then paste the generated response (default) or select “I know the token count”.
Pasted text is counted automatically in a same-origin browser worker; it never leaves
the page. Manual counts accept integers 1–1,000,000 and include provider-specific usage
help. Duration is optional (>0–3600 seconds). These are operational limits, not a
validated accuracy domain. Text accepts at most 50,000 Unicode code points, without
truncation, whitespace trimming or normalization. Blank/invalid Unicode is rejected.

Local counting uses pinned `gpt-tokenizer@4.0.0` (`o200k_base`, MIT). Its encoding
matches the selected GPT-4o, GPT-4o-mini and GPT-5 models; for all other selections
it is explicitly a rough reference-tokenizer approximation, not their native count.
Neither path derived from text includes hidden reasoning/formatting tokens. Energy
may consequently be too low, and its interval does not quantify these omissions or
token-count error. Prefer provider usage when available. The UI snapshots declared
versus compatible-text versus approximate-text provenance alongside each result.

The worker loads only for valid text while the text path is active, after a 350 ms
debounce. It terminates on completion, error, 10-second deadline, draft/path/mode
change or unmount. Retry or manual entry is available if counting fails. Path changes
preserve drafts only in memory and clear results; reset clears both. The tokenizer
is bundled locally; no provider calls, API keys or runtime vocabulary downloads.
See [third-party notices](public/tokenizer-notices.txt), also served at `/tokenizer-notices.txt`, and
[the upstream tokenizer](https://github.com/niieani/gpt-tokenizer).
No provider/model is selected automatically.

The authenticated estimator supplies its available catalog through `GET /api/advanced/models`;
`POST /api/advanced/estimate` accepts only provider, model, outputTokens and optional
requestLatencySeconds. Results preserve a native point or low/high range in Wh, with
source/version, duration provenance and localized warnings. Token provenance is
browser-only metadata; the service does not receive or certify it. No score, CO2e, water or
sharing is included. EcoLogits energy covers modeled server and data-center overhead;
it is not the author's measured consumption, a confidence interval or full lifecycle energy.

Blame remains the default. Mode switches retain drafts/results only in memory and cancel
pending work; refresh, navigation and locale changes discard them. API responses use
no-store, bounded bodies, existing local-demo admission and no content/result logging.
An unavailable calculator offers retry; no frontend estimate or fallback exists. Full
method and privacy explanations are available before submitting. IT and EN are supported.
The calculator must be explicitly enabled by the local service operator. Production
remains fail-closed. The previous Advanced chat prototype has been replaced.

Public Next.js application for the AI Waste Index MVP. Blame estimates the consumption of one hypothetical AI generation of the visible text,
excluding discarded drafts and revisions. It does not judge waste, quality, usefulness or AI authorship.

## Status

The local Text, URL and Screenshot flows are implemented. Paste text, extract a public page, or read a
screenshot in the browser. Extracted text always requires explicit confirmation of its editable preview.
Analysis uses the authenticated estimator service and displays score, class, scenario ranges and methodology
disclosure in IT/EN. The score is based on estimated GPU energy; CO₂e and water describe a conventional
infrastructure share attributed to that energy. CPU, memory and other unquantified IT loads
and their impacts are excluded, not zero. Both environmental metrics and ranges carry an
accessible asterisk explanation. Water includes cooling and electricity-production consumption.
All real results, full text, badges and cards disclose experimental status and unverified physical
accuracy, regardless of version prefix; scenario bounds are not confidence intervals or total uncertainty. Quota infrastructure is deferred until deployment is selected; this
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
the estimator. Methodology versions beginning with `stub-` visibly identify demonstration values; `experimental-`
versions identify experimental estimates. A zero rounded score with positive energy is explained in
results and shares. Positive metrics use up to three significant digits and are not displayed as zero. Refresh,
language navigation, back/forward restoration and starting again discard the result.

URL extraction always produces an editable review step; editing its text revokes confirmation. Only the
confirmed text and `sourceType: "url"` reach analysis, never the original URL. Screenshot extraction uses
the same mandatory review flow with `sourceType: "screenshot"`. Each transient result offers local text, badge and share-card copy actions.

## Estimator client

`src/server/estimator/` contains the generic black-box HTTP client. Its modules carry the `server-only` marker,
send only confirmed text plus source/locale metadata, authenticate with `X-Estimator-Key`, and validate every
success or error response before returning public result fields. The client makes one request with no retry or
fallback, applies one total timeout, bounds streamed response bytes before buffering, propagates cancellation,
requires the contract's no-store headers and maps upstream failures to safe public codes.
A valid upstream 422 `ESTIMATE_OUT_OF_DOMAIN` is forwarded unchanged. The UI displays a localized
estimate-unavailable message, leaves input editable, and creates no result/share or automatic retry.
Transport size rejection (413) and temporary service unavailability (503) remain distinct.

Authenticated estimator requests reject all HTTP redirects, including same-origin redirects, with
`ESTIMATOR_UNAVAILABLE`. No redirected destination receives the request text or service credential.
Both API paths also set no-store headers at the Next.js configuration boundary, covering framework-generated
responses as well as the POST handlers. `e2e/api-headers.spec.ts` checks all seven supported HTTP methods
against a running application and can also run against a production build via `E2E_BASE_URL`.

These web APIs serve the product frontend only. POST is the application operation; GET, HEAD, PUT, PATCH and
DELETE return 405 with no body. OPTIONS returns 204 with no body and advertises OPTIONS and POST in Allow.
The bodyless framework responses use the same no-store headers and introduce no JSON error code. The HTTP
regression checks their status, empty body and allowed methods as well as cache headers.

Copy `.env.example` to a local ignored environment file and replace its deliberately invalid placeholder key.
Estimator settings are mandatory positive/valid values: `ESTIMATOR_BASE_URL`, `ESTIMATOR_API_KEY`,
`ESTIMATOR_TIMEOUT_MS`, `MAX_ESTIMATOR_RESPONSE_BYTES` and `MAX_ANALYSIS_TEXT_CHARS`. Never expose them through
`NEXT_PUBLIC_*`. No estimator call occurs during page rendering or build.

## Running the local demo

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

## URL extraction

`POST /api/extract-url` accepts only `{ "url": "https://…" }`. It independently checks local-demo admission
before DNS/network/parser work, returning an editable text preview with the mandatory confirmation warning.
It does not call the estimator. The route shares bounded JSON receipt and safe no-store error handling with
analysis; production/non-demo requests are rejected with `GUARD_UNAVAILABLE` until quota protection exists.

Server configuration additionally requires `MAX_URL_CHARS`, `MAX_URL_RESPONSE_BYTES`, `MAX_URL_DECODED_BYTES`,
`MAX_URL_RESPONSE_HEADER_BYTES`, `URL_CONNECT_TIMEOUT_MS`, `URL_FETCH_TIMEOUT_MS` and `URL_MAX_REDIRECTS`.
Positive finite integer values are mandatory; connection time must fit the total deadline and URL input must
fit the request byte limit. Missing/invalid extraction settings disable URL submission without disabling Text.

The Node.js transport resolves both address families using a cancellable per-request resolver, rejects mixed
public/private answers, and connects to a chosen verified numeric address. It verifies the actual peer before
sending HTTP bytes, preserves the original Host/TLS identity, and never re-resolves or pools the connection.
Every redirect repeats validation. Ordinary public unicast addresses are accepted; special-use, private,
loopback, link-local, mapped/transition, multicast and documentation addresses are rejected conservatively.
The special-use filters reference the [IANA IPv4](https://www.iana.org/assignments/iana-ipv4-special-registry/)
and [IANA IPv6](https://www.iana.org/assignments/iana-ipv6-special-registry/) registries (reviewed 2026-09-21).
No incoming cookies, credentials or arbitrary headers are forwarded.

Byte limits accumulate across redirects. Wire-body accounting happens before HTTP parsing, includes transfer
framing/trailers, and does not trust Content-Length. Headers (including informational responses) are separately
bounded. The transport requests identity encoding and rejects compressed/unknown encodings before decoding;
`MAX_URL_DECODED_BYTES` independently bounds the accepted identity body. Redirects and parsing share one total
deadline; DNS/TCP/TLS also have a connection deadline. Abort destroys sockets, cancels DNS and terminates the parser.

Only `text/html` and `text/plain` are supported, with UTF-8 (default), ASCII, ISO-8859-1 or Windows-1252 decoding.
HTML is parsed inertly with LinkeDOM and Mozilla Readability inside a worker: scripts and page resources never
execute/load, no browser automation or login is used, and only plain text is returned. The worker has bounded
memory/stack and an operational 50,000-element parser cap. Empty, invalid or excessive text fails safely without
truncation. Dynamic, login-only or unsupported pages may require pasting text manually; no extraction service
or paid inference fallback is used.

`npm run build:worker` bundles the server-only parser into ignored `.generated/`. The `predev`, `prebuild` and
`pretest` hooks run it automatically; Next's extraction-route file trace includes that artifact. If invoking
Next directly, build the worker first. `LOCAL_VERIFICATION_BUILD=1` selects `.next-check` to keep test/build
artifacts separate from an active local development server.

## Browser-local screenshot OCR

Selecting a static PNG or baseline/progressive JPEG starts browser-only OCR. The file input is immediately
cleared; the image is never placed in application state, uploaded, logged or persisted. MIME, byte size and
actual format must agree. A bounded header parser checks width, height and total pixels before full decoding;
animated PNG, SVG, GIF, WebP and unsupported JPEG variants are rejected. A decoded bitmap is checked and
closed before recognition. An unreadable image can be replaced or its text pasted directly.

`MAX_SCREENSHOT_BYTES`, `MAX_SCREENSHOT_PIXELS`, `MAX_SCREENSHOT_WIDTH`, `MAX_SCREENSHOT_HEIGHT` and
`OCR_TIMEOUT_MS` are mandatory positive integer server settings, projected to the UI as public operational
limits only. The example allows 10 MB, 16 megapixels, at most 16,000 pixels on either side and 30 seconds
including validation, decode, engine/data loading and recognition. Missing/invalid configuration disables
Screenshot only. The existing analysis text limit also applies; excessive OCR text is rejected, never truncated.

One dedicated worker owns the entire operation, including synchronous WASM work. Cancellation, replacement,
navigation, unmount, success, failure and the total deadline terminate it. No nested workers or object URLs
are created. Progress is accessible and localized; every successful extraction still requires editable review
and explicit confirmation, revoked on edits. There is no confidence gate. Only confirmed text and source/locale
metadata reach `/api/analyze`.

Tesseract.js 7.0.0 and pinned Italian/English trained data run locally with both languages enabled regardless
of UI locale. `scripts/build-ocr.mjs` builds the worker and copies the WASM wrapper and language assets from
installed npm dependencies into ignored `public/ocr/`; `predev`, `prebuild` and `pretest` run it automatically.
If invoking Next directly, run both `npm run build:worker` and `npm run build:ocr` first. Serve/copy `public/`
with a deployed build as required by Next. No runtime CDN, OCR service, service worker or IndexedDB cache is
used. Only static engine/language assets may use the browser HTTP cache; no content/result cache exists.

The worker uses the version-pinned upstream dispatcher and browser adapters directly so the application owns
a terminable Worker even during initialization. It supplies the same Buffer polyfill as the upstream browser
bundle and disables language persistence (`cacheMethod: "none"`, no storage adapter). Third-party diagnostics
are suppressed; only safe errors and plain extracted text leave the worker. Dependency upgrades must rerun
the real browser OCR, cancellation, deadline and no-upload/no-storage tests to verify this integration.

## Local sharing

The result offers localized **Copy result text**, **Copy badge text** and **Show share card** actions. Result
text includes all three environmental estimates with their estimated ranges; the compact badge and card show
brand, estimated-generation-consumption context, returned score/class, methodology version and an estimate disclaimer.
Every output from a `stub-*` methodology also includes the demonstration warning; `experimental-*`
outputs carry the experimental accuracy notice in copied text, badges, HTML cards and PNG cards. These helpers only format
returned fields; they never compute or infer a score, class or metric. Input content, source URLs and screenshot
bytes are not available to the sharing component.

`src/browser/sharing/model.ts` builds the common presentation model. `card.ts` renders an opaque PNG with the
browser canvas using local system fonts; there are no image/font fetches, server rendering endpoints, hosted
images, downloads or public result links. The HTML preview contains the same disclosures, wraps long versions
and remains suitable for a manual screenshot on narrow screens. The badge can be copied as equivalent text.

Clipboard writes occur only on explicit button clicks. The image action supplies a Promise of the locally
encoded PNG to ClipboardItem and invokes write during that click, following the
[Clipboard API](https://www.w3.org/TR/clipboard-apis/#clipboarditem) data model. Missing support or denied
permission exposes selectable text or keeps the screenshot-ready card visible; raw platform errors are never
shown or logged. Production application code never reads the clipboard or asks for read permission.

Rendering is bounded to 1080 × at most 4096 pixels and 8192 characters of card copy; excessive metadata refuses
PNG export instead of clipping its version/disclaimer. The full text/HTML fallback remains available. Canvas
encoding has a five-second deadline. Success, failure, timeout and result unmount clear the temporary canvas;
late encodes are discarded on cancellation and late clipboard completions cannot restore UI state. No object
URLs, data URLs, browser storage, telemetry, social publishing integration or additional API calls are used.
Clipboard content explicitly copied by the user remains under the user's control after leaving the page; the
application retains no recoverable result or card. Refresh, locale navigation or a new analysis clears the UI.

## Browser tests

Install Chromium with `npx playwright install chromium`. With the local app and estimator running, execute
`npm run test:e2e` (or set `E2E_BASE_URL` for another loopback port). Tests cover real text submissions in both locales, estimate display, error/cancellation states and result
loss on refresh/language/back-forward navigation. URL browser tests use a stable extraction fixture for
review/edit/confirmation, call the real local estimator after confirmation, and exercise live loopback rejection.
Screenshot browser tests generate synthetic PNG/JPEG images in memory, run the real OCR in both locales,
inspect requests (only confirmed text is POSTed), verify empty browser storage and exercise native worker
termination on cancellation/deadline plus invalid-format/pixel-bomb rejection before engine loading.
Sharing tests use Chromium's real clipboard for text, badge and PNG, inspect image dimensions, assert zero
sharing network requests/storage, and verify manual-copy/mobile-card fallback and lifecycle loss in IT/EN.
Only the isolated browser test context is granted clipboard read permission to inspect its own synthetic test
output; the application itself uses write-only actions.
The server integration suite uses real HTTP sockets mapped to isolated test servers to test fetching, redirects,
DNS pinning, bounds, actual worker parsing and cancellation without depending on internet availability. The
production route has no dependency-injection or address-bypass setting exposed to requests/configuration. They use synthetic content and do not record screenshots, video or traces. Unit/integration tests
use arbitrary structural contract fixtures, never estimator-derived expected values.

## Data and integration boundaries

The application has no account, result history or application database. Content and results are transient and must
not be written to browser storage, logs or server-side persistence. Estimator integration uses only the documented
black-box HTTP contract from server-only code and environment-provided credentials. No browser code imports the
client.

Verification (2026-10-04): 440 unit/integration tests and 54 Chromium end-to-end tests pass.
Typecheck/lint and the Webpack build pass. GPU/partial-allocation copy is covered in IT/EN result, text,
badge, card, Canvas and HTML fallback with arbitrary public fixtures. Exact versions,
one-generation scope, scenario ranges, zero-score notes and positive small values are preserved.
