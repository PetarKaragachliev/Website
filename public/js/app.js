import { calculateNutrition, getWeeklyPaces } from './nutrition.js';
import { calculateBodyAssessment } from './body-assessment.js';
import { translate } from './i18n.js';
import { PROFILE_STORAGE_KEY, decodeProfile, encodeProfile } from './profile-storage.js';

const t = (message, values) => translate(message, 'bg', values);
const $ = selector => document.querySelector(selector);
const form = $('#profile-form');
const remember = $('#remember');
const number = new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 1 });
const percentNumber = new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 2 });
const rfmNumber = new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const paceNumber = new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ratioNumber = new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const goalLabels = { lose: 'Намаляване на теглото', maintain: 'Поддържане на теглото', muscle: 'Покачване с фокус върху мускулите', gain: 'Покачване на теглото' };
const factors = { sedentary: '1,2', light: '1,375', moderate: '1,55', very: '1,725' };
let displayedErrors = {};
let unavailablePace = null;
let profileDeletionFailed = false;

function setStorageStatus(message) {
  $('#storage-status').textContent = profileDeletionFailed
    ? `Запазеният профил не можа да бъде изтрит. Изчисти данните за този сайт от настройките на браузъра. ${message}`
    : message;
}

function readInputs() {
  return {
    ...Object.fromEntries(new FormData(form)),
    eligible: form.elements.eligible.checked,
    regularTraining: form.elements.regularTraining.checked,
    includeAssessment: true
  };
}

function updatePlanFields(reset = false) {
  const goal = form.elements.goal.value;
  const target = form.elements.targetWeight;
  const weekly = form.elements.weeklyRate;
  const previous = reset ? '' : weekly.value;
  target.disabled = !goal;
  target.readOnly = goal === 'maintain';
  target.required = Boolean(goal) && goal !== 'maintain';
  if (reset || !goal) target.value = '';
  if (goal === 'maintain') target.value = form.elements.weight.value;
  weekly.replaceChildren(new Option('Избери седмично темпо', ''));
  unavailablePace = null;
  const paces = getWeeklyPaces(goal, form.elements.weight.value);
  const blocked = [];
  for (const pace of paces) {
    const label = goal === 'maintain' ? 'Без планирана седмична промяна' : `${goal === 'lose' ? 'Намаляване' : 'Покачване'} с около ${paceNumber.format(pace.kg)} кг/седмица (${percentNumber.format(pace.percent)}% от текущото тегло)`;
    const option = new Option(label, pace.value);
    const candidate = calculateNutrition({ ...readInputs(), eligible: true, includeAssessment: false, weeklyRate: pace.value });
    if (['calories-range', 'pace-range'].includes(candidate.limitation)) {
      option.disabled = true;
      option.textContent += ' - извън ограниченията на калкулатора';
      blocked.push({ reason: candidate.limitation, value: pace.value });
    }
    weekly.append(option);
  }
  if (goal !== 'maintain' && paces.length && blocked.length === paces.length) unavailablePace = blocked[0];
  $('#pace-availability').hidden = !unavailablePace;
  $('#pace-availability').textContent = unavailablePace ? 'Няма налично темпо в калорийните ограничения на калкулатора. Анализирай за обяснение или потърси индивидуални насоки. Не е избрано невъзможно темпо.' : '';
  weekly.disabled = !goal || goal === 'maintain' || !paces.length || Boolean(unavailablePace);
  weekly.required = Boolean(goal) && goal !== 'maintain';
  weekly.value = goal === 'maintain' ? '0' : Array.from(weekly.options).find(option => option.value === previous && !option.disabled)?.value ?? '';
}

function invalidateResults() {
  for (const id of ['body-assessment', 'nutrition-result', 'limitation']) $(`#${id}`).hidden = true;
  $('#empty-result').hidden = false;
  $('#result-state').textContent = '';
}

