import { test, expect } from '@playwright/test';

const sessionKey = 'liftfuel.shared.session.v1';
const localKey = 'liftfuel.shared.saved.v1';

for (const action of ['delete', 'revoke']) {
  test(`a pending draft cannot restore remembering after another tab ${action}s consent`, async ({ page, context }) => {
    await nutrition(page, { remember: true });
    await workout(page);
    await page.goto('/index.html');
    await expect(page.locator('#analyze')).toBeEnabled();
    await page.locator('#weight').fill('71');
    await page.goto('/training.html');
    const other = await context.newPage();
    await other.goto('/index.html');
    await expect(other.locator('#analyze')).toBeEnabled();
    if (action === 'delete') await other.locator('#delete-data').click();
    else await other.locator('#remember').uncheck();
    await page.goto('/index.html');
    await expect(page.locator('#weight')).toHaveValue('71');
    await expect(page.locator('#remember')).not.toBeChecked();
    await page.locator('#eligible').check();
    await page.locator('#analyze').click();
    expect(await page.evaluate(key => localStorage.getItem(key), localKey)).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('liftfuel.profile.v1'))).toBeNull();
  });
}

test('one failed invalidation write cannot make a pending profile use stale workout calories', async ({ page }) => {
  await nutrition(page, { remember: true });
  await workout(page);
  await page.goto('/index.html');
  await expect(page.locator('#analyze')).toBeEnabled();
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    let fail = true;
    Storage.prototype.setItem = function (name, value) {
      if (this === sessionStorage && name === key && fail) { fail = false; throw new Error('One transient failure'); }
      return original.call(this, name, value);
    };
  }, sessionKey);
  await page.locator('#weight').fill('71');
  await expect(page.locator('#storage-status')).toContainText('не можа да бъде обезсилен');
  await page.goto('/training.html');
  await expect(page.locator('#workout-load-status')).toBeHidden();
  await expect(page.locator('#generate-workout')).toBeDisabled();
  await expect(page.getByTestId('weekly-nutrition')).toHaveCount(0);
});

async function nutrition(page, { remember = false, weight = '70', age = '30', sex = 'male', height = '180', waistRfm = '80', goal = 'maintain', targetWeight } = {}) {
  await page.goto('/index.html');
  await expect(page.locator('#analyze')).toBeEnabled();
  await page.locator('#sex').selectOption(sex);
  for (const [field, value] of Object.entries({ age, height, weight, waistRfm })) await page.locator(`#${field}`).fill(value);
  await page.locator('#activity').selectOption('sedentary');
  await page.locator(`[name="goal"][value="${goal}"]`).check();
  if (targetWeight) await page.locator('#targetWeight').fill(targetWeight);
  await page.locator('#remember').setChecked(remember);
  await page.locator('#eligible').check();
  await page.locator('#analyze').click();
  await expect(page.locator('#body-assessment')).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key))?.profile.version, sessionKey)).toBe(6);
}

async function workout(page, { days = '3', duration = '30' } = {}) {
  await page.goto('/training.html');
  await expect(page.locator('#generate-workout')).toBeEnabled();
  for (const [field, value] of Object.entries({ environment: 'gym', experience: 'beginner', days, duration, currentTraining: 'none' })) await page.locator(`#workout-${field}`).selectOption(value);
  await page.locator('#workout-eligible').check();
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-result')).toBeVisible();
}

async function rows(page) {
  return page.getByTestId('weekly-nutrition').locator('tbody tr').evaluateAll(nodes => nodes.map(node => ({
    day: node.dataset.day,
    training: node.dataset.training,
    values: Object.fromEntries(Array.from(node.querySelectorAll('[data-day-field]'), cell => [cell.dataset.dayField, Number(cell.textContent.replace(/\s/g, ''))]))
  })));
}

