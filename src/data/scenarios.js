// The identity scenarios as DATA (spec §4): ids 1-5, 7-8 — OIDC has a single
// scenario, id 5; there is no OIDC-leg equivalent of the detached "continue on
// your phone" mode. Input schemas match §4:
//  - scenario 3 adds the OAuth app PRIVATE KEY (PEM file-picker) + passphrase
//  - scenario 4 lists the DATA-CLIENT id/secret alongside the SERVICE PEM
//  - scenario 7 is a GUIDE card (no run button) — checklist + links to 1 and 5
//  - scenario 8 distinguishes the OAuth-app-with-service creds from the
//    data-client creds
//
// The grid renders only ids present in GET /api/meta and honors each scenario's
// `kind` from meta (runnable | guide). The `kind` below is the design default;
// meta is authoritative at render time. A gap at id 6 is harmless: the grid
// only ever renders ids the backend lists, never a contiguous range.
//
// Advanced inputs default to the DEPLOYED platform (spec §5, owner decision:
// pre-launch, the cluster is the test environment).

export const API_URL_DEFAULT = 'https://api.allme.fyi';
export const AUTHORIZE_BASE_DEFAULT = 'https://web.allme.fyi/auth';

// The advanced block, shared by every runnable scenario. Switchable to a local
// stack without editing any file (spec §5/§6).
const ADVANCED = [
  {
    key: 'apiUrl',
    label: 'API base URL',
    type: 'url',
    advanced: true,
    default: API_URL_DEFAULT,
    hint: 'Deployed platform by default. Switch to a local stack (e.g. http://localhost:8070) without editing files.'
  },
  {
    key: 'authorizeBase',
    label: 'Authorize base URL',
    type: 'url',
    advanced: true,
    default: AUTHORIZE_BASE_DEFAULT,
    hint: 'Where the person approves the sign-in / consent. Local stack: e.g. http://localhost:5174/auth.'
  }
];

// Flow runs drive the company party via a data client + the service key — there is
// no OAuth consent redirect — so the flow family's advanced block is API-URL only.
const FLOW_ADVANCED = [ADVANCED[0]];

const PHONE_PREREQ =
  'A physical phone with the allme app, signed in as the demo person. It reaches the deployed platform naturally.';

// ── The portal half of setup, per control ──────────────────────────────────────
// A scenario's own inputs are complete BY CONSTRUCTION: `fields` below IS the form the
// suite renders, so an input cannot exist without its `hint`. The portal half needs the
// same tie: a free-prose description of a form in another product can drift and
// under-specify with nothing to catch it — a scenario could name only some of a form's
// controls, or omit the one control that decides whether an OIDC scenario shows any
// claims at all.
//
// So PORTAL_FORMS is the CATALOG — every control each portal form actually renders — and
// a scenario declares `portalSetup: [{ form, settings }]` giving the
// intended value for EVERY control of every form it sends the reader to, including the
// ones to leave alone. "Leave it empty" and "it does not matter here, because …" are
// answers; silence is not. `portalSetupGaps()` reports what a scenario omitted (or named
// and the form does not have); `PortalSetup.jsx` renders a gap as a loud row and
// `npm run check` — which `prebuild` runs — exits non-zero, so a release cannot ship an
// unexplained control.
//
// When a portal form gains or loses a control, edit its entry here: every scenario that
// uses the form then fails the check until it says what to do with it.
export const PORTAL_FORMS = {
  'oauth-app': {
    title: 'Register an OAuth app',
    path: 'allus portal → Settings → OAuth apps → the “Register app” form',
    controls: [
      { key: 'name', label: 'App name (shown to the person)' },
      { key: 'redirectUris', label: 'Redirect URIs (one per line)' },
      { key: 'service', label: 'Service — “No service (sign-in / one-time only)” or one of yours' },
      { key: 'confidential', label: 'Confidential (server-side secret)' },
      { key: 'require2fa', label: 'Require 2FA' },
      { key: 'claimsDelivery', label: 'Claims in the id_token — Encrypted / Plaintext' },
      { key: 'claimConfig', label: 'Claim requirements (standard scopes) — Required / Verified only / Stay-connected field, per claim' }
    ]
  },
  'oauth-app-edit': {
    title: 'Edit an OAuth app',
    path: 'allus portal → Settings → OAuth apps → the app’s pencil button',
    // The edit panel is the register form MINUS Confidential: public-vs-confidential is
    // fixed at registration (the portal's `EditApp` in `account/OAuthApps.jsx` renders no
    // such control).
    controls: [
      { key: 'name', label: 'App name' },
      { key: 'redirectUris', label: 'Redirect URIs (one per line)' },
      { key: 'service', label: 'Service' },
      { key: 'require2fa', label: 'Require 2FA' },
      { key: 'claimsDelivery', label: 'Claims in the id_token' },
      { key: 'claimConfig', label: 'Claim requirements (standard scopes)' }
    ]
  },
  'account-client': {
    title: 'Create an account API client',
    path: 'allus portal → Settings → API clients → the “Create client” form',
    controls: [
      { key: 'name', label: 'Client name' },
      { key: 'capabilities', label: 'Capabilities — the four checkboxes' },
      { key: 'redirectUri', label: 'Redirect URI (optional)' }
    ]
  },
  'service-create': {
    title: 'Create the service',
    path: 'allus portal → Settings → Services → the “Add” row at the top',
    controls: [
      { key: 'name', label: 'New service name' },
      { key: 'adminEmail', label: 'Admin email' }
    ]
  },
  'service-overview': {
    title: 'The service’s Overview tab',
    path: 'allus portal → Settings → Services → your service → Overview',
    controls: [
      { key: 'shareCode', label: 'Share code' },
      { key: 'adminEmail', label: 'Admin email' },
      { key: 'connectPerson', label: 'Connect a person — share code + Send' },
      { key: 'audience', label: 'Audience — Businesses / People / Anyone' },
      { key: 'require2fa', label: 'Require 2FA' },
      { key: 'keypair', label: 'Keypair — Public key (.pem) / Private key (.pem)' }
    ]
  },
  'service-client': {
    title: 'Register the data client',
    path: 'allus portal → Settings → Services → your service → API access',
    controls: [
      { key: 'name', label: 'New client name' },
      { key: 'redirectUri', label: 'Redirect URI (appears under each registered client)' }
    ]
  },
  'service-requests': {
    title: 'Configure the request fields',
    path: 'allus portal → Settings → Services → your service → Requests',
    controls: [
      { key: 'fieldType', label: 'Type (the per-row select)' },
      { key: 'label', label: 'Label shown to the person' },
      { key: 'slug', label: 'Key' },
      { key: 'audience', label: 'Asks — People / Companies / Both' },
      { key: 'suggest', label: 'Suggest' },
      { key: 'mandatory', label: 'Mandatory' },
      { key: 'mustStayConnected', label: 'Must stay connected' },
      { key: 'publish', label: 'Publish changes' }
    ]
  },
  'service-webhook': {
    title: 'Register the webhook',
    path: 'allus portal → Settings → Services → your service → Webhooks → “Add webhook”',
    controls: [
      { key: 'url', label: 'Endpoint URL' },
      { key: 'format', label: 'Payload format — JSON / XML' },
      { key: 'events', label: 'Events (checkboxes; none selected = all)' },
      { key: 'auth', label: 'Authentication — HMAC / bearer / basic / custom header / none' },
      { key: 'encryptPayload', label: 'Encrypt payload with account keypair' },
      { key: 'enabled', label: 'Enabled' }
    ]
  },
  'service-flows': {
    title: 'Import and publish the flow',
    path: 'allus portal → Settings → Services → your service → Flows',
    controls: [
      { key: 'newFlowName', label: 'New flow name + Create' },
      { key: 'import', label: 'Import (a .zip flow package)' },
      { key: 'publish', label: 'Publish (top of the flow builder)' }
    ]
  }
};

