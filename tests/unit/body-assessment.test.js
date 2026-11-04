import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBodyAssessment, validateBodyMeasurements } from '../../public/js/body-assessment.js';

const baseline = { age: '30', sex: 'male', height: '180', weight: '70', waistRfm: '80', eligible: true };
const assess = (changes = {}) => calculateBodyAssessment({ ...baseline, ...changes }).assessment;

test('exact normalized output contract and raw fat masses', () => {
  const output = calculateBodyAssessment(baseline);
  assert.deepEqual(output.errors, {});
  assert.deepEqual(Object.keys(output).sort(), ['assessment', 'errors', 'measurements']);
  assert.deepEqual(output.measurements, { age: 30, sex: 'male', height: 180, weight: 70, body: {
    waistRfm: 80, waistWhtr: null, hip: null, chest: null, arm: null, thigh: null, wrist: null, regularTraining: false
  } });
  assert.deepEqual(Object.keys(output.assessment).sort(), ['bmi', 'bmiCategory', 'rfm', 'fatMass', 'fatFreeMass', 'whtr', 'proportions', 'proportionNote', 'reference', 'code', 'summary', 'explanation', 'analysis', 'recommendation'].sort());
  assert.equal(output.assessment.fatMass, 70 * 19 / 100);
  assert.equal(output.assessment.fatFreeMass, 70 - 70 * 19 / 100);
  const precise = assess({ waistRfm: '83.7' });
  const expected = 64 - 20 * 180 / 83.7;
  assert.equal(precise.fatMass, 70 * expected / 100);
  assert.equal(precise.fatFreeMass, 70 - 70 * expected / 100);
  assert.match(precise.explanation + precise.analysis.join(' '), /безмастна.*не.*мускул/i);
});

for (const [weight, code] of [[73.9, 'underweight'], [74, 'normal'], [99.9, 'normal'], [100, 'overweight'], [119.9, 'overweight'], [120, 'obese1'], [139.9, 'obese1'], [140, 'obese2'], [159.9, 'obese2'], [160, 'obese3']]) {
  test(`unrounded BMI category at ${weight}/200`, () => {
    const result = assess({ height: 200, weight, waistRfm: 90 });
    assert.equal(result.bmiCategory.code, code);
    assert.equal(result.bmi, weight / 4);
  });
}

for (const [waistWhtr, band] of [[79.9, 'below-range'], [80, 'not-raised'], [99.9, 'not-raised'], [100, 'increased'], [119.9, 'increased'], [120, 'high']]) {
  test(`NICE midpoint boundary ${waistWhtr}/200`, () => {
    const result = assess({ height: 200, weight: 90, waistWhtr });
    assert.deepEqual(Object.keys(result.whtr).sort(), ['band', 'note', 'source', 'value']);
    assert.equal(result.whtr.value, waistWhtr / 200);
    assert.equal(result.whtr.source, 'midpoint');
    assert.equal(result.whtr.band, band);
    assert.equal(result.rfm.percent, 14);
  });
}

test('fallback is explicitly descriptive, and BMI 35 excludes NICE bands', () => {
  const fallback = assess();
  assert.equal(fallback.whtr.value, 80 / 180);
  assert.equal(fallback.whtr.source, 'rfm-fallback');
  assert.equal(fallback.whtr.band, 'descriptive-only');
  assert.match(fallback.whtr.note, /не.*NICE/);
  assert.equal(assess({ height: 200, weight: 140, waistWhtr: 80 }).whtr.band, 'outside-scope');
  assert.equal(assess({ height: 200, weight: 140 }).whtr.band, 'outside-scope');
});

for (const [sex, age, limits] of [['male', 20, [8, 20, 25]], ['male', 39, [8, 20, 25]], ['male', 40, [11, 22, 28]], ['male', 56, [11, 22, 28]], ['female', 20, [21, 33, 39]], ['female', 39, [21, 33, 39]], ['female', 40, [23, 34, 40]], ['female', 56, [23, 34, 40]]]) {
  test(`sex-age manufacturer reference ${sex} ${age}`, () => {
    const result = assess({ sex, age });
    assert.deepEqual([result.reference.low, result.reference.high, result.reference.veryHigh], limits);
    assert.match(result.reference.note, /Gallagher/);
    assert.match(result.reference.note, /RFM.*DXA/);
    assert.match(result.reference.note, /не.*здрав/);
  });
}