// Read the workload prescribed to the user, not the calculator's energy output.
async function expectedDays(page) {
  const sessions = await page.locator('.workout-session').evaluateAll(nodes => nodes.map(node => ({
    day: node.querySelector('summary').textContent.split(' / ')[0],
    exercises: Array.from(node.querySelectorAll('.exercise-list > li'), item => ({
      prescription: item.querySelector('.exercise-prescription').textContent,
      setup: item.querySelector('p:not(.exercise-prescription)').textContent
    }))
  })));
  const base = (10 * 70 + 6.25 * 180 - 5 * 30 + 5) * 1.2;
  return new Map(sessions.map(session => {
    let lifting = 0;
    let setup = 0;
    for (const exercise of session.exercises) {
      const [, sets, , upper, rest] = exercise.prescription.match(/(\d+) серии по (\d+)-(\d+) повторения \/ (\d+) сек/).map(Number);
      lifting += (4 * upper * sets + (sets - 1) * rest) / 60;
      setup += Number(exercise.setup.match(/подготовка: (\d+) сек/)[1]) / 60;
    }
    const extra = Math.max(0, 70 * 3.5 / 200 * (3.5 * lifting + 1.3 * setup) - base / 1440 * (lifting + setup));
    const intake = base + extra;
    return [session.day, { calories: Math.round(intake / 10) * 10, protein: 140, fat: Math.round(intake * .25 / 9), carbs: Math.round((intake * .75 - 560) / 4), extraCalories: Math.round(extra / 10) * 10 }];
  }));
}

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/(www\.google\.com|www\.youtube-nocookie\.com)\//, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Fixture</title><p>Third party fixture</p>' }));
});

test('nutrition to workout to nutrition shares seven independently checked daily targets automatically', async ({ page }) => {
  await nutrition(page);
  await workout(page);
  const expected = await expectedDays(page);
  const actual = await rows(page);
  expect(actual).toHaveLength(7);
  await expect(page.locator('#workout-result button')).toHaveCount(0);
  await page.locator('.training-link').click();
  await expect(page.getByTestId('weekly-nutrition')).toBeVisible();
  expect(await rows(page)).toEqual(actual);
  await expect(page.locator('#eligible')).not.toBeChecked();
  expect(await page.evaluate(key => localStorage.getItem(key), localKey)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('liftfuel.profile.v1'))).toBeNull();
  for (const day of actual) {
    expect(day.training).toBe(String(expected.has(day.day)));
    expect(day.values).toEqual(expected.get(day.day) ?? { calories: 2020, protein: 140, fat: 56, carbs: 238, extraCalories: 0 });
  }
});

test('editing a workout clears saved credits immediately and regeneration replaces rather than accumulates', async ({ page }) => {
  await nutrition(page);
  await workout(page);
  await page.locator('#workout-profile > summary').click();
  await page.locator('#workout-days').selectOption('2');
  await expect(page.locator('#workout-result')).toBeHidden();
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)).workoutSetup, sessionKey)).toBeNull();
  await page.locator('#workout-eligible').check();
  await page.locator('#generate-workout').click();
  const expected = await expectedDays(page);
  const first = await rows(page);
  expect(first.filter(day => day.training === 'true')).toHaveLength(2);
  await page.locator('#workout-profile > summary').click();
  await page.locator('#workout-eligible').check();
  await page.locator('#generate-workout').click();
  expect(await rows(page)).toEqual(first);
  await page.goto('/index.html');
  await expect(page.getByTestId('weekly-nutrition')).toBeVisible();
  expect(await rows(page)).toEqual(first);
  for (const day of first.filter(day => day.training === 'true')) expect(day.values).toEqual(expected.get(day.day));
});

test('remembered workout restores only six inputs after reload, never eligibility, results or media', async ({ page }) => {
  await nutrition(page, { remember: true });
  await workout(page, { days: '2', duration: '45' });
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), localKey);
  expect(Object.keys(saved.workoutSetup).sort()).toEqual(['currentTraining', 'days', 'duration', 'environment', 'equipment', 'experience']);
  expect(JSON.stringify(saved)).not.toMatch(/eligible|calories|health/);
  await page.reload();
  await expect(page.locator('#generate-workout')).toBeEnabled();
  await expect(page.locator('#workout-days')).toHaveValue('2');
  await expect(page.locator('#workout-duration')).toHaveValue('45');
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
  await expect(page.locator('#workout-result')).toBeHidden();
  await expect(page.locator('#workout-media-list')).toBeEmpty();
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-eligible-error')).toBeVisible();
});

test('nutrition body support limits do not block a valid exercise plan or invent calorie rows', async ({ page }) => {
  await nutrition(page, { weight: '110' });
  await workout(page);
  await expect(page.locator('.workout-session')).toHaveCount(3);
  await expect(page.locator('#training-nutrition-note')).toContainText('ограниченията');
  await expect(page.getByTestId('weekly-nutrition')).toHaveCount(0);
});

