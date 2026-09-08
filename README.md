# mcpeek playground

A React playground for [mcpeek](https://github.com/stefafafan/mcpeek). Select a
preset or edit MCP configuration JSON, then run the real Go CLI through WebAssembly.
Results include findings, original text and JSON output, and the CLI exit code.

## Development

Requires Go 1.27.1, a current Node.js release supported by Vite 8, and pnpm 10.27.0.
Keep the repositories next to each other:

```text
parent/
  mcpeek/
  mcpeek-demo/
```

The Go module uses a local `replace` pointing at `../mcpeek`. There is no submodule
and no copied scanner implementation. The adapter module path is beneath mcpeek's
module path so it can call the existing internal CLI package.

```sh
pnpm install
pnpm dev
```

The development command compiles the scanner to `public/mcpeek.wasm` and copies
`wasm_exec.js` from the same Go toolchain before starting Vite. Restart it after
changing Go code in either repository.

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
