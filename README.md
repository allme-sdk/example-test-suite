# example-test-suite

The shared JSX frontend for the **allme SDK identity examples**. About 90% of
each example's logic is this frontend; each SDK example is a thin backend that
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
(`{"contractVersion": 1}`) is emitted into the bundle root — the backend reads
it at startup and refuses a version it does not implement.

## Release procedure (run by the reviewer, not the builder)

Build, package the bundle as the release asset, cut the tag, then record the
tarball checksum for consumers:

```
npm run build && tar -czf dist.tar.gz -C dist . && gh release create v0.1.0 dist.tar.gz --title v0.1.0 --notes "Identity example frontend — contract v1"
shasum -a 256 dist.tar.gz
```

`gh release create` takes asset paths as **positional arguments** (hence
`dist.tar.gz` after the tag). The printed `shasum -a 256 dist.tar.gz` value is
what each consuming SDK example records in its `frontend.lock`:

```json
{ "tag": "v0.1.0", "sha256": "<the sha256 printed above>" }
```

On first run an SDK example downloads exactly that release asset, verifies the
checksum, unpacks it to `.frontend/<tag>/` (git-ignored), and serves it.

## Contract versioning

The bundle embeds its contract version in `contract.json`. **A contract change
bumps `contractVersion` in the bundle AND the release tag.** The backend
compares the bundle's `contract.json` against the version it implements and
refuses a mismatch (printing both versions and the pin-bump pointer); a checksum
mismatch refuses the same way. Because each SDK example pins its own tag +
sha256, a contract bump is an explicit, **per-example** pin bump — every other
example keeps fetching its own pinned release, which stays downloadable
indefinitely.
