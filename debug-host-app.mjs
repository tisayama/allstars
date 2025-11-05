import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[Browser Console ${type}]:`, text);
  });

  // Listen to page errors
  page.on('pageerror', error => {
    console.error('[Page Error]:', error.message);
  });

  // Listen to network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('host') || url.includes('api') || url.includes('firestore')) {
      console.log('[Request]:', request.method(), url);
    }
  });

  // Listen to network responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('host') || url.includes('api') || url.includes('firestore')) {
      console.log('[Response]:', response.status(), url);
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('json') || contentType.includes('text')) {
          const body = await response.text();
          if (body && body.length < 1000) {
            console.log('[Response Body]:', body);
          } else if (body) {
            console.log('[Response Body (truncated)]:', body.substring(0, 500));
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  });

  try {
    console.log('Navigating to http://work-ubuntu:5173/');
    await page.goto('http://work-ubuntu:5173/', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('Page title:', await page.title());

    // Wait a bit to see the initial state
    await page.waitForTimeout(2000);

    // Check for any error messages on the page
    const bodyText = await page.textContent('body');
    console.log('\n=== Page Content ===');
    console.log(bodyText);
    console.log('===================\n');

    // Take a screenshot
    await page.screenshot({ path: '/home/tisayama/allstars/debug-host-app.png', fullPage: true });
    console.log('Screenshot saved to debug-host-app.png');

    // Keep the browser open for manual inspection
    console.log('Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error during debugging:', error);
    await page.screenshot({ path: '/home/tisayama/allstars/debug-host-app-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
