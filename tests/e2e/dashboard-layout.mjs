#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const screenshotDir = path.join(repoRoot, "docs/acceptance/dashboard");
let baseURL = process.env.MSF_E2E_BASE_URL || "";
let vite;

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function startVite() {
  if (process.env.MSF_E2E_BASE_URL) return;
  const port = await freePort();
  baseURL = `http://127.0.0.1:${port}`;
  vite = spawn(
    process.execPath,
    [path.join(repoRoot, "web/node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: path.join(repoRoot, "web"), stdio: ["ignore", "pipe", "pipe"] },
  );
  vite.stdout.on("data", (chunk) => process.stdout.write(`[vite] ${chunk}`));
  vite.stderr.on("data", (chunk) => process.stderr.write(`[vite] ${chunk}`));
}

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockApi(page) {
  await page.route("**/api/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/v1/setup/check") return json(route, { is_initialized: true });
    if (pathname === "/api/v1/auth/me") return json(route, { user: { username: "e2e", role: "admin" } });
    if (pathname === "/api/v1/version") return json(route, { version: "dashboard-e2e" });
    if (pathname === "/api/v1/events/monitor") {
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: `event: monitor\ndata: ${JSON.stringify({ timestamp: Date.now(), cpu_percent: 23, memory_percent: 41, download_speed: 245760, upload_speed: 98304, connections: 36 })}\n\n`,
      });
    }
    if (pathname === "/api/v1/monitor/system") return json(route, { data: { hostname: "msf-e2e", platform: "Linux / amd64", uptime_seconds: 86461, data_dir: "/opt/msf" } });
    if (pathname === "/api/v1/monitor/resources") return json(route, { data: { cpu_percent: 23, memory_percent: 41, cpu_model: "Virtual CPU", cpu_cores: 4, memory_total: 8 * 1024 ** 3, disk_total: 64 * 1024 ** 3, disk_percent: 37 } });
    if (pathname === "/api/v1/monitor/network") return json(route, { data: { download_speed: 245760, upload_speed: 98304, connections: 36, total_download: 16 * 1024 ** 3, total_upload: 4 * 1024 ** 3 } });
    if (pathname === "/api/v1/monitor/history") return json(route, { data: [0, 1, 2, 3].map((offset) => ({ timestamp: Date.now() - (3 - offset) * 1000, cpu_percent: 20 + offset, memory_percent: 40 + offset, download_speed: 200000 + offset * 10000, upload_speed: 80000 + offset * 5000, connections: 30 + offset })) });
    if (pathname === "/api/v1/services") return json(route, { data: [
      { name: "mosdns", display_name: "MosDNS", running: true, installed: true, cpu_percent: 1.2, memory_bytes: 32 * 1024 ** 2, uptime_seconds: 3600 },
      { name: "singbox", display_name: "Sing-Box", running: false, installed: false },
      { name: "mihomo", display_name: "Mihomo", running: true, installed: true, cpu_percent: 2.4, memory_bytes: 96 * 1024 ** 2, uptime_seconds: 7200 },
    ] });
    return json(route, { success: true, data: {} });
  });
}

async function waitForStablePage(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 7_500 }).catch(() => {});
  await page.locator(".dashboard-grid").waitFor();
}

async function openPicker(page) {
  const button = page.getByRole("button", { name: /打开仪表盘组件|完成仪表盘编辑/ });
  await button.click();
  const dialog = page.getByRole("dialog", { name: "仪表盘组件" });
  await dialog.waitFor();
  return dialog;
}

async function selectedCount(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("msf.dashboard.settings.v2") || "{}").instances?.length ?? 0);
}

