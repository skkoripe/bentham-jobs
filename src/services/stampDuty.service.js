/**
 * Rule-based stamp duty & incorporation fee (indicative).
 * Inputs: all Fee Details form fields. Output: fee table (registration + stamp duty).
 * Rules live in src/rules/ (stateRules.js, feeConstants.js).
 */

const {
  STATE_RULES,
  getStateRule,
  DEFAULT_STATE,
  DEFAULT_CAPITAL,
  PANTAN_FEE_INR,
  STAMP_DUTY_SPICE_PART_B_INR,
  DEFAULT_MOA_STAMP_INR,
} = require('../rules');

function normalizeState(state) {
  if (state == null || typeof state !== 'string') return DEFAULT_STATE;
  const s = String(state).trim();
  if (!s) return DEFAULT_STATE;
  const key = Object.keys(STATE_RULES).find((k) => k.toLowerCase() === s.toLowerCase() && k !== 'default');
  return key || s;
}

function toYesNo(val) {
  if (val == null) return 'No';
  const v = String(val).trim().toLowerCase();
  if (v === 'yes' || v === 'y' || v === true) return 'Yes';
  return 'No';
}

/** INC-2/INC-7/INC-29 stamp duty (state-wise). LMA rules. */
function computeInc(stateKey, isSection8, hasAuthCapital) {
  const r = getStateRule(stateKey);
  if (isSection8 && r.section8) return r.section8.inc != null ? r.section8.inc : 0;
  if (!hasAuthCapital && r.section8NoCapital) return r.section8NoCapital.inc != null ? r.section8NoCapital.inc : (r.inc != null ? r.inc : 0);
  return r.inc != null ? r.inc : 0;
}

function computeAoa(stateKey, authorisedCapital, isSection8, hasAuthCapital) {
  const r = getStateRule(stateKey);
  if (isSection8 && r.section8) return r.section8.aoa != null ? r.section8.aoa : 0;
  if (!hasAuthCapital && r.noShareCapital && r.noShareCapital.aoa != null) return r.noShareCapital.aoa;
  if (r.aoaFlat != null) return r.aoaFlat;
  if (r.aoaFlatThreshold != null) {
    return authorisedCapital <= r.aoaFlatThreshold ? (r.aoaFlatBelow ?? 0) : (r.aoaFlatAbove ?? 0);
  }
  if (r.aoaSlabs && r.aoaSlabs.length) {
    const last = r.aoaSlabs[r.aoaSlabs.length - 1];
    for (let i = 0; i < r.aoaSlabs.length - 1; i++) {
      const slab = r.aoaSlabs[i];
      if (authorisedCapital <= slab.maxCap) return slab.amount;
    }
    if (last.percentAbove != null) return Math.round((authorisedCapital * last.percentAbove) / 100);
    return last.amount || 0;
  }
  if (r.aoaPercent != null) {
    const amt = Math.round((authorisedCapital * r.aoaPercent) / 100);
    const min = r.aoaMin != null ? Math.max(amt, r.aoaMin) : amt;
    return Math.min(min, r.aoaMax || min);
  }
  if (r.aoaPerLakh != null) {
    const capCr = authorisedCapital / 1e7;
    if (r.aoaBeyond250Cr !== undefined && capCr >= 250) return r.aoaBeyond250Cr;
    const units = Math.ceil(authorisedCapital / (r.aoaPerLakhDenom || 5) / 1e5);
    let aoa = units * r.aoaPerLakh;
    if (r.aoaMax != null) aoa = Math.min(aoa, r.aoaMax);
    if (r.aoaMin != null) aoa = Math.max(aoa, r.aoaMin);
    return aoa;
  }
  return 0;
}

function parseInput(params = {}) {
  const enquireFeeFor = params.enquireFeeFor ?? params.enquire_fee_for ?? 'Company';
  const natureOfService = params.natureOfService ?? params.nature_of_service ?? 'Name reservation and Company Incorporation';
  const subService = params.subService ?? params.sub_service ?? 'Incorporation of a company (SPICe+ Part B)';
  const opcSmallCompany = toYesNo(params.opcSmallCompany ?? params.opc_small_company);
  const authCapital = toYesNo(params.authCapital ?? params.auth_capital ?? 'Yes');
  const authorisedCapitalINR = Number(params.authorisedCapitalINR ?? params.authorisedCapital ?? params.authorised_capital) || DEFAULT_CAPITAL;
  const whetherSec8Company = toYesNo(params.whetherSec8Company ?? params.whether_sec8_company);
  const state = normalizeState(params.state);

  return {
    enquireFeeFor: String(enquireFeeFor).trim() || 'Company',
    natureOfService: String(natureOfService).trim() || 'Name reservation and Company Incorporation',
    subService: String(subService).trim() || 'Incorporation of a company (SPICe+ Part B)',
    opcSmallCompany,
    authCapital,
    authorisedCapitalINR: Math.max(0, authorisedCapitalINR),
    whetherSec8Company,
    state,
  };
}

