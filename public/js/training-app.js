import { calculateWorkout } from './workout.js?v=workout-1';
import { workoutMedia } from './workout-media.js';
import { readSharedPlan, writeSharedPlan, SHARED_LOCAL_KEY } from './shared-plan.js';
import { buildTrainingNutrition } from './training-nutrition.js';
import { renderDayNutrition } from './day-nutrition-view.js';
import { languageBoundary } from './language.js';

const form = document.querySelector('#workout-form');
const result = document.querySelector('#workout-result');
const equipment = document.querySelector('#workout-equipment');
const errorsPanel = document.querySelector('#workout-errors');
const errorList = document.querySelector('#workout-error-list');
let displayedErrors = {};
const profile = document.querySelector('#workout-profile');
const mediaList = document.querySelector('#workout-media-list');
const mapPanel = document.querySelector('#gym-map');
const mapFrame = document.querySelector('#gym-map-frame');
const mapUrl = 'https://www.google.com/maps?cid=5854447715591440372&output=embed';
const setupFields = ['environment', 'equipment', 'experience', 'days', 'duration', 'currentTraining'];
let shared = null;

function syncShared(restore = false) {
  shared = readSharedPlan();
  document.querySelector('#generate-workout').disabled = !shared;
  const summary = document.querySelector('#shared-profile-summary');
  const status = document.querySelector('#shared-profile-status');
  summary.textContent = '';
  status.hidden = Boolean(shared);
  status.textContent = shared ? '' : 'Първо попълни хранителния план и избери отново активността извън тренировките. Нужен е валиден общ профил, не непременно калориен резултат.';
  if (!shared) return;
  const { age, weight, goal, activity } = shared.profile;
  const goals = { lose: 'Намаляване на теглото', maintain: 'Поддържане', muscle: 'Мускулно развитие', gain: 'Покачване на теглото' };
  const activities = { sedentary: 'Предимно седящо ежедневие', light: 'Лека активност', moderate: 'Умерена активност', very: 'Много ходене или физически труд' };
  summary.textContent = `${age} г. / ${weight} кг / ${goals[goal]} / Активност извън тренировките: ${activities[activity]}`;
  if (!restore || !shared.workoutSetup) return;
  for (const field of setupFields) {
    if (field === 'equipment') {
      for (const control of form.querySelectorAll('[name="equipment"]')) control.checked = shared.workoutSetup.equipment.includes(control.value);
    } else form.elements[field].value = shared.workoutSetup[field];
  }
}

function persistSetup(workoutSetup) {
  const flags = writeSharedPlan({ profile: shared.profile, workoutSetup, remember: shared.remember });
  const warning = document.querySelector('#workout-storage-status');
  warning.hidden = flags.session && (!shared.remember || flags.persistent);
  warning.textContent = warning.hidden ? '' : 'Промяната не е надеждно запазена. Другата страница може да показва стар план; не приемай, че храненето е свързано. Разреши съхранението и генерирай отново.';
  shared = readSharedPlan();
}