async function main() {
  await fs.mkdir(screenshotDir, { recursive: true });
  await startVite();
  await waitForServer(baseURL);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const legacy = {
    compact: false,
    visible: { device: false, hardware: true, stats: false, resources: true, rate: true, mosdns: true, singbox: true, mihomo: true },
  };
  await context.addInitScript((settings) => {
    localStorage.setItem("msf_token", "dashboard-e2e-token");
    if (!localStorage.getItem("msf.dashboard.settings.v2")) localStorage.setItem("msf.dashboard.settings.v1", JSON.stringify(settings));
  }, legacy);
  await context.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.__dashboardMonitorStreams = { active: 0, maxActive: 0, calls: 0 };
    window.fetch = (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      if (!url.includes("/api/v1/events/monitor")) return nativeFetch(input, init);
      const stats = window.__dashboardMonitorStreams;
      stats.calls += 1;
      stats.active += 1;
      stats.maxActive = Math.max(stats.maxActive, stats.active);
      const encoder = new TextEncoder();
      const body = new ReadableStream({
        start(controller) {
          let closed = false;
          controller.enqueue(encoder.encode(`event: monitor\ndata: ${JSON.stringify({ timestamp: Date.now(), cpu_percent: 23, memory_percent: 41, download_speed: 245760, upload_speed: 98304, connections: 36 })}\n\n`));
          const close = () => {
            if (closed) return;
            closed = true;
            stats.active -= 1;
            controller.close();
          };
          init?.signal?.addEventListener("abort", close, { once: true });
        },
      });
      return Promise.resolve(new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } }));
    };
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await mockApi(page);

  try {
    await page.goto(`${baseURL}/`);
    await waitForStablePage(page);

    const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem("msf.dashboard.settings.v2") || "null"));
    assert.equal(migrated.version, 2, "legacy settings should migrate to V2");
    assert.equal(migrated.instances.filter((item) => item.type === "system-info").length, 1, "legacy info cards should merge");
    assert.equal(migrated.instances.find((item) => item.type === "system-info").settings.tab, "hardware");

    let dialog = await openPicker(page);
    for (const label of ["系统", "MosDNS", "Mihomo"]) await dialog.getByRole("heading", { name: label, exact: true }).waitFor();
    assert.equal(await dialog.locator('input[type="search"], input[placeholder*="搜索"]').count(), 0, "picker must not contain search");
    assert.equal(await selectedCount(page), 6);

    while ((await selectedCount(page)) < 15) {
      const candidate = dialog.locator('button[aria-pressed="false"]:not([disabled])').first();
      assert.equal(await candidate.count(), 1, "there should be an addable widget before the limit");
      await candidate.click();
    }
    await dialog.getByText("最多启用 15 个组件", { exact: false }).waitFor();
    assert.ok(await dialog.locator('button[aria-pressed="false"][disabled]').count() > 0, "unselected widgets must disable at 15");
    const selectedButton = dialog.locator('button[aria-pressed="true"]').first();
    await selectedButton.click();
    assert.equal(await selectedCount(page), 14);
    assert.ok(await dialog.locator('button[aria-pressed="false"]:not([disabled])').count() > 0, "removing one widget must restore additions");

    await dialog.getByRole("button", { name: "编辑布局" }).click();
    await page.locator('.dashboard-grid[data-editing="true"]').waitFor();
    const desktopResizeHandle = page.locator(".react-resizable-handle").first();
    await desktopResizeHandle.waitFor();
    assert.notEqual(await desktopResizeHandle.evaluate((element) => getComputedStyle(element).display), "none", "desktop edit mode should show resize handles");
    await dialog.getByRole("button", { name: "完成编辑" }).click();
    await page.locator('.dashboard-grid[data-editing="true"]').waitFor({ state: "detached" });
    await dialog.getByRole("button", { name: "关闭组件面板" }).dispatchEvent("click");

    const beforeReload = await page.evaluate(() => localStorage.getItem("msf.dashboard.settings.v2"));
    await page.reload();
    await waitForStablePage(page);
    assert.equal(await page.evaluate(() => localStorage.getItem("msf.dashboard.settings.v2")), beforeReload, "layout and visibility must survive refresh");

    const viewports = [
      { width: 1440, height: 1000, name: "dashboard-1440.png" },
      { width: 1024, height: 900, name: "dashboard-1024.png" },
      { width: 768, height: 900, name: "dashboard-768.png" },
      { width: 390, height: 844, name: "dashboard-390.png" },
    ];
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(350);
      const overflow = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        structure: ["#main-content", "#main-content > div", "#main-content > div > div", ".dashboard-grid", ".react-grid-layout"].map((selector) => {
          const element = document.querySelector(selector);
          if (!element) return { selector, missing: true };
          const rect = element.getBoundingClientRect();
          return { selector, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth };
        }),
        offenders: Array.from(document.querySelectorAll("body *"))
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === "string" ? element.className.slice(0, 160) : "",
            left: Math.round(element.getBoundingClientRect().left),
            right: Math.round(element.getBoundingClientRect().right),
            width: Math.round(element.getBoundingClientRect().width),
          }))
          .filter((item) => item.right > window.innerWidth + 2 || item.left < -2)
          .sort((left, right) => right.right - left.right)
          .slice(0, 8),
      }));
      assert.ok(overflow.scrollWidth <= overflow.innerWidth + 2, `viewport overflow at ${viewport.width}px: ${JSON.stringify(overflow)}`);
      await page.screenshot({ path: path.join(screenshotDir, viewport.name), fullPage: true });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    dialog = await openPicker(page);
    await dialog.getByRole("button", { name: "编辑布局" }).click();
    await page.locator('.dashboard-grid[data-breakpoint="mobile"][data-editing="true"]').waitFor();
    const mobileHandles = page.locator(".react-resizable-handle");
    for (let index = 0; index < await mobileHandles.count(); index += 1) {
      assert.equal(await mobileHandles.nth(index).evaluate((element) => getComputedStyle(element).display), "none", "mobile must hide resize handles");
    }
    await dialog.getByRole("button", { name: "完成编辑" }).click();

    const monitorStreams = await page.evaluate(() => window.__dashboardMonitorStreams);
    assert.ok(monitorStreams.calls > 0, "dashboard should create the shared monitor SSE");
    assert.equal(monitorStreams.maxActive, 1, "dashboard must not create concurrent duplicate monitor SSE streams");

    await page.goto(`${baseURL}/mosdns/logs`);
    await page.waitForLoadState("domcontentloaded");
    assert.equal(await page.getByRole("button", { name: "打开仪表盘组件" }).count(), 0, "non-dashboard routes must not show the picker FAB");

    assert.deepEqual(browserErrors, [], `browser console errors: ${browserErrors.join(" | ")}`);
    console.log(`Dashboard E2E passed; screenshots: ${screenshotDir}`);
  } finally {
    await browser.close();
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (vite && !vite.killed) {
    vite.kill("SIGTERM");
    await new Promise((resolve) => vite.once("exit", resolve));
  }
}
