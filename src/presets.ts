const digest = `example/mcp@sha256:${"a".repeat(64)}`;
const commit = "0123456789abcdef0123456789abcdef01234567";
const docker = (...args: string[]) => ({
  command: "docker",
  args: ["run", "-i", "--rm", ...args, digest],
});
const encode = (servers: Record<string, unknown>) =>
  JSON.stringify({ mcpServers: servers }, null, 2);

export const presets = [
  {
    id: "mixed",
    name: "Mixed configuration",
    group: "Start here",
    kind: "mixed",
    source: encode({
      filesystem: docker("--privileged", "-v", "/home/alice/.ssh:/keys:ro"),
      docs: { command: "npx", args: ["-y", "@example/mcp-server@latest"] },
      remote: { url: "http://example.com/mcp" },
    }),
  },
  {
    id: "pinned",
    name: "Pinned configuration",
    group: "Start here",
    kind: "check",
    source: encode({
      filesystem: docker("-v", "/workspace/project:/workspace:ro"),
      docs: { command: "npx", args: ["-y", "@example/mcp-server@1.2.3"] },
      remote: {
        url: "https://example.com/mcp",
        headers: { Authorization: "Bearer ${env:API_TOKEN}" },
      },
    }),
  },
  {
    id: "git",
    name: "Pinned Git sources",
    group: "Start here",
    kind: "git",
    source: encode({
      npm: { command: "npx", args: [`github:example/server#${commit}`] },
      python: {
        command: "uvx",
        args: [
          "--from",
          `git+https://github.com/example/server.git@${commit}`,
          "server",
        ],
      },
    }),
  },
  {
    id: "secret",
    name: "Literal credential",
    group: "Rules",
    kind: "key",
    source: encode({
      docs: {
        url: "https://example.com/mcp",
        headers: { Authorization: "Bearer example-not-a-real-token" },
      },
    }),
  },
  {
    id: "package",
    name: "Unpinned package",
    group: "Rules",
    kind: "package",
    source: encode({
      docs: { command: "npx", args: ["-y", "@example/mcp-server@latest"] },
    }),
  },
  {
    id: "image",
    name: "Unpinned image",
    group: "Rules",
    kind: "box",
    source: encode({
      files: {
        command: "docker",
        args: ["run", "-i", "--rm", "example/mcp:1.2.3"],
      },
    }),
  },
  {
    id: "privileged",
    name: "Privileged container",
    group: "Rules",
    kind: "shield",
    source: encode({ files: docker("--privileged") }),
  },
  {
    id: "socket",
    name: "Docker socket",
    group: "Rules",
    kind: "plug",
    source: encode({ files: docker("-v", "/var/run/docker.sock:/socket:ro") }),
  },
  {
    id: "mount",
    name: "Sensitive mount",
    group: "Rules",
    kind: "folder",
    source: encode({ filesystem: docker("-v", "/home/alice/.ssh:/keys:ro") }),
  },
  {
    id: "namespace",
    name: "Host namespace",
    group: "Rules",
    kind: "network",
    source: encode({ files: docker("--network=host") }),
  },
  {
    id: "http",
    name: "Plaintext endpoint",
    group: "Rules",
    kind: "globe",
    source: encode({ docs: { url: "http://example.com/mcp" } }),
  },
  {
    id: "wrapper",
    name: "Unsupported wrapper",
    group: "Parsing",
    kind: "terminal",
    source: encode({ docs: { command: "sh", args: ["-c", "npx server"] } }),
  },
] as const;

export type Preset = (typeof presets)[number];