// The three OAuth-app answers that are identical on every identity scenario live once
// (standards §1) — the redirect URI above all, which is the one that most often goes wrong.
const REDIRECT_URIS_SETTING =
  'One line, matching the address THIS page is open on: http://localhost:8091/callback, or http://127.0.0.1:8091/callback, or http://<your-lan-ip>:8091/callback when you drive the example from a phone. The backend writes the origin your browser used into the config file and never substitutes a default, so the two must match. Beware that localhost and 127.0.0.1 are DIFFERENT origins — for redirect matching and for this page’s saved settings alike, so a flow that comes back on the other spelling lands on a page whose settings were never there. Registering both lines makes either one work, but that is a convenience, not a remedy for switching spelling mid-flow: open the example on one address and stay on it. Adjust the port if you set PORT.';

const APP_NAME_SETTING =
  'Anything — it is only the name the person sees on the consent screen. “Example test suite” is fine.';

const CONFIDENTIAL_SETTING =
  'TICK it. A public app issues NO client secret, and this example is a confidential server-side backend that authenticates with one.';

const REQUIRE_2FA_OFF_SETTING =
  'Leave it OFF. This checkbox is what scenario 7 turns on: the consent screen then challenges the person for their OWN account 2FA before it mints a code — a separate scenario rather than a variation of this one.';

// Scenarios 1 and 2 — mode=signin, no claim values anywhere in the flow.
const SIGNIN_APP_SETTINGS = {
  name: APP_NAME_SETTING,
  redirectUris: REDIRECT_URIS_SETTING,
  service: 'Leave it on “No service (sign-in / one-time only)”. A service matters only to connect mode (scenario 4) and to the 2fa_enroll step (scenario 8); picking one here changes nothing this scenario does.',
  confidential: CONFIDENTIAL_SETTING,
  require2fa: REQUIRE_2FA_OFF_SETTING,
  claimsDelivery: 'Leave it on “Encrypted” (the default). mode=signin asks for no claim values, so neither setting delivers anything; this control only bites on scenario 5.',
  claimConfig: 'Leave every Required / Verified-only box unticked and every “Stay-connected field” on “Not linkable”. They apply only to claims requested through the standard OIDC scopes, and mode=signin requests none.'
};

// Scenario 5 — the OIDC leg reads its claims out of the id_token, so the delivery
// mode is load-bearing rather than cosmetic.
const OIDC_APP_SETTINGS = {
  name: APP_NAME_SETTING,
  redirectUris: REDIRECT_URIS_SETTING,
  service: 'Leave it on “No service (sign-in / one-time only)”. A service is only needed for a per-claim live link, which plaintext delivery below rules out anyway.',
  confidential: CONFIDENTIAL_SETTING,
  require2fa: REQUIRE_2FA_OFF_SETTING,
  claimsDelivery: 'Choose “Plaintext”. This is the one setting that decides whether this scenario shows anything: a standards-only OIDC relying party — which is exactly what this scenario demonstrates — reads its claims out of the id_token, and only plaintext delivery puts readable values there. Left on “Encrypted” the login still succeeds, but the id_token carries no email and no name — only the standard identity claims (sub, iss, aud, exp, …) plus email_verified=false — and nothing on screen says why. Encrypted delivery is for apps that read values through userinfo and decrypt them with the app key — that is scenario 3.',
  claimConfig: 'Leave both boxes unticked and the “Stay-connected field” on “Not linkable” for the documented run. They DO apply here — scope=openid profile email resolves to exactly the name and email claims this block configures — so ticking “Required” on Email makes the consent screen refuse a decline, and “Verified only” additionally demands a verified email field. The stay-connected binding needs Encrypted delivery AND a service; this app has neither.'
};

