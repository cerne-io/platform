import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const ADMIN_PASSWORD = ["e2e", "workspace", "pass"].join("-");

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      srv.close(() => resolve(addr.port));
    });
  });
}

function startMockLlmServer(port) {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (req.url === "/v1/chat/completions" && req.method === "POST") {
        let reply = "OK";
        try {
          const parsed = JSON.parse(body);
          const userMsg = parsed?.messages?.at(-1)?.content || "";
          if (String(userMsg).includes("Hopeful") || String(userMsg).startsWith("[")) {
            reply = '[{"emotion":"engaged","sentiment":"positive"}]';
          }
        } catch {
          // ignore
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ choices: [{ message: { content: reply } }] }));
        return;
      }
      res.writeHead(404);
      res.end("Not found");
    });
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function startAppServer(port, dataDir) {
  const child = spawn("node", ["dist-server/index.js"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      DATA_DIR: dataDir,
      ADMIN_PASSWORD,
      SEED_SAMPLE_PROJECT: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });
  child.getLogs = () => logs;
  return child;
}

async function waitHealthy(baseUrl, child) {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early (${child.exitCode}):\n${child.getLogs()}`);
    }
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not become healthy:\n${child.getLogs()}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}

async function run() {
  const appPort = await getFreePort();
  const mockLlmPort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${appPort}`;
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "cerne-e2e-"));
  const dataDir = path.join(tmpDir, "pgdata");

  const mockLlm = await startMockLlmServer(mockLlmPort);
  let server = startAppServer(appPort, dataDir);
  let browser;

  try {
    await waitHealthy(baseUrl, server);

    browser = await chromium.launch({ headless: true });
    const adminContext = await browser.newContext();
    const page = await adminContext.newPage();

    const pageErrors = [];
    const server5xx = [];
    const trackErrors = (targetPage) => {
      targetPage.on("pageerror", (err) => pageErrors.push(err.message));
      targetPage.on("response", (res) => {
        if (res.status() >= 500) server5xx.push(`${res.status()} ${res.url()}`);
      });
    };
    trackErrors(page);

    // 1. Auth gate & unlock
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByText("Unlock Workspace").first().waitFor({ state: "visible" });

    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "Unlock Workspace" }).click();
    await page.getByText(/Invalid workspace password/i).waitFor({ state: "visible" });

    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Unlock Workspace" }).click();

    await page.getByText("Team Onboarding Retrospective").first().waitFor({ state: "visible" });

    // 2. Open sample project and navigate core routes
    await page.getByText("Team Onboarding Retrospective").first().click();
    await page.goto(`${baseUrl}/design`, { waitUntil: "networkidle" });
    await page.goto(`${baseUrl}/explore`, { waitUntil: "networkidle" });
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });

    // 3. Configure Settings with local mock OpenAI-compatible server + reset prompts
    await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
    assert.equal(await page.locator('[data-tour="sidebar-nav-settings"]').count(), 1);
    const mockBaseUrl = `http://127.0.0.1:${mockLlmPort}/v1`;
    await page.locator("#llm-base-url").fill(mockBaseUrl);
    await page.locator("#llm-model").fill("e2e-test-model");
    await page.getByRole("button", { name: "Test Connection" }).click();
    await page.getByText(/Connected to e2e-test-model/i).waitFor({ state: "visible" });

    await page.getByRole("button", { name: "Save Settings" }).click();
    await page.getByText("LLM settings saved", { exact: true }).first().waitFor({ state: "visible" });

    // Toggle "Enable AI follow-ups on public interviews" on then back off to verify immediate persistence
    const publicAiSwitch = page.locator("#public-interviewer-ai-toggle");
    await publicAiSwitch.click();
    await page.getByText("Public interviewer AI follow-ups enabled", { exact: true }).first().waitFor({ state: "visible" });
    await publicAiSwitch.click();
    await page.getByText("Public interviewer AI follow-ups disabled", { exact: true }).first().waitFor({ state: "visible" });

    await page.getByRole("tab", { name: "Design Assistant Prompts" }).click();
    await page.locator("#prompt-content").waitFor({ state: "visible" });
    await page.getByRole("button", { name: /Reset Defaults/i }).click();
    await page.getByText("Default prompts restored", { exact: true }).first().waitFor({ state: "visible" });

    // 4. Create shareable dashboard token from authenticated browser session
    const shareToken = "e2e-public-dashboard-token";
    const projectsRes = await page.evaluate(async () => {
      const r = await fetch("/api/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "projects",
          action: "select",
          filters: [{ op: "eq", column: "is_template", value: false }],
          limit: 1,
        }),
      });
      return r.json();
    });
    const projectId = projectsRes.data[0].id;
    assert.ok(projectId, "Expected seeded project id");

    // Verify authenticated interviewer route renders the story question & start card
    await page.goto(`${baseUrl}/interviewer/${projectId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Start Interview/i }).waitFor({ state: "visible" });

    const tokenStatus = await page.evaluate(
      async ({ pid, tok }) => {
        const r = await fetch("/api/rpc/create_dashboard_token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ p_project_id: pid, p_token: tok }),
        });
        return r.status;
      },
      { pid: projectId, tok: shareToken }
    );
    assert.equal(tokenStatus, 200);

    // 5. Incognito anonymous public form submission + public dashboard check
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();
    trackErrors(publicPage);

    const uniqueTitle = `E2E Submitted Story ${Date.now()}`;
    await publicPage.goto(`${baseUrl}/submit-story/sample-onboarding-form`, {
      waitUntil: "networkidle",
    });
    await publicPage.locator("#storyText").waitFor({ state: "visible" });
    await publicPage.locator("#storyText").fill(
      "On my third day, my mentor walked me through our first customer story review and explained why every voice mattered."
    );
    await publicPage.locator("#storyTitle").fill(uniqueTitle);
    await publicPage.locator("#feeling-engaged").click();
    await publicPage.getByRole("button", { name: /Submit/i }).click();

    await publicPage
      .getByText(/Thank you|Story Submitted|submitted/i)
      .first()
      .waitFor({ state: "visible", timeout: 15000 });

    // Incognito visitor completes public interview (/interview/sample-onboarding-form) with AI follow-ups disabled
    const interviewTitle = `E2E Interview Story ${Date.now()}`;
    await publicPage.goto(`${baseUrl}/interview/sample-onboarding-form`, {
      waitUntil: "networkidle",
    });
    await publicPage.getByRole("button", { name: /Start Interview/i }).click();
    // Wait for deterministic 2s delayed story question so assistantMessageCount reaches 1
    await publicPage.getByText(/Hello! I'm here to listen/i).waitFor({ state: "visible" });
    await publicPage.waitForTimeout(2300);
    const interviewInput = publicPage.getByPlaceholder(/Type your response here/i);
    await interviewInput.waitFor({ state: "visible" });
    await interviewInput.fill(
      "Joining the weekly mentor sync in week one helped me feel confident asking technical questions."
    );
    await interviewInput.press("Enter");

    // Skips AI follow-up when public AI toggle is off and asks for title + hashtags
    await publicPage.getByText(/title or hashtag/i).waitFor({ state: "visible" });
    await interviewInput.fill(`${interviewTitle} #onboarding`);
    await interviewInput.press("Enter");

    // Select emotion ("engaged")
    await publicPage.locator("label[for='engaged']").waitFor({ state: "visible" });
    await publicPage.locator("label[for='engaged']").click();

    // Advance through enabled interactive sliders / participant questions (2s delay each) until final comment prompt
    const finalCommentPrompt = publicPage.getByText(/anything else you would like to share/i);
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (await finalCommentPrompt.isVisible().catch(() => false)) break;
      const enabledSkip = publicPage.locator("button:not([disabled])", { hasText: /^Skip$/i }).first();
      if (await enabledSkip.isVisible().catch(() => false)) {
        await enabledSkip.click();
      }
      await publicPage.waitForTimeout(250);
    }

    await finalCommentPrompt.waitFor({ state: "visible", timeout: 5000 });
    await interviewInput.fill("No extra comments");
    await interviewInput.press("Enter");

    await publicPage
      .getByText(/Thank you so much for your participation|Your story has been saved/i)
      .first()
      .waitFor({ state: "visible", timeout: 15000 });

    // Confirm interview-submitted story also appears in /explore
    await page.goto(`${baseUrl}/explore?q=${encodeURIComponent(interviewTitle)}`, {
      waitUntil: "networkidle",
    });
    await page.getByText(interviewTitle).locator("visible=true").first().waitFor({ state: "visible" });

    // Incognito visitor opens shared public dashboard & cannot hit admin endpoints
    await publicPage.goto(`${baseUrl}/public-dashboard/${shareToken}`, {
      waitUntil: "networkidle",
    });
    await publicPage.getByText("Team Onboarding Retrospective").first().waitFor({ state: "visible" });

    const unauthDbStatus = await publicPage.evaluate(async () => {
      const r = await fetch("/api/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "projects", action: "select" }),
      });
      return r.status;
    });
    assert.equal(unauthDbStatus, 401);
    await publicContext.close();

    // Confirm newly submitted story shows in /explore (search filter brings it to page 1, ignoring hidden print card)
    const exploreFilteredUrl = `${baseUrl}/explore?q=${encodeURIComponent(uniqueTitle)}`;
    await page.goto(exploreFilteredUrl, { waitUntil: "networkidle" });
    await page
      .locator(`text="${uniqueTitle}" >> visible=true`)
      .first()
      .waitFor({ state: "visible" });

    // 6. Restart server against same DATA_DIR and verify persistence
    await stopServer(server);
    server = startAppServer(appPort, dataDir);
    await waitHealthy(baseUrl, server);

    await page.goto(exploreFilteredUrl, { waitUntil: "networkidle" });
    await page
      .locator(`text="${uniqueTitle}" >> visible=true`)
      .first()
      .waitFor({ state: "visible" });

    await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
    const persistedBaseUrl = await page.locator("#llm-base-url").inputValue();
    assert.equal(persistedBaseUrl, mockBaseUrl);

    assert.deepEqual(pageErrors, [], `Unexpected page errors: ${pageErrors.join("; ")}`);
    assert.deepEqual(server5xx, [], `Unexpected 5xx responses: ${server5xx.join("; ")}`);

    console.log("PASS: OSS E2E smoke suite passed across all 6 scenarios.");
  } finally {
    if (browser) await browser.close();
    await stopServer(server);
    await new Promise((resolve) => mockLlm.close(resolve));
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error("E2E smoke suite failed:", err);
  process.exit(1);
});

