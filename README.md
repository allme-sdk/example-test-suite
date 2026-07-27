# example-test-suite

The shared JSX frontend for the **allme SDK examples** — all three scenario
families (identity, company-data, contract flows) in one portal (#494). About 90%
of each example's logic is this frontend; each SDK example is a thin backend that
implements the demo-backend contract in [`CONTRACT.md`](./CONTRACT.md). That
shared contract is what makes the six SDK examples strictly comparable — an
example test suite in the literal sense.

This repo ships nothing to a package registry. It publishes **tagged GitHub
releases** whose asset is the built bundle as a tarball; each SDK example pins a
release in its own `frontend.lock` and fetches + verifies that exact asset on
first run.

## Develop

```
npm install
npm run dev
```

Vite serves the app on its dev port and **proxies `/api` to the demo backend on
the contract's default port (`8091`)** — run one of the SDK examples alongside it
and the app reaches it exactly as it does in production (where the backend serves
the built bundle on one origin). The app's **advanced inputs** point the BACKEND
at a different allme platform / authorize origin; they do NOT change the
app→backend transport (the proxy handles that).

## Build

```
npm run build
```

Produces `dist/`, a self-contained static bundle. `dist/contract.json`
(`{"contractVersion": 3}`) is emitted into the bundle root — the backend reads
it at startup and refuses a version it does not implement.

## Styling (#496)

The UI uses the **allus portal's stack** so the examples and the portal look like
one product: Tailwind (`tailwindcss` + `postcss` + `autoprefixer`) and
`lucide-react` icons. `tailwind.config.js`, `postcss.config.js` and the brand-token
block at the top of `src/index.css` are **copied from the portal verbatim** rather
than re-derived — if the portal's brand moves, re-copy those three, don't hand-edit
them. Shared class strings (card, button, input, badge, headings) live in
[`src/ui.js`](./src/ui.js); use them instead of repeating utility strings, so the
examples keep one visual vocabulary. Dark mode is class-based (the portal's
setting) and `src/theme.js` mirrors the OS preference onto the root element.

## Shell and navigation (#500)

The page has the **allus portal's shell**: a persistent left sidebar
([`src/components/Sidebar.jsx`](./src/components/Sidebar.jsx)) beside the content
pane, following `allus/src/Layout.jsx` — the same fixed `w-64` aside from `lg` up,
the same slide-over drawer below it, the same collapsible nav group and active-item
styling, and a bordered footer that carries the SDK / contract badges and the global
**Clear all**.

The nav lists the **three scenario families** (`Identity`, `Company data`,
`Contract flows`), each expanding to its own scenarios; picking a family shows that
family's cards, picking a scenario opens it. Families and their titles/blurbs come
from `FAMILIES` / `familyOf(id)` in [`src/data/scenarios.js`](./src/data/scenarios.js)
— there is deliberately no second nav list to hand-maintain, and a family the
backend's `/api/meta` does not list simply does not appear. The Ready / Needs setup
/ Guide classification behind both the card badge and the nav icon is
`scenarioStatus()` in the same file, rendered by
[`src/components/ScenarioStatus.jsx`](./src/components/ScenarioStatus.jsx).

**There is no router, by decision (#500).** `CONTRACT.md` fixes the OAuth callback
as a 302 to `/?scenario={id}&run={runId}` and all six backends implement it, so
adding `react-router` would have dragged a contract change into a shell change.
Selection is component state: the consequence, accepted knowingly, is that families
and scenarios are **not** linkable and not back-button-able. The in-app back button
returns to the open family's card list.

## Release procedure (run by the reviewer, not the builder)

Build, package the bundle as the release asset, cut the tag, then record the
tarball checksum for consumers:

```
npm ci && npm run build
tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner -cf - -C dist . | gzip -n -9 > dist.tar.gz
gh release create v0.6.0 dist.tar.gz --title v0.6.0 --notes "Example suite frontend — contract v3"
shasum -a 256 dist.tar.gz
```

**The packaging flags are load-bearing, not tidiness (#500).** Vite's output is
already deterministic (asset names are content hashes), but a plain
`tar -czf dist.tar.gz -C dist .` also records each file's mtime and the gzip
header's timestamp, so two identical builds produce two different sha256s. The
pin the six SDKs carry is that sha256 — so a re-cut of a byte-identical bundle
used to invalidate all six `frontend.lock` files, and #496 had to ship the
warning "the tarball must not be re-cut". `--sort=name --mtime --owner --group
--numeric-owner` plus `gzip -n` remove every non-content input, which makes the
tarball a pure function of `dist/`: whoever cuts it, whenever, the sha matches
the pins. Verify with `shasum -a 256` after a clean rebuild before publishing.

`gh release create` takes asset paths as **positional arguments** (hence
`dist.tar.gz` after the tag). The printed `shasum -a 256 dist.tar.gz` value is
what each consuming SDK example records in its `frontend.lock`:

```json
{ "tag": "v0.6.0", "sha256": "<the sha256 printed above>" }
```

On first run an SDK example downloads exactly that release asset, verifies the
checksum, unpacks it to `.frontend/<tag>/` (git-ignored), and serves it.

## Contract versioning

The bundle embeds its contract version in `contract.json`. **A contract change
bumps `contractVersion` in the bundle AND the release tag.** The backend
compares the bundle's `contract.json` against the version it implements and
refuses a mismatch (printing both versions and the pin-bump pointer); a checksum
mismatch refuses the same way. Because each SDK example pins its own tag +
sha256, a bump is an explicit pin bump — one `frontend.lock` per SDK since one
backend serves every family (#494) — and every SDK that has not bumped keeps
fetching its own pinned release, which stays downloadable indefinitely.
