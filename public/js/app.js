import { calculateNutrition, getWeeklyPaces, validateProfile } from './nutrition.js';
import { calculateBodyAssessment } from './body-assessment.js';

const storageKey = 'liftfuel.profile.v1';
const form = document.querySelector('#profile-form');
const remember = document.querySelector('#remember');
const storageStatus = document.querySelector('#storage-status');
const summary = document.querySelector('#error-summary');
const errorList = document.querySelector('#error-list');
const resultRegion = document.querySelector('#nutrition-result');
const limitation = document.querySelector('#limitation');
const emptyResult = document.querySelector('#empty-result');
const resultState = document.querySelector('#result-state');
const guidanceRegion = document.querySelector('#daily-guidance');
const guidanceLink = document.querySelector('#guidance-link');
const bodyRegion = document.querySelector('#body-assessment');
const bodyLink = document.querySelector('#body-link');
const bodyChoice = document.querySelector('#includeAssessment');
const bodyFields = document.querySelector('#body-fields');
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const goalLabels = { lose: 'Lose fat / gradual weight reduction', maintain: 'Maintain weight / estimated maintenance', muscle: 'Build muscle / minimize excess fat gain', gain: 'Gain weight / accept some fat gain' };
const factors = { sedentary: '1.2', light: '1.375', moderate: '1.55', very: '1.725' };
const weightNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const paceNumber = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const referenceNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const ratioNumber = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
let unavailablePaceReason = null;

function readInputs() {
  return { ...Object.fromEntries(new FormData(form)), eligible: form.elements.eligible.checked, includeAssessment: bodyChoice.checked };
}

function updateAssessmentFields() {
  bodyFields.disabled = !bodyChoice.checked;
  bodyFields.hidden = !bodyChoice.checked;
  const hasEstimate = form.elements.bodyFat.value.trim() !== '';
  form.elements.bodyFatMethod.disabled = !bodyChoice.checked || !hasEstimate;
  form.elements.bodyFatMethod.required = bodyChoice.checked && hasEstimate;
  if (!hasEstimate) form.elements.bodyFatMethod.value = '';
}

function updatePlanFields(reset = false) {
  const goal = form.elements.goal.value;
  const target = form.elements.targetWeight;
  const weekly = form.elements.weeklyRate;
  const previousRate = reset ? '' : weekly.value;
  target.disabled = !goal;
  target.readOnly = goal === 'maintain';
  target.required = Boolean(goal) && goal !== 'maintain';
  if (reset) target.value = '';
  if (goal === 'maintain') target.value = form.elements.weight.value.trim();
  weekly.replaceChildren(new Option('Choose a weekly pace', ''));
  unavailablePaceReason = null;
  const blockedPaces = [];
  const paces = getWeeklyPaces(goal, form.elements.weight.value);
  for (const pace of paces) {
    const label = goal === 'maintain' ? 'No planned weekly change' : `${goal === 'lose' ? 'Lose' : 'Gain'} about ${paceNumber.format(pace.kg)} kg/week (${pace.percent}% of current weight)`;
    const option = new Option(label, pace.value);
    // Preview availability only; actual results still require explicit eligibility confirmation.
    const candidate = calculateNutrition({ ...readInputs(), eligible: true, weeklyRate: pace.value });
    if (['calories-range', 'pace-range'].includes(candidate.limitation)) {
      blockedPaces.push(candidate.limitation);
      option.disabled = true;
      option.textContent += ' - outside calculator limits';
    }
    weekly.append(option);
  }
  if (goal !== 'maintain' && paces.length > 0 && blockedPaces.length === paces.length) unavailablePaceReason = blockedPaces[0];
  const availability = document.querySelector('#pace-availability');
  availability.hidden = !unavailablePaceReason;
  availability.textContent = unavailablePaceReason ? 'No weekly pace is available for these inputs within the calculator\'s calorie/deficit limits. Confirm eligibility and calculate for an explanation, or seek individual guidance.' : '';
  weekly.disabled = !goal || goal === 'maintain' || paces.length === 0 || Boolean(unavailablePaceReason);
  weekly.required = Boolean(goal) && goal !== 'maintain';
  const selected = Array.from(weekly.options).find(option => option.value === previousRate && !option.disabled);
  weekly.value = goal === 'maintain' ? '0' : selected?.value ?? '';
}

function clearErrors() {
  summary.hidden = true;
  errorList.replaceChildren();
  for (const field of form.querySelectorAll('[aria-invalid]')) field.removeAttribute('aria-invalid');
  for (const error of form.querySelectorAll('.field-error')) {
    error.hidden = true;
    error.textContent = '';
  }
}