// Nearby values catch classification after display rounding, including exactly 25%.
for (const [waistRfm, band] of [[55.7, 'low'], [55.8, 'within'], [70.9, 'within'], [71, 'high'], [80, 'very-high']]) {
  test(`continuous reference comparison at waist ${waistRfm}`, () => {
    assert.equal(assess({ height: 156, weight: 55, waistRfm }).reference.band, band);
  });
}

for (const [sex, age, height, waistRfm, percent, band, below] of [
  ['male', 30, 140, 50, 8, 'within', 'low'],
  ['male', 30, 220, 100, 20, 'high', 'within'],
  ['male', 30, 156, 80, 25, 'very-high', 'high'],
  ['male', 40, 159, 60, 11, 'within', 'low'],
  ['male', 40, 210, 100, 22, 'high', 'within'],
  ['male', 40, 180, 100, 28, 'very-high', 'high'],
  ['female', 30, 165, 60, 21, 'within', 'low'],
  ['female', 30, 215, 100, 33, 'high', 'within'],
  ['female', 30, 185, 100, 39, 'very-high', 'high'],
  ['female', 40, 159, 60, 23, 'within', 'low'],
  ['female', 40, 210, 100, 34, 'high', 'within'],
  ['female', 40, 180, 100, 40, 'very-high', 'high']
]) {
  test(`exact inclusive reference boundary ${sex} ${age}: ${percent}%`, () => {
    const changes = { sex, age, height, waistRfm, weight: Math.round(22 * (height / 100) ** 2 * 10) / 10 };
    const result = assess(changes);
    assert.equal(result.rfm.percent, percent);
    assert.equal(result.reference.band, band);
    assert.equal(assess({ ...changes, waistRfm: (waistRfm - 0.1).toFixed(1) }).reference.band, below);
  });
}

test('reference includes BMI 35 but excludes BMI above 35', () => {
  assert.ok(assess({ height: 200, weight: 140 }).reference);
  assert.equal(assess({ height: 200, weight: 140.1 }).reference, null);
});

for (const [changes, code] of [
  [{ age: 19, weight: 140 }, 'age-unavailable'],
  [{ weight: 50, waistRfm: 100, regularTraining: true }, 'underweight'],
  [{ weight: 100, waistRfm: 35 }, 'obesity'],
  [{ waistRfm: 35 }, 'insufficient-composition'],
  [{ waistRfm: 90, regularTraining: true }, 'possible-skinny-fat'],
  [{ regularTraining: true }, 'potential-athletic'],
  [{ waistRfm: 60 }, 'slim'],
  [{}, 'balanced'],
  [{ weight: 90, waistRfm: 90 }, 'overweight'],
  [{ weight: 90, regularTraining: true }, 'potential-athletic'],
  [{ weight: 90, waistRfm: 60 }, 'overweight']
]) {
  test(`classification priority ${code} ${JSON.stringify(changes)}`, () => {
    const result = assess(changes);
    assert.equal(result.code, code);
    assert.match(result.summary, /[А-Яа-я]/);
    assert.match(result.recommendation, /[А-Яа-я]/);
    assert.ok(result.analysis.length >= 3);
    assert.ok(result.analysis.includes(result.whtr.note));
  });
}

test('guidance qualifies tissue inference and never automatically prescribes loss below BMI 25', () => {
  const skinny = assess({ waistRfm: 90 });
  assert.match(skinny.recommendation, /рекомпозиция|силов/);
  assert.match(skinny.explanation, /не.*ниска мускулна/);
  assert.doesNotMatch(skinny.recommendation, /препоръчва.*отслаб|намалете теглото/i);
  assert.match(assess({ regularTraining: true }).explanation, /самооценка/);
  assert.match(assess({ weight: 50 }).recommendation, /покачване.*специалист|специалист.*покачване/);
  assert.match(assess({ weight: 100 }).explanation, /ИТМ.*не.*тъкан/);
  assert.match(assess({ weight: 100 }).recommendation, /специалист/);
  assert.match(assess({ waistRfm: 60 }).explanation, /не.*по-здрав/);
  assert.match(assess().explanation, /не.*медицинск/);
});

