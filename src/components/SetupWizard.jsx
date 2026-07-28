import { useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, FileKey, Save, Upload, X, AlertCircle } from 'lucide-react';
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

function TextField({ field, value, onChange, invalid }) {
  const type = field.type === 'secret' || field.type === 'passphrase' ? 'password' : 'text';
  return (
    <div>
      <label className={ui.label}>{field.label}</label>
      <input
        className={`${ui.input} ${invalid ? ui.inputInvalid : ''}`}
        type={type}
        value={value || ''}
        placeholder={field.default || ''}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
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
      <div>
        <h4 className={ui.h4}>Setup checklist</h4>
        <ol className="mt-2 space-y-1.5 list-decimal list-inside text-sm text-body marker:text-faint">
          {scenario.checklist.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </div>

      {/* #557: the portal half of setup, one row per control of every form the checklist
          above sends the reader to — rendered from the FORM's control list, so an
          unexplained control shows up instead of being silently absent. */}
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
