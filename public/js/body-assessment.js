import { parseMetric } from './measurements.js';

const descriptions = {
  '': null,
  slim: 'Slim (self-reported)',
  muscular: 'Muscular (self-reported)',
  'higher-fat': 'Higher body fat (self-reported)',
  'low-muscle-higher-fat': 'Lower muscle / higher body fat (self-reported)',
  unsure: 'Unsure (self-reported)',
  private: 'Prefer not to say'
};
const methods = { dxa: 'DXA scan', bia: 'Bioimpedance / body-fat scale', calipers: 'Skinfold calipers', other: 'Other / unknown method' };

function estimateRfm(age, sex, height, body) {
  if (body.waistSite !== 'iliac') return { percent: null, reason: 'RFM requires a new waist measurement at the top of the hipbone (iliac crest), not the ribs-to-hips midpoint.' };
  if (age < 20) return { percent: null, reason: 'The cited adult RFM study did not validate ages 18-19. This app estimates RFM only from age 20; your other measurements remain available.' };
  if (!['male', 'female'].includes(sex)) return { percent: null, reason: 'Choose an explicit male/female formula category for RFM. The study provides no validated coefficient for other categories or all hormonal/physiological circumstances.' };
  const percent = 64 - 20 * (height / body.waist) + (sex === 'female' ? 12 : 0);
  if (!Number.isFinite(percent) || percent < 3 || percent > 60) return { percent: null, reason: 'The formula is outside this app\'s 3-60% estimation support range. Recheck the measurement site or seek individual assessment; the estimate is not clamped.' };
  return { percent, reason: null };
}

export function validateBodyMeasurements(source) {
  const errors = {};
  const rawFat = source.bodyFat;
  const fatEmpty = rawFat === undefined || rawFat === null || (typeof rawFat === 'string' && rawFat.trim() === '');
  const body = {
    waist: parseMetric(source.waist, 35, 200),
    waistSite: source.waistSite,
    bodyFat: fatEmpty ? null : parseMetric(rawFat, 3, 60),
    bodyFatMethod: fatEmpty ? null : source.bodyFatMethod,
    bodyDescription: source.bodyDescription ?? ''
  };
  if (body.waist === null) errors.waist = 'Enter a waist of 35-200 cm, with at most one decimal place. These are input limits, not healthy ranges.';
  if (typeof body.waistSite !== 'string' || !['midpoint', 'iliac'].includes(body.waistSite)) errors.waistSite = 'Choose the measurement site you actually used; remeasure if you change it.';
  if (!fatEmpty && body.bodyFat === null) errors.bodyFat = 'Enter an existing estimate of 3-60%, with at most one decimal place, or leave it blank.';
  if (!fatEmpty && (typeof body.bodyFatMethod !== 'string' || !Object.hasOwn(methods, body.bodyFatMethod))) errors.bodyFatMethod = 'Choose how the existing body-fat estimate was obtained.';
  if (typeof body.bodyDescription !== 'string' || !Object.hasOwn(descriptions, body.bodyDescription)) errors.bodyDescription = 'Choose one of the optional self-descriptions, or leave it blank.';
  return { errors, body: Object.keys(errors).length ? null : body };
}

export function calculateBodyAssessment(input) {
  const source = input && typeof input === 'object' ? input : {};
  const age = parseMetric(source.age, 18, 56, true);
  const weight = parseMetric(source.weight, 35, 250);
  const height = parseMetric(source.height, 130, 230);
  const { errors, body } = validateBodyMeasurements(source);
  if (age === null) errors.age = 'Enter a whole-number age from 18 to 56.';
  if (weight === null) errors.weight = 'Enter 35-250 kg, with at most one decimal place.';
  if (height === null) errors.height = 'Enter 130-230 cm, with at most one decimal place.';
  if (source.eligible !== true) errors.eligible = 'Confirm that you understand who this tool is intended for.';
  if (Object.keys(errors).length) return { errors, assessment: null };

  const bmi = weight / (height / 100) ** 2;
  const waistRatio = body.waist / height;
  const midpoint = body.waistSite === 'midpoint';
  const rfm = estimateRfm(age, source.sex, height, body);
  const waistBand = !midpoint ? 'not-interpreted' : bmi >= 35 ? 'outside-scope' : waistRatio < 0.4 ? 'below-range' : waistRatio < 0.5 ? 'not-raised' : waistRatio < 0.6 ? 'increased' : 'high';
  const code = !midpoint ? (bmi < 18.5 ? 'lower-weight' : bmi >= 25 ? 'higher-weight-estimate' : 'mid-range-estimate') : bmi >= 35 ? 'outside-scope' : bmi < 18.5 ? 'lower-weight' : waistRatio >= 0.6 ? 'higher-waist' : waistRatio >= 0.5 ? 'raised-waist' : waistRatio < 0.4 ? 'check-waist' : bmi >= 25 ? 'higher-weight-lower-waist' : 'mid-range';
  const summaries = {
    'outside-scope': 'Outside waist-ratio interpretation scope',
    'lower-weight': 'Lower weight-for-height profile',
    'higher-waist': 'Higher waist-to-height profile',
    'raised-waist': 'Raised waist-to-height profile',
    'check-waist': 'Low waist-to-height measurement: check technique',
    'higher-weight-lower-waist': 'Higher weight-for-height, lower waist ratio',
    'mid-range': 'Mid-range weight-for-height, lower waist ratio',
    'mid-range-estimate': 'Mid-range weight-for-height / waist-based profile',
    'higher-weight-estimate': 'Higher weight-for-height / waist-based profile'
  };
  const waistNotes = {
    'not-interpreted': 'This waist was measured at hipbone level. The ratio is descriptive only: NICE midpoint-waist screening bands are not applied to this different measurement site.',
    'outside-scope': 'NICE waist-ratio bands are used here only below BMI 35. A low ratio at a higher BMI is not reassurance; seek individual assessment.',
    'below-range': 'Below the published 0.40 classification range. Check the tape measurement; this does not establish leanness or health.',
    'not-raised': 'No raised waist-ratio indicator in this framework. This does not prove overall health, low body fat, or high muscle mass.',
    increased: 'Raised waist relative to height, associated with increased central-adiposity risk. Consider professional guidance; this is not a diagnosis.',
    high: 'Higher waist relative to height, associated with further increased central-adiposity risk. Seek professional guidance; this is not a diagnosis.'
  };
  const goalContext = bmi < 18.5 || bmi >= 30
    ? 'Discuss suitable nutrition and training goals with a qualified professional. This app still withholds automated nutrition targets outside its supported BMI range.'
    : waistBand === 'increased' || waistBand === 'high'
      ? 'These measurements can support a discussion about gradual fat-loss or strength-training goals. They do not establish low muscle, and they do not change your selected goal or calorie target.'
      : 'Use your preferences, training history, strength, and multiweek trends to discuss maintenance or gradual muscle-building goals. A lower waist ratio does not prove muscularity or automatically justify a bulk or cut.';
  return {
    errors: {},
    assessment: {
      bmi, waistRatio, waistBand, code, summary: summaries[code], waistNote: waistNotes[waistBand], goalContext, rfm,
      selfDescription: descriptions[body.bodyDescription],
      bodyFat: body.bodyFat === null ? null : { percent: body.bodyFat, method: body.bodyFatMethod, methodLabel: methods[body.bodyFatMethod] }
    }
  };
}
