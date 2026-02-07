/**
 * Run MCA fee page scraper once. Usage: node scripts/run-scraper.js
 * Requires: npm install (Puppeteer may take a few minutes to download)
 */
const { scrapeFeePage } = require('../src/services/mcaScraper.service');

scrapeFeePage({ captureNetwork: true, autoResumeDebugger: true })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
