import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrainingNutrition, estimateWorkoutEnergy } from '../../public/js/training-nutrition.js';
import { calculateNutrition } from '../../public/js/nutrition.js';
import { calculateWorkout } from '../../public/js/workout.js';

const body = { waistRfm: 80, waistWhtr: null, hip: null, chest: null, arm: null, thigh: null, wrist: null, regularTraining: false };
const profile = { age: 30, sex: 'male', height: 180, weight: 80, activity: 'light', goal: 'maintain', targetWeight: 80, weeklyRate: '0', body };
const setup = { environment: 'gym', equipment: [], experience: 'beginner', days: '3', duration: '45', currentTraining: 'none' };
const session = { warmupMinutes: 5, cooldownMinutes: 3, estimatedMinutes: 8 + 230 / 60, exercises: [{ sets: 2, reps: '8-10', restSeconds: 90, setupSeconds: 60 }] };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('02054 credits only the planned block and setup, subtracting baseline once', () => {
  const result = estimateWorkoutEnergy(session, 80, 2400, 30);
  const gross = 80 * 3.5 / 200 * (3.5 * 170 / 60 + 1.3);
  const baseline = 2400 / 1440 * (230 / 60);
  near(result.grossCalories, gross);
  near(result.baselineCalories, baseline);
  near(result.extraCalories, gross - baseline);
  near(result.estimatedMinutes, 8 + 230 / 60);
  assert.equal(result.limitation, null);
  assert.deepEqual(estimateWorkoutEnergy({ ...session, warmupMinutes: 20, estimatedMinutes: 23 + 230 / 60 }, 80, 2400, 30).extraCalories, result.extraCalories);
  assert.equal(estimateWorkoutEnergy(session, 80, 20000, 30).extraCalories, 0);
});

test('energy estimator strictly rejects invalid counts, timings, measurements and age', () => {
  for (const patch of [{ sets: 0 }, { sets: 1.5 }, { reps: '10-8' }, { reps: '8-10x' }, { restSeconds: -1 }, { setupSeconds: '60' }, { sets: Infinity }]) {
    const result = estimateWorkoutEnergy({ ...session, exercises: [{ ...session.exercises[0], ...patch }] }, 80, 2400, 30);
    assert.ok(result.limitation);
    assert.equal(result.extraCalories, null);
  }
  for (const invalid of [null, {}, { ...session, exercises: [] }, { ...session, warmupMinutes: -1 }, { ...session, estimatedMinutes: 45 }]) {
    assert.ok(estimateWorkoutEnergy(invalid, 80, 2400, 30).limitation);
  }
  for (const [weight, maintenance, age] of [[0, 2400, 30], ['80', 2400, 30], [80, NaN, 30], [80, 2400, '30']]) {
    assert.ok(estimateWorkoutEnergy(session, weight, maintenance, age).limitation);
  }
  assert.equal(estimateWorkoutEnergy(session, 80, 2400, 18).limitation, 'energy-age');
  assert.equal(estimateWorkoutEnergy(session, 80, 2400, 60).limitation, 'energy-age');
});

test('baseline subtraction is floored only after the whole session, not per exercise', () => {
  const mixed = { warmupMinutes: 0, cooldownMinutes: 0, exercises: [
    { sets: 1, reps: '1-1', restSeconds: 0, setupSeconds: 600 },
    { sets: 10, reps: '10-10', restSeconds: 90, setupSeconds: 0 }
  ] };
  const energy = estimateWorkoutEnergy(mixed, 80, 5040, 30);
  const block = (4 + 400 + 810) / 60;
  near(energy.extraCalories, 80 * 3.5 / 200 * (3.5 * block + 1.3 * 10) - 5040 / 1440 * (block + 10));
  assert.ok(energy.extraCalories > 0);
});