function renderMedia(exercises = []) {
  mediaList.replaceChildren();
  document.querySelector('#workout-media-empty').hidden = exercises.length > 0;
  for (const exercise of exercises) {
    const card = document.createElement('section');
    card.className = 'media-card';
    card.dataset.mediaExercise = exercise.id;
    const title = document.createElement('h4');
    title.textContent = exercise.name;
    const cues = document.createElement('ul');
    for (const text of exercise.cues) {
      const cue = document.createElement('li');
      cue.textContent = text;
      cues.append(cue);
    }
    card.append(title, cues);
    const media = workoutMedia[exercise.id];
    const note = document.createElement('p');
    note.textContent = media ? `Източник: ${media.source}. ${media.caveat}` : 'Предстои проверена демонстрация. Следвай текстовите насоки и потърси инструктор; не предлагаме видео за друг вариант.';
    card.append(note);
    if (media) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'media-button';
      button.textContent = `Зареди видео: ${exercise.name}`;
      button.addEventListener('click', languageBoundary(() => {
        const frame = document.createElement('iframe');
        frame.title = `${exercise.name} / ${media.source}`;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.allowFullscreen = true;
        frame.src = `https://www.youtube-nocookie.com/embed/${media.videoId}`;
        button.replaceWith(frame);
      }), { once: true });
      const link = document.createElement('a');
      link.href = `https://www.youtube.com/watch?v=${media.videoId}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `Видео от ${media.source} (нов раздел)`;
      card.append(button, link);
    }
    mediaList.append(card);
  }
}

function invalidatePlan() {
  result.hidden = true;
  document.querySelector('#workout-guidance').hidden = true;
  document.querySelector('#empty-workout').hidden = false;
  for (const selector of ['#workout-title', '#workout-summary', '#training-nutrition-note', '#training-nutrition', '#workout-sessions', '#movement-title', '#movement-items', '#movement-caveat', '#workout-progression', '#workout-warnings']) document.querySelector(selector).replaceChildren();
  renderMedia();
}

function syncMap() {
  const gym = form.elements.environment.value === 'gym';
  mapPanel.hidden = !gym;
  if (!gym) { mapFrame.replaceChildren(); return; }
  if (mapFrame.firstChild) return;
  const frame = document.createElement('iframe');
  frame.title = 'Атлетик Фитнес Марково тепе / примерна зала';
  frame.loading = 'lazy';
  frame.referrerPolicy = 'no-referrer';
  frame.src = mapUrl;
  mapFrame.append(frame);
}

function syncEquipment() {
  const home = form.elements.environment.value === 'home';
  equipment.hidden = !home;
  equipment.disabled = !home;
}

function resetOnEntry(restore = true) {
  syncShared(restore);
  form.elements.eligible.checked = false;
  syncEquipment();
  invalidatePlan();
  profile.open = true;
  mapFrame.replaceChildren();
  syncMap();
  showErrors({});
}

function readSetup() {
  const data = new FormData(form);
  return { ...Object.fromEntries(data), age: String(shared?.profile.age ?? ''), goal: shared?.profile.goal, activity: shared?.profile.activity, equipment: data.getAll('equipment'), eligible: form.elements.eligible.checked };
}

function showErrors(errors, focus = false) {
  displayedErrors = errors;
  for (const control of form.querySelectorAll('[aria-invalid]')) control.removeAttribute('aria-invalid');
  for (const message of form.querySelectorAll('.field-error')) message.hidden = true;
  errorList.replaceChildren();
  for (const [name, message] of Object.entries(errors)) {
    const control = document.querySelector(`#workout-${name}`);
    const feedback = document.querySelector(`#workout-${name}-error`);
    if (control) control.setAttribute('aria-invalid', 'true');
    if (feedback) { feedback.textContent = message; feedback.hidden = false; }
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = control ? `#workout-${name}` : './index.html';
    link.textContent = message;
    if (control) link.addEventListener('click', event => { event.preventDefault(); control.focus(); });
    item.append(link);
    errorList.append(item);
  }
  errorsPanel.hidden = !Object.keys(errors).length;
  if (focus && !errorsPanel.hidden) errorsPanel.focus();
}

