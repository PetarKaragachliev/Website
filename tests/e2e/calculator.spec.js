import { test, expect } from '@playwright/test';

const storageKey = 'liftfuel.profile.v1';

async function enterProfile(page, overrides = {}) {
  const profile = { age: '30', weight: '70', height: '180', sex: 'male', activity: 'moderate', goal: 'maintain', ...overrides };
  await page.getByLabel('Age', { exact: true }).fill(profile.age);
  await page.getByLabel('Weight (kg)', { exact: true }).fill(profile.weight);
  await page.getByLabel('Height (cm)', { exact: true }).fill(profile.height);
  await page.getByLabel('Equation category', { exact: true }).selectOption(profile.sex);
  await page.getByLabel('Daily activity', { exact: true }).selectOption(profile.activity);
  await page.locator(`input[name="goal"][value="${profile.goal}"]`).check();
  if (profile.goal !== 'maintain') {
    await page.getByLabel('Target weight (kg)', { exact: true }).fill(profile.targetWeight ?? (profile.goal === 'lose' ? '65' : '75'));
    if (profile.weeklyRate !== null) await page.getByLabel('Weekly pace', { exact: true }).selectOption(profile.weeklyRate ?? (profile.goal === 'muscle' ? '0.1' : '0.25'));
  }
  await page.locator('#eligible').check();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shared preview clearly identifies unfinished functionality and review', async ({ page }) => {
  await expect(page.getByRole('note')).toContainText('Development preview.');
  await expect(page.getByRole('note')).toContainText('Workout generation and qualified content review are still pending.');
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

test('calculate real displayed nutrition targets without saving by default', async ({ page }) => {
  const externalRequests = [];
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) externalRequests.push(request.url());
  });
  await enterProfile(page);
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#nutrition-result')).toBeVisible();
  await expect(page.getByTestId('calories')).toHaveText('2,604');
  await expect(page.getByTestId('protein')).toHaveText('140');
  await expect(page.getByTestId('fat')).toHaveText('72');
  await expect(page.getByTestId('carbs')).toHaveText('348');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  expect(externalRequests).toEqual([]);
  await expect(page.locator('#remember')).not.toBeChecked();
});

test('failed module loading cannot submit private profile inputs to the server', async ({ page }) => {
  await page.route('**/js/app.js', route => route.abort());
  await page.reload();
  await enterProfile(page);
  const submissions = [];
  page.on('request', request => {
    if (new URL(request.url()).search) submissions.push(request.url());
  });
  await expect(page.getByRole('button', { name: 'Calculate my targets' })).toBeDisabled();
  await page.locator('#weight').press('Enter');
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  expect(submissions).toEqual([]);
  await expect(page.locator('#app-status')).toBeVisible();
});

