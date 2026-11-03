import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNutrition, getWeeklyPaces } from '../../public/js/nutrition.js';

const baseline = { age: '30', weight: '70', height: '180', sex: 'male', activity: 'moderate', goal: 'maintain', eligible: true };

for (const [sex, goal, expected] of [
  ['male', 'lose', [2412, 140, 67, 312]],
  ['male', 'maintain', [2604, 140, 72, 348]],
  ['male', 'muscle', [2734, 140, 76, 373]],
  ['male', 'gain', [2864, 140, 80, 397]],
  ['female', 'maintain', [2347, 140, 65, 300]]
]) {
  test(`reference profile: ${sex}, ${goal}`, () => {
    const plan = goal === 'maintain' ? {} : { targetWeight: goal === 'lose' ? '65' : '75', weeklyRate: goal === 'muscle' ? '0.1' : '0.25' };
    const output = calculateNutrition({ ...baseline, sex, goal, ...plan });
    assert.deepEqual(output.errors, {});
    assert.equal(output.limitation, null);
    assert.ok(output.result, 'eligible reference profile must produce a result');
    const { calories, protein, fat, carbs } = output.result;
    assert.deepEqual([calories, protein, fat, carbs].map(Math.round), expected);
    assert.ok(Math.abs(4 * protein + 9 * fat + 4 * carbs - calories) < 0.000001);
    assert.ok(Math.abs(4 * expected[1] + 9 * expected[2] + 4 * expected[3] - expected[0]) <= 9);
  });
}

for (const [field, value] of [
  ['age', ''], ['age', '17'], ['age', '57'], ['age', '30.5'], ['age', Infinity],
  ['weight', ''], ['weight', ' '], ['weight', '0'], ['weight', '-70'], ['weight', '34.9'], ['weight', '250.1'],
  ['weight', '70kg'], ['weight', '7e1'], ['weight', '1,000'], ['weight', '70.12'], ['weight', 'NaN'], ['weight', Infinity],
  ['height', '129.9'], ['height', '230.1'], ['height', '1.2.3'],
  ['sex', ''], ['sex', 'unknown'], ['activity', ''], ['activity', '1.55'], ['activity', ['moderate']], ['goal', ''], ['goal', 'dirty-bulk'], ['goal', ['maintain']],
  ['eligible', false], ['eligible', 'true']
]) {
  test(`reject ${field} = ${JSON.stringify(value)}`, () => {
    const output = calculateNutrition({ ...baseline, [field]: value });
    assert.ok(output.errors[field], 'invalid field must get an actionable error');
    assert.equal(output.result, null);
  });
}

for (const age of ['18', '56']) {
  test(`supported age boundary ${age}`, () => {
    assert.ok(calculateNutrition({ ...baseline, age }).result);
  });
}

for (const activity of ['sedentary', 'light', 'moderate', 'very']) {
  const expectedMaintenance = { sedentary: 2016, light: 2310, moderate: 2604, very: 2898 };
  test(`activity preset ${activity}`, () => {
    assert.equal(calculateNutrition({ ...baseline, activity }).result.maintenance, expectedMaintenance[activity]);
  });
}

test('decimal comma and surrounding whitespace are accepted without dropping precision', () => {
  const output = calculateNutrition({ ...baseline, weight: ' 70,5 ', height: '180.5' });
  assert.equal(output.profile.weight, 70.5);
  assert.equal(output.profile.height, 180.5);
  assert.equal(output.result.protein, 141);
});

for (const [weight, reason] of [['50', 'bmi-low'], ['100', 'bmi-high']]) {
  test(`nutrition support limitation ${reason} is not an input error`, () => {
    const output = calculateNutrition({ ...baseline, weight });
    assert.deepEqual(output.errors, {});
    assert.equal(output.limitation, reason);
    assert.equal(output.result, null);
    assert.equal(output.profile.weight, Number(weight));
  });
}

for (const [weight, reason] of [['73.9', 'bmi-low'], ['74', null], ['119.9', null], ['120', 'bmi-high']]) {
  test(`unrounded BMI screening at weight ${weight} and height 200`, () => {
    assert.equal(calculateNutrition({ ...baseline, height: '200', weight }).limitation, reason);
  });
}

test('low-energy result is withheld, not clamped', () => {
  const output = calculateNutrition({ ...baseline, age: '56', sex: 'female', height: '150', weight: '45', activity: 'sedentary', goal: 'lose', targetWeight: '44', weeklyRate: '0.25' });
  assert.equal(output.limitation, 'calories-range');
  assert.equal(output.result, null);
});

test('high-energy result is withheld, not clamped', () => {
  const output = calculateNutrition({ ...baseline, age: '18', height: '230', weight: '155', activity: 'very', goal: 'gain', targetWeight: '156', weeklyRate: '0.5' });
  assert.equal(output.limitation, 'calories-range');
  assert.equal(output.result, null);
});

test('null input fails validation rather than crashing', () => {
  const output = calculateNutrition(null);
  assert.ok(output.errors.age);
  assert.equal(output.result, null);
});

for (const [field, value] of [['weight', '35'], ['weight', '250'], ['height', '130'], ['height', '230']]) {
  test(`supported input boundary ${field} = ${value} is not a field error`, () => {
    const output = calculateNutrition({ ...baseline, [field]: value });
    assert.equal(output.errors[field], undefined);
    assert.equal(output.profile[field], Number(value));
  });
}

