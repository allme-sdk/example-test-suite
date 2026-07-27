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

## Release procedure (run by the reviewer, not the builder)

Build, package the bundle as the release asset, cut the tag, then record the
tarball checksum for consumers:

```
npm run build && tar -czf dist.tar.gz -C dist . && gh release create v0.5.0 dist.tar.gz --title v0.5.0 --notes "Example suite frontend — contract v3"
shasum -a 256 dist.tar.gz
```

`gh release create` takes asset paths as **positional arguments** (hence
`dist.tar.gz` after the tag). The printed `shasum -a 256 dist.tar.gz` value is
what each consuming SDK example records in its `frontend.lock`:

```json
{ "tag": "v0.5.0", "sha256": "<the sha256 printed above>" }
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