function invalidateResults() {
  resultRegion.hidden = true;
  guidanceRegion.hidden = true;
  guidanceLink.hidden = true;
  bodyRegion.hidden = true;
  bodyLink.hidden = true;
  limitation.hidden = true;
  emptyResult.hidden = false;
  resultState.textContent = 'YOUR STARTING POINT';
}

function renderBodyAssessment(assessment) {
  document.querySelector('#body-summary').textContent = assessment.summary;
  document.querySelector('#body-bmi').textContent = referenceNumber.format(assessment.bmi);
  document.querySelector('#body-waist-ratio').textContent = ratioNumber.format(assessment.waistRatio);
  document.querySelector('#body-fat-estimate').textContent = assessment.bodyFat ? `${referenceNumber.format(assessment.bodyFat.percent)}% (user-provided; ${assessment.bodyFat.methodLabel})` : 'Not provided; not estimated here';
  document.querySelector('#body-self-description').textContent = assessment.selfDescription ?? 'Not provided';
  document.querySelector('#body-waist-note').textContent = assessment.waistNote;
  document.querySelector('#body-goal-context').textContent = assessment.goalContext;
  bodyRegion.hidden = false;
  bodyLink.hidden = false;
}

function renderDailyGuidance(profile, guidance) {
  const rows = document.createDocumentFragment();
  for (const nutrient of guidance.nutrients) {
    const row = document.createElement('tr');
    row.dataset.nutrient = nutrient.id;
    row.dataset.kind = nutrient.kind;
    const name = document.createElement('th');
    name.scope = 'row';
    const source = document.createElement('a');
    source.href = nutrient.source;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = nutrient.name;
    source.setAttribute('aria-label', `${nutrient.name} source (opens in a new tab)`);
    const note = document.createElement('span');
    note.className = 'nutrient-note';
    note.textContent = nutrient.note;
    name.append(source, note);
    const reference = document.createElement('td');
    const value = document.createElement('span');
    value.className = 'reference-value';
    const prefix = nutrient.kind === 'limit' ? (nutrient.id === 'sodium' ? 'Less than ' : 'Less than about ') : (nutrient.id === 'fiber' ? 'About ' : '');
    value.textContent = nutrient.value === null ? nutrient.advice : `${prefix}${referenceNumber.format(nutrient.value)} ${nutrient.unit}/day`;
    const basis = document.createElement('span');
    basis.className = 'reference-basis';
    basis.textContent = `${nutrient.basis}${nutrient.kind === 'limit' ? ' / ceiling, not target' : ''}`;
    reference.append(value, basis);
    row.append(name, reference);
    rows.append(row);
  }
  document.querySelector('#nutrient-rows').replaceChildren(rows);
  document.querySelector('#reference-profile').textContent = `Baseline US dietary reference tables use age ${profile.age} and the selected ${profile.sex} category. This reuses the equation-category selection; it is not a complete account of physiology or individual needs. Food-first guidance for generally healthy, nonpregnant/nonlactating users, not personalized medical advice.`;
  document.querySelector('#meal-count').textContent = guidance.meals.count;
  const times = guidance.meals.exampleTimes.map((time, index) => {
    const item = document.createElement('li');
    const clock = document.createElement('time');
    clock.dateTime = time;
    clock.textContent = time;
    const label = document.createElement('span');
    label.textContent = `Eating occasion ${index + 1}`;
    item.append(clock, label);
    return item;
  });
  document.querySelector('#meal-times').replaceChildren(...times);
  document.querySelector('#meal-summary').textContent = `If divided evenly: about ${number.format(guidance.meals.caloriesPerMeal)} kcal and ${referenceNumber.format(guidance.meals.proteinPerMeal)} g protein per occasion. This divides your existing daily totals; it adds no extra calories and need not be followed exactly.`;
  guidanceRegion.hidden = false;
  guidanceLink.hidden = false;
}

function showErrors(errors) {
  for (const [field, message] of Object.entries(errors)) {
    document.getElementById(field).setAttribute('aria-invalid', 'true');
    const error = document.getElementById(`${field}-error`);
    error.textContent = message;
    error.hidden = false;
    const item = document.createElement('li');
    item.dataset.field = field;
    const link = document.createElement('a');
    link.href = `#${field}`;
    link.textContent = message;
    link.addEventListener('click', event => {
      event.preventDefault();
      document.getElementById(field).focus();
    });
    item.append(link);
    errorList.append(item);
  }
  summary.hidden = false;
  summary.focus();
}