test('editing one invalid field preserves unrelated error feedback', async ({ page }) => {
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#error-list li')).toHaveCount(7);
  await page.locator('#age').fill('30');
  await expect(page.locator('#weight-error')).toBeVisible();
  await expect(page.locator('#weight')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#error-summary')).toBeVisible();
  await expect(page.locator('#error-list li')).toHaveCount(6);
  await expect(page.locator('#age')).toHaveAccessibleDescription('18-56 years');
});

test('JavaScript-disabled visits cannot submit profile data', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await enterProfile(page);
    await expect(page.getByRole('button', { name: 'Calculate my targets' })).toBeDisabled();
    await page.locator('#weight').press('Enter');
    await expect(page).toHaveURL('http://127.0.0.1:4173/');
    await expect(page.locator('noscript .notice')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('invalid input has a focused, linked error and no nutrition result', async ({ page }) => {
  await enterProfile(page, { weight: '70kg' });
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#error-summary')).toBeFocused();
  await expect(page.locator('#weight')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#weight-error')).toContainText('35-250');
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await page.locator('#error-list a').click();
  await expect(page.locator('#weight')).toBeFocused();
});

test('confirmation is required and revoking it invalidates a result', async ({ page }) => {
  await enterProfile(page);
  await page.locator('#eligible').uncheck();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#eligible-error')).toBeVisible();
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await page.locator('#eligible').check();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#nutrition-result')).toBeVisible();
  await page.locator('#eligible').uncheck();
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

test('underweight users get neutral guidance instead of a prescription', async ({ page }) => {
  await enterProfile(page, { weight: '50', goal: 'gain' });
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#limitation')).toBeVisible();
  await expect(page.locator('#limitation')).toContainText('does not diagnose');
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await expect(page.locator('#error-summary')).toBeHidden();
});

test('editing inputs removes stale results and recalculation uses the changed goal', async ({ page }) => {
  await enterProfile(page);
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.getByTestId('calories')).toHaveText('2,604');
  await page.locator('input[name="goal"][value="muscle"]').check();
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await page.getByLabel('Target weight (kg)', { exact: true }).fill('75');
  await page.getByLabel('Weekly pace', { exact: true }).selectOption('0.1');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.getByTestId('calories')).toHaveText('2,734');
});

test('opt-in saving restores inputs but never eligibility or immediate results', async ({ page }) => {
  await enterProfile(page);
  await page.locator('#remember').check();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#storage-status')).toContainText('Saved on this device');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  expect(Object.keys(saved.profile).sort()).toEqual(['activity', 'age', 'body', 'goal', 'height', 'sex', 'targetWeight', 'weeklyRate', 'weight']);
  expect(saved.profile).not.toHaveProperty('eligible');
  await page.reload();
  await expect(page.locator('#weight')).toHaveValue('70');
  await expect(page.locator('#remember')).toBeChecked();
  await expect(page.locator('#eligible')).not.toBeChecked();
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await page.locator('#eligible').check();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.getByTestId('calories')).toHaveText('2,604');
});

test('delete saved data resets the profile and preserves unrelated storage', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('unrelated-setting', 'keep'));
  await enterProfile(page);
  await page.locator('#remember').check();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await page.getByRole('button', { name: 'Delete my saved data' }).click();
  await expect(page.locator('#weight')).toHaveValue('');
  await expect(page.locator('#nutrition-result')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('unrelated-setting'))).toBe('keep');
  await page.reload();
  await expect(page.locator('#weight')).toHaveValue('');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
});

test('opting out removes saved data while keeping the current inputs', async ({ page }) => {
  await enterProfile(page);
  await page.locator('#remember').check();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await page.locator('#remember').uncheck();
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  await expect(page.locator('#weight')).toHaveValue('70');
  await page.reload();
  await expect(page.locator('#weight')).toHaveValue('');
});

test('malformed saved data is rejected without breaking the calculator', async ({ page }) => {
  await page.evaluate(key => localStorage.setItem(key, '{broken'), storageKey);
  await page.reload();
  await expect(page.locator('#storage-status')).toContainText('could not be restored');
  await expect(page.locator('#weight')).toHaveValue('');
  await enterProfile(page);
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.getByTestId('calories')).toHaveText('2,604');
});

test('unavailable storage does not prevent an unsaved calculation', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  await page.reload();
  await expect(page.locator('#storage-status')).toContainText('unavailable');
  await enterProfile(page);
  await page.locator('#remember').check();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.getByTestId('calories')).toHaveText('2,604');
  await expect(page.locator('#storage-status')).toContainText('not saved');
});

test('saved profiles with invalid field types are not restored', async ({ page }) => {
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, remember: true, profile: { age: 30, weight: 70, height: 180, sex: 'male', activity: ['moderate'], goal: 'maintain' } })), storageKey);
  await page.reload();
  await expect(page.locator('#storage-status')).toContainText('could not be restored');
  await expect(page.locator('#weight')).toHaveValue('');
  await expect(page.locator('#remember')).not.toBeChecked();
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

test('layout reflows at the project viewport and at 320 CSS pixels', async ({ page }) => {
  await enterProfile(page);
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByTestId('calories')).toHaveText('2,604');
});

test('keyboard can activate the calculation and reach its result', async ({ page }) => {
  await enterProfile(page);
  await page.getByRole('button', { name: 'Calculate my targets' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#nutrition-result')).toBeFocused();
  await expect(page.getByTestId('calories')).toHaveText('2,604');
});

test('target weight and selected loss pace change the displayed plan', async ({ page }) => {
  await enterProfile(page, { goal: 'lose', targetWeight: '65', weeklyRate: '0.25' });
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.getByTestId('calories')).toHaveText('2,412');
  await expect(page.getByTestId('target-weight')).toHaveText('65 kg');
  await expect(page.getByTestId('weekly-pace')).toContainText('0.18 kg/week');
  await page.getByLabel('Weekly pace', { exact: true }).selectOption('0.5');
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.getByTestId('calories')).toHaveText('2,219');
  await expect(page.getByTestId('weekly-pace')).toContainText('0.35 kg/week');
});

