import { useEffect, useRef, useState } from 'react';
import s from '../brand.module.css';
import { startScenario, enrollScenario, getRun } from '../lib/api.js';
import { qrDataUrl } from '../lib/qr.js';

const DETACHED_CAVEAT =
  'Against the default deployed target the QR works on a phone. Running against a LOCAL stack, a localhost… QR is unreachable from a phone — use the link on this machine as the local test.';

// Flow family (#484): the result is {status, steps[], answers?, document?} and
// accumulates across polls. Rendered distinctly from the generic key→value area:
// a live step log (each type-checked submit, incl. the deliberate reject→accept),
// a waiting-on-phone banner, then the decrypted answers + document status.
function FlowResult({ result }) {
  const [showRaw, setShowRaw] = useState(false);
  const steps = Array.isArray(result.steps) ? result.steps : [];
  const answers = Array.isArray(result.answers) ? result.answers : null;
  const doc = result.document || null;
  return (
    <div className={s.block}>
      <h4 className={s.blockTitle}>Flow run</h4>
      {result.status === 'waiting_person' && (
        <div className={s.prereq}>Waiting — the person answers this step on their phone. Polling continues automatically.</div>
      )}
      {steps.length > 0 && (
        <ol className={s.calls}>
          {steps.map((st, i) => (
            <li key={i}>
              <span className={`${s.dot} ${st.accepted ? s.dotDone : s.dotFailed}`} />
              <span>
                <strong>{st.slug}</strong>
                <span className={s.muted}> ({st.type})</span> — submitted <code>{String(st.submitted)}</code>{' '}
                {st.accepted ? 'accepted ✓' : `rejected ✗${st.error ? ` — ${st.error}` : ''}`}
              </span>
            </li>
          ))}
        </ol>
      )}
      {answers && (
        <>
          <h4 className={s.blockTitle}>Decrypted answers</h4>
          <div className={s.dataRows}>
            {answers.map((a) => (
              <div key={a.slug} style={{ display: 'contents' }}>
                <div className={s.dataKey}>{a.slug}</div>
                <div className={s.dataVal}>{typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value)}</div>
              </div>
            ))}
          </div>
        </>
      )}
      {doc && (
        <div className={s.prereq}>
          Document: {doc.status}{doc.downloaded ? ' — downloaded via flowRunDocument()' : ''}
        </div>
      )}
      <button type="button" className={s.advToggle} onClick={() => setShowRaw((x) => !x)}>
        {showRaw ? '▾ Raw' : '▸ Raw'}
      </button>
      {showRaw && <pre className={s.raw}>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

function fmtVal(v) {
  if (v === null || v === undefined) return '—';
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

function KeyVal({ rows }) {
  return (
    <div className={s.dataRows}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <div className={s.dataKey}>{k}</div>
          <div className={s.dataVal}>{fmtVal(v)}</div>
        </div>
      ))}
    </div>
  );
}

// companydata:read — one card per connected person; two people who filled the
// same slug stay distinguishable (spec §2). The compact renderer shows the pinned
// columns; the Raw toggle shows the whole result.
function Connections({ connections }) {
  if (!connections.length) return <div className={s.muted}>No connected people.</div>;
  return (
    <div>
      {connections.map((c, i) => (
        <div key={c.connectionId || i} className={s.block} style={{ marginTop: i ? 12 : 0 }}>
          <div className={s.blockTitle}>
            {c.displayName || '(unnamed)'}{' '}
            <span className={s.muted}>· {c.shareCode || 'no share code'}{c.customerType ? ` · ${c.customerType}` : ''}</span>
          </div>
          {c.values && c.values.length ? (
            <KeyVal rows={c.values.map((v) => [v.slug, `${fmtVal(v.value)}${v.live === false ? ' (stale)' : ''}`])} />
          ) : (
            <div className={s.muted}>No shared values.</div>
          )}
        </div>
      ))}
    </div>
  );
}

