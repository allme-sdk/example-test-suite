# The demo-backend contract (v2)

This is the canonical contract that every allme SDK example implements.
It is what makes the examples strictly comparable — an example test suite in
the literal sense. The shared JSX frontend in this repo speaks only these
endpoints and shapes; a thin per-SDK backend implements them.

The contract is **cumulative and additive**: it grows one scenario *family* at a
time (identity first — v1; the flow family below — v2), each at the
next-available `contractVersion`. A backend lists ONLY its own family's scenarios
in `GET /api/meta`; the shared bundle carries every family and renders whichever
the running backend advertises. The endpoints and backend-state model below are
shared by all families; per-family specifics are called out in their own section.

One port serves bundle + API — default `8091`, overridable via the `PORT` env
var; a busy port refuses at startup with a clear message. The SAME default
across all SDK examples is deliberate (one browser origin → the localStorage
setup carries across SDKs), with the documented consequence that two examples
don't run side by side.

## Endpoints

### `GET /api/meta`

`{sdk, sdkVersion, contractVersion, scenarios: [{id, kind}]}` with
`kind: "runnable" | "guide"`. The frontend renders only listed scenarios.
**Scenario 7 is the one `guide` card**: it has NO `/start` (calling it is
undefined); its card renders the setup checklist plus links that navigate to
scenarios 1 and 5, where the 2FA prompt is observed. All other scenarios are
`runnable`.

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

### `GET /callback`

The registered redirect URI (`http://localhost:8091/callback`). Handles BOTH
delivery shapes: `?code=…&state=…` (complete via the SDK — `completeSignIn` — or
via the OIDC library for scenarios 5/6) and `?enrolled=true&state=…` (the
redirect-leg enrollment outcome, #436 — nothing to exchange; the outcome is
recorded). Writes the outcome to the run stash, then 302 →
`/?scenario={id}&run={runId}` so the frontend resumes the right card.

### `GET /api/runs/{runId}`

`{status: "pending"|"done"|"failed", result?, error?, calls: [strings]}` — ONE
poll endpoint for scenario runs AND enroll runs. `calls` names the exact SDK
functions invoked (feeds "what just happened"). **Progress is poll-driven and
blocking SDK waits are short-cycled**: a poll that finds a run awaiting a
detached/challenge outcome performs ONE short-timeout SDK call
(`pollResult`/`waitForResult` with `timeout=2`), treats the SDK timeout as
still-pending, and on a 200 writes the outcome to the run file (write-temp +
atomic rename). No handler ever blocks for the SDK's 600s defaults. **Reads are
idempotent** (owner decision 2026-07-24: no burn-on-read): once written, the
outcome is returned on every poll until the run's 30-min TTL or a Clear removes
it. An unknown/expired `runId` → `404 {error:"not_found"}`.

### `POST /api/scenarios/{id}/enroll`

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

## Backend state — single-worker, idempotent (owner decision 2026-07-24: no burn-on-read, no locks)

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

## Flow family (#484 — contract v2)

The flow family adds ONE scenario, `flow:run` (`kind: "runnable"`), demonstrating
a contract flow driven through the PHP SDK's flow surface. It reuses the shared
endpoints above; the family-specific points:

- **`POST /api/scenarios/flow:run/config`** — setup values (spec §5): the service
  data client (`client_id`/`client_secret`), the service PEM (`service_private_key`
  path + `key_passphrase`), and `api_url`, written to the canonical config file the
  run executes off (built via `Client::fromConfig` → `Config::fromFile`). The
  demo-only run parameters — the published `flow_id`, the `connection_id`, and the
  `fixture` choice (`"info" | "contract"`) — go to the sibling
  `config/{id}.meta.json`, NOT the SDK config.
- **`POST /api/scenarios/flow:run/start`** — builds the flow bindings
  (`company →` `Client::identity()['company_user_id']`; `customer →`
  `Connection::$personId` for the configured connection — fail clearly on a missing
  connection / null person id), calls `triggerFlowRun(flowId, connectionId,
  bindings)`, stores the returned platform `flowRunId` INSIDE the demo run file
  (never a separate browser input), and returns `{runId, action:{"type":"none"}}`.
  `409 not_configured` with no saved config, as elsewhere.
- **`GET /api/runs/{runId}`** — the run envelope keeps the shared
  `"pending"|"done"|"failed"` status (`"done"` once the flow completes, `"failed"`
  on error). Its `result` is the pinned flow shape and **accumulates across ordinary
  polls** (no long-poll): `{status: "running"|"waiting_person"|"completed",
  steps: [{slug, type, submitted, accepted, error?}], answers?: [{slug, value}],
  document?: {status, downloaded}}`. Each poll that finds the platform run
  `awaiting_company` drives ONE step via `processFlowRun` (the designated `email`
  step is submitted once with a canned invalid value → `ValidationError` →
  `accepted:false` without advancing, then valid on the next poll → `accepted:true`);
  `awaiting_customer` → `status:"waiting_person"` and nothing is touched (the next
  poll after the phone answer resumes automatically); `completed` → the decrypted
  `answers` (via `flowRunAnswers`) and, for the contract fixture, the `document`
  (downloaded via `flowRunDocument`) are written. `calls` names the exact SDK
  methods (`identity`, `triggerFlowRun`, `flowRun`, `processFlowRun`,
  `flowRunAnswers`, `flowRunDocument`).
- **`GET /callback`** is identity-only — a flow run has no OAuth consent redirect.

## Contract versioning

The bundle root contains `contract.json` → `{"contractVersion": 2}`; at startup
the backend compares it against the version it implements and refuses a
mismatch, printing both versions and the pin-bump pointer. Checksum failure
refuses the same way. Versioning is **additive**: a new family takes the
next-available version and PRESERVES every already-landed family (a backend
rebases onto the current bundle rather than dropping a family), so families can
land in any order without a version collision. A contract change bumps
`contractVersion` in this bundle AND the release tag; each SDK example's
`frontend.lock` pins the tag + sha256 it was built against, so a contract bump is
an explicit, per-example pin bump.
