/**
 * Rules for fee and stamp duty calculation. Import from here or from specific files.
 */

const { STATE_RULES, getStateRule, listStates } = require('./stateRules');
const {
  DEFAULT_STATE,
  DEFAULT_CAPITAL,
  PANTAN_FEE_INR,
  STAMP_DUTY_SPICE_PART_B_INR,
  DEFAULT_MOA_STAMP_INR,
  ENQUIRE_FEE_FOR,
  NATURE_OF_SERVICE,
  SUB_SERVICE,
  YES_NO,
} = require('./feeConstants');

module.exports = {
  STATE_RULES,
  getStateRule,
  listStates,
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
