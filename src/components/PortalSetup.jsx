import { AlertTriangle, ExternalLink } from 'lucide-react';
import * as ui from '../ui.js';
import { PORTAL_FORMS, portalSetupDeclaration, portalSetupGaps } from '../data/scenarios.js';

/**
 * #557 — the portal half of setup, one row per control.
 *
 * The scenario's own inputs are complete by construction: `SetupWizard` generates them from
 * `fields`, so an input cannot exist without its hint. This renders the same guarantee for
 * the portal forms a scenario sends you to — and it renders it the same WAY, by iterating
 * the FORM's control list rather than the scenario's answers. A control the scenario forgot
 * therefore appears here, loudly, instead of being silently absent (which is exactly how
 * scenario 1 shipped naming two of seven controls).
 *
 * `npm run check` reports the same gaps at build time; this is the copy a reader sees.
 */
function GapRow({ label }) {
  return (
    <>
      <dt className={`${ui.h4} text-amber-700 dark:text-amber-300`}>{label}</dt>
      <dd className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Not specified.</strong> This is a gap in the example suite, not a setting you
          are meant to guess — please report it.
        </span>
      </dd>
    </>
  );
}

export default function PortalSetup({ scenario }) {
  const declaration = portalSetupDeclaration(scenario);

  // ⚠ An OMITTED declaration must not render as an empty, innocent-looking panel — that is
  // precisely the silence #557 exists to remove, and returning null here made the UI
  // indistinguishable from a scenario that legitimately needs no portal work (review pass 1).
  // The two cases are now different components on screen, as they are in the checker.
  if (declaration.mode === 'undeclared') {
    return (
      <div className={ui.errorBox}>
        <AlertTriangle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
        <strong>This scenario declares no portal setup.</strong> That is a gap in the example
        suite, not a sign that there is nothing to do: if it genuinely needs no portal work it
        must say so explicitly. Please report it, and follow the checklist above with care.
      </div>
    );
  }

  if (declaration.mode === 'none') {
    return (
      <div className={ui.noteBox}>
        <strong className="text-heading">No portal setup needed.</strong> {declaration.reason}
      </div>
    );
  }

  const entries = declaration.entries;

  // Reported once, at the top, so a reader knows the table below is incomplete before
  // reading it — and so the omission cannot pass as "nothing more to set".
  const gaps = portalSetupGaps(scenario);

  return (
    <div className="space-y-3">
      <div>
        <h4 className={ui.h4}>What to set in the allus portal</h4>
        <span className={ui.hint}>
          Every control each form renders, including the ones to leave alone. A row saying
          “leave it as it is” means exactly that — nothing here is left to guess.
        </span>
      </div>

      {gaps.length > 0 && (
        <div className={ui.errorBox}>
          <AlertTriangle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          {gaps.length} problem{gaps.length === 1 ? '' : 's'} below: {gaps.length === 1 ? 'a' : 'some'} portal
          control{gaps.length === 1 ? '' : 's'} {gaps.length === 1 ? 'is' : 'are'} unexplained, or a form is
          listed with nothing in it. That is a defect in this suite — the marked rows are not settings you
          should work out for yourself.
        </div>
      )}

      {entries.map((entry) => {
        const form = PORTAL_FORMS[entry.form];
        if (!form) {
          return (
            <div key={entry.form} className={ui.errorBox}>
              <AlertTriangle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Unknown portal form “{entry.form}”.
            </div>
          );
        }
        // Same class as the missing declaration, one level up: a form listed with no
        // controls would otherwise render an empty card that reads as "nothing to set".
        if (!Array.isArray(form.controls) || form.controls.length === 0) {
          return (
            <div key={entry.form} className={ui.errorBox}>
              <AlertTriangle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Portal form “{entry.form}” lists no controls, so this scenario explains none of it.
              That is a gap in the example suite — please report it.
            </div>
          );
        }
        const settings = entry.settings || {};
        return (
          <div key={entry.form} className={`${ui.block} space-y-2`}>
            <div>
              <div className={ui.h4}>{form.title}</div>
              <span className={`${ui.faint} inline-flex items-center gap-1`}>
                <ExternalLink className="w-3 h-3 shrink-0" />
                {form.path}
              </span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-[minmax(0,14rem)_1fr] gap-x-4 gap-y-2">
              {form.controls.map((control) => {
                const value = settings[control.key];
                const specified = typeof value === 'string' && value.trim().length > 0;
                return specified ? (
                  <div key={control.key} className="contents">
                    <dt className={ui.h4}>{control.label}</dt>
                    <dd className="text-sm text-body">{value}</dd>
                  </div>
                ) : (
                  <div key={control.key} className="contents">
                    <GapRow label={control.label} />
                  </div>
                );
              })}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