const lossProfile = { ...baseline, goal: 'lose', targetWeight: '65', weeklyRate: '0.25' };

test('selected weekly loss changes calories and keeps protein based on current weight', () => {
  const slower = calculateNutrition(lossProfile).result;
  const faster = calculateNutrition({ ...lossProfile, weeklyRate: '0.5' }).result;
  assert.ok(Math.abs(slower.weeklyKg - 0.175) < 1e-9);
  assert.ok(Math.abs(faster.weeklyKg - 0.35) < 1e-9);
  assert.equal(slower.calories, 2411.5);
  assert.equal(faster.calories, 2219);
  assert.equal(faster.protein, 140);
});

for (const [goal, weeklyRate, calories] of [['muscle', '0.1', 2734.2], ['muscle', '0.25', 2864.4], ['gain', '0.25', 2864.4], ['gain', '0.5', 2994.6]]) {
  test(`supported gain plan ${goal} at ${weeklyRate}%`, () => {
    const output = calculateNutrition({ ...baseline, goal, targetWeight: '75', weeklyRate });
    assert.deepEqual(output.errors, {});
    assert.ok(Math.abs(output.result.calories - calories) < 1e-6);
    assert.ok(Math.abs(output.result.weeklyKg - 70 * Number(weeklyRate) / 100) < 1e-9);
    assert.equal(output.profile.targetWeight, 75);
  });
}

for (const [field, value] of [
  ['targetWeight', ''], ['targetWeight', '70'], ['targetWeight', '75'], ['targetWeight', '34.9'],
  ['targetWeight', '65kg'], ['targetWeight', '65.12'], ['targetWeight', '55'], ['targetWeight', Infinity],
  ['weeklyRate', ''], ['weeklyRate', '1'], ['weeklyRate', '-0.5'], ['weeklyRate', '0.1'], ['weeklyRate', ['0.25']]
]) {
  test(`loss plan rejects ${field} = ${JSON.stringify(value)}`, () => {
    const output = calculateNutrition({ ...lossProfile, [field]: value });
    assert.ok(output.errors[field]);
    assert.equal(output.result, null);
  });
}

test('gain goal cannot use a lower target', () => {
  const output = calculateNutrition({ ...baseline, goal: 'gain', targetWeight: '65', weeklyRate: '0.25' });
  assert.ok(output.errors.targetWeight);
  assert.equal(output.result, null);
});

test('gain goal rejects targets at the upper BMI boundary', () => {
  const output = calculateNutrition({ ...baseline, height: '200', weight: '110', goal: 'gain', targetWeight: '120', weeklyRate: '0.25' });
  assert.ok(output.errors.targetWeight);
  assert.equal(output.result, null);
});

test('loss goal accepts a target at the lower BMI boundary without rounding', () => {
  const output = calculateNutrition({ ...baseline, height: '200', weight: '80', goal: 'lose', targetWeight: '74', weeklyRate: '0.25' });
  assert.deepEqual(output.errors, {});
  assert.ok(output.result);
});

test('a loss pace requiring over a 20% deficit is withheld rather than clamped', () => {
  const output = calculateNutrition({ ...baseline, age: '56', height: '190', weight: '95', activity: 'sedentary', goal: 'lose', targetWeight: '90', weeklyRate: '0.5' });
  assert.deepEqual(output.errors, {});
  assert.equal(output.limitation, 'pace-range');
  assert.equal(output.result, null);
});

test('maintenance explicitly keeps current weight with no weekly change', () => {
  const output = calculateNutrition(baseline);
  assert.equal(output.profile.targetWeight, 70);
  assert.equal(output.profile.weeklyRate, '0');
  assert.equal(output.result.weeklyKg, 0);
  assert.equal(output.result.calories, 2604);
});

test('maintenance rejects a tampered weight-change pace', () => {
  const output = calculateNutrition({ ...baseline, targetWeight: '70', weeklyRate: '0.5' });
  assert.ok(output.errors.weeklyRate);
  assert.equal(output.result, null);
});

test('changing only the destination does not calculate calories from future bodyweight', () => {
  const near = calculateNutrition(lossProfile).result;
  const further = calculateNutrition({ ...lossProfile, targetWeight: '60' }).result;
  assert.equal(near.calories, further.calories);
  assert.equal(near.protein, further.protein);
});

for (const [goal, rates] of [['lose', ['0.25', '0.5']], ['muscle', ['0.1', '0.25']], ['gain', ['0.25', '0.5']], ['maintain', ['0']]]) {
  test(`pace menu only offers the specified ${goal} choices`, () => {
    assert.deepEqual(getWeeklyPaces(goal, '70').map(pace => pace.value), rates);
  });
}

test('pace menu uses current weight, not a fixed absolute kg amount', () => {
  assert.equal(getWeeklyPaces('lose', '80')[1].kg, 0.4);
  assert.equal(getWeeklyPaces('lose', '0').length, 0);
  assert.deepEqual(getWeeklyPaces('unknown', '80'), []);
});

test('maintenance rejects an inconsistent stored target weight', () => {
  const output = calculateNutrition({ ...baseline, targetWeight: '65', weeklyRate: '0' });
  assert.ok(output.errors.targetWeight);
  assert.equal(output.result, null);
});

test('weekly pace validation waits for a valid current weight', () => {
  const output = calculateNutrition({ ...lossProfile, weight: '', weeklyRate: '' });
  assert.ok(output.errors.weight);
  assert.equal(output.errors.weeklyRate, undefined);
  assert.equal(output.result, null);
});
