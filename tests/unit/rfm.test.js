import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBodyAssessment } from '../../public/js/body-assessment.js';
import { calculateNutrition } from '../../public/js/nutrition.js';

const baseline = { age: '30', height: '180', weight: '70', waist: '80', waistSite: 'iliac', sex: 'male', eligible: true };

test('hipbone waist produces the published male RFM estimate', () => {
  const output = calculateBodyAssessment(baseline);
  assert.deepEqual(output.errors, {});
  assert.ok(output.assessment.rfm, 'assessment must include RFM availability and its estimate');
  assert.equal(output.assessment.rfm.percent, 19);
  assert.equal(output.assessment.waistBand, 'not-interpreted');
  assert.equal(output.assessment.code, 'mid-range-estimate');
});

test('female RFM uses the published coefficient without mixing units', () => {
  const output = calculateBodyAssessment({ ...baseline, sex: 'female' });
  assert.equal(output.assessment.rfm.percent, 31);
});

test('RFM depends on height/waist/category, not a fabricated age or weight correction', () => {
  const younger = calculateBodyAssessment({ ...baseline, age: '20', weight: '65' }).assessment;
  const older = calculateBodyAssessment({ ...baseline, age: '56', weight: '90' }).assessment;
  assert.equal(younger.rfm.percent, 19);
  assert.equal(older.rfm.percent, 19);
  assert.notEqual(younger.bmi, older.bmi);
});

for (const age of ['18', '19']) {
  test(`adult RFM is withheld at age ${age}, without blocking the rest of the assessment`, () => {
    const output = calculateBodyAssessment({ ...baseline, age });
    assert.deepEqual(output.errors, {});
    assert.equal(output.assessment.rfm.percent, null);
    assert.match(output.assessment.rfm.reason, /20/);
    assert.ok(Number.isFinite(output.assessment.bmi));
  });
}

test('midpoint waist retains NICE interpretation but is not silently reused for RFM', () => {
  const output = calculateBodyAssessment({ ...baseline, waistSite: 'midpoint' });
  assert.equal(output.assessment.waistBand, 'not-raised');
  assert.equal(output.assessment.rfm.percent, null);
  assert.match(output.assessment.rfm.reason, /hipbone/i);
});

test('RFM requires an explicit supported formula category, not inferred sex', () => {
  const output = calculateBodyAssessment({ ...baseline, sex: '' });
  assert.deepEqual(output.errors, {});
  assert.equal(output.assessment.rfm.percent, null);
  assert.match(output.assessment.rfm.reason, /category/i);
});

test('implausible formula output is withheld, not clamped to a normal-looking percent', () => {
  const output = calculateBodyAssessment({ ...baseline, height: '230', waist: '35' });
  assert.deepEqual(output.errors, {});
  assert.equal(output.assessment.rfm.percent, null);
  assert.match(output.assessment.rfm.reason, /support|measurement/i);
});

for (const waistSite of ['navel', ['iliac'], null, undefined]) {
  test(`unsupported measurement protocol ${JSON.stringify(waistSite)} is rejected`, () => {
    const output = calculateBodyAssessment({ ...baseline, waistSite });
    assert.ok(output.errors.waistSite);
    assert.equal(output.assessment, null);
  });
}

test('computed RFM does not replace reported measurements or change nutrition targets', () => {
  const profile = { ...baseline, includeAssessment: true, activity: 'moderate', goal: 'maintain', bodyFat: '18.5', bodyFatMethod: 'bia' };
  const output = calculateNutrition(profile);
  const plain = calculateNutrition({ ...profile, includeAssessment: false });
  assert.equal(output.assessment.rfm.percent, 19);
  assert.equal(output.assessment.bodyFat.percent, 18.5);
  assert.equal(output.result.calories, plain.result.calories);
  assert.equal(output.profile.body.waistSite, 'iliac');
});