// ── company-data family ────────────────────────────────────────────────────────
// The regular company-data surface companies use, through the service data client:
// connections read, request-field definitions, the change feed, webhooks, documents.
// Every company-data scenario uses the SERVICE role — the service PEM is loaded at
// Client construction, so it is a required input on all five. Ids are namespaced
// companydata:* so they stay globally unique across families in the shared frontend.

// Advanced block for company-data — API base only (no OAuth authorize step).
const CD_ADVANCED = [
  {
    key: 'apiUrl',
    label: 'API base URL',
    type: 'url',
    advanced: true,
    default: API_URL_DEFAULT,
    hint: 'Deployed platform by default. Switch to a local stack (e.g. http://localhost:8070) without editing files.'
  }
];

// Service-role inputs shared by every company-data scenario.
const CD_SERVICE_FIELDS = [
  { key: 'clientId', label: 'Data client id', type: 'text' },
  { key: 'clientSecret', label: 'Data client secret', type: 'secret' },
  {
    key: 'servicePrivateKeyPem',
    label: 'Service private key (PEM)',
    type: 'pem',
    hint: 'The service role always loads its key at Client construction (every company-data call, not only the decrypting ones). Read into localStorage; on Save written under .runtime/config/keys (0600) and referenced by path in the SDK config file.'
  },
  { key: 'keyPassphrase', label: 'Service key passphrase', type: 'passphrase' }
];

// The four portal forms every company-data scenario sends you to. Shared, because the
// scenarios share the setup — one description, five scenarios (standards §1).
const SERVICE_CREATE_SETTINGS = {
  name: 'Anything — the person sees it on the connect screen. “CRM” or “Example service” is fine.',
  adminEmail: 'A mailbox you can actually read. It is MANDATORY (the form refuses an invalid address) and is where the platform emails you when change-feed events go un-fetched for days. It is never shown to connected people.'
};

const SERVICE_OVERVIEW_SETTINGS = {
  shareCode: 'Keep the code the portal generated from the name, or set your own 1–8 uppercase A–Z / 0–9. It is the second half of the connect handle COMPANYCODE/SERVICECODE the person types, so note it down — nothing in this example needs it, but the person connecting does.',
  adminEmail: 'Already set when you created the service. Leave it; this field is only here to change it later.',
  connectPerson: 'Use it only where the scenario needs the demo person ALREADY connected to this service — the company-data and flow scenarios do; scenario 4 connects the person itself through the consent screen, and scenario 8 needs an enrollment rather than a connection. Type the person’s own 6-character share code and press Send; they accept in the allme app. The other direction works too: the person opens COMPANYCODE/SERVICECODE themselves. Skip it if they are already connected.',
  audience: 'Leave it on “People” (the default). “Businesses” makes the service refuse person connections outright, so the demo person could not connect at all; “Anyone” also works.',
  require2fa: 'Leave it OFF. It adds an extra verification step for the person when they sign in or connect through this service — real, but nothing this example demonstrates.',
  keypair: 'Press “Private key (.pem)” and keep the file — it is what you pick as “Service private key (PEM)” below, and the SDK decrypts every value with it. Its passphrase is the random string the portal showed ONCE when you created the service (the amber “Save this passphrase now” panel); it is not recoverable, so without it you need a new service. You do not need the public key here.'
};

const SERVICE_CLIENT_SETTINGS = {
  name: 'Anything — “Example test suite” or “CRM backend”. It is the only field on this form. The client id and the secret are shown once, immediately after you press Register; copy both into the inputs below before leaving the page.',
  redirectUri: 'Leave it EMPTY. It appears under each registered client and enables the authorization-code flow, which the SDK does not use — every company-data call authenticates with client_credentials. An https URL is the only thing it would accept anyway.'
};

const SERVICE_REQUESTS_SETTINGS = {
  fieldType: 'Pick the types you want to read — Email and Phone make the shortest demo. The type is IMMUTABLE once the row is published: changing your mind means deleting the row and adding a new one, which deletes whatever people already answered into it.',
  label: 'What the person sees on the connect screen, e.g. “Billing email”. Free text; rename it whenever you like — the Key below, not this, is what your code reads.',
  slug: 'Leave it blank to have it derived from the label, or set your own [a-z0-9_] key. THIS is the contract: every value the SDK hands you is keyed by it — conn.values["billing_email"] — and it stays stable when you rename the label.',
  audience: 'Leave it on “People”. “Companies” makes the row invisible to the demo person (it is the business-to-business slot) and also hides the Suggest control; “Both” works too.',
  suggest: 'Optional — “No suggestion” is fine. It only pre-selects one of the person’s own fields of that type on the connect screen. The person always chooses; you never name their field.',
  mandatory: 'Leave it unticked for the demo. Ticked, a person cannot finish connecting without answering that row.',
  mustStayConnected: 'Leave it unticked. Ticked, it forces Mandatory on as well and forbids a share-once answer, so the value must stay live — useful in production, one more thing to get right in a demo.',
  publish: 'Press “Publish changes” — the rows are a draft until you do, and nothing reaches the API before that. On a service that already has connections, publishing a NEW row asks every connected person to consent to it; existing connections stay fully active until they answer.'
};

const CD_PORTAL_SETUP = [
  { form: 'service-create', settings: SERVICE_CREATE_SETTINGS },
  { form: 'service-overview', settings: SERVICE_OVERVIEW_SETTINGS },
  { form: 'service-client', settings: SERVICE_CLIENT_SETTINGS },
  { form: 'service-requests', settings: SERVICE_REQUESTS_SETTINGS }
];

