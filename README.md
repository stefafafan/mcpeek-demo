# mcpeek playground

A React playground for [mcpeek](https://github.com/stefafafan/mcpeek). Select a
preset or edit MCP configuration JSON, then run the real Go CLI through WebAssembly.
Results include findings, original text and JSON output, and the CLI exit code.

## Development

Requires Go 1.27.1, Node.js 24.18.0 (see `.node-version`), and pnpm 10.27.0.
The scanner is downloaded as a Go module pinned to commit
`164647c5daecd1accdcf8b392d984edf51be0a19`; `go.sum` records its checksums.
No sibling checkout, submodule, or copied scanner implementation is needed.
The adapter module path is beneath mcpeek's module path so it can call the
existing internal CLI package.

```sh
pnpm install
pnpm dev
```

The development command compiles the scanner to `public/mcpeek.wasm` and copies
`wasm_exec.js` from the same Go toolchain before starting Vite. Restart it after
changing Go code or updating the pinned scanner dependency.

## Verification

```sh
pnpm exec playwright install chromium
pnpm test
pnpm format:check
go test -race ./wasm
go vet ./wasm
```

Go tests exercise the CLI adapter. Playwright tests run the compiled WASM scanner
in Chromium, covering presets, editing, output formats, exit codes, suppressions,
invalid input, and mobile layout.

## Static Build

```sh
pnpm build
pnpm preview
```

Deploy the generated `dist/` directory to a static HTTP host. No backend or Next.js
is required. The WASM file and its matching Go runtime must be deployed together.

## Cloudflare Workers

This repository deploys to Workers Static Assets. Cloudflare serves `dist/`;
mcpeek still executes in the visitor's browser, not in Cloudflare's Worker runtime.
No server-side Worker entry point or Cloudflare Vite plugin is required.

Push the repository, including `go.sum`, `pnpm-lock.yaml`, and `wrangler.jsonc`,
to GitHub. In Cloudflare's dashboard, create a Worker connected to the
`mcpeek-demo` repository and use these settings:

| Setting                              | Value                                       |
| ------------------------------------ | ------------------------------------------- |
| Worker name                          | `mcpeek-demo` (must match `wrangler.jsonc`) |
| Root directory                       | Repository root                             |
| Build command                        | `pnpm build`                                |
| Deploy command                       | `pnpm run deploy`                           |
| Non-production branch deploy command | `pnpm exec wrangler versions upload`        |
| Build variable `GO_VERSION`          | `1.27.1`                                    |
| Build variable `PNPM_VERSION`        | `10.27.0`                                   |

Node's version is selected by `.node-version`. Leave automatic dependency
installation enabled so Cloudflare installs the packages from `pnpm-lock.yaml`.
Set Go and pnpm versions as **build variables**, not Worker runtime variables.
Cloudflare's Git integration handles deployment authentication; do not commit
Cloudflare tokens. Subsequent pushes to the production branch trigger deployment.

Verify locally without publishing:

```sh
pnpm build
pnpm deploy:check
```

For manual deployment only, authenticate with `pnpm exec wrangler login`, then
run `pnpm build` followed by `pnpm run deploy`. The deploy command does not rebuild
assets; Cloudflare runs the separate build command first.

See Cloudflare's [build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
and [build tool versions](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).

## Scope and Privacy

Scanning runs in a Web Worker. The configuration is not sent to a server or saved
in browser storage. Static application assets are downloaded when loading the
page; scans do not make network requests. Avoid pasting real credentials on a
shared device. Preset credentials, digests, and commit hashes are illustrative.

The playground accepts up to 1 MiB of input and terminates scans after 10 seconds.
Changing the input or options marks previous results as stale until the next run.
One-off ignores are recorded by mcpeek as command-line overrides. File-based
exception configuration is not exposed by the playground.

A zero exit code means no unsuppressed findings meet the chosen threshold within
the supported scope, not that a server is safe. Consult mcpeek's rule documentation
for recognition limits.
