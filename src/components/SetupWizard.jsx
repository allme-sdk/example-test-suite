import { useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Copy, FileKey, Save, Upload, X, AlertCircle } from 'lucide-react';
import * as ui from '../ui.js';
import PortalSetup from './PortalSetup.jsx';

function PemField({ field, value, onChange }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const loaded = typeof value === 'string' && value.length > 0;

  async function onPick(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // Read the file CONTENT into localStorage (spec §4/§5) — on Save the backend
    // writes it to the config's key dir and references it by path; no path is uploaded.
    const text = await file.text();
    setFileName(file.name);
    onChange(text);
  }

  return (
    <div>
      <label className={ui.label}>{field.label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={ui.btn} onClick={() => inputRef.current && inputRef.current.click()}>
          <Upload className="w-4 h-4" />
          {loaded ? 'Replace PEM file…' : 'Choose PEM file…'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pem,.key,application/x-pem-file,text/plain"
          className="hidden"
          onChange={onPick}
        />
        {loaded ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
            <FileKey className="w-3.5 h-3.5" />
            PEM loaded{fileName ? ` (${fileName})` : ''}
          </span>
        ) : (
          <span className={ui.faint}>No file chosen</span>
        )}
        {loaded && (
          <button
            type="button"
            className={ui.btnGhost}
            onClick={() => {
              setFileName('');
              onChange('');
            }}
          >
            <X className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>
      {field.hint && <span className={ui.hint}>{field.hint}</span>}
    </div>
  );
}

/**
 * A password input's characters can't be read by eye, so this is the only way to move a
 * secret from one scenario's saved value into another.
 *
 * Disabled on an empty value rather than just left clickable: a field with nothing typed
 * into it still renders this button, and a click that silently "succeeds" on an empty
 * string would look identical to a click that copied something real.
 *
 * The clipboard write is permission-gated and can fail (denied permission, an insecure
 * context). A failed write must not look like a missed click: the icon turns into a red
 * X and a message names the failure, both for 3s — longer than the checkmark's 1.5s,
 * since a warning needs more time to register than a confirmation does.
 */
function CopyButton({ value }) {
  const [state, setState] = useState('idle'); // 'idle' | 'copied' | 'failed'
  const hasValue = typeof value === 'string' && value.trim().length > 0;
  return (
    <>
      <button
        type="button"
        disabled={!hasValue}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setState('copied');
            setTimeout(() => setState('idle'), 1500);
          } catch {
            setState('failed');
            setTimeout(() => setState('idle'), 3000);
          }
        }}
        className="p-2 rounded-lg bg-surface border border-line hover:bg-hover shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Copy"
      >
        {state === 'copied' ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : state === 'failed' ? (
          <X className="w-4 h-4 text-red-600 dark:text-red-400" />
        ) : (
          <Copy className="w-4 h-4 text-faint" />
        )}
      </button>
      {state === 'failed' && (
        <span className="text-xs text-red-600 dark:text-red-400">Copy failed — select and copy manually</span>
      )}
    </>
  );
}

function TextField({ field, value, onChange, invalid }) {
  const type = field.type === 'secret' || field.type === 'passphrase' ? 'password' : 'text';
  return (
    <div>
      <label className={ui.label}>{field.label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${ui.input} ${invalid ? ui.inputInvalid : ''}`}
          type={type}
          value={value || ''}
          placeholder={field.default || ''}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <CopyButton value={value} />
      </div>
      {field.hint && <span className={ui.hint}>{field.hint}</span>}
    </div>
  );
}

function SelectField({ field, value, onChange, invalid }) {
  return (
    <div>
      <label className={ui.label}>{field.label}</label>
      <select
        className={`${ui.input} ${invalid ? ui.inputInvalid : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>— choose —</option>
        {(field.options || []).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {field.hint && <span className={ui.hint}>{field.hint}</span>}
    </div>
  );
}

function renderField(field, values, setValue, showInvalid) {
  const value = values[field.key] === undefined ? '' : values[field.key];
  const onChange = (v) => setValue(field.key, v);
  if (field.type === 'pem') {
    return <PemField key={field.key} field={field} value={value} onChange={onChange} />;
  }
  const invalid = showInvalid && !field.advanced && !(typeof value === 'string' && value.trim().length);
  if (field.type === 'select') {
    return <SelectField key={field.key} field={field} value={value} onChange={onChange} invalid={invalid} />;
  }
  return <TextField key={field.key} field={field} value={value} onChange={onChange} invalid={invalid} />;
}

export default function SetupWizard({
  scenario,
  values,
  setValue,
  showInvalid,
  isGuide,
  canSave,
  saving,
  saveError,
  configPath,
  onSave
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const required = scenario.fields.filter((f) => !f.advanced);
  const advanced = scenario.fields.filter((f) => f.advanced);

  return (
    <div className={`${ui.block} space-y-4`}>
      {/* The single source for a scenario's setup — one row per control of every
          portal form it sends the reader to — rendered from the FORM's control
          list, so an unexplained control shows up instead of being silently
          absent. */}
      <PortalSetup scenario={scenario} />

      {scenario.prerequisites && scenario.prerequisites.length > 0 && (
        <div className={ui.noteBox}>
          <strong className="text-heading">Prerequisites:</strong>
          <ul className="mt-1 space-y-1 list-disc list-inside marker:text-faint">
            {scenario.prerequisites.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {required.length > 0 && (
        <div className="space-y-3">
          <h4 className={ui.h4}>Inputs</h4>
          {required.map((f) => renderField(f, values, setValue, showInvalid))}
        </div>
      )}

      {advanced.length > 0 && (
        <div className="space-y-3">
          <button type="button" className={ui.btnGhost} onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Advanced (target platform)
          </button>
          {showAdvanced && advanced.map((f) => renderField(f, values, setValue, showInvalid))}
        </div>
      )}

      {!isGuide && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            className={ui.btnPrimary}
            disabled={!canSave || saving}
            onClick={onSave}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : configPath ? 'Re-save settings' : 'Save settings'}
          </button>
          {configPath ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>
                Saved — config written to <code className={ui.code}>{configPath}</code> (open it to read
                the real SDK config)
              </span>
            </span>
          ) : (
            <span className={ui.faint}>
              {canSave
                ? 'Save writes the SDK config file the run executes off.'
                : 'Complete the required inputs to save.'}
            </span>
          )}
        </div>
      )}
      {!isGuide && saveError && (
        <div className={ui.errorBox}>
          <AlertCircle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Could not save settings: {saveError}
        </div>
      )}
    </div>
  );
}
