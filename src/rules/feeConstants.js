/**
 * Fee and stamp duty constants (registration fees, fixed stamp amounts, defaults).
 * Used by rule-based stamp duty / incorporation fee calculation.
 */

const DEFAULT_STATE = 'Maharashtra';
const DEFAULT_CAPITAL = 100000;

/** PANTAN fee (INR). */
const PANTAN_FEE_INR = 143;

/** Stamp duty for SPICE+ Part B (INR). */
const STAMP_DUTY_SPICE_PART_B_INR = 10;

/** Default MoA stamp duty when state rule has no moa (INR). */
const DEFAULT_MOA_STAMP_INR = 200;

/** Allowed values for form dropdowns (for validation / docs). */
const ENQUIRE_FEE_FOR = ['Company', 'LLP', 'IEPF'];
const NATURE_OF_SERVICE = ['Name reservation and Company Incorporation'];
const SUB_SERVICE = ['Incorporation of a company (SPICe+ Part B)'];
const YES_NO = ['Yes', 'No'];

module.exports = {
  DEFAULT_STATE,
  DEFAULT_CAPITAL,
  PANTAN_FEE_INR,
  STAMP_DUTY_SPICE_PART_B_INR,
  DEFAULT_MOA_STAMP_INR,
  ENQUIRE_FEE_FOR,
  NATURE_OF_SERVICE,
  SUB_SERVICE,
  YES_NO,
};
