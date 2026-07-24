import { useRef, useState } from 'react';
import s from '../brand.module.css';

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
    <div className={s.field}>
      <label className={s.fieldLabel}>{field.label}</label>
      <div className={s.fileRow}>
        <button type="button" className={s.btn} onClick={() => inputRef.current && inputRef.current.click()}>
          {loaded ? 'Replace PEM file…' : 'Choose PEM file…'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pem,.key,application/x-pem-file,text/plain"
          style={{ display: 'none' }}
          onChange={onPick}
        />
        {loaded ? (
          <span className={`${s.fileState} ${s.fileLoaded}`}>
            PEM loaded{fileName ? ` (${fileName})` : ''}
          </span>
        ) : (
          <span className={s.fileState}>No file chosen</span>
        )}
        {loaded && (
          <button
            type="button"
            className={`${s.btn} ${s.btnGhost}`}
            onClick={() => {
              setFileName('');
              onChange('');
            }}
          >
            Remove
          </button>
        )}
      </div>
      {field.hint && <span className={s.fieldHint}>{field.hint}</span>}
    </div>
  );
}

function TextField({ field, value, onChange, invalid }) {
  const type = field.type === 'secret' || field.type === 'passphrase' ? 'password' : 'text';
  return (
    <div className={s.field}>
      <label className={s.fieldLabel}>{field.label}</label>
      <input
        className={`${s.input} ${invalid ? s.inputInvalid : ''}`}
        type={type}
        value={value || ''}
        placeholder={field.default || ''}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      {field.hint && <span className={s.fieldHint}>{field.hint}</span>}
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
    <div className={s.block}>
      <h4 className={s.blockTitle}>Setup checklist</h4>
      <ol className={s.checklist}>
        {scenario.checklist.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>

      {scenario.prerequisites && scenario.prerequisites.length > 0 && (
        <div className={s.prereq}>
          <strong>Prerequisites:</strong>
          <ul className={s.checklist}>
            {scenario.prerequisites.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {required.length > 0 && (
        <>
          <h4 className={s.blockTitle}>Inputs</h4>
          {required.map((f) => renderField(f, values, setValue, showInvalid))}
        </>
      )}

      {advanced.length > 0 && (
        <>
          <button type="button" className={s.advToggle} onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? '▾ Advanced (target platform)' : '▸ Advanced (target platform)'}
          </button>
          {showAdvanced && advanced.map((f) => renderField(f, values, setValue, showInvalid))}
        </>
      )}

      {!isGuide && (
        <div className={s.fileRow} style={{ marginTop: 16 }}>
          <button
            type="button"
            className={`${s.btn} ${s.btnPrimary}`}
            disabled={!canSave || saving}
            onClick={onSave}
          >
            {saving ? 'Saving…' : configPath ? 'Re-save settings' : 'Save settings'}
          </button>
          {configPath ? (
            <span className={`${s.fileState} ${s.fileLoaded}`}>
              Saved ✓ — config written to <code>{configPath}</code> (open it to read the real SDK config)
            </span>
          ) : (
            <span className={s.fileState}>
              {canSave ? 'Save writes the SDK config file the run executes off.' : 'Complete the required inputs to save.'}
            </span>
          )}
        </div>
      )}
      {!isGuide && saveError && <div className={s.errorBox}>Could not save settings: {saveError}</div>}
    </div>
  );
}
