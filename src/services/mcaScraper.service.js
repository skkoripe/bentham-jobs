/**
 * MCA Fee Enquiry page scraper (Puppeteer).
 * Loads the fee page, optionally neutralizes debugger, captures network requests.
 * Captcha on "Calculate Fee" will still block full automation unless solved externally.
 */

const CONTENT_FEE_PAGE = 'https://www.mca.gov.in/content/mca/global/en/mca/fo-llp-services/enquire-fees.html';

const FEE_PAGE_URLS = [
  CONTENT_FEE_PAGE,
  'https://www.mca.gov.in/mcafoportal/enquireFee.do',
];

const DEFAULT_LAUNCH_OPTS = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,1080',
    '--disable-blink-features=AutomationControlled',
  ],
  ignoreDefaultArgs: ['--enable-automation'],
};

/** Auto-resume when page hits debugger; so MCA's antibot doesn't freeze the page */
async function enableDebuggerAutoResume(page) {
  const cdp = await page.target().createCDPSession();
  await cdp.send('Debugger.enable');
  cdp.on('Debugger.paused', () => {
    cdp.send('Debugger.resume').catch(() => {});
  });
}

/**
 * Scrape MCA fee enquiry page: load page, capture XHR/fetch, extract form options and page content.
 * @param {Object} options - { targetUrl?: string, captureNetwork?: boolean, autoResumeDebugger?: boolean, extractContent?: boolean }
 * @returns {Promise<{ success, url, title, capturedRequests, formFields, pageContent?, error? }>}
 */
