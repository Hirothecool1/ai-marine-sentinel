const { chromium } = require('playwright');

async function captureBrowserErrors() {
  console.log("Launching Playwright browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    const location = msg.location();
    console.log(`[Browser Console ${type.toUpperCase()}] ${text} (at ${location.url}:${location.lineNumber}:${location.columnNumber})`);
  });

  page.on('pageerror', err => {
    console.error(`[Browser Uncaught Error] ${err.name}: ${err.message}`);
    console.error("Stack Trace:");
    console.error(err.stack);
  });

  page.on('response', res => {
    try {
      const url = res.url();
      const status = res.status();
      const headers = res.headers();
      const contentType = headers['content-type'] || 'unknown';
      console.log(`[Response] ${url} -> Status ${status}, Content-Type: ${contentType}`);
    } catch (err) {
      console.error("Error processing response event:", err);
    }
  });

  page.on('requestfailed', req => {
    console.log(`[Request Failed] ${req.url()}`);
  });

  console.log("Navigating to production URL...");
  try {
    await page.goto('https://whale-watch-474208523276.us-central1.run.app/index.html', { waitUntil: 'load', timeout: 30000 });
    console.log("Page loaded. Waiting 10 seconds for feeds...");
    await page.waitForTimeout(10000);
  } catch (err) {
    console.error("Navigation failed:", err);
  } finally {
    await browser.close();
  }
}

captureBrowserErrors();
