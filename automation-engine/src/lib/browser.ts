import { Browser, BrowserContext, chromium, Page } from 'playwright';
import { logger } from './logger';

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    logger.info('Launching Chromium browser…');
    browserInstance = await chromium.launch({
      headless: process.env.SCRAPER_HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });
  }
  return browserInstance;
}

export async function newStealthContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'fr-CH',
    timezoneId: 'Europe/Zurich',
    extraHTTPHeaders: {
      'Accept-Language': 'fr-CH,fr;q=0.9,en;q=0.8',
    },
  });

  // Block ads and tracking
  await context.route('**/(analytics|ads|tracking|pixel)/**', (route) => route.abort());

  return context;
}

export async function takeScreenshot(page: Page, label: string): Promise<string | undefined> {
  try {
    const dir = process.env.UPLOAD_DIR ?? './uploads';
    const filename = `screenshot_${label}_${Date.now()}.png`;
    const fullPath = `${dir}/screenshots/${filename}`;
    require('fs').mkdirSync(`${dir}/screenshots`, { recursive: true });
    await page.screenshot({ path: fullPath, fullPage: false });
    return fullPath;
  } catch {
    return undefined;
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