test('target must agree with the goal direction', async ({ page }) => {
  await enterProfile(page, { goal: 'lose', targetWeight: '75' });
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#targetWeight-error')).toContainText('below your current weight');
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

test('target cannot fall below the supported BMI range', async ({ page }) => {
  await enterProfile(page, { goal: 'lose', targetWeight: '55' });
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#targetWeight-error')).toContainText('BMI support range');
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

test('weekly kg choices scale with current weight and have no unrestricted entry', async ({ page }) => {
  await enterProfile(page, { goal: 'gain' });
  const weekly = page.getByLabel('Weekly pace', { exact: true });
  await expect(weekly.locator('option')).toHaveCount(3);
  await expect(weekly.locator('option[value="0.5"]')).toContainText('0.35 kg/week');
  await page.getByLabel('Weight (kg)', { exact: true }).fill('80');
  await expect(weekly.locator('option[value="0.5"]')).toContainText('0.40 kg/week');
});

test('weekly options requiring an excessive deficit are disabled', async ({ page }) => {
  await enterProfile(page, { age: '56', weight: '95', height: '190', activity: 'sedentary', goal: 'lose', targetWeight: '90' });
  await expect(page.locator('#weeklyRate option[value="0.5"]')).toBeDisabled();
  await expect(page.locator('#weeklyRate option[value="0.25"]')).toBeEnabled();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.getByTestId('calories')).toHaveText('1,974');
});

test('saving preserves target and pace without saving eligibility', async ({ page }) => {
  await enterProfile(page, { goal: 'lose', targetWeight: '65', weeklyRate: '0.5' });
  await page.locator('#remember').check();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await page.reload();
  await expect(page.locator('#targetWeight')).toHaveValue('65');
  await expect(page.locator('#weeklyRate')).toHaveValue('0.5');
  await expect(page.locator('#eligible')).not.toBeChecked();
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await page.locator('#eligible').check();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.getByTestId('calories')).toHaveText('2,219');
});

test('previously saved profiles restore base inputs but do not invent a target or pace', async ({ page }) => {
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, remember: true, profile: { age: 30, weight: 70, height: 180, sex: 'male', activity: 'moderate', goal: 'lose' } })), storageKey);
  await page.reload();
  await expect(page.locator('#weight')).toHaveValue('70');
  await expect(page.locator('#targetWeight')).toHaveValue('');
  await expect(page.locator('#weeklyRate')).toHaveValue('');
  await expect(page.locator('#storage-status')).toContainText('Choose a target weight and weekly pace');
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

