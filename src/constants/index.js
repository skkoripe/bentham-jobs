/** MCA fee calculation: internal API (discovered via scrape). Params come from form when "Calculate Fee" is clicked. */
const MCA_FEE_API_BASE = 'https://www.mca.gov.in/bin/mca/foserviceEnquirefee';

const errors = require('./errors');

module.exports = {
  MCA_FEE_API_BASE,
  ...errors,
};
