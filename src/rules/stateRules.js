/**
 * State-wise stamp duty rules for eForm INC-2/INC-7/INC-29, MoA, AoA.
 * Source: LMA – Rates of Stamp Duty (https://lma.co.in/resources/Utilities/Rates_of_stamp_duty/Rates_of_stamp_duty.aspx)
 * Amounts in INR. Companies having share capital (other than Section 8) unless noted.
 */

const STATE_RULES = {
  Delhi: {
    inc: 10,
    moa: 200,
    aoaPercent: 0.15,
    aoaMax: 2500000,
    noShareCapital: { moa: 200, aoa: 200 },
    section8: { inc: 10, moa: 0, aoa: 0 },
  },
  Haryana: {
    inc: 15,
    moa: 60,
    aoaFlatThreshold: 100000,
    aoaFlatBelow: 60,
    aoaFlatAbove: 120,
    section8: { inc: 15, moa: 0, aoa: 0 },
  },
  Maharashtra: {
    inc: 100,
    moa: 200,
    aoaPerLakh: 1000,
    aoaPerLakhDenom: 5,
    aoaMax: 5000000,
    aoaBeyond250Cr: 0,
    section8: { inc: 100, moa: 0, aoa: 0 },
  },
  Odisha: {
    inc: 10,
    moa: 300,
    aoaFlat: 300,
  },
  'Andhra Pradesh': {
    inc: 20,
    moa: 500,
    aoaPercent: 0.15,
    aoaMin: 1000,
    aoaMax: 500000,
  },
  Telangana: {
    inc: 20,
    moa: 500,
    aoaPercent: 0.15,
    aoaMin: 1000,
    aoaMax: 500000,
  },
  Bihar: {
    inc: 20,
    moa: 500,
    aoaPercent: 0.15,
    aoaMin: 1000,
    aoaMax: 500000,
    noShareCapital: { aoa: 1000 },
    section8: { inc: 20, moa: 0, aoa: 0 },
  },
  Jharkhand: {
    inc: 5,
    moa: 63,
    aoaFlat: 105,
  },
  'Jammu and Kashmir': {
    inc: 10,
    moa: 150,
    aoaFlatThreshold: 100000,
    aoaFlatBelow: 150,
    aoaFlatAbove: 300,
    section8: { inc: 10, moa: 0, aoa: 0 },
  },
  'Tamil Nadu': {
    inc: 20,
    moa: 200,
    aoaFlat: 300,
    section8: { inc: 20, moa: 0, aoa: 0 },
  },
  Puducherry: {
    inc: 10,
    moa: 200,
    aoaFlat: 300,
    section8: { inc: 10, moa: 0, aoa: 0 },
  },
  Assam: {
    inc: 15,
    moa: 200,
    aoaFlat: 310,
  },
  Meghalaya: {
    inc: 10,
    moa: 100,
    aoaFlat: 300,
  },
  Manipur: {
    inc: 10,
    moa: 100,
    aoaFlat: 150,
  },
  Nagaland: {
    inc: 10,
    moa: 100,
    aoaFlat: 150,
  },
  Tripura: {
    inc: 10,
    moa: 100,
    aoaFlat: 150,
  },
  'Arunachal Pradesh': {
    inc: 10,
    moa: 200,
    aoaFlat: 500,
  },
  Mizoram: {
    inc: 10,
    moa: 100,
    aoaFlat: 150,
  },
  Kerala: {
    inc: 25,
    moa: 1000,
    aoaSlabs: [
      { maxCap: 1000000, amount: 2000 },
      { maxCap: 2500000, amount: 5000 },
      { percentAbove: 0.5 },
    ],
    noShareCapital: { moa: 1000, aoa: 2000 },
  },
  Lakshadweep: {
    inc: 25,
    moa: 500,
    aoaFlat: 1000,
  },
  'Madhya Pradesh': {
    inc: 50,
    moa: 2500,
    aoaPercent: 0.15,
    aoaMin: 5000,
    aoaMax: 2500000,
    noShareCapital: { inc: 10, moa: 2500, aoa: 5000 },
  },
  Chhattisgarh: {
    inc: 10,
    moa: 500,
    aoaPercent: 0.15,
    aoaMin: 1000,
    aoaMax: 500000,
    section8: { inc: 10, moa: 0, aoa: 0 },
  },
  Rajasthan: {
    inc: 10,
    moa: 500,
    aoaPercent: 0.5,
    aoaMax: 2500000,
    noShareCapital: { aoa: 500 },
  },
  Punjab: {
    inc: 25,
    moa: 5000,
    aoaFlatThreshold: 100000,
    aoaFlatBelow: 5000,
    aoaFlatAbove: 10000,
    section8: { inc: 25, moa: 0, aoa: 0 },
  },
  'Himachal Pradesh': {
    inc: 3,
    moa: 60,
    aoaFlatThreshold: 100000,
    aoaFlatBelow: 60,
    aoaFlatAbove: 120,
    section8: { inc: 3, moa: 0, aoa: 0 },
  },
  Chandigarh: {
    inc: 3,
    moa: 500,
    aoaFlat: 1000,
    section8: { inc: 3, moa: 0, aoa: 0 },
  },
  'Uttar Pradesh': {
    inc: 10,
    moa: 500,
    aoaFlat: 500,
    section8NoCapital: { inc: 0, moa: 0, aoa: 0 },
  },
  Uttarakhand: {
    inc: 10,
    moa: 500,
    aoaFlat: 500,
    section8NoCapital: { inc: 0, moa: 0, aoa: 0 },
  },
  'West Bengal': {
    inc: 10,
    moa: 60,
    aoaFlat: 300,
    section8: { inc: 10, moa: 0, aoa: 0 },
  },
  Karnataka: {
    inc: 20,
    moa: 1000,
    aoaPerLakh: 500,
    aoaPerLakhDenom: 10,
    aoaMin: 500,
    noShareCapital: { aoa: 500 },
    section8: { inc: 20, moa: 0, aoa: 0 },
  },
  Gujarat: {
    inc: 20,
    moa: 100,
    aoaPercent: 0.5,
    aoaMax: 500000,
    noShareCapital: { aoa: 1000 },
    section8: { inc: 20, moa: 0, aoa: 0 },
  },
  'Dadra and Nagar Haveli': {
    inc: 1,
    moa: 15,
    aoaFlat: 25,
    section8: { inc: 1, moa: 0, aoa: 0 },
  },
  Goa: {
    inc: 50,
    moa: 150,
    aoaPerLakh: 1000,
    aoaPerLakhDenom: 5,
    section8: { inc: 50, moa: 0, aoa: 0 },
  },
  'Daman and Diu': {
    inc: 20,
    moa: 150,
    aoaPerLakh: 1000,
    aoaPerLakhDenom: 5,
    section8: { inc: 20, moa: 0, aoa: 0 },
  },
  'Andaman and Nicobar': {
    inc: 20,
    moa: 200,
    aoaFlat: 300,
    section8: { inc: 20, moa: 0, aoa: 0 },
  },
  default: {
    inc: 20,
    moa: 200,
    aoaPercent: 0.15,
    aoaMax: 2500000,
  },
};

/** Get rule for a state key; falls back to default. */
function getStateRule(stateKey) {
  return STATE_RULES[stateKey] || STATE_RULES.default;
}

/** List all state names (excluding 'default'). */
function listStates() {
  return Object.keys(STATE_RULES).filter((k) => k !== 'default');
}

module.exports = {
  STATE_RULES,
  getStateRule,
  listStates,
};
