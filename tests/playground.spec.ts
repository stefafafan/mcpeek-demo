import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Run analysis" }),
  ).toBeEnabled();
});

test("runs the actual WASM scanner and exposes all output formats", async ({
  page,
}) => {
  await expect(page.getByText("No run yet", { exact: true })).toBeVisible();
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.getByTestId("exit-code")).toHaveText("Exit 1");
  await expect(
    page.getByRole("heading", { name: "docker-privileged", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "JSON", exact: true }).click();
  await expect(page.getByTestId("raw-output")).toContainText(
    '"complete": true',
  );
  await page.getByRole("tab", { name: "Text", exact: true }).click();
  await expect(page.getByTestId("raw-output")).toContainText(
    "error docker-privileged:",
  );
  expect(requests).toEqual([]);
});

test("edits input, reports stale results, and respects thresholds", async ({
  page,
}) => {
  const editor = page.locator(".cm-content");
  await editor.fill('{"mcpServers":{"docs":{"url":"https://example.com"}}}');
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.getByTestId("exit-code")).toHaveText("Exit 0");
  await expect(page.getByText("No findings", { exact: true })).toBeVisible();
  await editor.fill('{"mcpServers":{"docs":{"url":"http://example.com"}}}');
  await expect(page.locator(".stale-state")).toContainText("Input changed");
  await page.getByLabel("Fail on").selectOption("error");
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.getByTestId("exit-code")).toHaveText("Exit 0");
  await expect(
    page.getByRole("heading", { name: "remote-http", exact: true }),
  ).toBeVisible();
});

test("reports malformed input and can recover", async ({ page }) => {
  await page.locator(".cm-content").fill("{");
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.getByTestId("exit-code")).toHaveText("Exit 2");
  await expect(
    page.getByRole("heading", { name: "input-error", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset configuration" }).click();
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.getByTestId("exit-code")).toHaveText("Exit 1");
});

test("suppresses a finding but retains it in JSON without secret values", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Literal credential", exact: true })
    .click();
  await page.getByLabel("Ignore rules").fill("secret-literal:docs");
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.getByTestId("exit-code")).toHaveText("Exit 0");
  await page.getByRole("tab", { name: "JSON", exact: true }).click();
  await expect(page.getByTestId("raw-output")).toContainText("command-line");
  await expect(page.getByTestId("raw-output")).not.toContainText(
    "example-not-a-real-token",
  );
});

test("presets produce expected scanner results", async ({ page }) => {
  for (const [name, code] of [
    ["Pinned configuration", 0],
    ["Pinned Git sources", 0],
    ["Unpinned package", 1],
    ["Unpinned image", 1],
    ["Privileged container", 1],
    ["Docker socket", 1],
    ["Sensitive mount", 1],
    ["Host namespace", 1],
    ["Plaintext endpoint", 1],
    ["TLS verification disabled", 1],
    ["Unsupported wrapper", 2],
  ] as const) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByRole("button", { name: "Run analysis" }).click();
    await expect(page.getByTestId("exit-code")).toHaveText(`Exit ${code}`);
  }
});

test("formats JSON without losing invalid input", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.fill('{"mcpServers":{}}');
  await page.getByRole("button", { name: "Format JSON" }).click();
  await expect(editor).toContainText('"mcpServers": {}');
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText("{");
  const invalidInput = await editor.innerText();
  await page.getByRole("button", { name: "Format JSON" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Cannot format invalid JSON.",
  );
  expect(await editor.innerText()).toBe(invalidInput);
});

test("invalid overrides preserve CLI errors and can recover", async ({
  page,
}) => {
  await page.getByLabel("Ignore rules").fill("not-a-rule:docs");
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.getByTestId("exit-code")).toHaveText("Exit 2");
  await expect(
    page.getByText("Analysis incomplete", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Text", exact: true }).click();
  await expect(page.getByTestId("raw-output")).not.toBeEmpty();
  await page.getByLabel("Ignore rules").fill("");
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.getByTestId("exit-code")).toHaveText("Exit 1");
});

test("findings highlight their JSON fields and clear after editing", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Run analysis" }).click();
  await page
    .getByRole("button", { name: "Show docker-privileged in configuration" })
    .click();
  const highlighted = page.locator(".cm-finding-line");
  await expect(highlighted.filter({ hasText: '"args"' })).toHaveCount(1);
  await expect(highlighted.filter({ hasText: '"--privileged"' })).toHaveCount(
    1,
  );
  await page
    .getByRole("button", { name: "Show remote-http in configuration" })
    .click();
  await expect(highlighted).toHaveCount(1);
  await expect(highlighted).toContainText('"url"');
  await page.locator(".cm-content").press("End");
  await page.keyboard.insertText(" ");
  await expect(highlighted).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Show remote-http in configuration" }),
  ).toBeDisabled();
});

test("finding navigation handles escaped keys and duplicate field names", async ({
  page,
}) => {
  await page.locator(".cm-content").fill(
    JSON.stringify(
      {
        mcpServers: {
          safe: { url: "https://example.com" },
          'docs."special': { url: "http://example.com" },
        },
      },
      null,
      2,
    ),
  );
  await page.getByRole("button", { name: "Run analysis" }).click();
  const target = page.getByRole("button", {
    name: "Show remote-http in configuration",
  });
  await target.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".cm-finding-line")).toHaveCount(1);
  await expect(page.locator(".cm-finding-line")).toContainText(
    "http://example.com",
  );
});

test("TLS bypass preset runs the scanner and highlights the environment field", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "TLS verification disabled", exact: true })
    .click();
  await page.getByLabel("Fail on").selectOption("error");
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(
    page.getByRole("heading", {
      name: "tls-verification-disabled",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("exit-code")).toHaveText("Exit 1");
  await page
    .getByRole("button", {
      name: "Show tls-verification-disabled in configuration",
    })
    .click();
  await expect(page.locator(".cm-finding-line")).toContainText(
    '"NODE_TLS_REJECT_UNAUTHORIZED": "0"',
  );
  await page.getByLabel("Ignore rules").fill("tls-verification-disabled:docs");
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.getByTestId("exit-code")).toHaveText("Exit 0");
});

test("fits mobile with editable input and accessible output", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Preset", { exact: true }).selectOption("pinned");
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.getByTestId("exit-code")).toHaveText("Exit 0");
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflows).toBe(false);
});
