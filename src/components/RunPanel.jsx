import { useEffect, useRef, useState } from 'react';
import s from '../brand.module.css';
import { startScenario, enrollScenario, getRun } from '../lib/api.js';
import { qrDataUrl } from '../lib/qr.js';

const DETACHED_CAVEAT =
  'Against the default deployed target the QR works on a phone. Running against a LOCAL stack, a localhost… QR is unreachable from a phone — use the link on this machine as the local test.';

function DataArea({ result }) {
  const [showRaw, setShowRaw] = useState(false);
  if (result === undefined || result === null) return null;

  const rows =
    result && typeof result === 'object' && !Array.isArray(result)
      ? Object.entries(result)
      : null;

  return (
    <div className={s.block}>
      <h4 className={s.blockTitle}>Data</h4>
      {rows ? (
        <div className={s.dataRows}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'contents' }}>
              <div className={s.dataKey}>{k}</div>
              <div className={s.dataVal}>
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={s.muted}>Result is not a key→value object; see raw below.</div>
      )}
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