// companydata:definitions — the request-field catalog.
function Fields({ fields }) {
  if (!fields.length) return <div className={s.muted}>No request fields configured.</div>;
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
  if (!events.length) return <div className={s.muted}>No events yet.</div>;
  return (
    <div className={s.dataRows}>
      {events.map((e, i) => (
        <div key={e.id || i} style={{ display: 'contents' }}>
          <div className={s.dataKey}>
            {e.source ? `${e.source}: ` : ''}{e.event || e.note || '(event)'}
          </div>
          <div className={s.dataVal}>
            {[
              e.slug ? `${e.slug}=${fmtVal(e.value)}` : null,
              e.documentId ? `doc ${e.documentId}${e.status ? ` (${e.status})` : ''}` : null,
              e.shareCode ? `share ${e.shareCode}` : null,
              e.at || null
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

// companydata:documents — the six created documents.
function Docs({ docs }) {
  if (!docs.length) return <div className={s.muted}>No documents created.</div>;
  return (
    <KeyVal rows={docs.map((d) => [`${d.index}. ${d.label}`, `${d.document_id || ''}${d.status ? ` (${d.status})` : ''}`])} />
  );
}

// Shape-aware body: the pinned company-data result schemas render richly; any other
// object falls back to a generic key→value grid (the identity family). The Raw view
// (JSON.stringify(result)) always shows everything, incl. each event's `raw` object.
function DataBody({ result }) {
  if (Array.isArray(result.connections)) return <Connections connections={result.connections} />;
  if (Array.isArray(result.fields)) return <Fields fields={result.fields} />;
  if (Array.isArray(result.events)) {
    return (
      <div>
        {(result.webhookId || result.unparseable) && (
          <div className={s.muted} style={{ marginBottom: 8 }}>
            {result.webhookId ? `webhook ${result.webhookId}` : ''}
            {result.unparseable ? ` · ${result.unparseable} unparseable` : ''}
          </div>
        )}
        <Events events={result.events} />
      </div>
    );
  }
  if (Array.isArray(result.docs)) return <Docs docs={result.docs} />;
  if (typeof result === 'object' && !Array.isArray(result)) {
    return <KeyVal rows={Object.entries(result)} />;
  }
  return <div className={s.muted}>Result is not a key→value object; see raw below.</div>;
}

function DataArea({ result }) {
  const [showRaw, setShowRaw] = useState(false);
  if (result === undefined || result === null) return null;
  // A flow-family result carries a steps[] array — render it with the flow view.
  if (Array.isArray(result.steps)) return <FlowResult result={result} />;

  return (
    <div className={s.block}>
      <h4 className={s.blockTitle}>Data</h4>
      <DataBody result={result} />
      <button type="button" className={s.advToggle} onClick={() => setShowRaw((x) => !x)}>
        {showRaw ? '▾ Raw' : '▸ Raw'}
      </button>
      {showRaw && <pre className={s.raw}>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

function WhatHappened({ calls, readmeChapter }) {
  if (!calls || !calls.length) return null;
  return (
    <div className={s.block}>
      <h4 className={s.blockTitle}>What just happened</h4>
      <ol className={s.calls}>
        {calls.map((call, i) => (
          <li key={i}>
            <span className={s.callIndex}>{i + 1}</span>
            {call}
          </li>
        ))}
      </ol>
      {readmeChapter && (
        <div className={s.readmeLink}>
          <span className={s.muted}>PHP SDK README chapter: </span>
          <span className={s.link}>{readmeChapter}</span>
        </div>
      )}
    </div>
  );
}

function StatusRow({ status }) {
  const map = {
    pending: [s.dotPending, 'Running — polling GET /api/runs/{runId}…'],
    done: [s.dotDone, 'Done'],
    failed: [s.dotFailed, 'Failed']
  };
  const [dot, label] = map[status] || map.pending;
  return (
    <div className={s.statusRow}>
      <span className={`${s.dot} ${dot}`} />
      <span>{label}</span>
    </div>
  );
}

function DetachedPanel({ url }) {
  return (
    <div className={s.block}>
      <h4 className={s.blockTitle}>Continue on your phone</h4>
      <div className={s.detached}>
        <div className={s.qr}>
          <img src={qrDataUrl(url)} alt="QR code for the detached sign-in URL" />
        </div>
        <div className={s.detachedInfo}>
          <div>
            <div className={s.muted}>Open on your phone, or click here on this machine:</div>
            <a className={s.link} href={url} target="_blank" rel="noreferrer">{url}</a>
          </div>
          <div className={s.caveat}>{DETACHED_CAVEAT}</div>
        </div>
      </div>
    </div>
  );
}

function ChallengePanel({ matchingDigits }) {
  return (
    <div className={s.block}>
      <h4 className={s.blockTitle}>Approve on your phone</h4>
      {matchingDigits ? (
        <div>
          <div className={s.muted}>Match these digits in the allme app, then approve:</div>
          <div className={s.digits}>{matchingDigits}</div>
        </div>
      ) : (
        <div className={s.muted}>Approve or deny the challenge in the allme app. (Number matching is off for this run.)</div>
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
    <div className={s.block}>
      <div className={s.runButtons}>
        {scenario.enrollButton && (
          <button
            type="button"
            className={s.btn}
            disabled={busy || !canRun}
            onClick={() => run('enroll', 'redirect')}
          >
            {scenario.enrollButton}
          </button>
        )}
        {scenario.enrollButtonDetached && (
          <button
            type="button"
            className={s.btn}
            disabled={busy || !canRun}
            onClick={() => run('enroll', 'detached')}
          >
            {scenario.enrollButtonDetached}
          </button>
        )}
        <button
          type="button"
          className={`${s.btn} ${s.btnPrimary}`}
          disabled={busy || !canRun}
          onClick={() => run('start')}
        >
          {scenario.runButton}
        </button>
      </div>
      {!canRun && (
        <div className={s.fieldHint}>
          {needsSave
            ? 'Save your settings above to enable running.'
            : 'Complete the required inputs above to enable running.'}
        </div>
      )}

      {error && <div className={s.errorBox}>{error}</div>}

      {action && action.type === 'detached' && status === 'pending' && (
        <DetachedPanel url={action.url} />
      )}
      {action && action.type === 'challenge' && status === 'pending' && (
        <ChallengePanel matchingDigits={action.matchingDigits} />
      )}

      {status && <StatusRow status={status} />}

      <DataArea result={result} />
      <WhatHappened calls={calls} readmeChapter={scenario.readmeChapter} />
    </div>
  );
}