const COMPANYDATA_SCENARIOS = [
  {
    id: 'companydata:read',
    kind: 'runnable',
    title: 'Read connected people',
    summary: 'Client::connections() reads each connected person’s decrypted values, grouped one card per person (two people who filled the same slug stay distinguishable).',
    readmeChapter: 'Company data — read connections',
    runButton: 'Read connections',
    portalSetup: CD_PORTAL_SETUP,
    prerequisites: [],
    fields: [...CD_SERVICE_FIELDS, ...CD_ADVANCED]
  },
  {
    id: 'companydata:definitions',
    kind: 'runnable',
    title: 'Request-field definitions',
    summary: 'Client::requestFields() returns your request slugs with label / type / the folded mandatory flag + one_time.',
    readmeChapter: 'Company data — request fields',
    runButton: 'List request fields',
    portalSetup: CD_PORTAL_SETUP,
    prerequisites: [],
    fields: [...CD_SERVICE_FIELDS, ...CD_ADVANCED]
  },
  {
    id: 'companydata:changes',
    kind: 'runnable',
    title: 'Change-feed pump',
    summary: 'Client::processChanges() drains the change feed through the crash-safe pump (idempotent per event on Change.id) and shows the drained batch.',
    readmeChapter: 'Company data — change feed',
    runButton: 'Drain the change feed',
    portalSetup: CD_PORTAL_SETUP,
    prerequisites: [],
    fields: [...CD_SERVICE_FIELDS, ...CD_ADVANCED]
  },
  {
    id: 'companydata:webhook',
    kind: 'runnable',
    title: 'Webhook receiver (dual-mode)',
    summary: 'A public POST /webhook runs verifyWebhook() then parseWebhook() (401 on a bad HMAC, 200 otherwise); the same run also polls the change feed as an always-works fallback.',
    readmeChapter: 'Company data — webhooks',
    runButton: 'Start receiving',
    portalSetup: [
      ...CD_PORTAL_SETUP,
      {
        form: 'service-webhook',
        settings: {
          url: 'Your tunnel’s public URL with /webhook appended (deployed platform), or http://localhost:8091/webhook (local stack). Plain http is accepted, deliberately, so a localhost receiver works in development; anything that is not an http(s) URL with a host is refused as services.webhook_url_invalid.',
          format: 'Leave it on JSON. The SDK parses XML too, so either works; JSON is what the “what just happened” panel is easiest to read as.',
          events: 'Leave every box UNTICKED — no selection means ALL events, which is what this scenario wants to observe. Ticking a subset is a filter, not a preference: anything unticked simply never arrives.',
          auth: 'Choose “HMAC signature” (the recommended default) and leave its secret box EMPTY so the platform generates one — it is shown once, and it is what goes in the “Webhook HMAC secret” input below. verifyWebhook() checks X-Allus-Signature against it. The other four methods (bearer, basic, custom header, none) are real and every SDK supports them, but this example writes only an HMAC secret into its config: registered with any other method, every delivery fails verification, the receiver answers 401, and the platform circuit-breaks the webhook.',
          encryptPayload: 'Leave it OFF. Ticked, the body is encrypted to your company ACCOUNT public key, and this example holds no account private key — every delivery would arrive undecryptable.',
          enabled: 'Leave it ON (the default). Off, the webhook is registered but nothing is ever delivered, and the scenario would sit on its change-feed fallback with no explanation.'
        }
      }
    ],
    prerequisites: [
      'Deployed platform: the cluster cannot reach your localhost, so open a tunnel first — cloudflared tunnel --url http://localhost:8091 — and use the printed public URL below as the webhook endpoint. Local stack: no tunnel, the local delivery worker reaches http://localhost:8091/webhook directly.'
    ],
    fields: [
      ...CD_SERVICE_FIELDS,
      { key: 'webhookId', label: 'Webhook id (routing key)', type: 'text', hint: 'The X-Allus-Webhook-Id the platform sends; selects the HMAC secret and keys the single active webhook run. Copied from the service’s webhook registration — the run refuses to start without it (409 not_configured).' },
      { key: 'webhookSecret', label: 'Webhook HMAC secret', type: 'secret', hint: 'The one-time secret shown at registration — written into the SDK config’s webhooks map; verifyWebhook() checks the signature against it.' },
      ...CD_ADVANCED
    ]
  },
  {
    id: 'companydata:documents',
    kind: 'runnable',
    title: 'Create the six document types',
    summary: 'Client::createDocument() creates all six document/contract types — broadcast JSON/PDF, per-person file, private file, and contracts requiring signature / acceptance.',
    readmeChapter: 'Company data — documents',
    runButton: 'Create documents',
    portalSetup: CD_PORTAL_SETUP,
    prerequisites: [],
    fields: [
      ...CD_SERVICE_FIELDS,
      { key: 'shareCode', label: 'Target person share code', type: 'text', hint: 'The connected person the per-person / private / contract documents target (broadcast documents ignore it).' },
      ...CD_ADVANCED
    ]
  }
];