/**
 * Calculate fee details: registration fees + stamp duty.
 * @param {Object} params - All 8 form inputs (enquireFeeFor, natureOfService, subService, opcSmallCompany, authCapital, authorisedCapitalINR, whetherSec8Company, state)
 * @returns {Object} - { success, data: { inputs, registrationFees, stampDutyFees, feeDetailsTable, totals }, disclaimer }
 */
function calculateStampDuty(params = {}) {
  const inputs = parseInput(params);
  const isSection8 = inputs.whetherSec8Company === 'Yes';
  const hasAuthCapital = inputs.authCapital === 'Yes';
  const capital = hasAuthCapital ? inputs.authorisedCapitalINR : 0;

  const stateKey = Object.keys(STATE_RULES).includes(inputs.state) ? inputs.state : 'default';
  const r = getStateRule(stateKey);
  const stampDutyINC = computeInc(stateKey, isSection8, hasAuthCapital);
  const stampDutySPICEPartB = stampDutyINC !== undefined && stampDutyINC !== null ? stampDutyINC : STAMP_DUTY_SPICE_PART_B_INR;
  let stampDutyMOA;
  if (isSection8 && r.section8) stampDutyMOA = r.section8.moa != null ? r.section8.moa : 0;
  else if (!hasAuthCapital && r.noShareCapital && r.noShareCapital.moa != null) stampDutyMOA = r.noShareCapital.moa;
  else stampDutyMOA = r.moa != null ? r.moa : DEFAULT_MOA_STAMP_INR;
  const stampDutyAOA = computeAoa(stateKey, capital, isSection8, hasAuthCapital);

  const totalStampDuty = stampDutyMOA + stampDutyAOA + stampDutySPICEPartB;

  const normalFee = 0;
  const additionalFee = 0;
  const moaRegistrationFees = 0;
  const aoaRegistrationFees = 0;
  const pantanFees = PANTAN_FEE_INR;
  const totalRegistrationFees = normalFee + additionalFee + moaRegistrationFees + aoaRegistrationFees + pantanFees;

  const registrationFees = [
    { type: 'Normal Fee', amountINR: normalFee },
    { type: 'Additional Fee', amountINR: additionalFee },
    { type: 'MoA registration fees', amountINR: moaRegistrationFees },
    { type: 'AoA registration fees', amountINR: aoaRegistrationFees },
    { type: 'PANTAN fees', amountINR: pantanFees },
    { type: 'Total', amountINR: totalRegistrationFees },
  ];

  const stampDutyFees = [
    { type: 'Stamp Duty MOA', amountINR: stampDutyMOA },
    { type: 'Stamp Duty AOA', amountINR: stampDutyAOA },
    { type: 'Stamp Duty SPICE+ Part B', amountINR: stampDutySPICEPartB },
    { type: 'Stamp Duty', amountINR: totalStampDuty },
  ];

  const feeDetailsTable = [
    { sNo: 1, typeOfFee: 'Normal Fee', amountINR: normalFee },
    { sNo: 2, typeOfFee: 'Additional Fee', amountINR: additionalFee },
    { sNo: 3, typeOfFee: 'MoA registration fees', amountINR: moaRegistrationFees },
    { sNo: 4, typeOfFee: 'AoA registration fees', amountINR: aoaRegistrationFees },
    { sNo: 5, typeOfFee: 'PANTAN fees', amountINR: pantanFees },
    { sNo: 6, typeOfFee: 'Total', amountINR: totalRegistrationFees },
    { sNo: 7, typeOfFee: 'Stamp Duty MOA', amountINR: stampDutyMOA },
    { sNo: 8, typeOfFee: 'Stamp Duty AOA', amountINR: stampDutyAOA },
    { sNo: 9, typeOfFee: 'Stamp Duty SPICE+ Part B', amountINR: stampDutySPICEPartB },
    { sNo: 10, typeOfFee: 'Stamp Duty', amountINR: totalStampDuty },
  ];

  return {
    success: true,
    data: {
      natureOfService: inputs.natureOfService,
      subService: inputs.subService,
      inputs: {
        enquireFeeFor: inputs.enquireFeeFor,
        natureOfService: inputs.natureOfService,
        subService: inputs.subService,
        opcSmallCompany: inputs.opcSmallCompany,
        authCapital: inputs.authCapital,
        authorisedCapitalINR: inputs.authorisedCapitalINR,
        whetherSec8Company: inputs.whetherSec8Company,
        state: inputs.state,
      },
      registrationFees,
      stampDutyFees,
      feeDetailsTable,
      totals: {
        totalRegistrationFees,
        totalStampDuty,
        grandTotalINR: totalRegistrationFees + totalStampDuty,
      },
      currency: 'INR',
    },
    disclaimer: 'Based on LMA Rates of Stamp Duty. Indicative only; refer to MCA portal and state notifications for official fees.',
  };
}

module.exports = {
  calculateStampDuty,
  parseInput,
  normalizeState,
};
