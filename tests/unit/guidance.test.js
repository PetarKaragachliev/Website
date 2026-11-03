import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNutrition } from '../../public/js/nutrition.js';

const baseline = { age: '30', weight: '70', height: '180', sex: 'male', activity: 'moderate', goal: 'maintain', eligible: true };

test('eligible calculator output includes all requested nutrient references', () => {
  const result = calculateNutrition(baseline).result;
  assert.ok(result.guidance, 'calculated results must include daily reference guidance');
  assert.deepEqual(result.guidance.nutrients.map(nutrient => nutrient.id), [
    'fiber', 'free-sugars', 'saturated-fat', 'cholesterol',
    'sodium', 'potassium', 'vitamin-a', 'vitamin-c', 'calcium', 'iron', 'omega-3', 'magnesium'
  ]);
});

test('energy-based references distinguish intake guidance from limits', () => {
  const { nutrients } = calculateNutrition(baseline).result.guidance;
  const reference = Object.fromEntries(nutrients.map(nutrient => [nutrient.id, nutrient]));
  assert.ok(Math.abs(reference.fiber.value - 36.456) < 1e-9);
  assert.ok(Math.abs(reference['free-sugars'].value - 32.55) < 1e-9);
  assert.ok(Math.abs(reference['saturated-fat'].value - 28.933333333333334) < 1e-9);
  assert.equal(reference.fiber.kind, 'reference');
  assert.equal(reference['free-sugars'].kind, 'limit');
  assert.equal(reference['saturated-fat'].kind, 'limit');
  assert.equal(reference.sodium.value, 2300);
  assert.equal(reference.sodium.kind, 'limit');
});

for (const id of ['sugar', 'monounsaturated-fat', 'polyunsaturated-fat', 'trans-fat']) {
  test(`${id} is not shown as a separate nutrient row`, () => {
    const nutrient = calculateNutrition(baseline).result.guidance.nutrients.find(item => item.id === id);
    assert.equal(nutrient, undefined);
  });
}

test('cholesterol is the FDA label Daily Value, not a universal maximum', () => {
  const nutrient = calculateNutrition(baseline).result.guidance.nutrients.find(item => item.id === 'cholesterol');
  assert.equal(nutrient.value, 300);
  assert.equal(nutrient.unit, 'mg');
  assert.equal(nutrient.basis, 'FDA Daily Value');
  assert.equal(nutrient.kind, 'reference');
});

for (const [sex, age, values] of [
  ['male', '18', [900, 75, 1300, 11, 410, 3000, 1600]],
  ['female', '18', [700, 65, 1300, 15, 360, 2300, 1100]],
  ['male', '19', [900, 90, 1000, 8, 400, 3400, 1600]],
  ['female', '19', [700, 75, 1000, 18, 310, 2600, 1100]],
  ['male', '30', [900, 90, 1000, 8, 400, 3400, 1600]],
  ['female', '30', [700, 75, 1000, 18, 310, 2600, 1100]],
  ['male', '31', [900, 90, 1000, 8, 420, 3400, 1600]],
  ['female', '31', [700, 75, 1000, 18, 320, 2600, 1100]],
  ['female', '50', [700, 75, 1000, 18, 320, 2600, 1100]],
  ['male', '51', [900, 90, 1000, 8, 420, 3400, 1600]],
  ['female', '51', [700, 75, 1200, 8, 320, 2600, 1100]],
  ['female', '56', [700, 75, 1200, 8, 320, 2600, 1100]]
]) {
  test(`US intake reference boundaries for ${sex} aged ${age}`, () => {
    const { nutrients } = calculateNutrition({ ...baseline, sex, age }).result.guidance;
    const reference = Object.fromEntries(nutrients.map(nutrient => [nutrient.id, nutrient]));
    assert.deepEqual(['vitamin-a', 'vitamin-c', 'calcium', 'iron', 'magnesium', 'potassium', 'omega-3'].map(id => reference[id].value), values);
    assert.equal(reference['vitamin-a'].unit, 'mcg RAE');
    assert.equal(reference.potassium.basis, 'AI');
    assert.equal(reference['omega-3'].basis, 'AI (ALA only)');
    assert.equal(reference['omega-3'].unit, 'mg');
  });
}

test('meal guidance distributes existing totals without adding extra calories', () => {
  const { guidance, calories, protein } = calculateNutrition(baseline).result;
  assert.equal(guidance.meals.count, 4);
  assert.equal(guidance.meals.intervalHours, 4);
  assert.deepEqual(guidance.meals.exampleTimes, ['08:00', '12:00', '16:00', '20:00']);
  assert.equal(guidance.meals.caloriesPerMeal, 651);
  assert.equal(guidance.meals.proteinPerMeal, 35);
  assert.equal(guidance.meals.count * guidance.meals.caloriesPerMeal, calories);
  assert.equal(guidance.meals.count * guidance.meals.proteinPerMeal, protein);
});

test('changing goal calories refreshes energy-based references and the meal split', () => {
  const maintenance = calculateNutrition(baseline).result;
  const loss = calculateNutrition({ ...baseline, goal: 'lose', targetWeight: '65', weeklyRate: '0.5' }).result;
  assert.ok(loss.guidance.nutrients.find(item => item.id === 'fiber').value < maintenance.guidance.nutrients.find(item => item.id === 'fiber').value);
  assert.equal(loss.guidance.meals.caloriesPerMeal * 4, loss.calories);
  assert.equal(loss.guidance.nutrients.find(item => item.id === 'vitamin-a').value, 900);
});

test('ineligible users receive no derived nutrition or meal guidance', () => {
  const output = calculateNutrition({ ...baseline, eligible: false });
  assert.ok(output.errors.eligible);
  assert.equal(output.result, null);
});
