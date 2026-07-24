// The eight identity scenarios as DATA (spec §4). Input schemas match §4:
//  - scenario 3 adds the OAuth app PRIVATE KEY (PEM file-picker) + passphrase
//  - scenario 4 lists the DATA-CLIENT id/secret alongside the SERVICE PEM
//  - scenario 7 is a GUIDE card (no run button) — checklist + links to 1 and 5
//  - scenario 8 distinguishes the OAuth-app-with-service creds from the
//    data-client creds
//
// The grid renders only ids present in GET /api/meta and honors each scenario's
// `kind` from meta (runnable | guide). The `kind` below is the design default;
// meta is authoritative at render time.
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

export const SCENARIOS = [
  {
    id: 1,
    kind: 'runnable',
    title: 'Sign in — redirect',
    summary: 'Classic OAuth redirect sign-in through the PHP SDK: authorizeUrl → /callback → completeSignIn.',
    readmeChapter: 'Sign in (redirect)',
    runButton: 'Sign in (redirect)',
    checklist: [
      'In the allus portal → OAuth apps page, register an OAuth app.',
      'Mark it Confidential (a public app issues NO client secret) and set its redirect URI to http://localhost:8091/callback.',
      'Copy the app’s client id and client secret into the inputs below.'
    ],
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
    checklist: [
      'In the allus portal → OAuth apps page, register an OAuth app (or reuse scenario 1’s).',
      'Mark it Confidential (a public app issues NO client secret) and set its redirect URI to http://localhost:8091/callback.',
      'Copy the app’s client id and client secret into the inputs below.'
    ],
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
    checklist: [
      'In the allus portal → OAuth apps page, register a Confidential OAuth app with NO service selected (the portal labels “No service” as “sign-in / one-time only”). There is NO “enable one-time claims” control — one_time is a mode the SDK sends, not an app setting.',
      'A public app issues NO client secret, so Confidential is required; set its redirect URI to http://localhost:8091/callback.',
      'Download the app’s private key (PEM) from the portal — it decrypts the one-time claim values.',
      'Copy the client id/secret below, pick the downloaded PEM file, and enter its passphrase.'
    ],
    prerequisites: [],
    fields: [
      { key: 'oauthClientId', label: 'OAuth app client id', type: 'text' },
      { key: 'oauthClientSecret', label: 'OAuth app client secret', type: 'secret' },
      {
        key: 'oauthPrivateKeyPem',
        label: 'OAuth app private key (PEM)',
        type: 'pem',
        hint: 'The file content is read into localStorage; on Save the backend writes it under .runtime/config/keys (0600) and records its path in the SDK config file. Clear removes it.'
      },
      { key: 'oauthKeyPassphrase', label: 'Private key passphrase', type: 'passphrase' },
      ...ADVANCED
    ]
  },
  {
    id: 4,
    kind: 'runnable',
    title: 'Connect (stay-connected)',
    summary: 'Mode connect keeps a live, auto-updating record; live values are encrypted per-service and read via the service data client.',
    readmeChapter: 'Connect (stay-connected)',
    runButton: 'Connect and read live values',
    checklist: [
      'In the allus portal, create the SERVICE you connect to (service settings) and download its private key (PEM) — both the OAuth app and the data client reference this service.',
      'OAuth apps page → register an OAuth app for the connect CONSENT (the identity app the person approves): mark it Confidential (a public app issues NO client secret), SELECT THE SERVICE on it (connect is refused with oauth.connect_no_service if the OAuth app carries no service), and set its redirect URI to http://localhost:8091/callback.',
      'Separately, register a data client with the SAME service reference for READING the live values — its redirect is HTTPS-only, so it cannot double as the consent app.',
      'Copy BOTH the OAuth app id/secret and the data client id/secret below, pick the SERVICE PEM, and enter its passphrase.'
    ],
    prerequisites: [],
    fields: [
      { key: 'oauthClientId', label: 'OAuth app client id (connect consent)', type: 'text' },
      { key: 'oauthClientSecret', label: 'OAuth app client secret', type: 'secret' },
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
    checklist: [
      'In the allus portal → OAuth apps page, register an OAuth app — an OAuth app IS the OIDC relying-party registration; there is no separate “OIDC client”.',
      'Mark it Confidential (a public app issues NO client secret) and set its redirect URI to http://localhost:8091/callback. (The example uses client_secret_post token auth — that is fixed provider behavior, not a portal control.)',
      'Copy the OAuth app’s client id and client secret into the inputs below.'
    ],
    prerequisites: [],
    fields: [
      { key: 'oauthClientId', label: 'OAuth app client id (OIDC RP)', type: 'text' },
      { key: 'oauthClientSecret', label: 'OAuth app client secret', type: 'secret' },
      ...ADVANCED
    ]
  },
  {
    id: 6,
    kind: 'runnable',
    title: 'OIDC — continue on your phone',
    summary: 'The desktop consent page polls the flow status and completes by itself once the person approves in the app (#431).',
    readmeChapter: 'OIDC — continue on your phone',
    runButton: 'Start OIDC (continue on phone)',
    checklist: [
      'In the allus portal → OAuth apps page, register an OAuth app (or reuse scenario 5’s) — an OAuth app IS the OIDC relying-party registration; there is no separate “OIDC client”.',
      'Mark it Confidential (a public app issues NO client secret) and set its redirect URI to http://localhost:8091/callback. (The example uses client_secret_post token auth — fixed provider behavior, not a portal control.)',
      'Copy the OAuth app’s client id and client secret into the inputs below.'
    ],
    prerequisites: [PHONE_PREREQ],
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
      'In the allus portal → OAuth apps page, tick “Require 2FA on the OAuth APP”.',
      'Person-account prerequisite: the demo person has TOTP or email 2FA enabled on their allme account (allme app/web → Settings).',
      'There is NO phone-push approval in-flow here and number matching plays no role — that lives only on scenario 8’s service challenges.',
      'Now run scenario 1 (redirect sign-in) and scenario 5 (OIDC login) and watch the consent-side 2FA prompt appear.'
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
    checklist: [
      'Registration (a): in the allus portal → OAuth apps page, register an OAuth app WITH a service reference (required for the 2fa_enroll step). Mark it Confidential (a public app issues NO client secret) and set its redirect URI to http://localhost:8091/callback.',
      'Registration (b): register a data client whose whitelist grants /api/service-2fa/* (used for the challenges).',
      'In the portal service settings, you will toggle number matching ON and OFF to exercise both.',
      'Enter the OAuth-app (with-service) creds, the data-client creds, and a demo user name below. Enroll first — “Enroll device (redirect)” completes via the callback, “Enroll — continue on phone” is the detached leg (link + QR, completes by pollResult) — then run a challenge.'
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
  // ── Flow family (#484) ────────────────────────────────────────────────
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
    checklist: [
      'In the allus portal, register a DATA CLIENT (client_credentials) for the service — its whitelist auto-grants /api/company-data/*.',
      'Create (or reuse) the SERVICE and download its private key (PEM) — the flow answers + document are decrypted with it.',
      'Import the chosen fixture zip (service settings → Flows → Import) from sdks/php/examples/flow/fixtures/, then PUBLISH the imported flow.',
      'Copy the PUBLISHED flow id and the target CONNECTION id below, pick the SERVICE PEM and its passphrase, and enter the data-client id/secret.',
      'Pick the same fixture below that you imported — the backend uses it to know the validation-demo step and whether to download a document.'
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
      { key: 'flowId', label: 'Published flow id', type: 'text', hint: 'The id of the flow you imported AND published in the portal.' },
      { key: 'connectionId', label: 'Connection id', type: 'text', hint: 'The connection to the demo person — the flow’s customer party binds to this connection’s person.' },
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

// A runnable scenario is "ready" when every required (non-advanced) field has a
// value. Advanced inputs always have a default, so they never gate readiness.
export function isScenarioReady(scenario, values) {
  const required = scenario.fields.filter((f) => !f.advanced);
  return required.every((f) => {
    const v = values[f.key];
    return typeof v === 'string' ? v.trim().length > 0 : Boolean(v);
  });
}