test('profiles with no available pace get an actionable calorie-limit explanation', async ({ page }) => {
  await enterProfile(page, { age: '56', sex: 'female', weight: '50', height: '160', activity: 'sedentary', goal: 'lose', targetWeight: '48', weeklyRate: null });
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#limitation')).toBeVisible();
  await expect(page.locator('#limitation')).toContainText('1,500-4,500');
  await expect(page.locator('#error-summary')).toBeHidden();
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

test('missing current weight does not create an unfocusable dependent pace error', async ({ page }) => {
  await enterProfile(page);
  await page.locator('#weight').fill('');
  await page.locator('input[name="goal"][value="lose"]').check();
  await page.locator('#targetWeight').fill('65');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#weeklyRate-error')).toBeHidden();
  await expect(page.locator('#error-list li')).toHaveCount(1);
  await page.locator('#error-list a').click();
  await expect(page.locator('#weight')).toBeFocused();
});

test('nutrient output distinguishes daily references, limits, and unknown intake', async ({ page }) => {
  await enterProfile(page);
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#daily-guidance')).toBeVisible();
  await expect(page.locator('#nutrient-rows tr')).toHaveCount(12);
  await page.getByRole('link', { name: 'Daily nutrients and meal structure' }).click();
  await expect(page.locator('#guidance-title')).toBeInViewport();
  await expect(page.locator('#reference-intro')).toContainText('not measured intake');
  await expect(page.locator('[data-nutrient="fiber"]')).toContainText('36.5 g/day');
  await expect(page.locator('[data-nutrient="saturated-fat"]')).toContainText('Less than about 28.9 g/day');
  await expect(page.locator('[data-nutrient="sodium"]')).toContainText('Less than 2,300 mg/day');
  await expect(page.locator('[data-nutrient="potassium"]')).toContainText('3,400 mg/day');
  await expect(page.locator('[data-nutrient="sugar"], [data-nutrient="monounsaturated-fat"], [data-nutrient="polyunsaturated-fat"], [data-nutrient="trans-fat"]')).toHaveCount(0);
  await expect(page.locator('[data-nutrient="free-sugars"]')).toContainText('32.6 g/day');
  await expect(page.locator('[data-nutrient="cholesterol"]')).toContainText('300 mg/day');
  await expect(page.locator('[data-nutrient="cholesterol"]')).toContainText('FDA Daily Value');
  await expect(page.locator('[data-nutrient="omega-3"]')).toContainText('AI (ALA only)');
  await expect(page.locator('[data-nutrient="omega-3"]')).toContainText('1,600 mg/day');
  await expect(page.locator('[data-nutrient="magnesium"]')).toContainText('400 mg/day');
});

test('optional assessment uses measurements without changing the nutrition goal', async ({ page }) => {
  await enterProfile(page);
  await page.locator('#includeAssessment').check();
  await page.locator('#waistSite').selectOption('midpoint');
  await page.getByLabel('Waist circumference (cm)', { exact: true }).fill('80');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-assessment')).toBeVisible();
  await expect(page.locator('#body-summary')).toContainText('Mid-range weight-for-height');
  await expect(page.locator('#body-bmi')).toHaveText('21.6');
  await expect(page.locator('#body-waist-ratio')).toContainText('0.44');
  await expect(page.getByTestId('calories')).toHaveText('2,604');
  await page.locator('#waist').fill('105');
  await expect(page.locator('#body-assessment')).toBeHidden();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-summary')).toContainText('Raised waist-to-height');
  await expect(page.getByTestId('calories')).toHaveText('2,604');
  await expect(page.locator('input[name="goal"][value="maintain"]')).toBeChecked();
});

test('body assessment can run without choosing a nutrition goal or formula category', async ({ page }) => {
  await page.locator('#age').fill('30');
  await page.locator('#weight').fill('70');
  await page.locator('#height').fill('180');
  await page.locator('#includeAssessment').check();
  await page.locator('#waist').fill('80');
  await page.locator('#eligible').check();
  await page.getByRole('button', { name: 'Assess my measurements' }).click();
  await expect(page.locator('#body-assessment')).toBeFocused();
  await expect(page.locator('#body-summary')).toContainText('Mid-range');
  await expect(page.locator('#error-summary')).toBeHidden();
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await expect(page.locator('#sex')).toHaveValue('');
});

test('underweight profiles can see a body assessment but no automatic calorie targets', async ({ page }) => {
  await enterProfile(page, { weight: '50' });
  await page.locator('#includeAssessment').check();
  await page.locator('#waist').fill('65');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-summary')).toContainText('Lower weight-for-height');
  await expect(page.locator('#limitation')).toBeVisible();
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await expect(page.locator('#daily-guidance')).toBeHidden();
});

test('self-description and existing body-fat estimates stay explicitly self-reported', async ({ page }) => {
  await enterProfile(page);
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.locator('#includeAssessment').check();
  await page.locator('#waist').fill('80');
  await page.locator('#bodyFat').fill('18.5');
  await page.locator('#bodyFatMethod').selectOption('bia');
  await page.locator('#bodyDescription').selectOption('muscular');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-self-description')).toHaveText('Muscular (self-reported)');
  await expect(page.locator('#body-fat-estimate')).toContainText('18.5%');
  await expect(page.locator('#body-fat-estimate')).toContainText('user-provided');
  await expect(page.locator('#body-summary')).not.toContainText('Muscular');
  await expect(page.locator('#body-assessment')).toContainText('do not measure muscle');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
  expect(requests).toEqual([]);
});

test('body assessment still appears when every nutrition pace is unavailable', async ({ page }) => {
  await enterProfile(page, { age: '56', sex: 'female', weight: '50', height: '160', activity: 'sedentary', goal: 'lose', targetWeight: '48', weeklyRate: null });
  await page.locator('#includeAssessment').check();
  await page.locator('#waist').fill('70');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-summary')).toContainText('Mid-range');
  await expect(page.locator('#limitation')).toBeVisible();
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

test('invalid optional measurements have actionable field errors', async ({ page }) => {
  await enterProfile(page);
  await page.locator('#includeAssessment').check();
  await page.locator('#waist').fill('80cm');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#waist-error')).toBeVisible();
  await expect(page.locator('#body-assessment')).toBeHidden();
  await page.locator('#error-list a').click();
  await expect(page.locator('#waist')).toBeFocused();
  await page.locator('#waist').fill('80');
  await page.locator('#bodyFat').fill('20');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#bodyFatMethod-error')).toBeVisible();
});

test('optional measurements restore only with consent and remain hidden until confirmation', async ({ page }) => {
  await enterProfile(page);
  await page.locator('#includeAssessment').check();
  await page.locator('#waist').fill('80');
  await page.locator('#bodyDescription').selectOption('muscular');
  await page.locator('#remember').check();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  expect(saved.version).toBe(4);
  expect(saved.profile.body.waist).toBe(80);
  expect(saved.profile.body.waistSite).toBe('iliac');
  expect(saved.profile.body.bodyDescription).toBe('muscular');
  expect(saved.profile).not.toHaveProperty('eligible');
  await page.reload();
  await expect(page.locator('#includeAssessment')).toBeChecked();
  await expect(page.locator('#waist')).toHaveValue('80');
  await expect(page.locator('#body-assessment')).toBeHidden();
  await expect(page.locator('#eligible')).not.toBeChecked();
  await page.locator('#eligible').check();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-summary')).toContainText('Mid-range');
  await page.locator('#includeAssessment').uncheck();
  await expect(page.locator('#body-assessment')).toBeHidden();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).profile.body, storageKey)).toBeNull();
});

test('version-two profiles restore without inventing optional body measurements', async ({ page }) => {
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 2, remember: true, profile: { age: 30, weight: 70, height: 180, sex: 'male', activity: 'moderate', goal: 'maintain', targetWeight: 70, weeklyRate: '0' } })), storageKey);
  await page.reload();
  await expect(page.locator('#weight')).toHaveValue('70');
  await expect(page.locator('#includeAssessment')).not.toBeChecked();
  await expect(page.locator('#body-assessment')).toBeHidden();
  await page.locator('#eligible').check();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.getByTestId('calories')).toHaveText('2,604');
});

