import { getDailyGuidance } from './guidance.js';
import { parseMetric } from './measurements.js';
import { calculateBodyAssessment, validateBodyMeasurements } from './body-assessment.js';

const activities = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 };
const plans = {
  lose: { '0.25': 0, '0.5': 0 },
  maintain: { '0': 0 },
  muscle: { '0.1': 0.05, '0.25': 0.1 },
  gain: { '0.25': 0.1, '0.5': 0.15 }
};

export function getWeeklyPaces(goal, weight) {
  const currentWeight = parseMetric(weight, 35, 250);
  if (typeof goal !== 'string' || !Object.hasOwn(plans, goal) || currentWeight === null) return [];
  return Object.keys(plans[goal]).map(value => ({ value, percent: Number(value), kg: currentWeight * Number(value) / 100 }));
}

export function validateProfile(input) {
  const source = input && typeof input === 'object' ? input : {};
  const profile = {
    age: parseMetric(source.age, 18, 56, true),
    weight: parseMetric(source.weight, 35, 250),
    height: parseMetric(source.height, 130, 230),
    sex: source.sex,
    activity: source.activity,
    goal: source.goal,
    targetWeight: null,
    weeklyRate: source.weeklyRate,
    body: null
  };
  const errors = {};
  if (profile.age === null) errors.age = 'Enter a whole-number age from 18 to 56.';
  if (profile.weight === null) errors.weight = 'Enter 35-250 kg, with at most one decimal place.';
  if (profile.height === null) errors.height = 'Enter 130-230 cm, with at most one decimal place.';
  if (!['male', 'female'].includes(profile.sex)) errors.sex = 'Choose a formula category to estimate your resting energy.';
  if (typeof profile.activity !== 'string' || !Object.hasOwn(activities, profile.activity)) errors.activity = 'Choose the activity level that describes your whole day.';
  if (typeof profile.goal !== 'string' || !Object.hasOwn(plans, profile.goal)) errors.goal = 'Choose one of the four supported goals.';
  if (!errors.goal && profile.goal === 'maintain') {
    profile.targetWeight = profile.weight;
    profile.weeklyRate = source.weeklyRate ?? '0';
    if (source.targetWeight !== undefined && profile.weight !== null && parseMetric(source.targetWeight, 35, 250) !== profile.weight) errors.targetWeight = 'For maintenance, target weight must match your current weight.';
  } else if (!errors.goal) {
    profile.targetWeight = parseMetric(source.targetWeight, 35, 250);
    if (profile.targetWeight === null) errors.targetWeight = 'Enter a target from 35-250 kg, with at most one decimal place.';
    else if (profile.weight !== null && (profile.goal === 'lose' ? profile.targetWeight >= profile.weight : profile.targetWeight <= profile.weight)) {
      errors.targetWeight = profile.goal === 'lose' ? 'Choose a target below your current weight for fat loss.' : 'Choose a target above your current weight for weight gain.';
    } else if (profile.height !== null) {
      const targetBmi = profile.targetWeight / (profile.height / 100) ** 2;
      if (targetBmi < 18.5 || targetBmi >= 30) errors.targetWeight = 'Choose a target within this calculator\'s BMI support range (18.5 to below 30), or seek individual guidance.';
    }
  }
  if (!errors.goal && profile.weight !== null && (typeof profile.weeklyRate !== 'string' || !Object.hasOwn(plans[profile.goal], profile.weeklyRate))) errors.weeklyRate = 'Choose one of the supported weekly paces for your goal.';
  if (source.includeAssessment !== undefined && typeof source.includeAssessment !== 'boolean') errors.includeAssessment = 'Use the checkbox to choose whether to include a body assessment.';
  if (source.includeAssessment === true) {
    const measured = validateBodyMeasurements(source);
    Object.assign(errors, measured.errors);
    profile.body = measured.body;
  }
  return { errors, profile: Object.keys(errors).length ? null : profile };
}

export function calculateNutrition(input) {
  const { errors, profile } = validateProfile(input);
  if (input?.eligible !== true) errors.eligible = 'Confirm that you understand who this tool is intended for.';
  const output = { errors, profile, result: null, limitation: null, assessment: null };
  if (input?.includeAssessment === true && input?.eligible === true) output.assessment = calculateBodyAssessment(input).assessment;
  if (Object.keys(errors).length) return output;

  const { weight, height, age, sex, activity, goal, weeklyRate } = profile;
  const bmi = weight / (height / 100) ** 2;
  if (bmi < 18.5 || bmi >= 30) {
    output.limitation = bmi < 18.5 ? 'bmi-low' : 'bmi-high';
    return output;
  }

  const rmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161);
  const maintenance = rmr * activities[activity];
  const weeklyKg = weight * Number(weeklyRate) / 100;
  const adjustment = goal === 'lose' ? -weeklyKg * 7700 / 7 : maintenance * plans[goal][weeklyRate];
  const calories = maintenance + adjustment;
  if (!Number.isFinite(calories) || rmr <= 0 || calories < 1500 || calories > 4500) {
    output.limitation = 'calories-range';
    return output;
  }
  if (goal === 'lose' && -adjustment > maintenance * 0.2) {
    output.limitation = 'pace-range';
    return output;
  }

  const protein = 2 * weight;
  const fat = 0.25 * calories / 9;
  const carbs = (calories - 4 * protein - 9 * fat) / 4;
  if (![protein, fat, carbs].every(value => Number.isFinite(value) && value > 0)) {
    output.limitation = 'macro-allocation';
    return output;
  }
  const guidance = getDailyGuidance({ age, sex, calories, protein });
  output.result = { rmr, maintenance, calories, protein, fat, carbs, bmi, weeklyKg, adjustment, guidance };
  return output;
}
