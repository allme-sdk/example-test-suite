#!/usr/bin/env node
/**
 * #557 — every portal control a scenario sends you to must be explained.
 *
 * A scenario's own inputs are complete by construction (the setup form IS generated from
 * `fields`). The portal half is not: it describes forms in another product, so before this
 * check it drifted and under-specified with nothing to catch it — scenario 1 named two of
 * the OAuth-app form's seven controls, and the OIDC scenarios named none of the one that
 * decides whether they display any claims at all.
 *
 * So this asserts the same completeness for the portal half, at BOTH levels:
 *
 *  1. every scenario must DECLARE its portal setup — a non-empty list of forms, or an
 *     explicit `noPortalSetup('<why>')`. An absent, empty or reasonless declaration FAILS.
 *     It used to pass silently while merely shrinking the reported counts, which is the
 *     "nothing was checked" hole this whole check exists to close (#557 review pass 1);
 *  2. for every form a scenario names, every control in `PORTAL_FORMS` must carry a
 *     non-empty answer, and every answer must name a control the form has.
 *
 * "Leave it empty" and "it does not matter here, because …" are answers; silence is a
 * failure — at the control level and at the declaration level alike.
 *
 * This is a structural completeness check in the shape of `translations/check-keys.js` and
 * `api/bin/check-route-catalog.php`, not a test suite — it reads the data and reports what
 * is missing. `npm run check` runs it, and `prebuild` runs it before every release build,
 * so the pinned bundle cannot ship an unexplained control.
 *
 * Exits 0 with a one-line confirmation, or non-zero listing every gap.
 */
import {
  SCENARIOS,
  PORTAL_FORMS,
  allPortalSetupGaps,
  portalFormCatalogGaps,
  portalSetupDeclaration,
} from '../src/data/scenarios.js';

// "Nothing was checked" must never read as "nothing is wrong" (standards §4). An empty
// catalog or an empty scenario list would otherwise sail through every loop below.
if (!Array.isArray(SCENARIOS) || SCENARIOS.length === 0) {
  console.error('FAIL: no scenarios to check — SCENARIOS is empty.');
  process.exit(1);
}
if (Object.keys(PORTAL_FORMS).length === 0) {
  console.error('FAIL: PORTAL_FORMS is empty — there is no catalog to check scenarios against.');
  process.exit(1);
}

const gaps = [...portalFormCatalogGaps().map((g) => ({ scenario: '(catalog)', ...g })), ...allPortalSetupGaps()];
const declarations = SCENARIOS.map((s) => [s, portalSetupDeclaration(s)]);

// Counted from the DECLARATIONS, never from `scenario.portalSetup || []`. The old arithmetic
// let an omitted declaration shrink the reported totals instead of failing — the count went
// down and the run still said OK, which is the failure mode this check exists to deny.
const withForms = declarations.filter(([, d]) => d.mode === 'forms');
const optedOut = declarations.filter(([, d]) => d.mode === 'none');
const formsUsed = new Set(withForms.flatMap(([, d]) => d.entries.map((e) => e.form)));
const controlsCovered = withForms.reduce(
  (n, [, d]) => n + d.entries.reduce((m, e) => m + (PORTAL_FORMS[e.form]?.controls.length || 0), 0),
  0,
);

if (gaps.length === 0) {
  // Every scenario is accounted for by construction: gaps === 0 now means each one either
  // lists forms or carries a reasoned `noPortalSetup()`, never that it was skipped.
  console.log(
    `OK: ${controlsCovered} portal controls explained across ${formsUsed.size} forms and ` +
      `${withForms.length} scenarios` +
      (optedOut.length > 0
        ? `, plus ${optedOut.length} declaring no portal setup (${optedOut.map(([s]) => s.id).join(', ')})`
        : '') +
      `. All ${SCENARIOS.length} scenarios declared.`,
  );
  process.exit(0);
}

console.error(`FAIL: ${gaps.length} portal-setup finding(s).\n`);
for (const g of gaps) {
  if (g.kind === 'missing-declaration') {
    console.error(
      `  scenario ${g.scenario}: declares NO portal setup. Absence is not an answer — give it a` +
        ` \`portalSetup: [...]\`, or say so explicitly with \`portalSetup: noPortalSetup('<why>')\`.`,
    );
  } else if (g.kind === 'unknown-form') {
    console.error(`  scenario ${g.scenario}: names portal form "${g.form}", which PORTAL_FORMS does not define.`);
  } else if (g.kind === 'empty-form') {
    console.error(`  ${g.scenario}: portal form "${g.form}" lists no controls, so naming it explains nothing.`);
  } else if (g.kind === 'form-missing-label') {
    console.error(`  ${g.scenario}: portal form "${g.form}" is missing its title or its path.`);
  } else if (g.kind === 'control-missing-label') {
    console.error(`  ${g.scenario}: portal form "${g.form}" has a control with no key or no label (${g.control}).`);
  } else if (g.kind === 'missing-setting') {
    console.error(`  scenario ${g.scenario}: form "${g.form}" renders "${g.label}" (${g.control}) and the scenario says nothing about it.`);
  } else {
    console.error(`  scenario ${g.scenario}: form "${g.form}" has no control "${g.control}" — stale answer or typo'd key.`);
  }
}
console.error(
  '\nEvery scenario declares its portal setup, and states the intended value for EVERY control\n' +
    'of every form it names — including the ones to leave alone.\n' +
    'If the portal form itself changed, update its entry in PORTAL_FORMS first.',
);
process.exit(1);
