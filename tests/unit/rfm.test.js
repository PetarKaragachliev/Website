import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBodyAssessment } from '../../public/js/body-assessment.js';

const baseline = { age: '30', height: '180', weight: '70', waistRfm: '80', sex: 'male', eligible: true };

for (const [sex, percent] of [['male', 19], ['female', 31]]) {
  test(`published ${sex} RFM golden result`, () => {
    const output = calculateBodyAssessment({ ...baseline, sex });
    assert.deepEqual(output.errors, {});
    assert.deepEqual(output.assessment.rfm, { percent, reason: null });
  });
}

test('RFM has no invented age, weight or midpoint correction', () => {
  const younger = calculateBodyAssessment({ ...baseline, age: 20, weight: 65, waistWhtr: 70 }).assessment;
  const older = calculateBodyAssessment({ ...baseline, age: 56, weight: 90, waistWhtr: 100 }).assessment;
  assert.equal(younger.rfm.percent, 19);
  assert.equal(older.rfm.percent, 19);
  assert.notEqual(younger.bmi, older.bmi);
  assert.notEqual(younger.whtr.value, older.whtr.value);
});

for (const age of [18, 19]) {
  test(`RFM and adult BMI classification unavailable at ${age}, NICE still available`, () => {
    const output = calculateBodyAssessment({ ...baseline, age, waistWhtr: 80 });
    assert.deepEqual(output.errors, {});
    const result = output.assessment;
    assert.equal(result.rfm.percent, null);
    assert.match(result.rfm.reason, /20.*проучване|проучване.*20/);
    assert.equal(result.fatMass, null);
    assert.equal(result.fatFreeMass, null);
    assert.equal(result.reference, null);
    assert.equal(result.bmiCategory.code, 'unavailable');
    assert.equal(result.code, 'age-unavailable');
    assert.equal(result.whtr.band, 'not-raised');
    assert.ok(Number.isFinite(result.bmi));
  });
}

for (const [sex, height, waistRfm] of [['male', 230, 35], ['female', 130, 200]]) {
  test(`software support bounds withhold, never clamp: ${sex}`, () => {
    const output = calculateBodyAssessment({ ...baseline, sex, height, waistRfm });
    assert.deepEqual(output.errors, {});
    const result = output.assessment;
    assert.equal(result.rfm.percent, null);
    assert.match(result.rfm.reason, /3.*60/);
    assert.match(result.rfm.reason, /софтуер/);
    assert.match(result.rfm.reason, /не.*здрав/);
    assert.equal(result.reference, null);
    assert.equal(result.fatMass, null);
    assert.equal(result.fatFreeMass, null);
  });
}

test('software upper bound 60 is inclusive, not a healthy threshold', () => {
  assert.equal(calculateBodyAssessment({ ...baseline, sex: 'female', height: 160, waistRfm: 200 }).assessment.rfm.percent, 60);
  assert.equal(calculateBodyAssessment({ ...baseline, sex: 'female', height: 159.9, waistRfm: 200 }).assessment.rfm.percent, null);
});

test('software lower bound 3 is inclusive and evaluated before rounding', () => {
  const result = calculateBodyAssessment({ ...baseline, height: 183, waistRfm: 60 }).assessment;
  assert.equal(result.rfm.percent, 3);
  assert.equal(result.fatMass, 2.1);
  const outside = calculateBodyAssessment({ ...baseline, height: 183.1, waistRfm: 60 }).assessment;
  assert.equal(outside.rfm.percent, null);
  assert.equal(outside.fatMass, null);
  assert.equal(outside.code, 'insufficient-composition');
});

test('manual estimates and method fields cannot override or rescue RFM', () => {
  const ordinary = calculateBodyAssessment(baseline);
  const supplied = calculateBodyAssessment({ ...baseline, bodyFat: 5, bodyFatMethod: 'dxa', method: 'bia' });
  assert.deepEqual(supplied, ordinary);
  const unavailable = calculateBodyAssessment({ ...baseline, age: 19, bodyFat: 20, bodyFatMethod: 'dxa' });
  assert.equal(unavailable.assessment.rfm.percent, null);
  assert.equal(unavailable.assessment.fatMass, null);
  assert.equal(Object.hasOwn(supplied.assessment, 'bodyFat'), false);
});

for (const [field, value] of [['sex', undefined], ['sex', 'other'], ['waistRfm', undefined], ['waistRfm', Infinity], ['waistRfm', '80.12']]) {
  test(`invalid RFM input ${field} ${String(value)}`, () => {
    const output = calculateBodyAssessment({ ...baseline, [field]: value });
    assert.ok(output.errors[field]);
    assert.equal(output.measurements, null);
    assert.equal(output.assessment, null);
  });
}