export const SCENARIOS = [
  {
    id: 1,
    kind: 'runnable',
    title: 'Sign in — redirect',
    summary: 'Classic OAuth redirect sign-in through the PHP SDK: authorizeUrl → /callback → completeSignIn.',
    readmeChapter: 'Sign in (redirect)',
    runButton: 'Sign in (redirect)',
    portalSetup: [{ form: 'oauth-app', settings: SIGNIN_APP_SETTINGS }],
    prerequisites: [],
    fields: [
      { key: 'oauthClientId', label: 'OAuth app client id', type: 'text' },
      { key: 'oauthClientSecret', label: 'OAuth app client secret', type: 'secret' },
      ...ADVANCED
    ]
  },
  {
    id: 2,
    kind: 'runnable',
    title: 'Sign in — detached',
    summary: 'Detached sign-in: the desktop shows a link + QR; the backend completes via pollResult then completeSignIn.',
    readmeChapter: 'Sign in (detached)',
    runButton: 'Start detached sign-in',
    portalSetup: [{ form: 'oauth-app', settings: SIGNIN_APP_SETTINGS }],
    prerequisites: [PHONE_PREREQ],
    fields: [
      { key: 'oauthClientId', label: 'OAuth app client id', type: 'text' },
      { key: 'oauthClientSecret', label: 'OAuth app client secret', type: 'secret' },
      ...ADVANCED
    ]
  },
  {
    id: 3,
    kind: 'runnable',
    title: 'One-time claims',
    summary: 'Mode one_time returns a small claim set; showing DECRYPTED values needs the OAuth app’s private key.',
    readmeChapter: 'One-time claims',
    runButton: 'Request one-time claims',
    portalSetup: [
      {
        form: 'oauth-app',
        settings: {
          name: APP_NAME_SETTING,
          redirectUris: REDIRECT_URIS_SETTING,
          service: 'Leave it on “No service (sign-in / one-time only)” — the portal’s own wording for exactly this scenario. Selecting a service does not enable or change one_time; it only makes connect mode (scenario 4) possible.',
          confidential: CONFIDENTIAL_SETTING,
          require2fa: REQUIRE_2FA_OFF_SETTING,
          claimsDelivery: 'Leave it on “Encrypted” (the default), though on this leg the setting is not consulted at all: one_time values ALWAYS reach you as app-key ciphertext through userinfo, which is why this scenario needs the private-key PEM below. The control exists for the OIDC leg (scenario 5).',
          claimConfig: 'Leave every box unticked and every “Stay-connected field” on “Not linkable”. The one-time leg never reads this block: only the claims the request itself names apply (this example asks for email + phone). It exists for standards-only relying parties that cannot express requirements in an OIDC request, and the stay-connected binding is an OIDC-leg feature that is never offered here.'
        }
      }
    ],
    prerequisites: [],
    fields: [
      { key: 'oauthClientId', label: 'OAuth app client id', type: 'text' },
      { key: 'oauthClientSecret', label: 'OAuth app client secret', type: 'secret' },
      {
        key: 'oauthPrivateKeyPem',
        label: 'OAuth app private key (PEM)',
        type: 'pem',
        hint: 'Downloaded with the download button on the app’s row in the OAuth apps list (it appears after registration; the registration form itself has no such control). The file content is read into localStorage; on Save the backend writes it under .runtime/config/keys (0600) and records its path in the SDK config file. Clear removes it.'
      },
      {
        key: 'oauthKeyPassphrase',
        label: 'Private key passphrase',
        type: 'passphrase',
        hint: 'Shown ONCE, in the same panel as the client secret, when the app is created — it decrypts the private key above and is not recoverable, so save it then.'
      },
      ...ADVANCED
    ]
  },
  {
    id: 4,
    kind: 'runnable',
    title: 'Connect (stay-connected)',
    summary: 'Mode connect keeps a live, auto-updating record; showing the DECRYPTED claim values from userinfo needs the OAuth app’s private key, and the connection’s live values are separately encrypted per-service and read via the service data client.',
    readmeChapter: 'Connect (stay-connected)',
    runButton: 'Connect and read live values',
    portalSetup: [
      { form: 'service-create', settings: SERVICE_CREATE_SETTINGS },
      { form: 'service-overview', settings: SERVICE_OVERVIEW_SETTINGS },
      {
        form: 'oauth-app',
        settings: {
          name: APP_NAME_SETTING,
          redirectUris: REDIRECT_URIS_SETTING,
          service: 'SELECT the service you just created — this is the one setting connect mode cannot do without: an app carrying no service is refused with oauth.connect_no_service. Pick the entry labelled “<name> (enables connect mode)”; one labelled “business-only, no live link” has its Audience on Businesses and no person can connect through it.',
          confidential: CONFIDENTIAL_SETTING,
          require2fa: REQUIRE_2FA_OFF_SETTING,
          claimsDelivery: 'Leave it on “Encrypted” (the default), though on this leg the setting is not consulted at all: connect mode delivers the consented claim values through userinfo as app-key ciphertext too — the same route one_time and oidc use — which is why the OAuth app private key is required above. The connection’s live values are a separate thing again: they come back over the company-data API, encrypted to the SERVICE key, which is why the service PEM below is also needed. The control exists for the OIDC leg (scenario 5).',
          claimConfig: 'Leave every box unticked and every “Stay-connected field” on “Not linkable”. Those are the OIDC leg’s smaller, per-claim version of this scenario; mode=connect runs the full company connect instead, so the person is asked about your service’s own request fields and no binding is consulted.'
        }
      },
      { form: 'service-client', settings: SERVICE_CLIENT_SETTINGS }
    ],
    prerequisites: [],
    fields: [
      { key: 'oauthClientId', label: 'OAuth app client id (connect consent)', type: 'text' },
      { key: 'oauthClientSecret', label: 'OAuth app client secret', type: 'secret' },
      {
        key: 'oauthPrivateKeyPem',
        label: 'OAuth app private key (PEM)',
        type: 'pem',
        hint: 'Decrypts the consented claim values connect delivers through userinfo — the same app-key route one_time and oidc use. Downloaded with the download button on the app’s row in the OAuth apps list. Distinct from the SERVICE private key below, which decrypts the connection’s separate LIVE values read back over the company-data API.'
      },
      {
        key: 'oauthKeyPassphrase',
        label: 'Private key passphrase',
        type: 'passphrase',
        hint: 'Shown ONCE, in the same panel as the client secret, when the app is created — it decrypts the private key above and is not recoverable, so save it then.'
      },
      { key: 'clientId', label: 'Service data client id (live values)', type: 'text' },
      { key: 'clientSecret', label: 'Service data client secret', type: 'secret' },
      {
        key: 'servicePrivateKeyPem',
        label: 'Service private key (PEM)',
        type: 'pem',
        hint: 'Live values are encrypted per-service; the service private key decrypts them. Read into localStorage; on Save written under .runtime/config/keys (0600) and referenced by path in the SDK config file.'
      },
      { key: 'keyPassphrase', label: 'Service key passphrase', type: 'passphrase' },
      ...ADVANCED
    ]
  },
  {
    id: 5,
    kind: 'runnable',
    title: 'OIDC login',
    summary: 'Standard OIDC: discovery → PKCE → id_token verified by the pinned third-party OIDC library (the #314 compliance demo).',
    readmeChapter: 'OIDC login',
    runButton: 'Sign in with OIDC',
    portalSetup: [{ form: 'oauth-app', settings: OIDC_APP_SETTINGS }],
    prerequisites: [],
    fields: [
      { key: 'oauthClientId', label: 'OAuth app client id (OIDC RP)', type: 'text' },
      { key: 'oauthClientSecret', label: 'OAuth app client secret', type: 'secret' },
      ...ADVANCED
    ]
  },
  {
    id: 7,
    kind: 'guide',
    title: '2FA at consent',
    summary: 'A guide, not a run: the authorize step challenges the person’s OWN account 2FA (TOTP / email code / biometric). Set it up, then observe it inside scenarios 1 and 5.',
    readmeChapter: '2FA at consent',
    // No runButton: this is the guide card (kind: guide).
    checklist: [
      'This scenario EDITS the app scenario 1 or scenario 5 already uses rather than registering a new one: allus portal → Settings → OAuth apps → the app’s pencil button. The per-control table below is that edit panel — it is the registration form minus “Confidential”, which is fixed when an app is created.',
      'Person-account prerequisite: the demo person has TOTP or email 2FA enabled on their allme account (allme app/web → Settings).',
      'There is NO phone-push approval in-flow here and number matching plays no role — that lives only on scenario 8’s service challenges. The service-level “Require 2FA” toggle on a service’s Overview tab is a different control with the same name; this scenario is the one on the APP.',
      'Now run scenario 1 (redirect sign-in) and scenario 5 (OIDC login) and watch the consent-side 2FA prompt appear. Untick it again afterwards, or those two scenarios keep prompting.'
    ],
    portalSetup: [
      {
        form: 'oauth-app-edit',
        settings: {
          name: 'Leave it exactly as it is — you are editing the app scenario 1 or 5 uses, not creating a variant.',
          redirectUris: 'Leave them exactly as they are. Clearing or changing a line here breaks the scenario you are about to observe.',
          service: 'Leave it as it is (“No service (sign-in / one-time only)” on both of those apps). 2FA at consent is the person’s OWN account 2FA and has nothing to do with a service.',
          require2fa: 'TICK it. This single checkbox IS the scenario: with it on, the /auth consent screen challenges the person for their own account 2FA — TOTP, an email code, or a biometric — before it will mint a code.',
          claimsDelivery: 'Leave whatever that app already has: Encrypted on scenario 1’s app, Plaintext on scenario 5’s. Changing it changes what those scenarios show, which is not what you are testing here.',
          claimConfig: 'Leave it exactly as it is. Consent-side 2FA is a gate in front of the same consent screen; it neither reads nor changes the claim options.'
        }
      }
    ],
    prerequisites: [
      'The demo person’s allme account has TOTP or email 2FA enabled (an allme app/web Settings step).'
    ],
    guideLinks: [1, 5],
    fields: []
  },
  {
    id: 8,
    kind: 'runnable',
    title: 'Standalone service-2FA (+ enrollment)',
    summary: 'A deliberately fake one-field local login where the only real authentication is the allme challenge: enroll, then challenge → approve/deny on the phone (number matching ON and OFF).',
    readmeChapter: 'Standalone service-2FA',
    runButton: 'Run challenge',
    enrollButton: 'Enroll device (redirect)',
    enrollButtonDetached: 'Enroll — continue on phone',
    portalSetup: [
      { form: 'service-create', settings: SERVICE_CREATE_SETTINGS },
      { form: 'service-overview', settings: SERVICE_OVERVIEW_SETTINGS },
      {
        form: 'oauth-app',
        settings: {
          name: APP_NAME_SETTING,
          redirectUris: REDIRECT_URIS_SETTING,
          service: 'SELECT the service — the same one the data client below belongs to. The 2fa_enroll step records the person against THAT service, and a challenge raised by a client on a different service will not find the enrollment (404 unknown or not enrolled). An app with no service cannot run the enroll step at all.',
          confidential: CONFIDENTIAL_SETTING,
          require2fa: 'Leave it OFF. That checkbox gates code minting at the consent screen with the person’s OWN account 2FA (scenario 7); enrollment mints no code, and the approval this scenario demonstrates is the service’s challenge, not the person’s account 2FA. Ticking it only adds an unrelated prompt in front of enrolling.',
          claimsDelivery: 'Leave it on “Encrypted” (the default). mode=2fa_enroll delivers no claim values at all — it records an enrollment and returns — so neither setting changes anything here.',
          claimConfig: 'Leave every box unticked and every “Stay-connected field” on “Not linkable”. Enrollment touches none of the scope/claim machinery.'
        }
      },
      { form: 'service-client', settings: SERVICE_CLIENT_SETTINGS },
      {
        form: 'account-client',
        settings: {
          name: 'Anything — “number-matching toggle” says what you made it for. This client exists ONLY to flip number matching, because the portal has no control for it.',
          capabilities: 'Tick “Service management” and nothing else. That is the group granting /api/services*, which is what PUT /api/services/{id}/number-matching lives under. Leave “Company profile & fields”, “Customer connections & feed” and especially “Sign-in apps (OAuth)” unticked — none of them is needed, and the last one is powerful.',
          redirectUri: 'Leave it EMPTY. It enables the authorization-code flow, and you want the client_credentials one: POST /oauth2/token with grant_type=client_credentials and this client’s id/secret, then send the resulting bearer token on the PUT.'
        }
      }
    ],
    prerequisites: [PHONE_PREREQ],
    fields: [
      { key: 'oauthClientId', label: 'OAuth app client id (with service reference)', type: 'text' },
      { key: 'oauthClientSecret', label: 'OAuth app client secret', type: 'secret' },
      { key: 'clientId', label: 'Data client id (service-2fa whitelist)', type: 'text' },
      { key: 'clientSecret', label: 'Data client secret', type: 'secret' },
      {
        key: 'servicePrivateKeyPem',
        label: 'Service private key (PEM)',
        type: 'pem',
        hint: 'The service-2fa data client decrypts with the service private key. Read into localStorage; on Save written under .runtime/config/keys (0600) and referenced by path in the SDK config file.'
      },
      { key: 'keyPassphrase', label: 'Service key passphrase', type: 'passphrase', hint: 'The passphrase for the service private key above — Client() decrypts the PEM with it at construction.' },
      { key: 'shareCode', label: 'Person share code (to challenge)', type: 'text', hint: 'The connected person’s share code — the target of the 2FA challenge.' },
      {
        key: 'demoUserName',
        label: 'Demo user name',
        type: 'text',
        hint: 'The fake local login is one field — no password, no backend user store. This name is a frontend setup value only.'
      },
      ...ADVANCED
    ]
  },
  ...COMPANYDATA_SCENARIOS,
  // ── Flow family ─────────────────────────────────────────────────────────
  // A flow run needs no OAuth consent redirect (it drives the company party
  // via a data client + the service key), so its advanced block is API-URL only.
  {
    id: 'flow:run',
    kind: 'runnable',
    title: 'Run a contract flow',
    summary:
      'Trigger a contract flow and drive the company party through it: type-checked step filling (one deliberate reject → accept), a person turn on the phone, then the decrypted answers and — for the contract fixture — the signed document.',
    readmeChapter: 'Run a contract flow',
    runButton: 'Trigger the flow run',
    portalSetup: [
      { form: 'service-create', settings: SERVICE_CREATE_SETTINGS },
      { form: 'service-overview', settings: SERVICE_OVERVIEW_SETTINGS },
      { form: 'service-client', settings: SERVICE_CLIENT_SETTINGS },
      {
        form: 'service-flows',
        settings: {
          newFlowName: 'SKIP it. That row authors a brand-new empty flow; this scenario runs a ready-made package. Only use it if you want to build a flow by hand instead.',
          import: 'Press “Import” and pick ONE of the two .zip packages shipped with the example you started — they sit in its fixtures/ folder — the info-gathering one or the contract one. Whichever you pick, pick the same one in the “Fixture” input below. Import drops you straight into the flow builder on the imported DRAFT.',
          publish: 'Press “Publish” at the top of the builder. An imported flow is a draft and a run cannot be triggered against a draft, so skipping this is the single most common way this scenario fails to start. Publishing appends a version; the flow id in the address bar does not change.'
        }
      }
    ],
    prerequisites: [
      'A physical phone with the allme app, signed in as the connected demo person — the person answers their turn (and, for the contract fixture, signs the document) on the phone.'
    ],
    fields: [
      { key: 'clientId', label: 'Service data client id', type: 'text' },
      { key: 'clientSecret', label: 'Service data client secret', type: 'secret' },
      {
        key: 'servicePrivateKeyPem',
        label: 'Service private key (PEM)',
        type: 'pem',
        hint: 'The flow answers + document copy are service-key-encrypted; this key decrypts them. Read into localStorage; on Save written under .runtime/config/keys (0600) and referenced by path in the SDK config file.'
      },
      { key: 'keyPassphrase', label: 'Service key passphrase', type: 'passphrase' },
      { key: 'flowId', label: 'Published flow id', type: 'text', hint: 'The id of the flow you imported AND published in the portal — the last segment of the flow builder’s address after you publish (…/services/<serviceId>/flows/<flowId>). Copy it from the address bar; there is no “copy id” button.' },
      { key: 'connectionId', label: 'Connection id', type: 'text', hint: 'The connection to the demo person — the flow’s customer party binds to this connection’s person. The portal shows no per-service list of connected people, so this does NOT come from the portal: run the “Read connected people” scenario first and open its Raw view — each entry’s connectionId is the value this scenario wants.' },
      {
        key: 'fixture',
        label: 'Fixture',
        type: 'select',
        options: [
          { value: 'info', label: 'Info-gathering (data only, a person turn)' },
          { value: 'contract', label: 'Contract (document + signature)' }
        ],
        hint: 'Pick the fixture you imported. The contract fixture also downloads the generated signed document on completion.'
      },
      ...FLOW_ADVANCED
    ]
  }
];