test('nutrition changes remove training credits and require a new workout affirmation', async ({ page }) => {
  await nutrition(page);
  await workout(page);
  await page.goto('/index.html');
  await expect(page.locator('#analyze')).toBeEnabled();
  await page.locator('#weight').fill('71');
  await expect(page.getByTestId('weekly-nutrition')).toHaveCount(0);
  await page.goto('/training.html');
  await expect(page.locator('#generate-workout')).toBeDisabled();
  await expect(page.locator('#workout-result')).toBeHidden();
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
});

test('deleting nutrition removes the shared source and prevents stale training generation', async ({ page }) => {
  await nutrition(page, { remember: true });
  await workout(page);
  await page.goto('/index.html');
  await expect(page.locator('#analyze')).toBeEnabled();
  await page.locator('#delete-data').click();
  await page.goto('/training.html');
  await expect(page.locator('#generate-workout')).toBeDisabled();
  expect(await page.evaluate(key => localStorage.getItem(key), localKey)).toBeNull();
  await expect(page.locator('#workout-media-list')).toBeEmpty();
});

test('legacy v5 shared activity is rejected until nutrition activity is reselected', async ({ page }) => {
  await nutrition(page);
  await page.evaluate(key => {
    const saved = JSON.parse(sessionStorage.getItem(key));
    saved.profile.version = 5;
    sessionStorage.setItem(key, JSON.stringify(saved));
    localStorage.setItem('liftfuel.profile.v1', JSON.stringify(saved.profile));
  }, sessionKey);
  await page.goto('/training.html');
  await expect(page.locator('#generate-workout')).toBeDisabled();
  await page.locator('#shared-profile-edit').click();
  await expect(page.locator('#analyze')).toBeEnabled();
  await expect(page.locator('#activity')).toHaveValue('');
  await page.locator('#activity').selectOption('sedentary');
  await page.locator('#eligible').check();
  await page.locator('#analyze').click();
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key))?.profile.version, sessionKey)).toBe(6);
  await page.goto('/training.html');
  await expect(page.locator('#generate-workout')).toBeEnabled();
});

test('submit rechecks the source even when no storage event was received', async ({ page }) => {
  await nutrition(page);
  await workout(page);
  await page.locator('#workout-profile > summary').click();
  await page.locator('#workout-eligible').check();
  await page.evaluate(key => sessionStorage.removeItem(key), sessionKey);
  await page.locator('#generate-workout').click();
  await expect(page.locator('#generate-workout')).toBeDisabled();
  await expect(page.locator('#workout-result')).toBeHidden();
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
});

test('replaced source on submit is displayed but cannot reuse the previous health affirmation', async ({ page }) => {
  await nutrition(page);
  await workout(page);
  await page.locator('#workout-profile > summary').click();
  await page.locator('#workout-eligible').check();
  await page.evaluate(async () => {
    const { readSharedPlan, writeSharedPlan } = await import('/js/shared-plan.js');
    const prior = readSharedPlan();
    writeSharedPlan({ ...prior, profile: { ...prior.profile, weight: 71, targetWeight: 71 }, workoutSetup: null });
  });
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-result')).toBeHidden();
  await expect(page.locator('#shared-profile-summary')).toContainText('71 кг');
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
  await expect(page.locator('#generate-workout')).toBeEnabled();
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-eligible-error')).toBeVisible();
});

test('turning remember off keeps the session setup but subsequent training never writes local data', async ({ page }) => {
  await nutrition(page, { remember: true });
  await workout(page);
  await page.goto('/index.html');
  await expect(page.locator('#analyze')).toBeEnabled();
  await page.locator('#remember').uncheck();
  expect(await page.evaluate(key => localStorage.getItem(key), localKey)).toBeNull();
  await page.goto('/training.html');
  await expect(page.locator('#generate-workout')).toBeEnabled();
  await expect(page.locator('#workout-days')).toHaveValue('3');
  await page.locator('#workout-eligible').check();
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-result')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), localKey)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('liftfuel.profile.v1'))).toBeNull();
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)).remember, sessionKey)).toBe(false);
});