test('body assessment reflows on small screens and clears on eligibility withdrawal', async ({ page }) => {
  await enterProfile(page);
  await page.locator('#includeAssessment').check();
  await page.locator('#waist').fill('80');
  await page.getByRole('button', { name: 'Assess my measurements' }).click();
  await expect(page.locator('#body-assessment')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#eligible').uncheck();
  await expect(page.locator('#body-assessment')).toBeHidden();
});

test('waist and height calculate RFM without entering an existing body-fat percentage', async ({ page }) => {
  await enterProfile(page);
  await page.locator('#includeAssessment').check();
  await expect(page.locator('#waistSite')).toHaveValue('iliac');
  await page.locator('#waist').fill('80');
  await expect(page.locator('#bodyFat')).toHaveValue('');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-fat-calculated')).toHaveText('About 19% (RFM)');
  await expect(page.locator('#body-rfm-note')).toContainText('not a direct measurement');
  await expect(page.locator('#body-fat-estimate')).toContainText('Not provided');
  await expect(page.getByTestId('calories')).toHaveText('2,604');
  await page.locator('#sex').selectOption('female');
  await expect(page.locator('#body-assessment')).toBeHidden();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-fat-calculated')).toHaveText('About 31% (RFM)');
});

test('changing waist protocol requires remeasurement and never applies both models to one waist', async ({ page }) => {
  await enterProfile(page);
  await page.locator('#includeAssessment').check();
  await page.locator('#waist').fill('80');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-fat-calculated')).toContainText('19%');
  await page.locator('#waistSite').selectOption('midpoint');
  await expect(page.locator('#waist')).toHaveValue('');
  await expect(page.locator('#body-assessment')).toBeHidden();
  await expect(page.locator('#waist-hint')).toContainText('midway');
  await page.locator('#waist').fill('80');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-rfm-note')).toContainText('hipbone');
  await expect(page.locator('#body-fat-calculated')).not.toContainText('19%');
  await expect(page.locator('#body-waist-note')).toContainText('No raised waist-ratio');
});

test('adult RFM age boundary does not remove nutrition or the rest of the body assessment', async ({ page }) => {
  await enterProfile(page, { age: '18' });
  await page.locator('#includeAssessment').check();
  await page.locator('#waist').fill('80');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-rfm-note')).toContainText('18-19');
  await expect(page.locator('#body-fat-calculated')).toHaveText('Estimate unavailable');
  await expect(page.locator('#nutrition-result')).toBeVisible();
  await expect(page.locator('#body-bmi')).toHaveText('21.6');
});

test('version-three saved waist is explicitly restored as midpoint, not silently used for RFM', async ({ page }) => {
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 3, remember: true, profile: { age: 30, weight: 70, height: 180, sex: 'male', activity: 'moderate', goal: 'maintain', targetWeight: 70, weeklyRate: '0', body: { waist: 80, bodyFat: null, bodyFatMethod: null, bodyDescription: '' } } })), storageKey);
  await page.reload();
  await expect(page.locator('#waistSite')).toHaveValue('midpoint');
  await expect(page.locator('#waist')).toHaveValue('80');
  await page.locator('#eligible').check();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-rfm-note')).toContainText('hipbone');
  await page.locator('#waistSite').selectOption('iliac');
  await expect(page.locator('#waist')).toHaveValue('');
  await page.locator('#waist').fill('80');
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#body-fat-calculated')).toHaveText('About 19% (RFM)');
});

