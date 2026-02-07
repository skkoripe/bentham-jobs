/**
 * Direct GET to MCA fee API (no browser). Use when scraping redirects to Home.
 * GET https://www.mca.gov.in/bin/mca/foserviceEnquirefee?param1=value1&...
 */

const https = require('https');
const { MCA_FEE_API_BASE } = require('../constants');

/**
 * Call MCA foserviceEnquirefee with query params.
 * @param {Record<string, string|number|boolean>} params - e.g. { service: "Company", name: "Company", ... }
 * @returns {Promise<{ success: boolean, data?: object, error?: string, statusCode?: number }>}
 */
function enquireFee(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      query.append(k, String(v));
    }
  });
  const url = `${MCA_FEE_API_BASE}${query.toString() ? `?${query.toString()}` : ''}`;

  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let data = null;
          try {
            const ct = (res.headers['content-type'] || '').toLowerCase();
            data = ct.includes('json') ? JSON.parse(body) : body;
          } catch (_) {
            data = body;
          }
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            data,
            error: res.statusCode >= 400 ? body.slice(0, 200) : undefined,
          });
        });
      }
    );
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });
  });
}

module.exports = {
  enquireFee,
};
