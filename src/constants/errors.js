/**
 * Central error codes, messages, and HTTP status. Import and use everywhere for consistent API errors.
 */

const CODES = {
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  MCA_REQUEST_FAILED: 'MCA_REQUEST_FAILED',
  MCA_ACCESS_DENIED: 'MCA_ACCESS_DENIED',
  SCRAPE_FAILED: 'SCRAPE_FAILED',
  TIMEOUT: 'TIMEOUT',
};

const MESSAGES = {
  [CODES.NOT_FOUND]: 'Resource not found',
  [CODES.BAD_REQUEST]: 'Bad request',
  [CODES.VALIDATION_ERROR]: 'Validation failed',
  [CODES.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [CODES.MCA_REQUEST_FAILED]: 'MCA fee request failed',
  [CODES.MCA_ACCESS_DENIED]: 'MCA blocks direct server access',
  [CODES.SCRAPE_FAILED]: 'Scrape failed',
  [CODES.TIMEOUT]: 'Request timeout',
};

const HTTP_STATUS = {
  [CODES.NOT_FOUND]: 404,
  [CODES.BAD_REQUEST]: 400,
  [CODES.VALIDATION_ERROR]: 400,
  [CODES.INTERNAL_SERVER_ERROR]: 500,
  [CODES.MCA_REQUEST_FAILED]: 502,
  [CODES.MCA_ACCESS_DENIED]: 403,
  [CODES.SCRAPE_FAILED]: 502,
  [CODES.TIMEOUT]: 408,
};

/**
 * Create error object for next(err). Use in handlers/services.
 * @param {string} code - One of CODES
 * @param {{ message?: string, statusCode?: number, details?: unknown }} overrides
 * @returns {{ statusCode: number, code: string, message: string, details?: unknown }}
 */
function createError(code, overrides = {}) {
  const statusCode = overrides.statusCode ?? HTTP_STATUS[code] ?? 500;
  const message = overrides.message ?? MESSAGES[code] ?? MESSAGES[CODES.INTERNAL_SERVER_ERROR];
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (overrides.details !== undefined) err.details = overrides.details;
  return err;
}

/**
 * Standard API error response body (used by middleware).
 * @param {string} code
 * @param {string} message
 * @param {number} statusCode
 * @param {unknown} [details]
 */
function errorResponseBody(code, message, statusCode, details) {
  const body = { success: false, code, message };
  if (details !== undefined) body.details = details;
  if (statusCode >= 500) body.requestId = undefined; // can be set by middleware if you add request id
  return body;
}

module.exports = {
  CODES,
  MESSAGES,
  HTTP_STATUS,
  createError,
  errorResponseBody,
};
