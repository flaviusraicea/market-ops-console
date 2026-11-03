// Fails when the production build ships more than the budgets in package.json ("budgets"). Run after `pnpm build`.
//
// It starts `next start`, loads Overview and the Analyst URL in headless Chromium, and adds up what the browser
// actually received (compressed bytes of each script, stylesheet and font). That is the number a user pays, and
// it is what Lighthouse measures. `next analyze` shows where those bytes come from; see docs/performance-monitoring.md.
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Browser } from "@playwright/test";

import { evaluate, format, lazyChunks, type Asset, type Budgets, type Load } from "./budget";

const PORT = 3300;
const root = path.join(__dirname, "..");
const budgets = (
  JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as { budgets: Budgets }
).budgets;

function startServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    // Node runs Next directly (not through pnpm), so killing this one process is enough to stop the server.
    const next = path.join(root, "node_modules", "next", "dist", "bin", "next");
    const child = spawn(process.execPath, [next, "start", "-p", String(PORT)], {
      cwd: root,
      stdio: ["ignore", "pipe", "inherit"],
    });
    child.once("error", reject);
    child.once("exit", (code) => reject(new Error(`next start exited with ${code}`)));
    child.stdout.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("Ready")) resolve(child);
    });
  });
}

async function measure(browser: Browser, route: string): Promise<Load> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  const urls = new Map<string, string>();
  const received = new Map<string, number>();
  cdp.on("Network.requestWillBeSent", (e) => urls.set(e.requestId, e.request.url));
  cdp.on("Network.dataReceived", (e) =>
    received.set(e.requestId, (received.get(e.requestId) ?? 0) + e.encodedDataLength),
  );
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "networkidle" });
  await context.close();

  const load: Load = { js: [], css: [], fonts: [] };
  for (const [id, url] of urls) {
    const { pathname } = new URL(url);
    const asset: Asset = { file: path.basename(pathname), kb: (received.get(id) ?? 0) / 1024 };
    if (pathname.endsWith(".js")) load.js.push(asset);
    else if (pathname.endsWith(".css")) load.css.push(asset);
    else if (pathname.endsWith(".woff2")) load.fonts.push(asset);
  }
  return load;
}

async function main() {
  const server = await startServer();
  // CHROMIUM_PATH lets a machine whose Playwright browsers are a different build point at one it has.
  const browser = await chromium.launch(
    process.env["CHROMIUM_PATH"] ? { executablePath: process.env["CHROMIUM_PATH"] } : {},
  );
  try {
    const overview = await measure(browser, budgets.overview.path);
    const analyst = await measure(browser, budgets.analyst.path);
    const rows = evaluate(budgets, overview, analyst);
    console.log(format(rows));
    console.log("\nLazy chunks (loaded by Analyst, not by Overview):");
    for (const chunk of lazyChunks(overview, analyst).sort((a, b) => b.kb - a.kb))
      console.log(`  ${chunk.kb.toFixed(1).padStart(6)} KB  ${chunk.file}`);
    const failures = rows.filter((r) => !r.pass);
    console.log(`\n${rows.length} budgets, ${failures.length} over`);
    if (failures.length > 0) process.exitCode = 1;
  } finally {
    await browser.close();
    server.removeAllListeners("exit");
    server.kill();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
