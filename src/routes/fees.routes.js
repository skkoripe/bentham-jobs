const express = require('express');
const feesHandler = require('../handlers/fees.handler');

const router = express.Router();

router.post('/scrape', feesHandler.scrapeFeePage);
router.post('/enquire', feesHandler.enquireFee);
router.post('/stamp-duty', feesHandler.stampDuty);

module.exports = router;
