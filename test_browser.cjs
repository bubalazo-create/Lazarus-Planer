const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText || request.response()?.status());
  });
  
  try {
    await page.goto('https://bubalazo-create.github.io/Lazarus-Planer/', { waitUntil: 'networkidle0' });
    const content = await page.evaluate(() => document.body.innerHTML);
    console.log('BODY LENGTH:', content.length);
  } catch (e) {
    console.error('NAV ERROR:', e.message);
  }
  
  await browser.close();
})();
