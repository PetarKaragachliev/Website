import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNutrition } from '../../public/js/nutrition.js';
import { calculateBodyAssessment } from '../../public/js/body-assessment.js';

const baseline = { age: '30', weight: '70', height: '180', sex: 'male', activity: 'moderate', goal: 'maintain', eligible: true };
const measured = { ...baseline, includeAssessment: true, waist: '80', waistSite: 'midpoint' };

test('optional body assessment combines BMI and waist without inventing muscle mass', () => {
  const output = calculateNutrition(measured);
  assert.ok(output.assessment, 'requested assessment must be returned');
  assert.equal(output.assessment.code, 'mid-range');
  assert.ok(Math.abs(output.assessment.waistRatio - 80 / 180) < 1e-9);
  assert.ok(Math.abs(output.assessment.bmi - 70 / 1.8 ** 2) < 1e-9);
  assert.equal(output.assessment.bodyFat, null);
  assert.doesNotMatch(output.assessment.summary, /muscular|skinny-fat/i);
});

for (const [waist, band] of [['79.9', 'below-range'], ['80', 'not-raised'], ['99.9', 'not-raised'], ['100', 'increased'], ['119.9', 'increased'], ['120', 'high']]) {
  test(`unrounded waist-to-height boundary at ${waist}/200`, () => {
    const output = calculateNutrition({ ...measured, height: '200', weight: '90', waist });
    assert.equal(output.assessment.waistBand, band);
  });
}

test('assessment is available below the nutrition BMI range without a calorie prescription', () => {
  const output = calculateNutrition({ ...measured, weight: '50', waist: '65' });
  assert.equal(output.assessment.code, 'lower-weight');
  assert.equal(output.limitation, 'bmi-low');
  assert.equal(output.result, null);
});

test('BMI 35 is outside waist-interpretation scope, not reassurance from a low ratio', () => {
  const output = calculateNutrition({ ...measured, height: '200', weight: '140', waist: '80' });
  assert.equal(output.assessment.waistBand, 'outside-scope');
  assert.equal(output.assessment.code, 'outside-scope');
  assert.equal(output.result, null);
});

test('higher BMI with lower waist ratio is not automatically called muscular', () => {
  const output = calculateNutrition({ ...measured, weight: '90' });
  assert.equal(output.assessment.code, 'higher-weight-lower-waist');
  assert.doesNotMatch(output.assessment.summary, /muscular/i);
});

test('body description and an existing estimate are labeled as user-provided, not inferred', () => {
  const output = calculateNutrition({ ...measured, bodyFat: '18.5', bodyFatMethod: 'bia', bodyDescription: 'muscular' });
  assert.equal(output.assessment.bodyFat.percent, 18.5);
  assert.equal(output.assessment.bodyFat.method, 'bia');
  assert.equal(output.assessment.selfDescription, 'Muscular (self-reported)');
  assert.doesNotMatch(output.assessment.summary, /muscular/i);
});

test('assessment does not alter selected goal or calorie and macro calculations', () => {
  const plain = calculateNutrition(baseline);
  const assessed = calculateNutrition({ ...measured, waist: '105', bodyDescription: 'low-muscle-higher-fat' });
  assert.equal(assessed.profile.goal, 'maintain');
  for (const key of ['calories', 'protein', 'carbs', 'fat']) assert.equal(assessed.result[key], plain.result[key]);
  assert.equal(assessed.assessment.waistBand, 'increased');
});

for (const [field, value] of [
  ['waist', ''], ['waist', '34.9'], ['waist', '200.1'], ['waist', '80cm'], ['waist', '80.12'], ['waist', Infinity],
  ['bodyFat', '2.9'], ['bodyFat', '60.1'], ['bodyFat', '20%'], ['bodyFat', ['20']],
  ['bodyDescription', 'diagnosed-obese'], ['bodyDescription', ['muscular']], ['includeAssessment', 'true']
]) {
  test(`assessment rejects ${field} = ${JSON.stringify(value)}`, () => {
    const output = calculateNutrition({ ...measured, [field]: value });
    assert.ok(output.errors[field]);
    assert.equal(output.result, null);
    assert.equal(output.assessment, null);
  });
}

test('existing body-fat estimate requires a stated method', () => {
  const output = calculateNutrition({ ...measured, bodyFat: '20' });
  assert.ok(output.errors.bodyFatMethod);
  assert.equal(output.assessment, null);
});

test('assessment stays optional and disabled measurements do not affect nutrition', () => {
  const output = calculateNutrition({ ...baseline, includeAssessment: false, waist: 'invalid' });
  assert.deepEqual(output.errors, {});
  assert.equal(output.assessment, null);
  assert.equal(output.profile.body, null);
  assert.ok(output.result);
});

test('eligibility is required for body interpretation too', () => {
  const output = calculateNutrition({ ...measured, eligible: false });
  assert.ok(output.errors.eligible);
  assert.equal(output.assessment, null);
});

test('standalone assessment needs no nutrition goal, activity, or formula category', () => {
  const output = calculateBodyAssessment({ age: '18', weight: '70', height: '180', waist: '80', waistSite: 'midpoint', eligible: true });
  assert.deepEqual(output.errors, {});
  assert.equal(output.assessment.code, 'mid-range');
});

for (const [field, value] of [['age', '17'], ['age', '57'], ['age', '30.5'], ['height', '180cm'], ['weight', NaN], ['eligible', false]]) {
  test(`standalone assessment rejects ${field} = ${JSON.stringify(value)}`, () => {
    const output = calculateBodyAssessment({ ...measured, [field]: value });
    assert.ok(output.errors[field]);
    assert.equal(output.assessment, null);
  });
}

test('higher BMI still gets professional goal guidance even with a lower waist ratio', () => {
  const output = calculateBodyAssessment({ ...measured, weight: '100', waist: '80' });
  assert.equal(output.assessment.code, 'higher-weight-lower-waist');
  assert.match(output.assessment.goalContext, /qualified professional/);
});

test('valid body assessment is independent of an unavailable nutrition pace', () => {
  const output = calculateNutrition({ ...measured, age: '56', sex: 'female', weight: '50', height: '160', waist: '70', activity: 'sedentary', goal: 'lose', targetWeight: '48', weeklyRate: '' });
  assert.ok(output.errors.weeklyRate);
  assert.equal(output.result, null);
  assert.equal(output.assessment?.code, 'mid-range');
});