export const SCENARIOS_BY_ID = SCENARIOS.reduce((acc, s) => {
  acc[s.id] = s;
  return acc;
}, {});

// ── scenario families ────────────────────────────────────────────────────────
// One backend now serves ALL families from one port, so the portal groups the grid
// into a section per family. The family is derived from the scenario id: the
// identity family kept its original bare integer ids (1–8, contract v1), the later
// families are namespaced `<family>:<name>`.
export const FAMILIES = [
  { key: 'identity', title: 'Identity', blurb: 'Sign in with allme, OIDC login, and 2FA — the scenarios a site uses to authenticate a person.' },
  { key: 'company-data', title: 'Company data', blurb: 'The regular company-data surface: read connected people, request fields, the change feed, webhooks and documents.' },
  { key: 'flow', title: 'Contract flows', blurb: 'Drive a contract flow end to end: trigger, type-check a step, the person’s turn, then the answers and the generated document.' }
];

export function familyOf(id) {
  const s = String(id);
  if (s.startsWith('companydata:')) return 'company-data';
  if (s.startsWith('flow:')) return 'flow';
  return 'identity'; // the v1 integer ids
}

// A runnable scenario is "ready" when every required (non-advanced) field has a
// value. Advanced inputs always have a default, so they never gate readiness.
export function isScenarioReady(scenario, values) {
  const required = scenario.fields.filter((f) => !f.advanced);
  return required.every((f) => {
    const v = values[f.key];
    return typeof v === 'string' ? v.trim().length > 0 : Boolean(v);
  });
}