test('another tab deleting remembered nutrition invalidates an already open training plan', async ({ page, context }) => {
  await nutrition(page, { remember: true });
  await workout(page);
  const other = await context.newPage();
  await other.goto('/index.html');
  await expect(other.locator('#analyze')).toBeEnabled();
  await other.locator('#delete-data').click();
  await expect(page.locator('#workout-result')).toBeHidden();
  await expect(page.locator('#generate-workout')).toBeDisabled();
  await expect(page.locator('#workout-media-list')).toBeEmpty();
});

test('another tab replacing remembered nutrition refreshes the source without reviving old credits', async ({ page, context }) => {
  await nutrition(page, { remember: true });
  await workout(page);
  const other = await context.newPage();
  await other.goto('/index.html');
  await expect(other.locator('#analyze')).toBeEnabled();
  await other.locator('#weight').fill('71');
  await expect(page.locator('#workout-result')).toBeVisible();
  await expect(page.locator('#shared-profile-summary')).toContainText('70 кг');
  await other.locator('#eligible').check();
  await other.locator('#analyze').click();
  await expect(page.locator('#generate-workout')).toBeEnabled();
  await expect(page.locator('#shared-profile-summary')).toContainText('71 кг');
  await expect(page.locator('#workout-result')).toBeHidden();
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key) ?? localStorage.getItem('liftfuel.shared.saved.v1')).workoutSetup, sessionKey)).toBeNull();
});

test('storage write failure is visible outside the collapsed form without a linked-plan success claim', async ({ page }) => {
  await nutrition(page);
  await page.goto('/training.html');
  await expect(page.locator('#generate-workout')).toBeEnabled();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('quota'); }; });
  for (const [field, value] of Object.entries({ environment: 'gym', experience: 'beginner', days: '3', duration: '30', currentTraining: 'none' })) await page.locator(`#workout-${field}`).selectOption(value);
  await page.locator('#workout-eligible').check();
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-result')).toBeVisible();
  await expect(page.locator('#workout-profile')).not.toHaveAttribute('open');
  await expect(page.locator('#workout-storage-status')).toBeVisible();
  await expect(page.locator('#workout-storage-status')).toContainText('не е надеждно запазена');
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)).workoutSetup, sessionKey)).toBeNull();
});

test('unchanged nutrition eligibility and resubmission preserve workout inputs and identical totals', async ({ page }) => {
  await nutrition(page, { remember: true });
  await workout(page);
  const original = await rows(page);
  const setup = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)).workoutSetup, sessionKey);
  await page.goto('/index.html');
  await expect(page.locator('#analyze')).toBeEnabled();
  await page.locator('#eligible').check();
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)).workoutSetup, sessionKey)).toEqual(setup);
  await page.locator('#analyze').click();
  await expect(page.getByTestId('weekly-nutrition')).toBeVisible();
  expect(await rows(page)).toEqual(original);
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)).workoutSetup, sessionKey)).toEqual(setup);
  await page.goto('/training.html');
  await expect(page.locator('#generate-workout')).toBeEnabled();
  await expect(page.locator('#workout-days')).toHaveValue('3');
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
});

for (const action of ['delete', 'revoke']) test(`nutrition receiver cannot resurrect remembered inputs after another tab ${action}s them`, async ({ page, context }) => {
  await nutrition(page, { remember: true });
  await workout(page);
  await page.goto('/index.html');
  await expect(page.getByTestId('weekly-nutrition')).toBeVisible();
  const other = await context.newPage();
  await other.goto('/index.html');
  await expect(other.locator('#analyze')).toBeEnabled();
  if (action === 'delete') await other.locator('#delete-data').click();
  else await other.locator('#remember').uncheck();
  await expect(page.locator('#remember')).not.toBeChecked();
  await expect(page.locator('#eligible')).not.toBeChecked();
  await expect(page.getByTestId('weekly-nutrition')).toHaveCount(0);
  await page.locator('#next .training-link').click();
  await expect(page.locator('#generate-workout')).toBeDisabled();
  await expect(page.locator('#workout-result')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), localKey)).toBeNull();
  await page.reload();
  await expect(page.locator('#workout-load-status')).toBeHidden();
  await expect(page.locator('#generate-workout')).toBeDisabled();
});