function removeSavedProfile() {
  try {
    localStorage.removeItem(storageKey);
    return true;
  } catch {
    storageStatus.textContent = 'Browser storage is unavailable. Saved data could not be removed; clear this site\'s data in browser settings.';
    return false;
  }
}

function restoreProfile() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return;
    const saved = JSON.parse(raw);
    if (![1, 2, 3].includes(saved?.version) || saved?.remember !== true || !saved.profile || typeof saved.profile !== 'object' || Array.isArray(saved.profile)) throw new Error('Invalid saved record');
    const legacy = saved.version === 1;
    if (legacy && (typeof saved.profile.goal !== 'string' || !Object.hasOwn(goalLabels, saved.profile.goal))) throw new Error('Invalid saved goal');
    const storedBody = saved.version === 3 ? saved.profile.body : null;
    if (storedBody !== null && (!storedBody || typeof storedBody !== 'object' || Array.isArray(storedBody))) throw new Error('Invalid saved measurements');
    const restoredInput = {
      ...saved.profile,
      includeAssessment: storedBody !== null,
      waist: storedBody?.waist,
      bodyFat: storedBody?.bodyFat,
      bodyFatMethod: storedBody?.bodyFatMethod,
      bodyDescription: storedBody?.bodyDescription
    };
    const { errors, profile } = validateProfile(legacy ? { ...restoredInput, goal: 'maintain', targetWeight: undefined, weeklyRate: undefined } : restoredInput);
    if (Object.keys(errors).length) throw new Error('Invalid saved profile');
    if (legacy) {
      profile.goal = saved.profile.goal;
      if (profile.goal !== 'maintain') {
        profile.targetWeight = '';
        profile.weeklyRate = '';
      }
    }
    for (const [field, value] of Object.entries(profile)) {
      if (field === 'goal') form.querySelector(`input[name="goal"][value="${value}"]`).checked = true;
      else if (field !== 'weeklyRate' && field !== 'body') form.elements.namedItem(field).value = value;
    }
    bodyChoice.checked = profile.body !== null;
    if (profile.body) for (const [field, value] of Object.entries(profile.body)) form.elements.namedItem(field).value = value ?? '';
    updateAssessmentFields();
    updatePlanFields();
    const restoredPace = Array.from(form.elements.weeklyRate.options).find(option => option.value === profile.weeklyRate && !option.disabled);
    if (restoredPace) form.elements.weeklyRate.value = restoredPace.value;
    remember.checked = true;
    storageStatus.textContent = legacy && profile.goal !== 'maintain' ? 'Saved inputs restored. Choose a target weight and weekly pace, then confirm eligibility and calculate.' : 'Saved inputs restored. Confirm eligibility and calculate to see current targets.';
  } catch {
    storageStatus.textContent = 'Saved inputs could not be restored or storage is unavailable. You can still calculate without saving.';
  }
}

function saveProfile(profile) {
  if (!remember.checked) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({ version: 3, remember: true, profile }));
    storageStatus.textContent = 'Saved on this device. Your eligibility confirmation is not saved.';
  } catch {
    storageStatus.textContent = 'Your inputs were not saved because browser storage is unavailable. Your calculation still works.';
  }
}

