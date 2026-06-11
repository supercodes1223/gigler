/**
 * Capture script for the submission video.
 * Usage: node docs/submission/video-assets/capture.mjs <task> [args]
 * Tasks:
 *   stage <htmlFile> <outPng> [query]   - 1920x1080 screenshot of a local stage HTML
 *   steps <htmlFile> <outDir> <n>       - screenshot ?step=1..n as outDir/step-XX.png
 *   scroll <url> <outDir> <seconds>     - record a slow scroll of a live page (webm in outDir)
 *   page <url> <outPng>                 - full 1920x1080 screenshot of a live page
 */
import { chromium } from "playwright";
import { pathToFileURL } from "url";
import path from "path";

const [task, a, b, c] = process.argv.slice(2);
const VIEWPORT = { width: 1920, height: 1080 };

const toUrl = (p) => (p.startsWith("http") ? p : pathToFileURL(path.resolve(p)).href);

async function withPage(fn, recordDir) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    ...(recordDir ? { recordVideo: { dir: recordDir, size: VIEWPORT } } : {}),
  });
  const page = await ctx.newPage();
  try {
    await fn(page);
  } finally {
    await ctx.close();
    await browser.close();
  }
}

if (task === "stage") {
  await withPage(async (page) => {
    await page.goto(toUrl(a) + (c ? `?${c}` : ""));
    await page.waitForTimeout(800);
    await page.screenshot({ path: b });
    console.log("wrote", b);
  });
} else if (task === "steps") {
  const n = parseInt(c, 10);
  await withPage(async (page) => {
    for (let i = 1; i <= n; i++) {
      await page.goto(toUrl(a) + `?step=${i}`);
      await page.waitForTimeout(500);
      const out = path.join(b, `step-${String(i).padStart(2, "0")}.png`);
      await page.screenshot({ path: out });
      console.log("wrote", out);
    }
  });
} else if (task === "scroll") {
  const secs = parseInt(c, 10) || 8;
  await withPage(async (page) => {
    await page.goto(toUrl(a), { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const height = await page.evaluate(() => document.body.scrollHeight);
    const stepCount = secs * 25;
    for (let i = 0; i <= stepCount; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), ((height - 1080) * i) / stepCount);
      await page.waitForTimeout(40);
    }
    console.log("recorded scroll of", a);
  }, b);
} else if (task === "page") {
  await withPage(async (page) => {
    await page.goto(toUrl(a), { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: b });
    console.log("wrote", b);
  });
} else {
  console.error("unknown task", task);
  process.exit(1);
}