function renderList(selector, items) {
  document.querySelector(selector).replaceChildren(...items.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
}

function renderPlan(plan) {
  document.querySelector('#workout-title').textContent = plan.title;
  document.querySelector('#workout-summary').textContent = plan.summary;
  document.querySelector('#workout-sessions').replaceChildren(...plan.sessions.map((session, index) => {
    const card = document.createElement('details');
    card.className = 'workout-session disclosure';
    card.open = index === 0;
    card.addEventListener('toggle', languageBoundary(() => {
      if (!card.isConnected) return;
      if (card.open) {
        for (const other of document.querySelectorAll('.workout-session')) if (other !== card) other.open = false;
        renderMedia(session.exercises);
      } else if (!document.querySelector('.workout-session[open]')) renderMedia();
    }));
    const title = document.createElement('summary');
    title.textContent = `${session.dayLabel} / ${session.title}`;
    const timing = document.createElement('p');
    timing.dataset.sessionMinutes = session.estimatedMinutes;
    timing.textContent = `Около ${Math.ceil(session.estimatedMinutes)} минути: ${session.warmupMinutes} мин загряване, упражнения и ${session.cooldownMinutes} мин спокойно завършване. Не съкращавай необходимата почивка, за да вместиш повече упражнения.`;
    const exercises = document.createElement('ol');
    exercises.className = 'exercise-list';
    for (const exercise of session.exercises) {
      const item = document.createElement('li');
      item.dataset.exercise = exercise.id;
      const heading = document.createElement('h4');
      heading.textContent = exercise.name;
      const prescription = document.createElement('p');
      prescription.className = 'exercise-prescription';
      prescription.textContent = `${exercise.sets} серии по ${exercise.reps} повторения / ${exercise.restSeconds} сек почивка между сериите`;
      const gear = document.createElement('p');
      gear.textContent = `Оборудване: ${exercise.equipment.join(', ')} / подготовка: ${exercise.setupSeconds} сек`;
      const cues = document.createElement('ul');
      cues.className = 'exercise-cues';
      for (const text of exercise.cues) {
        const cue = document.createElement('li');
        cue.textContent = text;
        cues.append(cue);
      }
      const progression = document.createElement('p');
      progression.textContent = `Прогрес: ${exercise.progression}`;
      item.append(heading, prescription, gear, cues, progression);
      exercises.append(item);
    }
    card.append(title, timing, exercises);
    return card;
  }));
  document.querySelector('#movement-title').textContent = plan.movement.title;
  renderList('#movement-items', plan.movement.items);
  document.querySelector('#movement-caveat').textContent = plan.movement.caveat;
  renderList('#workout-progression', plan.progression);
  renderList('#workout-warnings', plan.warnings);
  document.querySelector('#empty-workout').hidden = true;
  result.hidden = false;
  document.querySelector('#workout-guidance').hidden = false;
  renderMedia(plan.sessions[0].exercises);
  profile.open = false;
  result.focus({ preventScroll: true });
  window.scrollTo({ top: window.scrollY + result.getBoundingClientRect().top, behavior: 'instant' });
}

form.addEventListener('submit', languageBoundary(event => {
  event.preventDefault();
  invalidatePlan();
  if (JSON.stringify(readSharedPlan()) !== JSON.stringify(shared)) {
    resetOnEntry();
    const status = document.querySelector('#shared-profile-status');
    status.textContent = 'Общият профил е променен. Провери данните и потвърди отново условията за тренировки.';
    status.hidden = false;
    return;
  }
  if (!shared) return;
  const setup = readSetup();
  const { errors, plan } = calculateWorkout(setup);
  if (!plan) profile.open = true;
  showErrors(errors, true);
  if (!plan) return;
  const source = shared.profile;
  const workoutSetup = Object.fromEntries(setupFields.map(field => [field, setup[field]]));
  persistSetup(workoutSetup);
  const nutrition = buildTrainingNutrition(source, workoutSetup);
  renderDayNutrition(document.querySelector('#training-nutrition'), nutrition);
  document.querySelector('#training-nutrition-note').textContent = nutrition.days.length
    ? 'Прогноза, не измерен разход: консервативна оценка с ниска увереност при 3,5 MET. Без добавка за ходене, загряване, охлаждане или последващо горене (afterburn). На 18 години тренировките са разрешени, но няма оценка за тренировъчния разход.'
    : 'Хранителните ориентири не са налични поради ограниченията на хранителния модел. Не показваме измислени калории. Това не спира валидния тренировъчен план.';
  renderPlan(plan);
  form.elements.eligible.checked = false;
}));

function handleEdit(event) {
  if (event.target.name !== 'eligible' && shared?.workoutSetup) {
    const latest = readSharedPlan();
    if (JSON.stringify(latest) === JSON.stringify(shared)) persistSetup(null);
    else { resetOnEntry(); return; }
  }
  syncEquipment();
  syncMap();
  invalidatePlan();
  if (!Object.keys(displayedErrors).length) return;
  const { errors } = calculateWorkout(readSetup());
  showErrors(Object.fromEntries(Object.keys(displayedErrors).filter(name => errors[name]).map(name => [name, errors[name]])));
}
form.addEventListener('input', languageBoundary(handleEdit));
form.addEventListener('change', languageBoundary(handleEdit));
form.addEventListener('reset', () => queueMicrotask(languageBoundary(() => {
  if (shared?.workoutSetup && JSON.stringify(readSharedPlan()) === JSON.stringify(shared)) persistSetup(null);
  resetOnEntry(false);
})));

window.addEventListener('pageshow', languageBoundary(() => resetOnEntry()));
window.addEventListener('storage', languageBoundary(event => {
  if (![SHARED_LOCAL_KEY, null].includes(event.key) || (shared && !shared.remember)) return;
  resetOnEntry();
}));
resetOnEntry();
document.querySelector('#workout-load-status').hidden = true;
