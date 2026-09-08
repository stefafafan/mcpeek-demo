import { useState } from "react";
import {
  ArrowUpRight,
  Braces,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileJson2,
  Folder,
  GitBranch,
  Globe,
  KeyRound,
  Layers,
  LoaderCircle,
  Network,
  Package,
  Play,
  Plug,
  RotateCcw,
  ScanLine,
  Shield,
  Terminal,
} from "lucide-react";
import { presets, type Preset } from "./presets";
import { useScanner } from "./useScanner";
import Editor from "./Editor";
import Results from "./Results";
import "./styles.css";

const icons = {
  mixed: Layers,
  check: CheckCircle2,
  git: GitBranch,
  key: KeyRound,
  package: Package,
  box: Box,
  shield: Shield,
  plug: Plug,
  folder: Folder,
  network: Network,
  globe: Globe,
  terminal: Terminal,
};

export default function App() {
  const [selected, setSelected] = useState<Preset>(presets[0]);
  const [source, setSource] = useState<string>(presets[0].source);
  const [failOn, setFailOn] = useState("warning");
  const [ignore, setIgnore] = useState("");
  const [notice, setNotice] = useState("");
  const [highlight, setHighlight] = useState<{
    path: string;
    requestKey: string;
    result: unknown;
  } | null>(null);
  const scanner = useScanner();
  const request = {
    input: source,
    failOn,
    ignore: ignore
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  };
  const modified = source !== selected.source;
  const stale =
    !!scanner.result && scanner.result.requestKey !== JSON.stringify(request);

  function choose(preset: Preset) {
    setSelected(preset);
    setSource(preset.source);
    setNotice("");
    setIgnore("");
  }

  function format() {
    try {
      setSource(JSON.stringify(JSON.parse(source), null, 2));
      setNotice("");
    } catch {
      setNotice("Cannot format invalid JSON.");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setNotice("Configuration copied.");
    } catch {
      setNotice("Clipboard unavailable.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label="mcpeek playground">
          <span className="brand-mark">
            <ScanLine size={23} strokeWidth={1.8} />
          </span>
          mcpeek<span className="brand-slash">/</span>
          <span className="brand-section">playground</span>
        </a>
        <nav aria-label="Project links">
          <a
            href="https://github.com/stefafafan/mcpeek#readme"
            target="_blank"
            rel="noreferrer"
          >
            Documentation <ArrowUpRight size={14} />
          </a>
          <a
            href="https://github.com/stefafafan/mcpeek"
            target="_blank"
            rel="noreferrer"
            className="github-link"
            aria-label="mcpeek on GitHub"
          >
            <GitBranch size={18} />
          </a>
        </nav>
      </header>

      <main>
        <div className="workspace-heading">
          <div>
            <div className="eyebrow">
              <span className="status-dot ready" />
              MCP CONFIGURATION CHECKER
            </div>
            <h1>
              Configuration playground<span className="heading-period">.</span>
            </h1>
          </div>
          <div className="engine-status" role="status">
            {scanner.status === "loading" || scanner.status === "running" ? (
              <LoaderCircle size={14} className="spin" />
            ) : (
              <span
                className={`status-dot ${scanner.status === "ready" ? "ready" : "failed"}`}
              />
            )}
            <span>
              {scanner.status === "loading"
                ? "Loading WebAssembly"
                : scanner.status === "running"
                  ? "Analyzing"
                  : scanner.status === "ready"
                    ? "WebAssembly ready"
                    : "Scanner unavailable"}
            </span>
          </div>
        </div>

        <div className="workspace">
          <aside className="preset-sidebar" aria-label="Configuration presets">
            <div className="sidebar-heading">
              <h2>Presets</h2>
              <span>{presets.length}</span>
            </div>
            {["Start here", "Rules", "Parsing"].map((group) => (
              <div className="preset-group" key={group}>
                <h3>{group}</h3>
                {presets
                  .filter((preset) => preset.group === group)
                  .map((preset) => {
                    const Icon = icons[preset.kind];
                    return (
                      <button
                        key={preset.id}
                        className={`preset-button ${selected.id === preset.id ? "selected" : ""}`}
                        onClick={() => choose(preset)}
                        aria-label={preset.name}
                        aria-pressed={selected.id === preset.id}
                      >
                        <Icon size={15} />
                        <span>{preset.name}</span>
                        {selected.id === preset.id && (
                          <ChevronRight size={13} className="preset-arrow" />
                        )}
                      </button>
                    );
                  })}
              </div>
            ))}
            <div className="sidebar-foot">
              <Shield size={15} />
              <span>Local session</span>
            </div>
          </aside>

          <div className="editor-column">
            <div className="mobile-presets">
              <label htmlFor="preset">Preset</label>
              <select
                id="preset"
                value={selected.id}
                onChange={(event) =>
                  choose(
                    presets.find((preset) => preset.id === event.target.value)!,
                  )
                }
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
            <section className="editor-pane" aria-label="Configuration editor">
              <div className="pane-heading editor-heading">
                <div>
                  <FileJson2 size={16} />
                  <h2>.mcp.json</h2>
                  {modified && (
                    <span
                      className="modified-dot"
                      title="Modified configuration"
                    />
                  )}
                </div>
                <div className="editor-tools">
                  <button
                    className="icon-button"
                    title="Format JSON"
                    aria-label="Format JSON"
                    onClick={format}
                  >
                    <Braces size={17} />
                  </button>
                  <button
                    className="icon-button"
                    title="Copy configuration"
                    aria-label="Copy configuration"
                    onClick={copy}
                  >
                    {notice === "Configuration copied." ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                  <button
                    className="icon-button"
                    title="Reset configuration"
                    aria-label="Reset configuration"
                    onClick={() => {
                      setSource(selected.source);
                      setNotice("");
                    }}
                  >
                    <RotateCcw size={16} />
                  </button>
                  <span className="toolbar-divider" />
                  <button
                    className="run-button"
                    aria-label="Run analysis"
                    disabled={scanner.status !== "ready"}
                    onClick={() => scanner.run(request)}
                  >
                    {scanner.status === "running" ? (
                      <LoaderCircle size={15} className="spin" />
                    ) : (
                      <Play size={14} fill="currentColor" />
                    )}
                    <span>
                      {scanner.status === "running" ? "Running" : "Run"}
                    </span>
                  </button>
                </div>
              </div>
              <div className="code-editor">
                <Editor
                  value={source}
                  highlightPath={
                    highlight &&
                    !stale &&
                    highlight.result === scanner.result &&
                    highlight.requestKey === JSON.stringify(request)
                      ? highlight
                      : null
                  }
                  onChange={(value) => {
                    setSource(value);
                    setHighlight(null);
                    setNotice("");
                  }}
                />
              </div>
              <div className="editor-status">
                <span>
                  {selected.name}
                  {modified && " · edited"}
                </span>
                <span>
                  {source.split("\n").length} lines{" "}
                  <span className="status-separator">/</span> JSON
                </span>
              </div>
            </section>
            <div className="scan-options">
              <div className="option">
                <label htmlFor="fail-on">Fail on</label>
                <select
                  id="fail-on"
                  value={failOn}
                  onChange={(event) => setFailOn(event.target.value)}
                >
                  <option value="warning">Warning + error</option>
                  <option value="error">Error only</option>
                </select>
              </div>
              <div className="option ignore-option">
                <label htmlFor="ignore">Ignore rules</label>
                <input
                  id="ignore"
                  value={ignore}
                  onChange={(event) => setIgnore(event.target.value)}
                  placeholder="rule:server, rule:server"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
            {(notice || scanner.error) && (
              <div className="editor-notice" role="alert">
                <span>{scanner.error || notice}</span>
                {scanner.status === "error" && (
                  <button onClick={scanner.retry}>
                    <RotateCcw size={13} />
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>

          <Results
            result={scanner.result}
            stale={stale}
            running={scanner.status === "running"}
            onSelectFinding={(path) =>
              setHighlight({
                path,
                requestKey: JSON.stringify(request),
                result: scanner.result,
              })
            }
          />
        </div>
      </main>
      <footer className="page-footer">
        <span>
          <Shield size={13} />
          Static analysis · Not a safety certification
        </span>
        <a
          href="https://github.com/stefafafan/mcpeek"
          target="_blank"
          rel="noreferrer"
        >
          mcpeek <ArrowUpRight size={12} />
        </a>
      </footer>
    </div>
  );
}
