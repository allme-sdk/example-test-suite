import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  Play,
  Smartphone,
  X,
  XCircle
} from 'lucide-react';
import * as ui from '../ui.js';
import { startScenario, enrollScenario, getRun } from '../lib/api.js';
import { qrDataUrl } from '../lib/qr.js';

const DETACHED_CAVEAT =
  'Against the default deployed target the QR works on a phone. Running against a LOCAL stack, a localhost… QR is unreachable from a phone — use the link on this machine as the local test.';

/** The Raw JSON disclosure, identical wherever a result is shown. */
function RawToggle({ value }) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <div className="pt-1">
      <button type="button" className={ui.btnGhost} onClick={() => setShowRaw((x) => !x)}>
        {showRaw ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        Raw
      </button>
      {showRaw && <pre className={ui.pre}>{JSON.stringify(value, null, 2)}</pre>}
    </div>
  );
}

// Each decrypted value (a flow answer or an identity claim) is shown paired with the
// ciphertext it was decrypted from — the same row, never two separate lists — so a reader
// can see the decrypt actually ran on real bytes rather than take it on faith. A slug with
// no ciphertext (nothing came back encrypted for it) says so plainly instead of hiding the
// row. `cipher` is whatever shape the caller's raw wire value takes — a pre-serialized
// string (flow answers) or a parsed JSON wrapper object (identity claims) — so it goes
// through fmtVal exactly like `value` rather than being rendered as a raw child.
function AnswerRows({ answers }) {
  return (
    <div className="mt-2 space-y-2">
      {answers.map((a, i) => (
        <div key={i} className="rounded-lg border border-line bg-surface p-3 space-y-1">
          <div className="text-xs font-medium text-muted">{a.slug}</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm items-baseline">
            <span className={ui.faint}>Ciphertext</span>
            <span className={`${ui.code} break-all`}>
              {a.cipher ? fmtVal(a.cipher) : <span className={ui.faint}>(none returned for this slug)</span>}
            </span>
            <span className={ui.faint}>Decrypted</span>
            <span className={`${ui.code} break-words`}>{fmtVal(a.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Flow family: the result is {status, steps[], answers?, document?} and
// accumulates across polls. Rendered distinctly from the generic key→value area:
// a live step log (each type-checked submit, incl. the deliberate reject→accept),
// a waiting-on-phone banner, then the decrypted answers (each paired with the
// ciphertext it came from) + document status.
function FlowResult({ result }) {
  const steps = Array.isArray(result.steps) ? result.steps : [];
  const answers = Array.isArray(result.answers) ? result.answers : null;
  const doc = result.document || null;
  return (
    <div className={`${ui.block} space-y-3`}>
      <h4 className={ui.h4}>Flow run</h4>
      {result.status === 'waiting_person' && (
        <div className={`${ui.noteBox} flex items-center gap-2`}>
          <Smartphone className="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-300" />
          Waiting — the person answers this step on their phone. Polling continues automatically.
        </div>
      )}
      {steps.length > 0 && (
        <ol className="space-y-1.5">
          {steps.map((st, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-body">
              {st.accepted ? (
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <X className="w-4 h-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
              )}
              <span>
                <strong className="text-heading">{st.slug}</strong>
                <span className="text-muted"> ({st.type})</span> — submitted{' '}
                <code className={ui.code}>{String(st.submitted)}</code>{' '}
                {st.accepted ? 'accepted' : `rejected${st.error ? ` — ${st.error}` : ''}`}
              </span>
            </li>
          ))}
        </ol>
      )}
      {answers && (
        <div>
          <h4 className={ui.h4}>Decrypted answers</h4>
          <p className={ui.faint}>Each value next to the service-key ciphertext it was decrypted from.</p>
          <AnswerRows answers={answers} />
        </div>
      )}
      {doc && (
        <div className={ui.noteBox}>
          Document: {doc.status}
          {doc.downloaded ? ' — downloaded via flowRunDocument()' : ''}
        </div>
      )}
      <RawToggle value={result} />
    </div>
  );
}

function fmtVal(v) {
  if (v === null || v === undefined) return '—';
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

function KeyVal({ rows }) {
  return (
    <dl className="mt-2 divide-y divide-line rounded-lg border border-line overflow-hidden">
      {rows.map(([k, v], i) => (
        <div key={i} className="grid grid-cols-3 gap-3 px-3 py-2 bg-surface">
          <dt className="col-span-1 text-xs font-medium text-muted break-words">{k}</dt>
          <dd className={`col-span-2 text-sm text-body break-words ${ui.code}`}>{fmtVal(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

// companydata:read — one card per connected person; two people who filled the
// same slug stay distinguishable (spec §2). The compact renderer shows the pinned
// columns; the Raw toggle shows the whole result.
function Connections({ connections }) {
  if (!connections.length) return <div className={ui.sub}>No connected people.</div>;
  return (
    <div className="space-y-3">
      {connections.map((c, i) => (
        <div key={c.connectionId || i} className="rounded-lg border border-line bg-surface p-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={ui.h4}>{c.displayName || '(unnamed)'}</span>
            <span className={ui.faint}>
              {c.shareCode || 'no share code'}
              {c.customerType ? ` · ${c.customerType}` : ''}
            </span>
          </div>
          {c.values && c.values.length ? (
            <KeyVal rows={c.values.map((v) => [v.slug, `${fmtVal(v.value)}${v.live === false ? ' (stale)' : ''}`])} />
          ) : (
            <div className={`${ui.sub} mt-1`}>No shared values.</div>
          )}
        </div>
      ))}
    </div>
  );
}

// companydata:definitions — the request-field catalog.
function Fields({ fields }) {
  if (!fields.length) return <div className={ui.sub}>No request fields configured.</div>;
  return (
    <KeyVal
      rows={fields.map((f) => [
        f.slug,
        `${f.label || ''} · ${f.type || ''}${f.mandatory ? ' · mandatory' : ' · optional'}${f.one_time ? ' · one-time' : ''}`
      ])}
    />
  );
}

// companydata:changes / :webhook — one row per event. The event name is always
// present (connection_created vs connection_deleted vs document_status_changed stay
// distinguishable); source labels a webhook delivery vs a pull-feed row. The Raw
// toggle shows every event's `raw` object (the full public Change fields).
function Events({ events }) {
  if (!events.length) return <div className={ui.sub}>No events yet.</div>;
  return (
    <KeyVal
      rows={events.map((e) => [
        `${e.source ? `${e.source}: ` : ''}${e.event || e.note || '(event)'}`,
        [
          e.slug ? `${e.slug}=${fmtVal(e.value)}` : null,
          e.documentId ? `doc ${e.documentId}${e.status ? ` (${e.status})` : ''}` : null,
          e.shareCode ? `share ${e.shareCode}` : null,
          e.at || null
        ]
          .filter(Boolean)
          .join(' · ') || '—'
      ])}
    />
  );
}

// companydata:documents — the documents actually created this run (as many as were selected in
// setup, never assumed to be all six — a partial selection must not read as a partial failure).
function Docs({ docs }) {
  if (!docs.length) return <div className={ui.sub}>No documents created.</div>;
  return (
    <KeyVal rows={docs.map((d) => [`${d.index}. ${d.label}`, `${d.document_id || ''}${d.status ? ` (${d.status})` : ''}`])} />
  );
}

// identity family (scenarios 1-4): a completeSignIn result carries `values` (decrypted claims)
// paired with `values_cipher` (the SAME claims' raw app-key ciphertext, keyed identically) — the
// sibling always present (empty for signin mode, which asks for none) rather than only sometimes
// there, so its presence alone identifies this result shape. Reuses AnswerRows (the flow family's
// paired renderer) rather than a second copy: this is the same pairing, just adapted from a
// claim-name-keyed map instead of a slug-keyed list.
function SignInValues({ values, cipher }) {
  const rows = Object.keys(values || {}).map((slug) => ({
    slug,
    value: values[slug],
    cipher: cipher ? cipher[slug] : undefined
  }));
  if (rows.length === 0) {
    return <div className={ui.sub}>No claim values (this mode asked for none).</div>;
  }
  return <AnswerRows answers={rows} />;
}

// Shape-aware body: the pinned company-data result schemas render richly; any other
// object falls back to a generic key→value grid. The Raw view (JSON.stringify(result))
// always shows everything, incl. each event's `raw` object.
function DataBody({ result }) {
  if (Array.isArray(result.connections)) return <Connections connections={result.connections} />;
  if (Array.isArray(result.fields)) return <Fields fields={result.fields} />;
  if (Array.isArray(result.events)) {
    return (
      <div>
        {(result.webhookId || result.unparseable) && (
          <div className={`${ui.faint} mb-2`}>
            {result.webhookId ? `webhook ${result.webhookId}` : ''}
            {result.unparseable ? ` · ${result.unparseable} unparseable` : ''}
          </div>
        )}
        <Events events={result.events} />
      </div>
    );
  }
  if (Array.isArray(result.docs)) return <Docs docs={result.docs} />;
  // scenario 5 (OIDC login): the id_token's own claims, plus any additional value read via
  // userinfo. Always rendered — never gated on there being something to show — because "nothing
  // came back" is itself a fact worth telling apart from an actionable problem.
  if (result.claims !== undefined && typeof result.claims === 'object' && result.claims !== null) {
    const { claims, values, values_cipher: cipher, values_gap: gap, attestations, ...rest } = result;
    const hasValues = values && typeof values === 'object' && Object.keys(values).length > 0;
    const rejected = Object.entries(attestations || {})
      .filter(([slug, a]) => a && a.verified === false && !(values && slug in values))
      .map(([slug]) => slug);
    return (
      <div className="space-y-3">
        <div>
          <h4 className={ui.h4}>id_token claims</h4>
          <KeyVal rows={Object.entries(claims)} />
        </div>
        <div>
          <h4 className={ui.h4}>Claim values via userinfo</h4>
          <p className={ui.faint}>
            A value the id_token cannot carry is read and decrypted separately, below (an attestation is
            checked when the claim carries one; its absence means unverified, not rejected). What is shown
            may be a SUBSET: a claim beyond these may have been declined, left unanswered, or none was
            requested — the platform never tells a relying party which case applies.
          </p>
          {gap && <div className="mt-1 text-sm text-amber-700 dark:text-amber-400">{gap}</div>}
          {hasValues && <SignInValues values={values} cipher={cipher} />}
          {rejected.length > 0 && (
            <div className="mt-1 text-sm text-red-700 dark:text-red-400">
              Withheld — verification mismatch, so the delivered value was rejected rather than shown: {rejected.join(', ')}.
            </div>
          )}
          {!gap && !hasValues && rejected.length === 0 && (
            <div className={`mt-1 text-sm ${ui.sub}`}>No claim values came back beyond what is shown above.</div>
          )}
        </div>
        {Object.keys(rest).length > 0 && <KeyVal rows={Object.entries(rest)} />}
      </div>
    );
  }
  if (result.values_cipher !== undefined && typeof result.values === 'object' && result.values !== null) {
    const { values, values_cipher: cipher, ...rest } = result;
    return (
      <div className="space-y-3">
        <KeyVal rows={Object.entries(rest)} />
        <div>
          <h4 className={ui.h4}>Claim values</h4>
          <p className={ui.faint}>Each decrypted value next to the app-key ciphertext it was decrypted from.</p>
          <SignInValues values={values} cipher={cipher} />
        </div>
      </div>
    );
  }
  if (typeof result === 'object' && !Array.isArray(result)) {
    return <KeyVal rows={Object.entries(result)} />;
  }
  return <div className={ui.sub}>Result is not a key→value object; see raw below.</div>;
}

function DataArea({ result }) {
  if (result === undefined || result === null) return null;
  // A flow-family result carries a steps[] array — render it with the flow view.
  if (Array.isArray(result.steps)) return <FlowResult result={result} />;

  return (
    <div className={`${ui.block} space-y-2`}>
      <h4 className={ui.h4}>Data</h4>
      <DataBody result={result} />
      <RawToggle value={result} />
    </div>
  );
}

function WhatHappened({ calls, readmeChapter }) {
  if (!calls || !calls.length) return null;
  return (
    <div className={`${ui.block} space-y-2`}>
      <h4 className={ui.h4}>What just happened</h4>
      <ol className="space-y-1.5">
        {calls.map((call, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-body">
            <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-[11px] font-semibold flex items-center justify-center">
              {i + 1}
            </span>
            <span className={ui.code}>{call}</span>
          </li>
        ))}
      </ol>
      {readmeChapter && (
        <div className={ui.faint}>
          SDK README chapter: <span className="text-brand-700 dark:text-brand-300">{readmeChapter}</span>
        </div>
      )}
    </div>
  );
}

function StatusRow({ status }) {
  const map = {
    pending: [
      <Loader2 key="i" className="w-4 h-4 animate-spin text-brand-600 dark:text-brand-300" />,
      'Running — polling GET /api/runs/{runId}…'
    ],
    done: [<Check key="i" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />, 'Done'],
    failed: [<XCircle key="i" className="w-4 h-4 text-red-600 dark:text-red-400" />, 'Failed']
  };
  const [icon, label] = map[status] || map.pending;
  return (
    <div className="flex items-center gap-2 text-sm text-body">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function DetachedPanel({ url }) {
  return (
    <div className={`${ui.block} space-y-3`}>
      <h4 className={`${ui.h4} flex items-center gap-1.5`}>
        <Smartphone className="w-4 h-4 text-brand-600 dark:text-brand-300" />
        Continue on your phone
      </h4>
      <div className="flex flex-wrap items-start gap-4">
        <div className="rounded-lg border border-line bg-white p-2 shrink-0">
          <img src={qrDataUrl(url)} alt="QR code for the detached sign-in URL" className="block w-40 h-40" />
        </div>
        <div className="flex-1 min-w-[16rem] space-y-2">
          <div className={ui.sub}>Open on your phone, or click here on this machine:</div>
          <a
            className="inline-flex items-center gap-1 text-sm text-brand-700 dark:text-brand-300 hover:underline break-all"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            {url}
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
          <div className={ui.faint}>{DETACHED_CAVEAT}</div>
        </div>
      </div>
    </div>
  );
}

function ChallengePanel({ matchingDigits }) {
  return (
    <div className={`${ui.block} space-y-2`}>
      <h4 className={`${ui.h4} flex items-center gap-1.5`}>
        <Smartphone className="w-4 h-4 text-brand-600 dark:text-brand-300" />
        Approve on your phone
      </h4>
      {matchingDigits ? (
        <div>
          <div className={ui.sub}>Match these digits in the allme app, then approve:</div>
          <div className="mt-1 font-mono text-3xl font-semibold tracking-[0.3em] text-heading">{matchingDigits}</div>
        </div>
      ) : (
        <div className={ui.sub}>
          Approve or deny the challenge in the allme app. (Number matching is off for this run.)
        </div>
      )}
    </div>
  );
}

export default function RunPanel({ scenario, resumeRunId, canRun, needsSave }) {
  const [runId, setRunId] = useState(resumeRunId || null);
  const [action, setAction] = useState(null); // {type, url?, matchingDigits?}
  const [status, setStatus] = useState(resumeRunId ? 'pending' : null);
  const [calls, setCalls] = useState([]);
  const [result, setResult] = useState(undefined);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef(null);

  // Poll GET /api/runs/{runId} until it leaves "pending" (or 404s).
  useEffect(() => {
    if (!runId) return undefined;
    let cancelled = false;

    async function tick() {
      try {
        const run = await getRun(runId);
        if (cancelled) return;
        if (run === null) {
          setError('Run not found or expired (404).');
          setStatus('failed');
          return;
        }
        if (run.calls) setCalls(run.calls);
        // Render accumulating results while pending: flow grows steps and
        // companydata:webhook grows events.
        if (run.result !== undefined) setResult(run.result);
        if (run.status === 'pending') {
          timerRef.current = setTimeout(tick, 1500);
          return;
        }
        setStatus(run.status);
        if (run.status === 'done') setResult(run.result !== undefined ? run.result : null);
        if (run.status === 'failed') setError(run.error || 'Run failed.');
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Poll failed.');
          setStatus('failed');
        }
      }
    }

    setStatus((prev) => prev || 'pending');
    tick();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [runId]);

  function applyAction(envelope) {
    // envelope: {runId, action}
    setError(null);
    setResult(undefined);
    setCalls([]);
    setAction(envelope.action || { type: 'none' });
    const a = envelope.action || { type: 'none' };
    if (a.type === 'redirect') {
      // Full-page navigation to the authorize URL; the backend /callback 302s
      // back to /?scenario={id}&run={runId} so the app resumes this run.
      window.location.href = a.url;
      return;
    }
    // detached / challenge / none all resume via polling.
    setStatus('pending');
    setRunId(envelope.runId);
  }

  async function run(kind, responseMode) {
    setBusy(true);
    setError(null);
    try {
      // The run executes off the SAVED config file — only the enroll delivery-leg
      // choice (redirect | detached) is sent, never credentials.
      const envelope =
        kind === 'enroll'
          ? await enrollScenario(scenario.id, responseMode)
          : await startScenario(scenario.id);
      applyAction(envelope);
    } catch (e) {
      const msg = e && e.message === 'not_configured'
        ? 'Save your settings first — the run executes off the saved config file.'
        : (e && e.message) || 'Request failed.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {scenario.enrollButton && (
          <button type="button" className={ui.btn} disabled={busy || !canRun} onClick={() => run('enroll', 'redirect')}>
            {scenario.enrollButton}
          </button>
        )}
        {scenario.enrollButtonDetached && (
          <button type="button" className={ui.btn} disabled={busy || !canRun} onClick={() => run('enroll', 'detached')}>
            {scenario.enrollButtonDetached}
          </button>
        )}
        <button type="button" className={ui.btnPrimary} disabled={busy || !canRun} onClick={() => run('start')}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {scenario.runButton}
        </button>
      </div>
      {!canRun && (
        <div className={ui.faint}>
          {needsSave
            ? 'Save your settings above to enable running.'
            : 'Complete the required inputs above to enable running.'}
        </div>
      )}

      {error && (
        <div className={ui.errorBox}>
          <AlertCircle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          {error}
        </div>
      )}

      {action && action.type === 'detached' && status === 'pending' && <DetachedPanel url={action.url} />}
      {action && action.type === 'challenge' && status === 'pending' && (
        <ChallengePanel matchingDigits={action.matchingDigits} />
      )}

      {status && <StatusRow status={status} />}

      <DataArea result={result} />
      <WhatHappened calls={calls} readmeChapter={scenario.readmeChapter} />
    </div>
  );
}