async function scrapeFeePage(options = {}) {
  const {
    targetUrl = null,
    captureNetwork = true,
    autoResumeDebugger = true,
    extractContent = true,
    fillAndClickCalculateFee = null,
  } = options;
  const urlsToTry = targetUrl ? [targetUrl] : FEE_PAGE_URLS;
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (_) {
    return {
      success: false,
      url: null,
      title: '',
      capturedRequests: [],
      formFields: null,
      pageContent: null,
      error: 'Puppeteer not installed. Run: npm install puppeteer (close other Node/IDE processes first to avoid EBUSY).',
    };
  }
  let browser;

  const capturedRequests = [];

  try {
    browser = await puppeteer.launch(DEFAULT_LAUNCH_OPTS);
    const page = await browser.newPage();

    if (autoResumeDebugger) {
      await enableDebuggerAutoResume(page);
    }

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-IN,en;q=0.9',
    });

    const feeApiCalls = [];
    if (captureNetwork) {
      page.on('request', (req) => {
        const u = req.url();
        const method = req.method();
        const isFeeApi = u.includes('foserviceEnquirefee') || u.includes('enquireFee') || u.includes('Enquirefee');
        if (method === 'POST' || isFeeApi || u.includes('fee') || u.includes('Fee')) {
          const record = {
            url: u,
            method,
            postData: req.postData() || undefined,
          };
          capturedRequests.push(record);
          if (isFeeApi) feeApiCalls.push({ request: record, responseStatus: null, responseBody: null });
        }
      });
      page.on('response', async (res) => {
        const u = res.url();
        if (!u.includes('foserviceEnquirefee') && !u.includes('Enquirefee')) return;
        const entry = feeApiCalls.find((c) => c.request.url === u && c.responseBody === null);
        const target = entry || feeApiCalls[feeApiCalls.length - 1];
        if (target) {
          target.responseStatus = res.status();
          try {
            const ct = (res.headers()['content-type'] || '').toLowerCase();
            if (ct.includes('json')) target.responseBody = await res.json();
            else target.responseBody = await res.text();
          } catch (_) {}
        }
      });
    }

    let lastError;
    let resolvedUrl;
    let title = '';

    const isFeePage = (t, u) => {
      const uu = (u || '').toLowerCase();
      const tt = (t || '').toLowerCase();
      return (
        tt.includes('enquir') ||
        tt.includes('fee') ||
        uu.includes('enquirefee') ||
        uu.includes('enquire-fees')
      );
    };

    for (const url of urlsToTry) {
      try {
        const res = await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 25000,
        });
        if (res && res.status() === 200) {
          const actualUrl = page.url();
          const actualTitle = await page.title();
          if (isFeePage(actualTitle, actualUrl)) {
            resolvedUrl = actualUrl;
            title = actualTitle;
            break;
          }
          lastError = `Redirected to "${actualTitle}" (not fee page)`;
        }
      } catch (e) {
        lastError = e.message;
        continue;
      }
    }

    let redirectedToNonFeePage = false;
    if (!resolvedUrl) {
      try {
        resolvedUrl = page.url();
        title = await page.title();
        if (resolvedUrl && !isFeePage(title, resolvedUrl)) redirectedToNonFeePage = true;
      } catch (_) {}
      if (!resolvedUrl) {
        return {
          success: false,
          url: null,
          title: '',
          capturedRequests: capturedRequests.slice(-20),
          formFields: null,
          pageContent: null,
          feeApiCapture: undefined,
          redirectedToNonFeePage: false,
          error: lastError || 'All fee page URLs failed to load',
        };
      }
    }

    const formFields = await page.evaluate(() => {
      const out = {};
      const selects = document.querySelectorAll('select[id], select[name]');
      selects.forEach((el) => {
        const name = el.name || el.id || el.getAttribute('data-name');
        if (!name) return;
        const options = Array.from(el.options).map((o) => ({ value: o.value, text: (o.text || '').trim() }));
        out[name] = { type: 'select', options: options.filter((o) => o.value || o.text) };
      });
      const inputs = document.querySelectorAll('input[name][type="text"], input[name][type="number"], input[id]');
      inputs.forEach((el) => {
        const name = el.name || el.id;
        if (!name || out[name]) return;
        out[name] = { type: el.type || 'text', name, placeholder: el.placeholder || null };
      });
      return Object.keys(out).length ? out : null;
    });

    if (fillAndClickCalculateFee) {
      const formValues = fillAndClickCalculateFee.formValues || {};
      const defaults = {
        enquireFeeFor: formValues.enquireFeeFor || 'Company',
        natureOfService: formValues.natureOfService || 'Name reservation and Company Incorporation',
        subService: formValues.subService || 'Incorporation of a company (SPICe+ Part B)',
        opcSmallCompany: formValues.opcSmallCompany || 'N',
        authCapital: formValues.authCapital || 'Y',
        authorisedCapital: formValues.authorisedCapital != null ? String(formValues.authorisedCapital) : '1000000',
        whetherSec8Company: formValues.whetherSec8Company || 'N',
        state: formValues.state || '',
      };
      const clickResult = await page.evaluate((vals) => {
        const setSelect = (name, valueOrText) => {
          const el = document.querySelector(`select[name="${name}"], select[id="${name}"]`);
          if (!el) return false;
          const v = String(valueOrText);
          const opt = Array.from(el.options).find((o) => o.value === v || (o.text && o.text.trim() === v));
          if (opt) {
            el.value = opt.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        };
        const setInput = (name, value) => {
          const el = document.querySelector(`input[name="${name}"], input[id="${name}"]`);
          if (!el) return false;
          el.value = String(value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        };
        const setRadio = (name, value) => {
          const v = String(value);
          const el = document.querySelector(`input[name="${name}"][value="${v}"], input[id="${name}"][value="${v}"]`);
          if (!el) return false;
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        const applied = [];
        [
          ['enquireFeeFor', vals.enquireFeeFor],
          ['name', vals.enquireFeeFor],
          ['natureOfService', vals.natureOfService],
          ['subService', vals.subService],
          ['purpose', vals.purpose],
        ].forEach(([name, val]) => { if (val && setSelect(name, val)) applied.push(name); });
        [
          ['opcSmallCompany', vals.opcSmallCompany],
          ['authCapital', vals.authCapital],
          ['whetherSec8Company', vals.whetherSec8Company],
        ].forEach(([name, val]) => { if (val && setRadio(name, val)) applied.push(name); });
        if (vals.authorisedCapital && setInput('authorisedCapital', vals.authorisedCapital)) applied.push('authorisedCapital');
        if (vals.state && setInput('state', vals.state)) applied.push('state');
        const btn = Array.from(document.querySelectorAll('button, input[type="submit"], a')).find((e) => /calculate\s*fee/i.test((e.textContent || e.value || '')));
        if (btn) {
          btn.click();
          return { clicked: true, applied };
        }
        return { clicked: false, applied };
      }, defaults).catch(() => ({ clicked: false, applied: [] }));

      if (clickResult && clickResult.clicked) {
        await new Promise((r) => setTimeout(r, 4000));
      }
    }

    let pageContent = null;
    if (extractContent) {
      pageContent = await page.evaluate(() => {
        const main = document.querySelector('main, [role="main"], .content, #content, .page-content') || document.body;
        const tables = Array.from(main.querySelectorAll('table')).map((t) => {
          const rows = Array.from(t.querySelectorAll('tr')).map((tr) =>
            Array.from(tr.querySelectorAll('th, td')).map((cell) => cell.textContent.trim())
          );
          return rows;
        });
        const headings = Array.from(main.querySelectorAll('h1, h2, h3')).map((h) => ({
          tag: h.tagName,
          text: h.textContent.trim(),
        }));
        const paragraphs = Array.from(main.querySelectorAll('p')).slice(0, 20).map((p) => p.textContent.trim());
        return {
          headings: headings.filter((h) => h.text),
          tables: tables.filter((t) => t.length > 0),
          paragraphs: paragraphs.filter((p) => p.length > 0),
        };
      });
    }

    return {
      success: true,
      url: resolvedUrl,
      title,
      capturedRequests: capturedRequests.slice(-30),
      formFields,
      pageContent,
      redirectedToNonFeePage,
      feeApiCapture: feeApiCalls.length
        ? feeApiCalls.map((c) => ({
            request: c.request,
            responseStatus: c.responseStatus,
            responseBody: c.responseBody,
          }))
        : undefined,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      url: null,
      title: '',
      capturedRequests: capturedRequests.slice(-20),
      formFields: null,
      pageContent: null,
      error: err.message || String(err),
    };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = {
  scrapeFeePage,
  FEE_PAGE_URLS,
  CONTENT_FEE_PAGE,
};
