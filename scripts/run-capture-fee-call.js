/**
 * Run scraper with form fill + "Calculate Fee" click to capture the exact internal fee API call.
 * Usage: node scripts/run-capture-fee-call.js
 * Output: feeApiCapture (request URL with query params + response body) and capturedRequests.
 * Captcha may block the response; you will still get the request URL.
 */
const { scrapeFeePage } = require('../src/services/mcaScraper.service');

const formValues = {
  enquireFeeFor: 'Company',
  natureOfService: 'Name reservation and Company Incorporation',
  subService: 'Incorporation of a company (SPICe+ Part B)',
  opcSmallCompany: 'N',
  authCapital: 'Y',
  authorisedCapital: 1000000,
  whetherSec8Company: 'N',
  state: '', // set e.g. "Maharashtra" if needed
};

scrapeFeePage({
  targetUrl: 'https://www.mca.gov.in/content/mca/global/en/mca/fo-llp-services/enquire-fees.html',
  captureNetwork: true,
  autoResumeDebugger: true,
  extractContent: false,
  fillAndClickCalculateFee: { formValues },
})
  .then((result) => {
    const out = {
      success: result.success,
      feeApiCapture: result.feeApiCapture,
      capturedRequests: result.capturedRequests,
      error: result.error,
    };
    console.log(JSON.stringify(out, null, 2));
    if (result.feeApiCapture && result.feeApiCapture.request) {
      console.log('\n--- Internal fee API call (URL with params) ---');
      console.log(result.feeApiCapture.request.url);
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