// The one classification behind every "where am I" signal in the UI: the card
// badge in the grid AND the icon beside the scenario in the left nav read this,
// so a scenario can never look ready in one place and not in the other.
// `guide` | `ready` | `setup`.
export function scenarioStatus(scenario, values) {
  if (scenario.kind === 'guide') return 'guide';
  return isScenarioReady(scenario, values) ? 'ready' : 'setup';
}

// ── portal-setup completeness ─────────────────────────────────────────────────
// The whole point of PORTAL_FORMS is that an unexplained portal control becomes
// DETECTABLE instead of a matter of memory. This is the detector, and it is the ONE
// implementation of the rule: `PortalSetup.jsx` renders its findings as a loud row and
// `scripts/check-portal-setup.mjs` (run by `npm run check`, and by `prebuild` before
// every release build) exits non-zero on any of them.
//
// ⚠ **ABSENCE IS A FINDING, NOT A PASS**. Iterating `scenario.portalSetup || []` directly
// would make a scenario with NO declaration produce zero gaps: the check would exit 0 while
// merely reporting a smaller scenario count, the UI would render nothing, and deleting a
// scenario's whole `portalSetup` would silently restore an under-specified state with
// nothing to flag it. That is the "nothing was checked read as nothing is wrong" defect
// class the project already refuses elsewhere (standards §4: `check-keys.js` exits
// non-zero when no platform was present to check). So the declaration itself is
// mandatory, and the ONLY way to say a scenario needs no portal work is to say it OUT LOUD
// with `noPortalSetup('<why>')` — silence is not an answer at the declaration level either.
//
// Four kinds of finding, all defects in the DATA rather than in a reader's setup:
//   `missing-declaration` — the scenario declares no portal setup at all (absent, empty,
//                           or a `noPortalSetup()` with no reason given).
//   `unknown-form`        — the scenario names a form the catalog does not have.
//   `missing-setting`     — the form renders a control the scenario says nothing about.
//   `unknown-setting`     — the scenario answers a control the form does not render
//                           (usually a control the portal removed, or a typo'd key).