function showLimitation(reason) {
  const explanations = {
    'bmi-low': 'Your measurements are below this calculator\'s supported BMI range. Automated calorie and macro targets are not provided for underweight profiles in this MVP. General nutrition information remains available below.',
    'bmi-high': 'Your measurements are above this calculator\'s supported BMI range. Because BMI does not distinguish muscle from fat and the macro rules have not been reviewed for this range, automatic targets are withheld.',
    'calories-range': 'The calculated calorie estimate falls outside this MVP\'s 1,500-4,500 kcal/day support range. We have not changed your goal or clamped your calories. This range is a product limit, not a safe-intake guarantee.',
    'pace-range': 'The selected loss pace would require more than this calculator\'s 20% deficit limit. Choose a slower pace or seek individual guidance. The result has not been silently clamped.',
    'macro-allocation': 'The current rules cannot produce a suitable positive macro allocation for these inputs. No partial or adjusted prescription is shown.'
  };
  document.querySelector('#limitation-detail').textContent = explanations[reason];
  emptyResult.hidden = true;
  limitation.hidden = false;
  resultState.textContent = 'INDIVIDUAL GUIDANCE';
  limitation.focus();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  clearErrors();
  invalidateResults();
  const input = readInputs();
  const output = calculateNutrition(input);
  if (unavailablePaceReason) delete output.errors.weeklyRate;
  if (Object.keys(output.errors).length) {
    showErrors(output.errors);
    return;
  }
  if (output.assessment) renderBodyAssessment(output.assessment);
  if (unavailablePaceReason) {
    showLimitation(unavailablePaceReason);
    return;
  }
  saveProfile(output.profile);
  if (output.limitation) {
    showLimitation(output.limitation);
    return;
  }
  for (const key of ['calories', 'protein', 'fat', 'carbs']) document.querySelector(`[data-testid="${key}"]`).textContent = number.format(output.result[key]);
  document.querySelector('#goal-description').textContent = goalLabels[output.profile.goal];
  document.querySelector('[data-testid="target-weight"]').textContent = `${weightNumber.format(output.profile.targetWeight)} kg`;
  document.querySelector('[data-testid="weekly-pace"]').textContent = output.profile.goal === 'maintain' ? 'Maintain / no planned weekly change' : `${output.profile.goal === 'lose' ? 'Lose' : 'Gain'} about ${paceNumber.format(output.result.weeklyKg)} kg/week (${output.profile.weeklyRate}% of current weight)`;
  document.querySelector('#calculation-detail').textContent = `Mifflin-St Jeor (${output.profile.sex} equation): ${number.format(output.result.rmr)} kcal resting estimate. Activity factor ${factors[output.profile.activity]} gives estimated maintenance of ${number.format(output.result.maintenance)} kcal/day. Selected starting adjustment: ${output.result.adjustment >= 0 ? '+' : '-'}${number.format(Math.abs(output.result.adjustment))} kcal/day.`;
  document.querySelector('#pace-assumptions').textContent = output.profile.goal === 'lose' ? 'Loss uses a rough 7,700 kcal/kg energy heuristic to choose an initial deficit, limited to 20% of estimated maintenance. Metabolic adaptation and tissue/water changes mean actual progress will differ.' : output.profile.goal === 'maintain' ? 'Maintenance keeps your current weight as the target. Reassess using multiweek trends, not a single weigh-in.' : 'Gain uses a modest starting surplus: muscle-focused paces map to 5% or 10%; overall-gain paces map to 10% or 15%. This is not a calorie-per-kilogram prediction or a promise of the selected pace. The faster gain option may not suit advanced trainees.';
  renderDailyGuidance(output.profile, output.result.guidance);
  emptyResult.hidden = true;
  resultRegion.hidden = false;
  resultState.textContent = 'ESTIMATES, NOT LIMITS';
  resultRegion.focus();
});

form.addEventListener('input', event => {
  if (event.target === remember) return;
  updateAssessmentFields();
  updatePlanFields(event.target.name === 'goal');
  const input = readInputs();
  const { errors } = calculateNutrition(input);
  if (unavailablePaceReason) delete errors.weeklyRate;
  for (const control of form.querySelectorAll('[aria-invalid]')) {
    const field = control.id;
    if (!errors[field]) {
      control.removeAttribute('aria-invalid');
      document.getElementById(`${field}-error`).hidden = true;
      document.getElementById(`${field}-error`).textContent = '';
      errorList.querySelector(`[data-field="${field}"]`)?.remove();
      summary.hidden = errorList.childElementCount === 0;
    } else {
      document.getElementById(`${field}-error`).textContent = errors[field];
      const link = errorList.querySelector(`[data-field="${field}"] a`);
      if (link) link.textContent = errors[field];
    }
  }
  invalidateResults();
  if (remember.checked) storageStatus.textContent = 'Changes are not saved until you calculate again.';
});

document.querySelector('#assess-body').addEventListener('click', () => {
  if (!bodyChoice.checked) return;
  clearErrors();
  invalidateResults();
  const output = calculateBodyAssessment(readInputs());
  if (Object.keys(output.errors).length) {
    showErrors(output.errors);
    return;
  }
  renderBodyAssessment(output.assessment);
  bodyRegion.focus();
});

remember.addEventListener('change', () => {
  if (remember.checked) {
    storageStatus.textContent = 'Your inputs will be saved when you calculate. Only use this on a browser you trust.';
    return;
  }
  if (removeSavedProfile()) storageStatus.textContent = 'Remembering is off. Saved inputs have been removed; current inputs stay on this page only.';
});

document.querySelector('#delete-data').addEventListener('click', () => {
  const removed = removeSavedProfile();
  form.reset();
  updateAssessmentFields();
  updatePlanFields();
  clearErrors();
  invalidateResults();
  if (removed) storageStatus.textContent = 'Your saved data has been deleted. Nothing is saved unless you opt in.';
});

updateAssessmentFields();
restoreProfile();
document.querySelector('#app-status').hidden = true;
form.querySelector('[type="submit"]').disabled = false;
