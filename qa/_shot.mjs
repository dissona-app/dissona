import { chromium } from '@playwright/test';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url);
await p.waitForTimeout(2500);
await p.screenshot({ path: out });
await b.close();