function showErrors(errors, focus = false) {
  for (const field of form.querySelectorAll('[aria-invalid]')) field.removeAttribute('aria-invalid');
  for (const error of form.querySelectorAll('.field-error')) {
    error.hidden = true;
    error.textContent = '';
  }
  displayedErrors = { ...errors };
  $('#error-list').replaceChildren();
  for (const [field, message] of Object.entries(errors)) {
    const control = document.getElementById(field);
    const error = document.getElementById(`${field}-error`);
    if (!control || !error) continue;
    control.setAttribute('aria-invalid', 'true');
    error.hidden = false;
    error.textContent = t(message);
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${field}`;
    link.textContent = t(message);
    link.addEventListener('click', event => {
      event.preventDefault();
      const details = control.closest('details');
      if (details) details.open = true;
      control.focus();
    });
    item.append(link);
    $('#error-list').append(item);
    const details = control.closest('details');
    if (details) details.open = true;
  }
  $('#error-summary').hidden = !Object.keys(errors).length;
  if (focus && Object.keys(errors).length) $('#error-summary').focus();
}

function renderBodyAssessment(assessment) {
  $('#body-summary').textContent = assessment.summary;
  $('#body-explanation').textContent = assessment.explanation;
  $('#body-bmi').textContent = decimal.format(assessment.bmi);
  $('#body-bmi-category').textContent = assessment.bmiCategory.label;
  $('#body-bmi-note').textContent = assessment.bmiCategory.note;
  $('#body-fat-calculated').textContent = assessment.rfm.percent === null ? 'Оценката не е налична' : `${rfmNumber.format(assessment.rfm.percent)}%`;
  $('#body-fat-mass').textContent = assessment.fatMass === null ? 'Оценката не е налична' : `${decimal.format(assessment.fatMass)} кг`;
  $('#body-fat-free-mass').textContent = assessment.fatFreeMass === null ? 'Оценката не е налична' : `${decimal.format(assessment.fatFreeMass)} кг`;
  $('#body-waist-ratio').textContent = assessment.whtr.value === null ? 'Няма отделно измерване по NICE' : `${ratioNumber.format(assessment.whtr.value)}${assessment.whtr.source === 'rfm-fallback' ? ' (описателно, талия за RFM; не по NICE)' : ''}`;
  $('#body-rfm-note').textContent = assessment.rfm.reason ?? 'RFM е приблизителна оценка по популационен модел, не пряко измерване. Индивидуалната грешка може да е значителна. Безмастната маса включва вода, кости, органи и други тъкани, не само мускули.';
  $('#body-reference-note').textContent = assessment.reference ? `${assessment.reference.label} ${assessment.reference.note}` : 'Няма приложима референтна категория за тази оценка.';
  $('#body-reference-summary').textContent = assessment.reference ? `${assessment.reference.label}. Условен ориентир за сравнение: от ${decimal.format(assessment.reference.low)} до под ${decimal.format(assessment.reference.high)}%. Не е универсална норма за RFM.` : 'Референтно сравнение на мазнините не е налично за този профил.';
  $('#body-waist-note').textContent = assessment.whtr.note;
  $('#body-goal-context').textContent = assessment.recommendation;
  $('#body-analysis-list').replaceChildren(...assessment.analysis.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  const proportions = document.createDocumentFragment();
  for (const proportion of assessment.proportions) {
    const term = document.createElement('dt');
    const value = document.createElement('dd');
    term.textContent = proportion.label;
    value.textContent = `${proportion.value === null ? 'Няма измерване' : ratioNumber.format(proportion.value)}. ${proportion.description}`;
    proportions.append(term, value);
  }
  $('#body-proportions').replaceChildren(proportions);
  $('#proportion-note').textContent = assessment.proportionNote;
  $('#body-assessment').hidden = false;
}

function renderDailyGuidance(profile, guidance) {
  const rows = document.createDocumentFragment();
  for (const nutrient of guidance.nutrients) {
    const row = document.createElement('tr');
    row.dataset.nutrient = nutrient.id;
    row.dataset.kind = nutrient.kind;
    const name = document.createElement('th');
    name.scope = 'row';
    const label = document.createElement('span');
    label.textContent = nutrient.id === 'fiber' ? 'Фибри / хранителни влакнини' : t(nutrient.name);
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Информация и източник';
    const note = document.createElement('p');
    note.className = 'nutrient-note';
    note.textContent = t(nutrient.note);
    const source = document.createElement('a');
    source.href = nutrient.source;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = 'Оригинален източник (нов раздел)';
    details.append(summary, note, source);
    name.append(label, details);
    const reference = document.createElement('td');
    const value = document.createElement('span');
    value.className = 'reference-value';
    const prefix = nutrient.kind === 'limit' ? (nutrient.id === 'sodium' ? 'По-малко от ' : 'По-малко от около ') : nutrient.id === 'fiber' ? 'Около ' : '';
    value.textContent = nutrient.value === null ? t(nutrient.advice) : `${prefix}${decimal.format(nutrient.value)} ${t(nutrient.unit)}/ден`;
    const basis = document.createElement('span');
    basis.className = 'reference-basis';
    basis.textContent = `${t(nutrient.basis)}${nutrient.kind === 'limit' ? ' / горна граница, не цел' : ''}`;
    reference.append(value, basis);
    row.append(name, reference);
    rows.append(row);
  }
  $('#nutrient-rows').replaceChildren(rows);
  $('#reference-profile').textContent = t('Baseline US dietary reference tables use age {age} and the selected {sex} category. This reuses the equation-category selection; it is not a complete account of physiology or individual needs. Food-first guidance for generally healthy, nonpregnant/nonlactating users, not personalized medical advice.', { age: number.format(profile.age), sex: t(profile.sex) });
  $('#meal-count').textContent = number.format(guidance.meals.count);
  $('#meal-times').replaceChildren(...guidance.meals.exampleTimes.map((time, index) => {
    const item = document.createElement('li');
    const clock = document.createElement('time');
    clock.dateTime = time;
    clock.textContent = time;
    const label = document.createElement('span');
    label.textContent = `Хранене ${index + 1}`;
    item.append(clock, label);
    return item;
  }));
  $('#meal-summary').textContent = t('If divided evenly: about {calories} kcal and {protein} g protein per occasion. This divides your existing daily totals; it adds no extra calories and need not be followed exactly.', { calories: number.format(guidance.meals.caloriesPerMeal), protein: decimal.format(guidance.meals.proteinPerMeal) });
}

function renderNutrition(output) {
  for (const key of ['calories', 'protein', 'fat', 'carbs']) $(`[data-testid="${key}"]`).textContent = number.format(output.result[key]);
  $('#goal-description').textContent = goalLabels[output.profile.goal];
  $('[data-testid="target-weight"]').textContent = `${decimal.format(output.profile.targetWeight)} кг`;
  $('[data-testid="weekly-pace"]').textContent = output.profile.goal === 'maintain' ? 'Поддържане / без планирана седмична промяна' : `${output.profile.goal === 'lose' ? 'Намаляване' : 'Покачване'} с около ${paceNumber.format(output.result.weeklyKg)} кг/седмица (${percentNumber.format(Number(output.profile.weeklyRate))}%)`;
  $('#calculation-detail').textContent = t('Mifflin-St Jeor ({sex} equation): {rmr} kcal resting estimate. Activity factor {factor} gives estimated maintenance of {maintenance} kcal/day. Selected starting adjustment: {sign}{adjustment} kcal/day.', { sex: t(output.profile.sex), rmr: number.format(output.result.rmr), factor: factors[output.profile.activity], maintenance: number.format(output.result.maintenance), sign: output.result.adjustment >= 0 ? '+' : '-', adjustment: number.format(Math.abs(output.result.adjustment)) });
  $('#pace-assumptions').textContent = t(output.profile.goal === 'lose' ? 'Loss uses a rough 7,700 kcal/kg energy heuristic to choose an initial deficit, limited to 20% of estimated maintenance. Metabolic adaptation and tissue/water changes mean actual progress will differ.' : output.profile.goal === 'maintain' ? 'Maintenance keeps your current weight as the target. Reassess using multiweek trends, not a single weigh-in.' : 'Gain uses a modest starting surplus: muscle-focused paces map to 5% or 10%; overall-gain paces map to 10% or 15%. This is not a calorie-per-kilogram prediction or a promise of the selected pace. The faster gain option may not suit advanced trainees.');
  renderDailyGuidance(output.profile, output.result.guidance);
  $('#empty-result').hidden = true;
  $('#nutrition-result').hidden = false;
  $('#result-state').textContent = 'Ориентири, не предписание';
}

function showLimitation(reason) {
  const explanations = {
    'bmi-low': 'Измерванията са под поддържания диапазон на ИТМ за автоматични хранителни цели. Анализът на телосложението остава отделен ориентир.',
    'bmi-high': 'Измерванията са над поддържания диапазон на ИТМ за автоматични хранителни цели. ИТМ не различава мускули от мазнини; потърси индивидуална оценка.',
    'calories-range': 'Калорийният ориентир е извън продуктовия диапазон 1500-4500 ккал/ден. Целта не е променена и калориите не са ограничени изкуствено. Този диапазон не е гаранция за безопасен прием.',
    'pace-range': 'Избраното темпо изисква дефицит над ограничението от 20% от изчисленото поддържане. Избери по-бавно темпо или потърси индивидуални насоки. Резултатът не е коригиран скрито.',
    'macro-allocation': 'Правилата не дават подходящо положително разпределение на макронутриентите. Не се показва частично или коригирано предписание.'
  };
  $('#limitation-detail').textContent = explanations[reason];
  $('#empty-result').hidden = true;
  $('#limitation').hidden = false;
  $('#result-state').textContent = 'Необходими са индивидуални насоки';
}

function evaluate(input) {
  const body = calculateBodyAssessment(input);
  const wantsNutrition = Boolean(input.activity || input.goal);
  // A blocked candidate explains the product limit; it is never a selected/saved pace.
  const nutrition = wantsNutrition ? calculateNutrition({ ...input, includeAssessment: false, weeklyRate: unavailablePace?.value ?? input.weeklyRate }) : null;
  return { body, nutrition, errors: { ...nutrition?.errors, ...body.errors } };
}

function saveProfile(body, nutrition) {
  if (!remember.checked) return;
  if (nutrition && (Object.keys(nutrition.errors).length || unavailablePace)) {
    setStorageStatus('Данните не са запазени: коригирай хранителните полета. Валидният анализ на телосложението остава достъпен. Предишните запазени данни не са променени.');
    return;
  }
  const profile = {
    ...body.measurements,
    activity: nutrition?.profile.activity ?? '',
    goal: nutrition?.profile.goal ?? '',
    targetWeight: nutrition?.profile.targetWeight ?? null,
    weeklyRate: nutrition?.profile.weeklyRate ?? ''
  };
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, encodeProfile(profile));
    setStorageStatus('Данните са запазени на това устройство. Потвърждението за допустимост не се запазва.');
  } catch {
    setStorageStatus('Данните не са запазени: записът е невалиден или браузърното хранилище е недостъпно. Анализът работи и без запазване.');
  }
}

function removeSavedProfile() {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    profileDeletionFailed = false;
    return true;
  } catch {
    profileDeletionFailed = true;
    setStorageStatus('');
    return false;
  }
}

function restoreProfile() {
  remember.checked = false;
  form.elements.eligible.checked = false;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw === null) return;
    const profile = decodeProfile(raw);
    for (const field of ['age', 'sex', 'height', 'weight', 'activity', 'targetWeight']) form.elements.namedItem(field).value = profile[field] ?? '';
    for (const radio of form.querySelectorAll('[name="goal"]')) radio.checked = radio.value === profile.goal;
    for (const [field, value] of Object.entries(profile.body)) {
      if (field === 'regularTraining') form.elements.regularTraining.checked = value;
      else form.elements.namedItem(field).value = value ?? '';
    }
    updatePlanFields();
    if (Array.from(form.elements.weeklyRate.options).some(option => option.value === profile.weeklyRate && !option.disabled)) form.elements.weeklyRate.value = profile.weeklyRate;
    remember.checked = true;
    setStorageStatus('Запазените данни са възстановени без резултати. Провери измерванията, потвърди допустимостта и анализирай отново.');
  } catch {
    setStorageStatus('Запазените данни не могат да бъдат възстановени или хранилището е недостъпно. Можеш да анализираш без запазване.');
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  invalidateResults();
  const { body, nutrition, errors } = evaluate(readInputs());
  if (body.assessment) renderBodyAssessment(body.assessment);
  if (body.assessment && nutrition && !Object.keys(nutrition.errors).length) {
    if (nutrition.limitation) showLimitation(nutrition.limitation);
    else renderNutrition(nutrition);
  }
  showErrors(errors, !body.assessment);
  if (body.assessment) {
    saveProfile(body, nutrition);
    $('#body-assessment').focus();
  } else if (remember.checked) setStorageStatus('Невалидните данни не са запазени. Коригирай посочените полета и анализирай отново.');
});

form.addEventListener('input', event => {
  if (event.target === remember) return;
  if (['goal', 'weight', 'targetWeight', 'activity', 'sex', 'age', 'height'].includes(event.target.name)) updatePlanFields(event.target.name === 'goal');
  if (Object.keys(displayedErrors).length) {
    const { errors } = evaluate(readInputs());
    showErrors(Object.fromEntries(Object.keys(displayedErrors).filter(field => errors[field]).map(field => [field, errors[field]])));
  }
  invalidateResults();
  if (remember.checked) setStorageStatus('Промените не са запазени. Анализирай отново, за да ги запазиш.');
});

$('#clear-nutrition').addEventListener('click', () => {
  form.elements.activity.value = '';
  for (const radio of form.querySelectorAll('[name="goal"]')) radio.checked = false;
  updatePlanFields(true);
  const errors = calculateBodyAssessment(readInputs()).errors;
  showErrors(Object.fromEntries(Object.keys(displayedErrors).filter(field => errors[field]).map(field => [field, errors[field]])));
  $('#nutrition-result').hidden = true;
  $('#limitation').hidden = true;
  $('#empty-result').hidden = false;
  $('#result-state').textContent = '';
  if (remember.checked) setStorageStatus('Хранителната цел е изчистена само на страницата. Анализирай отново, за да запазиш промяната; измерванията са запазени в полетата.');
});

remember.addEventListener('change', () => {
  if (remember.checked) setStorageStatus('Данните ще се запазят след валиден анализ. Използвай само браузър, на който имаш доверие.');
  else if (removeSavedProfile()) setStorageStatus('Запомнянето е изключено. Запазеният профил е изтрит; текущите полета остават само на страницата.');
});

$('#delete-data').addEventListener('click', () => {
  const profileRemoved = removeSavedProfile();
  let languageRemoved = true;
  try { localStorage.removeItem('liftfuel.language'); } catch { languageRemoved = false; }
  form.reset();
  remember.checked = false;
  form.elements.eligible.checked = false;
  form.elements.regularTraining.checked = false;
  for (const details of document.querySelectorAll('details')) details.open = false;
  updatePlanFields(true);
  showErrors({});
  invalidateResults();
  if (profileRemoved && languageRemoved) setStorageStatus('Запазеният профил и старото езиково предпочитание са изтрити. Данни няма да се запазват без ново съгласие.');
  else if (profileRemoved) setStorageStatus('Профилът е изтрит, но старото езиково предпочитание не можа да бъде изтрито. Изчисти данните за сайта от настройките на браузъра.');
  else setStorageStatus(languageRemoved ? 'Старото езиково предпочитание е изтрито.' : 'Старото езиково предпочитание също не можа да бъде изтрито.');
});

updatePlanFields();
restoreProfile();
invalidateResults();
$('#measurements-details').open = false;
$('#nutrition-details').open = false;
$('#app-status').hidden = true;
$('#result-state').setAttribute('role', 'status');
$('#analyze').textContent = 'Анализирай телосложението ми';
$('#analyze').disabled = false;