test('new saved records with an unknown waist protocol are rejected rather than guessed', async ({ page }) => {
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 4, remember: true, profile: { age: 30, weight: 70, height: 180, sex: 'male', activity: 'moderate', goal: 'maintain', targetWeight: 70, weeklyRate: '0', body: { waist: 80, waistSite: 'navel', bodyFat: null, bodyFatMethod: null, bodyDescription: '' } } })), storageKey);
  await page.reload();
  await expect(page.locator('#storage-status')).toContainText('could not be restored');
  await expect(page.locator('#weight')).toHaveValue('');
  await expect(page.locator('#includeAssessment')).not.toBeChecked();
  await expect(page.locator('#body-assessment')).toBeHidden();
});

test('reference values update across age and category boundaries', async ({ page }) => {
  await enterProfile(page, { age: '18', sex: 'female' });
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('[data-nutrient="calcium"]')).toContainText('1,300 mg/day');
  await expect(page.locator('[data-nutrient="iron"]')).toContainText('15 mg/day');
  await expect(page.locator('[data-nutrient="magnesium"]')).toContainText('360 mg/day');
  await page.locator('#age').fill('51');
  await expect(page.locator('#daily-guidance')).toBeHidden();
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('[data-nutrient="calcium"]')).toContainText('1,200 mg/day');
  await expect(page.locator('[data-nutrient="iron"]')).toContainText('8 mg/day');
  await expect(page.locator('[data-nutrient="magnesium"]')).toContainText('320 mg/day');
});

test('meal recommendation is a flexible four-occasion example, not a health requirement', async ({ page }) => {
  await enterProfile(page);
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#meal-count')).toHaveText('4');
  await expect(page.locator('#meal-times li')).toHaveCount(4);
  await expect(page.locator('#meal-times')).toContainText('08:00');
  await expect(page.locator('#meal-times')).toContainText('20:00');
  await expect(page.locator('#meal-summary')).toContainText('651 kcal');
  await expect(page.locator('#meal-summary')).toContainText('35 g protein');
  await expect(page.locator('#meal-spacing-note')).toContainText('not established as healthiest');
  await expect(page.locator('#meal-guidance')).toContainText('Three or four meals can work');
});

test('guidance is hidden without eligibility and for unsupported profiles', async ({ page }) => {
  await expect(page.locator('#daily-guidance')).toBeHidden();
  await enterProfile(page);
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#daily-guidance')).toBeVisible();
  await page.locator('#eligible').uncheck();
  await expect(page.locator('#daily-guidance')).toBeHidden();
  await enterProfile(page, { goal: 'gain', weight: '50', targetWeight: '75' });
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('#limitation')).toBeVisible();
  await expect(page.locator('#daily-guidance')).toBeHidden();
});

test('nutrient and meal estimates refresh with calories without page overflow', async ({ page }) => {
  await enterProfile(page, { goal: 'lose', targetWeight: '65', weeklyRate: '0.5' });
  await page.getByRole('button', { name: 'Calculate my targets' }).click();
  await expect(page.locator('[data-nutrient="fiber"]')).toContainText('31.1 g/day');
  await expect(page.locator('#meal-summary')).toContainText('555 kcal');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#reference-scope')).toContainText('not supplement doses');
});
