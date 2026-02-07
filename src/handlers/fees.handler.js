const mcaScraper = require('../services/mcaScraper.service');
const mcaFeeApi = require('../services/mcaFeeApi.service');
const stampDutyService = require('../services/stampDuty.service');
const { createError, CODES } = require('../constants/errors');

async function scrapeFeePage(req, res, next) {
  try {
    const options = {
      targetUrl: req.body.targetUrl || null,
      captureNetwork: req.body.captureNetwork !== false,
      autoResumeDebugger: req.body.autoResumeDebugger !== false,
      extractContent: req.body.extractContent !== false,
      fillAndClickCalculateFee: req.body.fillAndClickCalculateFee || null,
    };
    const result = await mcaScraper.scrapeFeePage(options);
    res.json({
      success: result.success,
      data: {
        url: result.url,
        title: result.title,
        redirectedToNonFeePage: result.redirectedToNonFeePage,
        capturedRequests: result.capturedRequests,
        formFields: result.formFields,
        pageContent: result.pageContent || undefined,
        feeApiCapture: result.feeApiCapture,
      },
      error: result.error || undefined,
      disclaimer: result.redirectedToNonFeePage
        ? 'MCA redirected to Home (antibot). Run "npm run scrape:capture-fee" locally for fee form, or use rule-based fee API.'
        : 'With fillAndClickCalculateFee, captcha may block; feeApiCapture shows the internal fee API call (URL + response) if captured.',
    });
  } catch (err) {
    if (err.statusCode && err.code) return next(err);
    next(createError(CODES.SCRAPE_FAILED, { message: err.message || 'Scrape failed' }));
  }
}

/**
 * POST /api/v1/fees/enquire
 * Direct GET to MCA fee API with query params (no browser). Use when scrape redirects to Home.
 * Body: { service?, name?, natureOfService?, subService?, opcSmallCompany?, authCapital?, authorisedCapital?, whetherSec8Company?, state?, ... } — all sent as query params.
 */
async function enquireFee(req, res, next) {
  try {
    const params = req.body && typeof req.body === 'object' ? req.body : {};
    const result = await mcaFeeApi.enquireFee(params);
    const isBlocked = result.statusCode === 403 || (result.error && result.error.includes('Access Denied'));
    res.json({
      success: result.success,
      data: result.data,
      statusCode: result.statusCode,
      error: result.error,
      note: isBlocked
        ? 'MCA blocks direct server access (403). Use POST /api/v1/fees/stamp-duty for rule-based fee, or run "npm run scrape:capture-fee" locally when scrape does not redirect.'
        : 'Params are sent as GET query string to MCA.',
    });
  } catch (err) {
    if (err.statusCode && err.code) return next(err);
    next(createError(CODES.MCA_REQUEST_FAILED, { message: err.message }));
  }
}

/**
 * POST /api/v1/fees/stamp-duty
 * Rule-based stamp duty & incorporation fee. Accepts all Fee Details form fields (image 1); returns fee table (image 2).
 * Body: enquireFeeFor?, natureOfService?, subService?, opcSmallCompany?, authCapital?, authorisedCapitalINR?, whetherSec8Company?, state?
 */                                                       
async function stampDuty(req, res, next) {
  try {
    const params = req.body && typeof req.body === 'object' ? req.body : {};
    const result = stampDutyService.calculateStampDuty(params);
    res.json({
      success: result.success,
      data: result.data,
      disclaimer: result.disclaimer,
    });
  } catch (err) {
    if (err.statusCode && err.code) return next(err);
    next(createError(CODES.INTERNAL_SERVER_ERROR, { message: err.message }));
  }
}

module.exports = {
  scrapeFeePage,
  enquireFee,
  stampDuty,
};
