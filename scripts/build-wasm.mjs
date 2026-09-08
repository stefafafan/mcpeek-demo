import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicDir = join(root, "public");
mkdirSync(publicDir, { recursive: true });
const goroot = execFileSync("go", ["env", "GOROOT"], {
  cwd: root,
  encoding: "utf8",
}).trim();
execFileSync(
  "go",
  [
    "build",
    "-trimpath",
    "-ldflags=-s -w",
    "-o",
    join(publicDir, "mcpeek.wasm"),
    "./wasm",
  ],
  {
    cwd: root,
    env: { ...process.env, GOOS: "js", GOARCH: "wasm" },
    stdio: "inherit",
  },
);
const runtime = join(publicDir, "wasm_exec.js");
// Go's module cache files are read-only; replace the generated copy on rebuild.
rmSync(runtime, { force: true });
copyFileSync(join(goroot, "lib", "wasm", "wasm_exec.js"), runtime);
console.log("Built mcpeek.wasm with matching Go runtime.");
