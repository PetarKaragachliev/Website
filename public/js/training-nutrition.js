import { calculateNutrition } from './nutrition.js';
import { calculateWorkout } from './workout.js';
import { normalizeSharedProfile } from './shared-plan.js';

const dayLabels = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя'];

// Low-confidence planned energy, not measured expenditure. Compendium 02054 (3.5 MET)
// covers sets and between-set rest; setup is 1.3 MET. Unspecified warmup/cooldown earn no credit.
export function estimateWorkoutEnergy(session, weight, baselineMaintenance, age) {
  const withheld = limitation => ({ grossCalories: null, baselineCalories: null, extraCalories: null, estimatedMinutes: null, limitation });
  if (!Number.isInteger(age) || !Number.isFinite(weight) || weight <= 0 || !Number.isFinite(baselineMaintenance) || baselineMaintenance <= 0) return withheld('energy-input');
  if (age < 19 || age > 59) return withheld('energy-age');
  if (!session || typeof session !== 'object' || Array.isArray(session) || !Array.isArray(session.exercises) || !session.exercises.length) return withheld('energy-session');
  if (![session.warmupMinutes, session.cooldownMinutes].every(value => Number.isFinite(value) && value >= 0)) return withheld('energy-session');
  let blockSeconds = 0;
  let setupSeconds = 0;
  for (const exercise of session.exercises) {
    if (!exercise || typeof exercise !== 'object' || Array.isArray(exercise)) return withheld('energy-session');
    const reps = typeof exercise.reps === 'string' && /^([1-9]\d*)-([1-9]\d*)$/.exec(exercise.reps);
    if (!reps || !Number.isSafeInteger(exercise.sets) || exercise.sets < 1 || ![Number(reps[1]), Number(reps[2])].every(Number.isSafeInteger) || Number(reps[1]) > Number(reps[2])) return withheld('energy-session');
    if (![exercise.restSeconds, exercise.setupSeconds].every(value => Number.isFinite(value) && value >= 0)) return withheld('energy-session');
    blockSeconds += 4 * Number(reps[2]) * exercise.sets + (exercise.sets - 1) * exercise.restSeconds;
    setupSeconds += exercise.setupSeconds;
  }
  const blockMinutes = blockSeconds / 60;
  const setupMinutes = setupSeconds / 60;
  const estimatedMinutes = blockMinutes + setupMinutes + session.warmupMinutes + session.cooldownMinutes;
  if (session.estimatedMinutes !== undefined && (!Number.isFinite(session.estimatedMinutes) || Math.abs(session.estimatedMinutes - estimatedMinutes) > 1e-9)) return withheld('energy-session');
  const grossCalories = weight * 3.5 / 200 * (3.5 * blockMinutes + 1.3 * setupMinutes);
  const baselineCalories = baselineMaintenance / 1440 * (blockMinutes + setupMinutes);
  const extraCalories = Math.max(0, grossCalories - baselineCalories);
  if (![estimatedMinutes, grossCalories, baselineCalories, extraCalories].every(Number.isFinite)) return withheld('energy-session');
  return { grossCalories, baselineCalories, extraCalories, estimatedMinutes, limitation: null };
}

// Callers must validate fresh health checkboxes before invoking this input-only integration.
export function buildTrainingNutrition(profile, workoutSetup) {
  let canonical;
  try {
    canonical = normalizeSharedProfile(profile);
  } catch {
    return { errors: { profile: 'Invalid shared profile.' }, limitation: null, base: null, plan: null, days: [] };
  }
  const base = calculateNutrition({ ...canonical, eligible: true, includeAssessment: false });
  const workout = calculateWorkout({ ...workoutSetup, age: String(canonical.age), goal: canonical.goal, activity: canonical.activity, eligible: true });
  const output = { errors: { ...base.errors, ...workout.errors }, limitation: base.limitation ?? (base.errors.weeklyRate ? 'nutrition-unavailable' : null), base, plan: workout.plan, days: [] };
  if (Object.keys(output.errors).length || !base.result || !workout.plan) return output;
  output.days = dayLabels.map(dayLabel => {
    const session = workout.plan.sessions.find(item => item.dayLabel === dayLabel);
    const { calories, protein, fat, carbs, maintenance } = base.result;
    if (!session) return { dayLabel, training: false, calories, protein, fat, carbs, extraCalories: 0, grossCalories: 0, baselineCalories: 0, estimatedMinutes: 0 };
    const energy = estimateWorkoutEnergy(session, canonical.weight, maintenance, canonical.age);
    const intake = calories + energy.extraCalories;
    const trainingProtein = 2 * canonical.weight;
    const trainingFat = 0.25 * intake / 9;
    const trainingCarbs = (intake - 4 * trainingProtein - 9 * trainingFat) / 4;
    let limitation = energy.limitation;
    if (!limitation && (!Number.isFinite(intake) || intake < 1500 || intake > 4500)) limitation = 'calories-range';
    if (!limitation && ![trainingProtein, trainingFat, trainingCarbs].every(value => Number.isFinite(value) && value > 0)) limitation = 'macro-allocation';
    const day = { dayLabel, training: true, calories: intake, protein: trainingProtein, fat: trainingFat, carbs: trainingCarbs, extraCalories: energy.extraCalories, grossCalories: energy.grossCalories, baselineCalories: energy.baselineCalories, estimatedMinutes: energy.estimatedMinutes };
    if (limitation) {
      Object.assign(day, { calories: null, protein: null, fat: null, carbs: null, limitation });
      output.limitation ??= limitation;
    }
    return day;
  });
  return output;
}
