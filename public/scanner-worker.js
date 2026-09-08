/* global Go, mcpeekRun */
// A classic worker loads Go's matching runtime. Only static assets are fetched.
self.mcpeekReady = () => self.postMessage({ type: "ready" });
self.onmessage = (event) => {
  const { id, request } = event.data;
  try {
    const result = JSON.parse(mcpeekRun(JSON.stringify(request)));
    self.postMessage({ type: "result", id, result });
  } catch {
    self.postMessage({
      type: "error",
      id,
      message: "The scanner could not complete this run.",
    });
  }
};

async function start() {
  importScripts("./wasm_exec.js");
  const go = new Go();
  const response = await fetch("./mcpeek.wasm");
  if (!response.ok) throw new Error("WASM download failed");
  const { instance } = await WebAssembly.instantiate(
    await response.arrayBuffer(),
    go.importObject,
  );
  await go.run(instance);
  throw new Error("WASM runtime exited");
}

start().catch(() => {
  self.postMessage({
    type: "error",
    message:
      "Could not load the scanner. Retry to reload the WebAssembly module.",
  });
});