/**
 * The explicit, reasoned opt-out — the one legitimate alternative to a list of forms.
 * Every scenario shipped today needs portal work, so nothing uses it yet; it exists so
 * that "this scenario genuinely touches no portal form" is a DECLARATION the checker can
 * tell apart from an omission, instead of the two being the same empty value.
 */
export function noPortalSetup(reason) {
  return { none: reason };
}

/**
 * Normalise a scenario's declaration into exactly one of three shapes, so the renderer and
 * the checker cannot disagree about what "declared" means:
 *   {mode:'forms', entries}  — a non-empty list of portal forms to explain.
 *   {mode:'none', reason}    — an explicit, reasoned opt-out.
 *   {mode:'undeclared'}      — anything else: absent, null, `[]`, `{}`, a reasonless
 *                              opt-out, or a wrong type. All of them are findings.
 */
export function portalSetupDeclaration(scenario) {
  const decl = scenario.portalSetup;
  if (Array.isArray(decl)) {
    return decl.length > 0 ? { mode: 'forms', entries: decl } : { mode: 'undeclared' };
  }
  if (decl && typeof decl === 'object' && typeof decl.none === 'string' && decl.none.trim().length > 0) {
    return { mode: 'none', reason: decl.none };
  }
  return { mode: 'undeclared' };
}

export function portalSetupGaps(scenario) {
  const declaration = portalSetupDeclaration(scenario);
  if (declaration.mode === 'undeclared') {
    return [{ kind: 'missing-declaration' }];
  }
  if (declaration.mode === 'none') {
    return [];
  }
  const gaps = [];
  for (const entry of declaration.entries) {
    const form = PORTAL_FORMS[entry.form];
    if (!form) {
      gaps.push({ kind: 'unknown-form', form: entry.form });
      continue;
    }
    // The SAME class as `missing-declaration`, one level up: a catalog entry with no
    // controls makes the per-control loop below iterate nothing, so a scenario naming it
    // would explain nothing and still come back clean. Emptiness must never read as
    // completeness at ANY level of this model.
    if (!Array.isArray(form.controls) || form.controls.length === 0) {
      gaps.push({ kind: 'empty-form', form: entry.form });
      continue;
    }
    const settings = entry.settings || {};
    for (const control of form.controls) {
      const v = settings[control.key];
      if (typeof v !== 'string' || v.trim().length === 0) {
        gaps.push({ kind: 'missing-setting', form: entry.form, control: control.key, label: control.label });
      }
    }
    for (const key of Object.keys(settings)) {
      if (!form.controls.some((c) => c.key === key)) {
        gaps.push({ kind: 'unknown-setting', form: entry.form, control: key });
      }
    }
  }
  return gaps;
}

/** Every scenario's gaps, flattened — what the check script reports on. */
export function allPortalSetupGaps() {
  return SCENARIOS.flatMap((s) => portalSetupGaps(s).map((g) => ({ scenario: s.id, ...g })));
}

/**
 * The CATALOG's own integrity, checked independently of who names it — same reasoning as
 * `empty-form` above, but it fires even when no scenario references the form yet, so a
 * half-written entry cannot sit in the catalog waiting to pass silently later.
 */
export function portalFormCatalogGaps() {
  const gaps = [];
  for (const [key, form] of Object.entries(PORTAL_FORMS)) {
    const text = (v) => typeof v === 'string' && v.trim().length > 0;
    if (!text(form.title) || !text(form.path)) {
      gaps.push({ kind: 'form-missing-label', form: key });
    }
    if (!Array.isArray(form.controls) || form.controls.length === 0) {
      gaps.push({ kind: 'empty-form', form: key });
      continue;
    }
    for (const control of form.controls) {
      if (!text(control.key) || !text(control.label)) {
        gaps.push({ kind: 'control-missing-label', form: key, control: control.key });
      }
    }
  }
  return gaps;
}
