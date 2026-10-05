const { chromium } = require('playwright');
const path = require('path');

async function runVerification() {
  console.log("Launching headless browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Capture console messages to ensure no errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
    console.log(`[Browser Console ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.error(`[Browser Page Error] ${err.name}: ${err.message}`);
  });

  console.log("Navigating to production site...");
  await page.goto('https://whale-watch-474208523276.us-central1.run.app/', { waitUntil: 'networkidle', timeout: 30000 });

  console.log("Waiting 15 seconds for backend evaluate-risk to complete and real-time markers to populate...");
  await page.waitForTimeout(15000);

  // Grab the counts and text from DOM
  const results = await page.evaluate(() => {
    const dangerZonesText = document.getElementById('count-danger-zones')?.innerText || 'not found';
    const vesselsText = document.getElementById('count-vessels')?.innerText || 'not found';
    const clockTime = document.getElementById('sim-time')?.innerText || 'not found';
    const clockDate = document.getElementById('sim-date')?.innerText || 'not found';
    
    // Check if the empty state overlay is visible or not
    const emptyStateEl = document.getElementById('map-empty-state');
    const emptyStateStyle = emptyStateEl ? window.getComputedStyle(emptyStateEl) : null;
    const emptyStateVisible = emptyStateStyle ? emptyStateStyle.display !== 'none' : false;
    const emptyStateContent = emptyStateEl ? emptyStateEl.innerText : '';

    return {
      dangerZonesText,
      vesselsText,
      clockTime,
      clockDate,
      emptyStateVisible,
      emptyStateContent
    };
  });

  console.log("\n=================== VERIFICATION RESULTS ===================");
  console.log(`Danger Zones Count in UI: ${results.dangerZonesText}`);
  console.log(`Vessels Count in UI:      ${results.vesselsText}`);
  console.log(`Clock Time:               ${results.clockTime}`);
  console.log(`Clock Date:               ${results.clockDate}`);
  console.log(`Empty State Visible:      ${results.emptyStateVisible}`);
  console.log("============================================================\n");

  // Save screenshot to artifacts directory
  const screenshotPath = '/Users/hirokenehan/.gemini/antigravity-ide/brain/51ab15b6-07d0-4d1b-afc2-1095f8f1ccaf/final_page_verification.png';
  console.log(`Saving screenshot to ${screenshotPath}...`);
  await page.screenshot({ path: screenshotPath });

  await browser.close();

  if (errors.length > 0) {
    console.error(`Verification completed with ${errors.length} browser errors.`);
    process.exit(1);
  } else {
    console.log("Verification completed successfully with zero browser errors!");
    process.exit(0);
  }
}

runVerification();