test('integration uses shared fields and actual sessions, leaving rest unchanged and inputs untouched', () => {
  const before = structuredClone({ profile, setup });
  const result = buildTrainingNutrition(profile, { ...setup, age: '18', goal: 'lose', activity: 'very', eligible: false });
  const base = calculateNutrition({ ...profile, eligible: true, includeAssessment: false });
  assert.deepEqual(result.base, base);
  assert.deepEqual(result.errors, {});
  assert.equal(result.limitation, null);
  assert.deepEqual(result.plan, calculateWorkout({ ...setup, age: '30', goal: profile.goal, activity: profile.activity, eligible: true }).plan);
  assert.deepEqual(result.days.map(day => day.dayLabel), ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя']);
  assert.equal(result.days.filter(day => day.training).length, 3);
  for (const day of result.days) {
    assert.equal(day.protein, 160);
    if (!day.training) {
      for (const key of ['calories', 'protein', 'fat', 'carbs']) assert.equal(day[key], base.result[key]);
      for (const key of ['extraCalories', 'grossCalories', 'baselineCalories', 'estimatedMinutes']) assert.equal(day[key], 0);
      continue;
    }
    const exerciseSession = result.plan.sessions.find(s => s.dayLabel === day.dayLabel);
    const block = exerciseSession.exercises.reduce((sum, e) => sum + e.sets * Number(e.reps.split('-')[1]) * 4 + (e.sets - 1) * e.restSeconds, 0) / 60;
    const preparation = exerciseSession.exercises.reduce((sum, e) => sum + e.setupSeconds, 0) / 60;
    near(day.grossCalories, 80 * 3.5 / 200 * (3.5 * block + 1.3 * preparation));
    near(day.baselineCalories, base.result.maintenance / 1440 * (block + preparation));
    near(day.calories, base.result.calories + day.extraCalories);
    near(day.fat, day.calories * 0.25 / 9);
    near(day.carbs, (day.calories - 4 * day.protein - 9 * day.fat) / 4);
  }
  assert.deepEqual(buildTrainingNutrition(profile, setup), buildTrainingNutrition(profile, setup));
  assert.deepEqual({ profile, setup }, before);
});

test('all goals preserve the absolute base adjustment, not a scaled surplus', () => {
  for (const choices of [{ goal: 'lose', targetWeight: 75, weeklyRate: '0.25' }, { goal: 'muscle', targetWeight: 85, weeklyRate: '0.25' }, { goal: 'gain', targetWeight: 85, weeklyRate: '0.5' }]) {
    const result = buildTrainingNutrition({ ...profile, ...choices }, setup);
    const day = result.days.find(d => d.training);
    near(day.calories - (result.base.result.maintenance + day.extraCalories), result.base.result.adjustment);
  }
});

test('every supported schedule uses exactly the actual plan days, including the light fifth session', () => {
  for (const days of ['2', '3', '4', '5']) {
    const result = buildTrainingNutrition(profile, { ...setup, days });
    assert.deepEqual(result.days.filter(day => day.training).map(day => day.dayLabel), result.plan.sessions.map(s => s.dayLabel));
    assert.equal(result.days.length, 7);
    assert.equal(result.days.filter(day => day.training).length, Number(days));
  }
});

test('BMI-limited profiles retain workouts but never receive a nutrition score', () => {
  for (const weight of [50, 110]) {
    const result = buildTrainingNutrition({ ...profile, weight, targetWeight: weight }, setup);
    assert.equal(result.base.result, null);
    assert.ok(result.limitation.startsWith('bmi-'));
    assert.ok(result.plan.sessions.length);
    assert.deepEqual(result.days, []);
  }
});

test('18-year-olds keep rest nutrition but unsupported training intake is withheld', () => {
  const result = buildTrainingNutrition({ ...profile, age: 18 }, setup);
  assert.equal(result.limitation, 'energy-age');
  for (const day of result.days) {
    assert.equal(day.calories, day.training ? null : result.base.result.calories);
    if (day.training) assert.equal(day.limitation, 'energy-age');
  }
});

test('training intake above 4500 is withheld rather than clamped; rest remains valid', () => {
  const value = { ...profile, age: 19, height: 230, weight: 140, activity: 'light', goal: 'gain', targetWeight: 145, weeklyRate: '0.5' };
  const result = buildTrainingNutrition(value, { ...setup, experience: 'advanced', duration: '60' });
  assert.ok(result.base.result.calories <= 4500);
  assert.equal(result.limitation, 'calories-range');
  for (const day of result.days) {
    if (day.training) {
      for (const key of ['calories', 'protein', 'fat', 'carbs']) assert.equal(day[key], null);
      assert.equal(day.limitation, 'calories-range');
    } else assert.equal(day.calories, result.base.result.calories);
  }
});

test('invalid profile and setup produce errors instead of a partial scored week', () => {
  assert.ok(Object.keys(buildTrainingNutrition(null, setup).errors).length);
  const result = buildTrainingNutrition(profile, { ...setup, days: '7' });
  assert.ok(result.errors.days);
  assert.equal(result.plan, null);
  assert.deepEqual(result.days, []);
});

test('all-paces-blocked profile keeps a workout without selecting a pace or scoring nutrition', () => {
  const value = { ...profile, age: 56, sex: 'female', height: 160, weight: 50, activity: 'sedentary', goal: 'lose', targetWeight: 49, weeklyRate: '', body: { ...body, waistRfm: 70 } };
  const before = structuredClone(value);
  const result = buildTrainingNutrition(value, setup);
  assert.deepEqual(result.plan, calculateWorkout({ ...setup, age: '56', goal: 'lose', activity: 'sedentary', eligible: true }).plan);
  assert.ok(result.errors.weeklyRate);
  assert.equal(result.limitation, 'nutrition-unavailable');
  assert.deepEqual(result.base, calculateNutrition({ ...value, eligible: true, includeAssessment: false }));
  assert.equal(result.base.result, null);
  assert.deepEqual(result.days, []);
  assert.deepEqual(value, before);
});

test('a missing pace with available choices does not bypass integration validation', () => {
  const result = buildTrainingNutrition({ ...profile, goal: 'lose', targetWeight: 75, weeklyRate: '' }, setup);
  assert.ok(result.errors.profile);
  assert.equal(result.plan, null);
  assert.deepEqual(result.days, []);
});