test('nutrition receiver imports the newest committed profile from another tab before training navigation', async ({ page, context }) => {
  await nutrition(page, { remember: true });
  await workout(page);
  await page.goto('/index.html');
  await expect(page.locator('#analyze')).toBeEnabled();
  const other = await context.newPage();
  await other.goto('/index.html');
  await expect(other.locator('#analyze')).toBeEnabled();
  await other.locator('#weight').fill('71');
  await other.locator('#eligible').check();
  await other.locator('#analyze').click();
  await expect(page.locator('#weight')).toHaveValue('71');
  await expect(page.locator('#remember')).not.toBeChecked();
  await expect(page.locator('#eligible')).not.toBeChecked();
  await page.locator('#next .training-link').click();
  await expect(page.locator('#generate-workout')).toBeEnabled();
  await expect(page.locator('#shared-profile-summary')).toContainText('71 кг');
  await expect(page.locator('#workout-result')).toBeHidden();
  expect(await page.evaluate(async () => (await import('/js/shared-plan.js')).readSharedPlan().workoutSetup)).toBeNull();
});

test('pending remembered nutrition edits survive training navigation and back without restoring older inputs', async ({ page }) => {
  await nutrition(page, { remember: true });
  await workout(page);
  await page.goto('/index.html');
  await expect(page.locator('#analyze')).toBeEnabled();
  await page.locator('#weight').fill('71');
  const saved = await page.evaluate(key => localStorage.getItem(key), localKey);
  expect(JSON.parse(saved).profile.profile.weight).toBe(70);
  await page.locator('#next .training-link').click();
  await expect(page.locator('#workout-load-status')).toBeHidden();
  await expect(page.locator('#generate-workout')).toBeDisabled();
  await page.locator('#shared-profile-edit').click();
  await expect(page.locator('#analyze')).toBeEnabled();
  await expect(page.locator('#weight')).toHaveValue('71');
  await expect(page.locator('#eligible')).not.toBeChecked();
  await expect(page.getByTestId('weekly-nutrition')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), localKey)).toBe(saved);
  await page.reload();
  await expect(page.locator('#analyze')).toBeEnabled();
  await expect(page.locator('#weight')).toHaveValue('71');
});

test('all blocked nutrition paces allow a gym workout without inventing a selected pace or energy targets', async ({ page }) => {
  await nutrition(page, { remember: true, age: '56', sex: 'female', height: '160', weight: '50', waistRfm: '70', goal: 'lose', targetWeight: '49' });
  await workout(page);
  await expect(page.locator('.workout-session')).toHaveCount(3);
  await expect(page.locator('#training-nutrition-note')).toContainText('ограниченията');
  await expect(page.getByTestId('weekly-nutrition')).toHaveCount(0);
  const saved = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), sessionKey);
  expect(saved.profile.profile.weeklyRate).toBe('');
  expect(saved.workoutSetup.environment).toBe('gym');
  await page.reload();
  await expect(page.locator('#generate-workout')).toBeEnabled();
  await expect(page.locator('#workout-environment')).toHaveValue('gym');
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
});

test('failed persistent workout write warns visibly and keeps new inputs tab-only instead of claiming a saved update', async ({ page }) => {
  await nutrition(page, { remember: true });
  await page.goto('/training.html');
  await expect(page.locator('#generate-workout')).toBeEnabled();
  const previous = await page.evaluate(key => localStorage.getItem(key), localKey);
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage) throw new Error('local quota');
      return setItem.call(this, key, value);
    };
  });
  for (const [field, value] of Object.entries({ environment: 'gym', experience: 'beginner', days: '2', duration: '30', currentTraining: 'none' })) await page.locator(`#workout-${field}`).selectOption(value);
  await page.locator('#workout-eligible').check();
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-result')).toBeVisible();
  await expect(page.locator('#workout-storage-status')).toBeVisible();
  await expect(page.locator('#workout-storage-status')).toContainText('не приемай, че храненето е свързано');
  const tab = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), sessionKey);
  expect(tab.remember).toBe(false);
  expect(tab.workoutSetup.days).toBe('2');
  expect(await page.evaluate(key => localStorage.getItem(key), localKey)).toBe(previous);
  const actual = await rows(page);
  await page.goto('/index.html');
  await expect(page.getByTestId('weekly-nutrition')).toBeVisible();
  expect(await rows(page)).toEqual(actual);
  await expect(page.locator('#remember')).not.toBeChecked();
});
