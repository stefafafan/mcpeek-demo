import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleDashed,
  Copy,
  Terminal,
  XCircle,
} from "lucide-react";
import type { ScanResult } from "./useScanner";
import { useState } from "react";

type Tab = "Findings" | "Text" | "JSON";

export default function Results({
  result,
  stale,
  running,
  onSelectFinding,
}: {
  result: ScanResult | null;
  stale: boolean;
  running: boolean;
  onSelectFinding: (path: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("Findings");
  const [copyState, setCopyState] = useState("");
  const report = result?.report;
  const findings =
    report?.findings.filter((finding) => !finding.suppression) ?? [];
  const suppressed =
    report?.findings.filter((finding) => finding.suppression).length ?? 0;
  const errors = findings.filter(
    (finding) => finding.severity === "error",
  ).length;
  const warnings = findings.length - errors;
  const incomplete = result?.exitCode === 2;
  const raw =
    tab === "JSON"
      ? report
        ? JSON.stringify(report, null, 2)
        : result?.json || result?.stderr || ""
      : [result?.stdout, result?.stderr].filter(Boolean).join("");

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(raw);
      setCopyState("Copied");
    } catch {
      setCopyState("Copy unavailable");
    }
    setTimeout(() => setCopyState(""), 1800);
  }

  return (
    <section
      className={`results-pane ${running ? "is-running" : ""}`}
      aria-label="Analysis output"
      aria-busy={running}
    >
      <div className="pane-heading result-heading">
        <div>
          <Terminal size={16} />
          <h2>Output</h2>
        </div>
        {result && (
          <span
            data-testid="exit-code"
            className={`exit-code exit-${result.exitCode}`}
          >
            Exit {result.exitCode}
          </span>
        )}
      </div>
      <div className="tabs-row">
        <div className="tabs" role="tablist" aria-label="Output format">
          {(["Findings", "Text", "JSON"] as const).map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
            >
              {name}
              {name === "Findings" && result && (
                <span className="tab-count">{findings.length}</span>
              )}
            </button>
          ))}
        </div>
        {tab !== "Findings" && result && (
          <button
            className="icon-button"
            title={copyState || "Copy output"}
            aria-label="Copy output"
            onClick={copyOutput}
          >
            {copyState === "Copied" ? <Check size={15} /> : <Copy size={15} />}
          </button>
        )}
      </div>
      {stale && (
        <div className="stale-state">
          <CircleDashed size={13} />
          Input changed<span>Previous run</span>
        </div>
      )}
      <div className="results-body" role="tabpanel" aria-label={tab}>
        {!result ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Terminal size={26} strokeWidth={1.4} />
            </div>
            <h3>No run yet</h3>
            <code>$ mcpeek --format json -</code>
            <span className="empty-cursor" />
          </div>
        ) : tab !== "Findings" ? (
          <pre className="raw-output" data-testid="raw-output">
            {raw || "(no output)"}
          </pre>
        ) : (
          <>
            <div
              className={`run-summary ${incomplete ? "incomplete" : findings.length ? "has-findings" : "clear"}`}
              aria-live="polite"
            >
              {incomplete ? (
                <AlertCircle size={19} />
              ) : findings.length ? (
                <AlertTriangle size={19} />
              ) : (
                <CheckCircle2 size={19} />
              )}
              <div>
                <strong>
                  {incomplete
                    ? "Analysis incomplete"
                    : findings.length
                      ? `${findings.length} finding${findings.length === 1 ? "" : "s"}`
                      : "No findings"}
                </strong>
                <span>
                  {incomplete
                    ? "Unsupported or invalid input"
                    : findings.length
                      ? `${errors} error${errors === 1 ? "" : "s"} · ${warnings} warning${warnings === 1 ? "" : "s"}`
                      : "Analysis complete"}
                </span>
              </div>
            </div>
            {report?.diagnostics.map((diagnostic, index) => (
              <article
                className="finding diagnostic"
                key={`diagnostic-${index}`}
              >
                <div className="finding-heading">
                  <XCircle size={15} />
                  <h3>{diagnostic.code}</h3>
                  <span>unassessed</span>
                </div>
                <p>{diagnostic.message}</p>
                <code>{diagnostic.path}</code>
              </article>
            ))}
            {!report && (
              <article className="finding diagnostic">
                <p>
                  {result.stderr ||
                    "The scanner returned no structured report."}
                </p>
              </article>
            )}
            {findings.map((finding, index) => (
              <article
                className={`finding ${finding.severity}`}
                key={`${finding.rule}-${index}`}
              >
                <button
                  className="finding-jump"
                  aria-label={`Show ${finding.rule} in configuration`}
                  disabled={stale || running}
                  onClick={() => onSelectFinding(finding.path)}
                />
                <div className="finding-heading">
                  {finding.severity === "error" ? (
                    <XCircle size={15} />
                  ) : (
                    <AlertTriangle size={15} />
                  )}
                  <h3>{finding.rule}</h3>
                  <span>{finding.severity}</span>
                </div>
                <p>{finding.message}</p>
                <code>{finding.path}</code>
                <div className="finding-bottom">
                  <span className="server-name">{finding.server}</span>
                  <a
                    href={`https://github.com/stefafafan/mcpeek/blob/main/docs/rules/${finding.rule}.md`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Rule details <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            ))}
            {!incomplete && findings.length === 0 && (
              <div className="clear-state">
                <CheckCircle2 size={36} strokeWidth={1.2} />
                <p>No unsuppressed findings.</p>
                <span>
                  {suppressed
                    ? `${suppressed} suppressed finding${suppressed === 1 ? "" : "s"} in JSON output.`
                    : "No findings within the supported scope."}
                </span>
              </div>
            )}
            {suppressed > 0 && findings.length > 0 && (
              <div className="suppressed-count">
                {suppressed} suppressed · retained in JSON
              </div>
            )}
          </>
        )}
      </div>
      <div className="result-footer">
        <span className={`status-dot ${result ? "ready" : ""}`} />
        <span>{result ? "mcpeek / wasm" : "Awaiting analysis"}</span>
        {result && (
          <span className="duration">
            {result.duration < 1 ? "< 1" : Math.round(result.duration)} ms
          </span>
        )}
      </div>
    </section>
  );
}
