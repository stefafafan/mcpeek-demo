import { useCallback, useEffect, useRef, useState } from "react";

export interface Finding {
  rule: string;
  severity: "warning" | "error";
  server: string;
  path: string;
  message: string;
  suppression?: { source: string; reason: string };
}
export interface Report {
  file: string;
  complete: boolean;
  findings: Finding[];
  diagnostics: {
    code: string;
    server?: string;
    path: string;
    message: string;
  }[];
}
export interface ScanRequest {
  input: string;
  failOn: string;
  ignore: string[];
}
export interface ScanResult {
  exitCode: number;
  json: string;
  stdout: string;
  stderr: string;
  report: Report | null;
  requestKey: string;
  duration: number;
}

export function useScanner() {
  const [status, setStatus] = useState<
    "loading" | "ready" | "running" | "error"
  >("loading");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [generation, setGeneration] = useState(0);
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<{ id: number; key: string; started: number } | null>(
    null,
  );
  const nextId = useRef(0);

  useEffect(() => {
    setStatus("loading");
    setError("");
    const instance = new Worker(`${import.meta.env.BASE_URL}scanner-worker.js`);
    worker.current = instance;
    const fail = (message: string) => {
      clearTimeout(timer.current);
      pending.current = null;
      setError(message);
      setStatus("error");
      instance.terminate();
    };
    timer.current = setTimeout(
      () => fail("The scanner took too long to load."),
      20000,
    );
    instance.onerror = () => fail("The scanner stopped unexpectedly.");
    instance.onmessage = (event) => {
      const message = event.data;
      const current = pending.current;
      if (message.type === "ready") {
        clearTimeout(timer.current);
        setStatus("ready");
      } else if (message.type === "error") {
        fail(message.message);
      } else if (
        message.type === "result" &&
        current &&
        current.id === message.id
      ) {
        clearTimeout(timer.current);
        let report: Report | null = null;
        try {
          report = JSON.parse(message.result.json);
        } catch {
          /* CLI argument errors use stderr. */
        }
        setResult({
          ...message.result,
          report,
          requestKey: current.key,
          duration: performance.now() - current.started,
        });
        pending.current = null;
        setStatus("ready");
      }
    };
    return () => {
      clearTimeout(timer.current);
      instance.terminate();
      worker.current = null;
      pending.current = null;
    };
  }, [generation]);

  const run = useCallback(
    (request: ScanRequest) => {
      if (status !== "ready" || !worker.current) {
        return;
      }
      if (new TextEncoder().encode(request.input).length > 1024 * 1024) {
        setError("Input exceeds the 1 MiB playground limit.");
        return;
      }
      setError("");
      const id = ++nextId.current;
      pending.current = {
        id,
        key: JSON.stringify(request),
        started: performance.now(),
      };
      setStatus("running");
      timer.current = setTimeout(() => {
        worker.current?.terminate();
        pending.current = null;
        setError("Analysis exceeded the 10-second playground limit.");
        setStatus("error");
      }, 10000);
      worker.current.postMessage({ id, request });
    },
    [status],
  );

  return {
    status,
    error,
    result,
    run,
    retry: () => setGeneration((value) => value + 1),
  };
}
