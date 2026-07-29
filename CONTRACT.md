# The demo-backend contract (v3)

This is the canonical contract that every allme SDK example implements.
It is what makes the examples strictly comparable — an example test suite in
the literal sense. The shared JSX frontend in this repo speaks only these
endpoints and shapes; a thin per-SDK backend implements them.

## Scenario families & ids

**One backend serves ALL families (#494).** A single server process, started once,
lists every family's scenarios in `/api/meta` and serves them on one port; the
portal renders one **section per family**. (Before #494 each family was a separate
sub-project, each pinning a different frontend release and each having to be
started on its own — only one could run at a time.) The frontend groups by family
using the scenario id, so a backend that lists only one family still renders
correctly — the section headings simply collapse to none.

Each family owns a namespace of scenario ids so they stay globally unique:

- **identity** (#478) — the eight sign-in / OIDC / 2FA scenarios; ids `1`–`8`
  (the original integer ids, kept stable).
- **flow** (#484) — the contract-flow scenario; id `flow:run`.
- **company-data** (#483) — the five regular company-data scenarios; ids
  `companydata:read` · `companydata:definitions` · `companydata:changes` ·
  `companydata:webhook` · `companydata:documents`.

There is now **one contract version (3) and one frontend release** for all three
families — the earlier per-family versions/pins (v1/v2/v3 with three separate
`frontend.lock` files per SDK) are retired: each SDK has ONE `frontend.lock`.

The frontend keys its scenario definitions on these ids and renders whatever the
connected backend's `/api/meta` lists. `GET /api/meta`,
`POST /api/scenarios/{id}/config|start|clear`, `GET /api/runs/{runId}` and
`POST /api/clear` are shared by every family; `GET /callback` and
`POST /api/scenarios/{id}/enroll` are **identity-family only** (the OAuth leg).

One port serves bundle + API — default `8091`, overridable via the `PORT` env
var; a busy port refuses at startup with a clear message. The SAME default
across all SDK examples is deliberate (one browser origin → the localStorage
setup carries across SDKs), with the documented consequence that two SDKs'
examples don't run side by side. Since #494 that is no longer a limitation
*within* an SDK: its one server already carries all three families.

## Endpoints

### `GET /api/meta`

`{sdk, sdkVersion, contractVersion, scenarios: [{id, kind}]}` with
`kind: "runnable" | "guide"`. The frontend renders only listed scenarios.
**Scenario 7 is the one `guide` card**: it has NO `/start` (calling it is
undefined); its card renders its own scenario-specific checklist plus links
that navigate to scenarios 1 and 5, where the 2FA prompt is observed. Every
other scenario states its setup once, from the derived "what to set in the
allus portal" section (`portalSetup`) — no separate hand-written checklist.
All other scenarios are `runnable`.

### `POST /api/scenarios/{id}/config`

Body: that scenario's setup values (schemas per spec §4). The backend writes them
to a local JSON **config file** in the SDK's canonical config shape at
`.runtime/config/{id}.json` — the *idw* role for the OAuth scenarios (`api_url`,
`oauth_client_id`, `oauth_redirect_uri`, optional `oauth_client_secret`,
`oauth_private_key` path + `oauth_key_passphrase`; sdk.html §12c), plus the
*service* keys (`client_id`/`client_secret`/`service_private_key`
path/`key_passphrase`; sdk.html §2) for scenarios 4/8 that also read live values
via the data `Client`. Any browser-sent PEM is written to `.runtime/config/keys/`
(0600) and referenced by path in that JSON. Demo-only run parameters that are not
SDK config fields (the authorize base, one-time claims, share code, context) go
to a sibling `.runtime/config/{id}.meta.json`. Returns `{ok:true, configPath}`
(the relative path, for display/inspection). Idempotent (re-save overwrites).
`oauth_redirect_uri` is derived from THIS request's `Host` header and from
nothing else; a request carrying no `Host` is refused with
`400 {error:"no_origin — …"}` and nothing is written (#574).
This is the "settings received from the frontend → written to a local config
file" step; `/start` then runs off it.

### `POST /api/scenarios/{id}/start`

Empty (or ignored) body — **the run is constructed from the persisted
`.runtime/config/{id}.json` via the role-appropriate file constructor
(`OAuthClient::fromConfig` → `Config::fromIdwFile`, and `Client::fromConfig` →
`Config::fromFile` for the service reads), not from the request body**. A `/start`
with no saved config → `409 {error:"not_configured"}`. Response envelope:
`{runId, action}`, `action` one of:

- `{"type":"redirect","url":…}`
- `{"type":"detached","url":…}` (frontend renders link + QR)
- `{"type":"challenge","matchingDigits":string|null}`
- `{"type":"none"}`

**The OAuth `state` parameter IS the `runId`** — that is how the callback finds
its run.

### `GET /callback` *(identity family only)*

The registered redirect URI — `http://{host}/callback`, where `{host}` is the
origin the browser actually reached the backend on (`localhost:8091`,
`127.0.0.1:8091`, `<lan-ip>:8091`, …). The backend derives it from the request's
own `Host` header and never substitutes a default (#574). Handles BOTH
delivery shapes: `?code=…&state=…` (complete via the SDK — `completeSignIn` — or
via the OIDC library for scenario 5) and `?enrolled=true&state=…` (the
redirect-leg enrollment outcome, #436 — nothing to exchange; the outcome is
recorded). Writes the outcome to the run stash, then 302 →
`/?scenario={id}&run={runId}` so the frontend resumes the right card.

### `GET /api/runs/{runId}`

`{status: "pending"|"done"|"failed", result?, error?, calls: [strings]}` — ONE
poll endpoint for scenario runs AND enroll runs. `calls` is the run's TRACE and
feeds the "what just happened" panel, so it must be a record of what the run
actually did (#578): every entry is `<SDK method> — <what that call did in THIS
scenario>`, appended AT the call site, in the order the calls were made, and the
list covers the scenario end to end (client construction included — `fromConfig`
is a real SDK call and the first thing a reader writes). The method reference is
written in the backend's own language idiom; **the annotation after the em dash is
byte-identical across the backends**, so one scenario teaches one thing whichever
example a reader starts. The same method called in a different mode is a different
entry (`authorizeUrl` under `signin` / `one_time` / `connect`), and an entry wrapped
in parentheses is deliberately not an SDK call (`(webhook run started)`,
`(callback ?enrolled=true)`; `(oidc)` marks the third-party OIDC library).

**Record at ATTEMPT time — append immediately BEFORE the call, never after it
returns.** A run that ends `failed` is still a run the panel reports, and the call
the reader needs to see is the one that THREW: a bad client secret, a 429, a
decrypt failure. An append placed after the call is skipped by that very exception,
so the panel would say only that the client was constructed — the same
under-reporting this contract exists to prevent, one path further in. A **bulk**
call records one entry per ATTEMPT (`createDocument` is six entries naming the six
document types, not one entry claiming six), so a run that dies on the third
document shows exactly three.

Appends are **deduplicated on first occurrence**, because several handlers can run
twice for one run: `/callback` carries no already-completed guard, so re-opening or
refreshing the callback URL inside the run's 30-minute TTL re-runs the completion,
and the flow / company-data poll loops legitimately re-attempt the same call on
every poll. The frontend renders the list verbatim, in order. **Progress is poll-driven and
blocking SDK waits are short-cycled**: a poll that finds a run awaiting a
detached/challenge outcome performs ONE short-timeout SDK call
(`pollResult`/`waitForResult` with `timeout=2`), treats the SDK timeout as
still-pending, and on a 200 writes the outcome to the run file (write-temp +
atomic rename). No handler ever blocks for the SDK's 600s defaults. **Reads are
idempotent** (no burn-on-read): once written, the
outcome is returned on every poll until the run's 30-min TTL or a Clear removes
it. An unknown/expired `runId` → `404 {error:"not_found"}`.

### `POST /api/scenarios/{id}/enroll` *(identity family only)*

Scenario 8's enrollment step, also built off the saved config file (`409
not_configured` if none). Request body selects the delivery leg (NOT a
credential — credentials come from the config file):
`{"responseMode": "redirect" | "detached"}`, **default `redirect`** when the key
is absent or any other value. `redirect` → `{"type":"redirect","url":…}` (the
`2fa_enroll` consent redirect that lands on `/callback?enrolled=true`);
`detached` → `{"type":"detached","url":…}` (link + QR, completed via the SDK's
`pollResult` `{enrolled:true}` delivery). Same `{runId, action}` envelope as
`/start`; completion observable via `GET /api/runs/{runId}`. Every SDK backend
MUST honour both values so the shared frontend's two enroll buttons work
identically across ports.

### `POST /api/scenarios/{id}/clear` · `POST /api/clear`

The backend half of Clear (the frontend clears its own localStorage). Both take
an empty body, return `{ok: true}`, idempotent. Per-scenario clear deletes that
scenario's run files AND its `.runtime/config/{id}.json` (+ its `.meta.json`),
then garbage-collects any key PEM no surviving config still references (keys are
content-addressed and may be shared, so one is removed only once nothing points
at it). Global clear wipes all run files and the entire `.runtime/config/` tree
(configs, metas, keys). Single-worker server (below) → no concurrent mutation to
guard; a plain unlink suffices.

## The failure envelope — `error` carries the REASON (#583)

Any non-2xx a backend answers with, other than the two token-only refusals below,
carries:

```json
{"error": "<token> — <reason>", "message": "<reason>"}
```

`<token>` is the machine token (`server_error`, `start_failed`, `identity_error`,
`connection_error`, `trigger_error`, `no_origin`) and `<reason>` is the sentence
that says what actually went wrong. **Both, in `error`, in that order** — because
this repo's client (`src/lib/api.js`) raises `body.error` VERBATIM and reads no
other key, so anything a backend puts only in `message` never reaches the
developer. A bare token would arrive as one uninformative word, and a response
with no body at all falls back to `start failed ({id})`, which reads like an error
code and names nothing: that is exactly how #583 was reported. `message` keeps the
bare reason for a programmatic reader.

Two refusals stay **token-only**, because the client dispatches on their STATUS
before it looks at the body:

| Refusal | Why it keeps a bare token |
|---|---|
| `409 {"error":"not_configured"}` | `startScenario`/`enrollScenario` map the 409 to the Save prompt without reading the body |
| `404 {"error":"not_found"}` | `getRun` maps the 404 to `null`; unknown ids are not a reportable reason |

**Every backend guards its OUTERMOST boundary**, so an unexpected throw becomes
this envelope rather than whatever the framework would emit — never a `try` per
handler (standards §1); the rendering itself is ONE helper per backend, so no
path can answer in a different shape.

Two properties make "outermost" literal rather than approximate:

- **Request PREPROCESSING is inside the guard**, not above it. Runtime setup and
  target parsing can fail before handler dispatch —
  `POST /api/scenarios/5/start%` reaches Node verbatim and `decodeURIComponent`
  raises `URIError: URI malformed` — so the
  guard opens before the first of them and, in Go, the deferred `recover` is
  registered before any request work in `ServeHTTP`.
- **Where the host framework answers with NOTHING, the launcher carries a
  last-resort net through the same helper.** Node's `createServer` callback and
  Python's `BaseHTTPRequestHandler` both sit outside the router: an escaping
  error there closes the connection with no response at all (measured in Python:
  `RemoteDisconnected: Remote end closed connection without response`), which the
  suite renders as its `start failed ({id})` fallback. Those nets call
  `sendFailure` / `failure_response`, so a process still has exactly one
  envelope. Java, Go and C# need no second net — their outermost guard already
  is the framework's entry point.

PHP additionally registers a shutdown handler — as its first act, before any
other statement can fail — because a PHP **fatal** error is not a `\Throwable`
and unwinds straight past `catch (\Throwable)` (#583: a class-compatibility
failure raised while autoloading a JOSE algorithm produced a bare 500 with an
empty `text/html` body).

A failure raised **after the first byte is on the wire** (a static file is
streamed) cannot be replaced with the JSON envelope and must never be re-written
over. TypeScript's shared helper reports that case on stderr because routing the
launcher through it made the case newly reachable there. PHP, Java, and Go keep
their existing framework handling; this local-demo contract does not require
cross-framework recovery after output has begun.

## Backend state — single-worker, idempotent (no burn-on-read, no locks)

PHP's built-in server runs as ONE worker (do NOT set `PHP_CLI_SERVER_WORKERS`),
so requests serialize and there is no cross-request concurrency to guard — no
`flock`, no tombstones, no burn-on-read (three review rounds of that machinery
were removed as disproportionate for a local single-developer demo).
Cross-request state lives in `.runtime/` (git-ignored, wiped at startup):

- `config/{id}.json` — the canonical SDK config file a scenario runs OFF, written
  by `POST /api/scenarios/{id}/config` from the browser settings, with any PEM
  written to `config/keys/<sha1>.pem` (0600) and referenced by path;
  `config/{id}.meta.json` carries the demo-only run parameters (authorize base,
  claims, share code, context). `/start` and `/enroll` build the SDK from the
  config file via the role-appropriate file constructor
  (`OAuthClient::fromConfig`/`Config::fromIdwFile` for OAuth,
  `Client::fromConfig`/`Config::fromFile` for the service reads) and run off it.
  The config file is **not** TTL-swept — it is configuration, not a run, cleared
  only by Clear or the startup wipe.
- `runs/{runId}.json` — PKCE verifier/state/nonce → outcome, written via
  write-temp + atomic rename (crash hygiene only — a reader never sees a partial
  file). Removed by its **30-minute TTL** (lazy: any request sweeps expired files,
  also collecting orphaned `*.tmp`), by Clear, or by the startup wipe.

The short-cycled 2s SDK wait bounds how long a single worker is busy per poll
(~2s), so serialized requests stay responsive; the earlier worry about a 600s
blocking wait wedging one worker is moot. **Data-at-rest note:** the config file
holds the credentials + private-key path the developer entered in the browser,
and a completed run's decrypted values (scenario 3's claims) rest in its run file
until TTL/Clear — all acceptable on the developer's own machine (it already holds
the private key). **The config file is written BY the backend from browser inputs
— the user still never hand-creates or hand-edits it** (the "no config files
while testing" rule is reversed for the examples precisely because seeing the real
SDK config makes the demo clearer, sdk.html §2). No sessions, no database.

## Flow family (#484)

The flow family adds ONE scenario, `flow:run` (`kind: "runnable"`), demonstrating
a contract flow driven through the PHP SDK's flow surface. It reuses the shared
endpoints above; the family-specific points:

- **`POST /api/scenarios/flow:run/config`** — setup values (spec §5): the service
  data client (`client_id`/`client_secret`), the service PEM (`service_private_key`
  path + `key_passphrase`), and `api_url`, written to the canonical config file the
  run executes off (built via `Client::fromConfig` → `Config::fromFile`). The
  demo-only run parameters — `flow_name` + `flow_version` (the flow's published
  version), the person's `share_code`, and the `fixture` choice
  (`"info" | "contract"`) — go to the sibling `config/{id}.meta.json`, NOT the SDK
  config. Neither the flow id nor the connection id is ever collected: both are
  internal identifiers, so `/start` resolves them.
- **`POST /api/scenarios/flow:run/start`** — resolves `flow_name` + `flow_version`
  to a `flow_id` via `Client::requestFields()` (matched on the additive
  `flow_name`/`flow_version` tags flow-answerable rows carry) and `share_code` to a
  connection via `Client::connections()` (matched on `Connection::$shareCode`).
  The flow pair is not guaranteed unique — nothing constrains a service to distinct
  flow names, and `requestFields()` can therefore surface more than one distinct
  `flow_id` for the same name+version — so flow resolution fails clearly rather
  than picking a candidate: `start_failed` on zero OR more than one matching flow
  (the two cases carry different messages so a developer can tell "not found" from
  "ambiguous, go rename one"). Share codes identify people uniquely, so connection
  resolution returns its single possible match or `connection_error` when none exists.
  Then builds the flow bindings (`company →`
  `Client::identity()['company_user_id']`; `customer →` `Connection::$personId` for
  the resolved connection), calls `triggerFlowRun(flowId, connectionId,
  bindings)`, stores the returned platform `flowRunId` INSIDE the demo run file
  (never a separate browser input), and returns `{runId, action:{"type":"none"}}`.
  `409 not_configured` with no saved config, as elsewhere.
- **`GET /api/runs/{runId}`** — the run envelope keeps the shared
  `"pending"|"done"|"failed"` status (`"done"` once the flow completes, `"failed"`
  on error). Its `result` is the pinned flow shape and **accumulates across ordinary
  polls** (no long-poll): `{status: "running"|"waiting_person"|"completed",
  steps: [{slug, type, submitted, accepted, error?}], answers?: [{slug, value, cipher}],
  document?: {status, downloaded}}`. Each poll that finds the platform run
  `awaiting_company` drives ONE step via `processFlowRun` (the designated `email`
  step is submitted once with a canned invalid value → `ValidationError` →
  `accepted:false` without advancing, then valid on the next poll → `accepted:true`);
  `awaiting_customer` → `status:"waiting_person"` and nothing is touched (the next
  poll after the phone answer resumes automatically); `completed` → the decrypted
  `answers` (via `flowRunAnswers`) and, for the contract fixture, the `document`
  (downloaded via `flowRunDocument`) are written. Each answer's `cipher` is the SAME
  row's still-encrypted wrapper, read straight off the run's unchanged raw
  (undecrypted) answer list alongside the `flowRunAnswers` result — the pairing is what lets the panel show
  that the cleartext really came from that ciphertext rather than assert it. `calls`
  traces the SDK methods in order — client construction, `identity`, `connection`,
  `triggerFlowRun`, `flowRun`, `processFlowRun`, `flowRunAnswers`, `flowRunDocument`
  — in the entry shape described under `GET /api/runs/{runId}` above.
- **`GET /callback`** is identity-only — a flow run has no OAuth consent redirect.

## Company-data family (#483)

The five `companydata:*` scenarios exercise the regular company-data surface
through the **service-role** data `Client`. They reuse the shared endpoints
above (`/api/meta`, `/config`, `/start`, `/clear`, `/runs`, `/api/clear`) with no
`/callback` and no `/enroll` (no OAuth leg), plus ONE public route,
`POST /webhook`.

**Config (`POST /api/scenarios/{id}/config`).** Every company-data scenario writes
the service role to `.runtime/config/{sid}.json`: `api_url`, `client_id`,
`client_secret`, `service_private_key` (PEM path), `key_passphrase` (the PEM is
loaded at `Client` construction on every scenario). `companydata:changes` and
`companydata:webhook` also set `cache_dir` (the SDK pump's buffer, under
`.runtime/`). `companydata:webhook` adds `webhooks: {webhookId: secret}` (the SDK
selects the secret by the delivery's `X-Allus-Webhook-Id` header) and records the
webhook id in the `.meta.json` sidecar (the routing key `/start` needs);
`companydata:documents` records the target person `share_code` in the sidecar.
`{sid}` is a filesystem-safe token of the id (e.g. `companydata_read`).

**Start actions.** The four data scenarios run the SDK call synchronously on
`/start` and return `{"type":"data"}`; the outcome is read once via
`GET /api/runs/{runId}` (`status:"done"`, `result`). `companydata:webhook`
returns `{"type":"none"}` and is *accumulating* — see below.

**Pinned result schemas** (so every SDK backend renders identically; the leading
keys are the RENDERED columns, `raw` carries every remaining public `Change`
field so the Raw view shows them — nothing is dropped from `result`):

- `companydata:read` — `{connections:[{connectionId, personId, displayName,
  customerType, shareCode, values:[{slug, value, live, at}]}]}` (grouped by
  connection — the `Connection` object boundary and every customer identifier are
  preserved, so two people who filled the same slug stay distinguishable).
- `companydata:definitions` — `{fields:[{slug, label, type, mandatory, one_time}]}`
  (the folded `mandatory` bool, not the raw split flags).
- `companydata:changes` — `{events:[{event, personId, shareCode?, customerType?,
  slug?, value?, live?, at, documentId?, status?, action?, id,
  raw:{…full public Change fields}}], drained:true}`.
- `companydata:documents` — `{docs:[{index, label, document_id, status}]}` (the
  six document/contract types).
- `companydata:webhook` — `{webhookId, events:[{source:"webhook"|"feed", event,
  personId, shareCode?, customerType?, slug?, value?, live?, at, documentId?,
  status?, action?, id, raw:{…}}], unparseable?:int}`.

**`POST /webhook` (public inbound delivery).** The exact call/status sequence —
NEVER the combined `handleWebhook()` (it throws one `WebhookError` for both a bad
HMAC and a parse failure, so it can't drive the 401-vs-200 split):

1. read `X-Allus-Webhook-Id`; unknown/stale id or no active run → **200**
   acknowledge-and-discard.
2. `verifyWebhook()` → `false` → **401** (a genuine signature failure; loud).
3. `parseWebhook()` → success → append the event (`source:"webhook"`) + **200**; a
   `WebhookError` here is a VERIFIED-but-unparseable delivery → **200**
   acknowledge-and-note (increment `unparseable`) — NOT 401, the signature was
   valid.

All accepted-and-dropped cases return **200** because the platform delivery worker
counts EXACTLY 200 as success (202/401/other = failure → retry + circuit-break).

**The `companydata:webhook` run is accumulating, not long-poll** (a held-open
request would wedge the single worker). `/start` persists a `.runtime/`
routing record `webhookId → runId` (superseding any prior active webhook run) and
returns `{"type":"none"}`. Events arrive via `POST /webhook` and, as an
always-works fallback, via ONE immediate `Client::drainBatch()` raw feed fetch on
EACH `GET /api/runs` poll (deduped on the pull-feed `Change.id`; NOT
`processChanges()`, which loops the pump to empty and could stall the worker —
the crash-safe pump is `companydata:changes`' job). `status` stays `pending` while
collecting (an accumulating result under `pending` is the one semantic addition
this family makes; the enum is unchanged). TTL expiry of the run drops its routing
record; Clear removes both plus the pump cache.

## Contract versioning

The bundle root contains `contract.json` → `{"contractVersion": 3}`; at startup
the backend compares it against the version it implements and refuses a
mismatch, printing both versions and the pin-bump pointer. Checksum failure
refuses the same way. The contract is **cumulative and additive**: a new family
is added at the **next-available** version (one higher than the landed bundle,
read at implementation time — never hardcoded), PRESERVING every already-landed
family and rebasing onto the current bundle. A contract change bumps
`contractVersion` in this bundle AND the release tag; each SDK example's
`frontend.lock` pins the tag + sha256 it was built against, so a contract bump is
an explicit pin bump — one `frontend.lock` per SDK, since one backend now serves every family (#494).