test('proportions use only midpoint waist and retain all five raw ratios', () => {
  const result = assess({ waistWhtr: 75, hip: 100, chest: 105, arm: 35, thigh: 55, wrist: 17 });
  assert.deepEqual(result.proportions.map(({ id, value }) => [id, value]), [
    ['waist-hip', 75 / 100], ['chest-waist', 105 / 75], ['arm-height', 35 / 180], ['thigh-height', 55 / 180], ['wrist-height', 17 / 180]
  ]);
  for (const ratio of result.proportions) {
    assert.deepEqual(Object.keys(ratio).sort(), ['description', 'id', 'label', 'value']);
    assert.match(ratio.description, /[А-Яа-я]/);
  }
  assert.match(result.analysis.join(' '), /5.*съотношен/);
  const missing = assess({ hip: 100, chest: 105, arm: 35 });
  assert.deepEqual(missing.proportions.map(p => p.id), ['arm-height']);
  assert.match(missing.proportionNote, /средата/);
  assert.match(missing.proportionNote, /мускул/);
});

test('body validator accepts localized decimals and normalizes optional absence', () => {
  const { errors, body } = validateBodyMeasurements({ waistRfm: '80,5', waistWhtr: ' ', hip: null, chest: undefined, arm: '35,1', regularTraining: true });
  assert.deepEqual(errors, {});
  assert.deepEqual(body, { waistRfm: 80.5, waistWhtr: null, hip: null, chest: null, arm: 35.1, thigh: null, wrist: null, regularTraining: true });
});

const ranges = { waistRfm: [35, 200], waistWhtr: [35, 200], hip: [45, 220], chest: [45, 220], arm: [10, 85], thigh: [20, 140], wrist: [8, 35] };
for (const [field, [min, max]] of Object.entries(ranges)) {
  test(`${field} accepts both input bounds, not health cutoffs`, () => {
    for (const value of [min, max]) assert.deepEqual(calculateBodyAssessment({ ...baseline, [field]: value }).errors, {});
  });
  if (field !== 'waistRfm') {
    test(`${field} normalizes each absent representation`, () => {
      for (const value of ['', '  ', null, undefined]) {
        const output = calculateBodyAssessment({ ...baseline, [field]: value });
        assert.deepEqual(output.errors, {});
        assert.equal(output.measurements.body[field], null);
      }
    });
  }
  for (const value of [min - 0.1, max + 0.1, `${min}.12`, '80cm', Infinity, NaN, true, [], {}]) {
    test(`${field} rejects ${String(value)} (${typeof value})`, () => {
      const output = calculateBodyAssessment({ ...baseline, [field]: value });
      assert.match(output.errors[field], /[А-Яа-я]/);
      assert.equal(output.measurements, null);
      assert.equal(output.assessment, null);
      assert.equal(validateBodyMeasurements({ ...baseline, [field]: value }).body, null);
    });
  }
}

for (const [field, value] of [['sex', ''], ['sex', 'other'], ['sex', ['male']], ['age', 17], ['age', 57], ['age', 20.5], ['height', 129.9], ['height', 230.1], ['weight', 34.9], ['weight', 250.1], ['eligible', 'true'], ['eligible', false], ['waistRfm', ''], ['waistRfm', null], ['waistRfm', undefined], ['regularTraining', 'true'], ['regularTraining', 1], ['regularTraining', null]]) {
  test(`invalid raw ${field}: ${String(value)}`, () => {
    const output = calculateBodyAssessment({ ...baseline, [field]: value });
    assert.match(output.errors[field], /[А-Яа-я]/);
    assert.equal(output.measurements, null);
    assert.equal(output.assessment, null);
  });
}

test('missing input yields field errors instead of throwing', () => {
  for (const input of [null, undefined, 'bad']) {
    const output = calculateBodyAssessment(input);
    assert.deepEqual(Object.keys(output.errors).sort(), ['age', 'eligible', 'height', 'sex', 'waistRfm', 'weight']);
    assert.equal(output.measurements, null);
    assert.equal(output.assessment, null);
  }
  assert.ok(validateBodyMeasurements(null).errors.waistRfm);
});
test('a raised midpoint-waist indicator is not summarized as overall balance or automatic loss at normal BMI', () => {
  const output = calculateBodyAssessment({ age: '30', sex: 'male', height: '180', weight: '70', waistRfm: '80', waistWhtr: '100', eligible: true });
  assert.equal(output.assessment.bmiCategory.code, 'normal');
  assert.equal(output.assessment.reference.band, 'within');
  assert.equal(output.assessment.whtr.band, 'increased');
  assert.match(output.assessment.summary, /повишен показател/);
  assert.match(output.assessment.recommendation, /без автоматично отслабване/);
});
