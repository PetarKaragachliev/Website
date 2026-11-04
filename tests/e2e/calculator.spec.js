import { test, expect } from '@playwright/test';

const key = 'liftfuel.profile.v1';

async function measurements(page, overrides = {}) {
  const input = { sex: 'male', age: '30', height: '180', weight: '70', waistRfm: '80', ...overrides };
  await page.locator('#sex').selectOption(input.sex);
  for (const field of ['age', 'height', 'weight', 'waistRfm']) await page.locator(`#${field}`).fill(input[field]);
  await page.locator('#eligible').check();
  await nutrition(page);
}

async function nutrition(page, overrides = {}) {
  const input = { activity: 'moderate', goal: 'maintain', ...overrides };
  await page.locator('#activity').selectOption(input.activity);
  await page.locator(`input[name="goal"][value="${input.goal}"]`).check();
  if (input.goal !== 'maintain') {
    await page.locator('#targetWeight').fill(input.targetWeight ?? '65');
    if (input.weeklyRate !== null) await page.locator('#weeklyRate').selectOption(input.weeklyRate ?? '0.25');
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#analyze')).toBeEnabled();
});

test('Bulgarian first screen exposes nutrition controls and calorie/macro placeholders without invented targets', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'bg');
  await expect(page.getByRole('button', { name: 'Изчисли моите резултати' })).toBeEnabled();
  await expect(page.locator('#language')).toHaveCount(0);
  await expect(page.locator('#measurements-details')).not.toHaveAttribute('open');
  await expect(page.locator('details#nutrition-details')).toHaveCount(0);
  await expect(page.locator('#nutrition-details summary')).toHaveCount(0);
  await expect(page.locator('#clear-nutrition')).toHaveCount(0);
  await expect(page.locator('#activity')).toBeVisible();
  await expect(page.locator('#empty-result')).toContainText('Калории');
  await expect(page.locator('#empty-result .macro-list dt')).toHaveText(['Белтъчини', 'Въглехидрати', 'Мазнини']);
  await expect(page.locator('#empty-result .macro-list dd')).toHaveText(['- г / ден', '- г / ден', '- г / ден']);
  await expect(page.locator('#body-assessment')).toBeHidden();
  await expect(page.locator('#remember')).not.toBeChecked();
});

test('original sidebar, input and output columns are restored with the LF hero artwork', async ({ page }) => {
  await page.setViewportSize({ width: 1240, height: 900 });
  await expect(page.locator('.sidebar nav a')).toHaveCount(3);
  await expect(page.locator('.hero-art')).toBeVisible();
  const sidebar = await page.locator('.sidebar').boundingBox();
  const input = await page.locator('.profile-panel').boundingBox();
  const output = await page.locator('#nutrition-panel').boundingBox();
  expect(sidebar.x + sidebar.width).toBeLessThanOrEqual(input.x);
  expect(input.x + input.width).toBeLessThan(output.x);
  expect(input.y).toBe(output.y);
  await page.setViewportSize({ width: 360, height: 800 });
  const mobileInput = await page.locator('.profile-panel').boundingBox();
  const mobileOutput = await page.locator('#nutrition-panel').boundingBox();
  expect(mobileOutput.y).toBeGreaterThan(mobileInput.y + mobileInput.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('one submission calculates nutrition first and adds the body analysis from the same measurements', async ({ page }) => {
  await measurements(page);
  await page.locator('#analyze').click();
  await expect(page.locator('#nutrition-result')).toBeFocused();
  await expect(page.locator('#body-summary')).toContainText('Балансиран');
  await expect(page.locator('#body-bmi')).toHaveText('21,6');
  await expect(page.locator('#body-bmi-category')).toContainText('Нормално тегло');
  await expect(page.locator('#body-fat-calculated')).toHaveText('19,0%');
  await expect(page.locator('#body-fat-mass')).toHaveText('13,3 кг');
  await expect(page.locator('#body-fat-free-mass')).toHaveText('56,7 кг');
  await expect(page.locator('#body-waist-ratio')).toContainText('описателно');
  await expect(page.locator('#nutrition-result')).toBeVisible();
  expect((await page.getByTestId('calories').textContent()).replace(/\s/g, '')).toBe('2604');
  await expect(page.getByTestId('protein')).toHaveText('140');
  await expect(page.locator('#nutrient-rows tr')).toHaveCount(12);
  await expect(page.locator('#empty-result')).toBeHidden();
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
});

test('female formula and masses use the correct coefficient', async ({ page }) => {
  await measurements(page, { sex: 'female' });
  await page.locator('#analyze').click();
  await expect(page.locator('#body-fat-calculated')).toHaveText('31,0%');
  await expect(page.locator('#body-fat-mass')).toHaveText('21,7 кг');
  await expect(page.locator('#body-fat-free-mass')).toHaveText('48,3 кг');
});

test('decimal commas are accepted and rounding happens only in the results', async ({ page }) => {
  await measurements(page, { waistRfm: '80,5' });
  await page.locator('#analyze').click();
  await expect(page.locator('#waistRfm')).toHaveValue('80,5');
  await expect(page.locator('#body-fat-calculated')).toHaveText('19,3%');
  await expect(page.locator('#body-fat-mass')).toHaveText('13,5 кг');
});

test('under-20s see descriptive BMI but no adult weight category or RFM masses', async ({ page }) => {
  await measurements(page, { age: '18' });
  await page.locator('#analyze').click();
  await expect(page.locator('#body-bmi')).toHaveText('21,6');
  await expect(page.locator('#body-bmi-category')).toContainText('под 20');
  await expect(page.locator('#body-fat-calculated')).toContainText('не е налична');
  await expect(page.locator('#body-fat-free-mass')).toContainText('не е налична');
  await expect(page.locator('#body-rfm-note')).toContainText('18-19');
});

test('BMI category uses the unrounded value and edits invalidate the old analysis', async ({ page }) => {
  await measurements(page, { height: '200', weight: '99,9', waistRfm: '90' });
  await page.locator('#analyze').click();
  await expect(page.locator('#body-bmi')).toHaveText('25');
  await expect(page.locator('#body-bmi-category')).toContainText('Нормално');
  await page.locator('#weight').fill('100');
  await expect(page.locator('#body-assessment')).toBeHidden();
  await page.locator('#analyze').click();
  await expect(page.locator('#body-bmi-category')).toContainText('Наднормено');
});

test('possible Skinny Fat is conditional and recommends recomposition rather than automatic loss', async ({ page }) => {
  await measurements(page, { waistRfm: '84' });
  await page.locator('#analyze').click();
  await expect(page.locator('#body-summary')).toContainText('Възможно телосложение тип Skinny Fat');
  await expect(page.locator('#body-explanation')).toContainText('не потвърждава ниска мускулна');
  await expect(page.locator('#body-goal-context')).toContainText('рекомпозиция');
  await expect(page.locator('#body-goal-context')).toContainText('не автоматично отслабване');
  await expect(page.locator('input[name="goal"][value="maintain"]')).toBeChecked();
});

test('age-specific fat reference changes at 40 without changing RFM itself', async ({ page }) => {
  await measurements(page, { age: '39', waistRfm: '84' });
  await page.locator('#analyze').click();
  await expect(page.locator('#body-summary')).toContainText('Skinny Fat');
  const percent = await page.locator('#body-fat-calculated').textContent();
  await page.locator('#age').fill('40');
  await page.locator('#analyze').click();
  await expect(page.locator('#body-summary')).toContainText('Балансиран');
  await expect(page.locator('#body-fat-calculated')).toHaveText(percent);
});

test('potential athletic wording requires reported training and does not confirm muscle mass', async ({ page }) => {
  await measurements(page);
  await page.locator('#regularTraining').check();
  await page.locator('#analyze').click();
  await expect(page.locator('#body-summary')).toContainText('Потенциално атлетично');
  await expect(page.locator('#body-explanation')).toContainText('самооценка');
  await page.locator('#waistRfm').fill('84');
  await page.locator('#analyze').click();
  await expect(page.locator('#body-summary')).toContainText('Skinny Fat');
});

test('the optional midpoint waist changes NICE interpretation, not RFM', async ({ page }) => {
  await measurements(page);
  await page.locator('#measurements-details').evaluate(node => { node.open = true; });
  await page.locator('#waistWhtr').fill('100');
  await page.locator('#analyze').click();
  await expect(page.locator('#body-fat-calculated')).toHaveText('19,0%');
  await expect(page.locator('#body-waist-note')).toContainText('повишен риск');
  await expect(page.locator('#body-summary')).toContainText('повишен показател');
  await page.locator('#waistWhtr').fill('70');
  await page.locator('#analyze').click();
  await expect(page.locator('#body-fat-calculated')).toHaveText('19,0%');
  await expect(page.locator('#body-waist-note')).toContainText('под 0,40');
});

test('optional circumferences produce five descriptive ratios with no muscle-mass claim', async ({ page }) => {
  await measurements(page);
  await page.locator('#measurements-details').evaluate(node => { node.open = true; });
  for (const [id, value] of Object.entries({ waistWhtr: '80', hip: '100', chest: '104', arm: '36', thigh: '54', wrist: '18' })) await page.locator(`#${id}`).fill(value);
  await page.locator('#analyze').click();
  await expect(page.locator('#body-proportions dt')).toHaveCount(5);
  await expect(page.locator('#body-proportions dd').nth(0)).toContainText('0,80');
  await expect(page.locator('#body-proportions dd').nth(1)).toContainText('1,30');
  await expect(page.locator('#body-proportions dd').nth(2)).toContainText('0,20');
  await expect(page.locator('#proportion-note')).toContainText('описателни');
});

test('RFM waist is not substituted for missing midpoint waist in additional proportions', async ({ page }) => {
  await measurements(page);
  await page.locator('#measurements-details').evaluate(node => { node.open = true; });
  await page.locator('#hip').fill('100');
  await page.locator('#chest').fill('104');
  await page.locator('#analyze').click();
  await expect(page.locator('#body-proportions dt')).toHaveCount(0);
  await expect(page.locator('#proportion-note')).toContainText('добавете талия');
  await expect(page.locator('#body-waist-ratio')).toContainText('не по NICE');
});

test('invalid required measurements show focused, linked errors without results', async ({ page }) => {
  await measurements(page, { waistRfm: '80cm' });
  await page.locator('#analyze').click();
  await expect(page.locator('#error-summary')).toBeFocused();
  await expect(page.locator('#waistRfm')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#body-assessment')).toBeHidden();
  await page.locator('#error-list a[href="#waistRfm"]').click();
  await expect(page.locator('#waistRfm')).toBeFocused();
});

test('implausible RFM has warnings and missing masses rather than fabricated values', async ({ page }) => {
  await measurements(page, { height: '230', weight: '120', waistRfm: '35' });
  await page.locator('#analyze').click();
  await expect(page.locator('#body-summary')).toContainText('Недостатъчна информация');
  await expect(page.locator('#body-rfm-note')).toContainText('3-60%');
  await expect(page.locator('#body-fat-mass')).toContainText('не е налична');
});

test('correcting one field preserves errors on other fields', async ({ page }) => {
  await page.locator('#analyze').click();
  await expect(page.locator('#error-list li')).toHaveCount(8);
  await page.locator('#age').fill('30');
  await expect(page.locator('#age-error')).toBeHidden();
  await expect(page.locator('#waistRfm-error')).toBeVisible();
  await expect(page.locator('#error-list li')).toHaveCount(7);
});

test('all additional nutrients are vertical after fats in the right panel', async ({ page }) => {
  await measurements(page);
  await nutrition(page);
  await page.locator('#analyze').click();
  expect((await page.getByTestId('calories').textContent()).replace(/\s/g, '')).toBe('2604');
  await expect(page.getByTestId('protein')).toHaveText('140');
  await expect(page.getByTestId('carbs')).toHaveText('348');
  await expect(page.getByTestId('fat')).toHaveText('72');
  await expect(page.locator('#nutrition-panel #nutrient-rows tr')).toHaveCount(12);
  await expect(page.locator('#empty-result')).toBeHidden();
  await expect(page.locator('[data-nutrient="fiber"]')).toContainText('Фибри / хранителни влакнини');
  await expect(page.locator('[data-nutrient="free-sugars"]')).toContainText('32,6');
  await expect(page.locator('[data-nutrient="cholesterol"]')).toContainText('FDA');
  const ordered = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#nutrient-rows tr')];
    const positions = rows.map(row => row.getBoundingClientRect().top);
    return document.querySelector('[data-testid="fat"]').getBoundingClientRect().bottom <= positions[0] && positions.every((top, index) => index === 0 || top > positions[index - 1]);
  });
  expect(ordered).toBe(true);
  await expect(page.locator('#reference-intro')).toContainText('не измерен прием');
});

test('manual nutrition pace retains exact percent labels and does not override body recommendations', async ({ page }) => {
  await measurements(page);
  await nutrition(page, { goal: 'lose', targetWeight: '65', weeklyRate: '0.25' });
  await expect(page.locator('#weeklyRate option[value="0.25"]')).toContainText('0,25%');
  await page.locator('#analyze').click();
  expect((await page.getByTestId('calories').textContent()).replace(/\s/g, '')).toBe('2412');
  await expect(page.locator('#body-fat-calculated')).toHaveText('19,0%');
  await expect(page.locator('input[name="goal"][value="lose"]')).toBeChecked();
});

test('all-disabled nutrition pace shows a limit while valid body analysis still appears', async ({ page }) => {
  await measurements(page, { sex: 'female', age: '56', height: '160', weight: '50', waistRfm: '70' });
  await nutrition(page, { activity: 'sedentary', goal: 'lose', targetWeight: '48', weeklyRate: null });
  await page.locator('#analyze').click();
  await expect(page.locator('#body-assessment')).toBeVisible();
  await expect(page.locator('#limitation')).toBeVisible();
  await expect(page.locator('#limitation-detail')).toContainText('1500-4500');
  await expect(page.locator('#weeklyRate-error')).toBeHidden();
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

test('missing nutrition goal prompts a focused error instead of silently choosing a diet', async ({ page }) => {
  await measurements(page);
  await page.locator('#remember').check();
  await page.locator('input[name="goal"]:checked').evaluate(node => { node.checked = false; node.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#analyze').click();
  await expect(page.locator('#body-assessment')).toBeVisible();
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await expect(page.locator('#goal-error')).toBeVisible();
  await expect(page.locator('#error-summary')).toBeFocused();
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
});

test('activity and goal are required for the shared calculation and correcting them reuses entered measurements', async ({ page }) => {
  await measurements(page);
  await page.locator('#activity').selectOption('');
  await page.locator('input[name="goal"]:checked').evaluate(node => { node.checked = false; node.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#analyze').click();
  await expect(page.locator('#weight')).toHaveValue('70');
  await expect(page.locator('#waistRfm')).toHaveValue('80');
  await expect(page.locator('input[name="goal"]:checked')).toHaveCount(0);
  await expect(page.locator('#activity')).toHaveValue('');
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await expect(page.locator('#activity-error')).toBeVisible();
  await expect(page.locator('#goal-error')).toBeVisible();
  await nutrition(page);
  await page.locator('#analyze').click();
  await expect(page.locator('#error-summary')).toBeHidden();
  await expect(page.locator('#body-fat-calculated')).toHaveText('19,0%');
  await expect(page.locator('#nutrition-result')).toBeVisible();
});

test('eligibility withdrawal invalidates both panels and prevents new results', async ({ page }) => {
  await measurements(page);
  await nutrition(page);
  await page.locator('#analyze').click();
  await page.locator('#eligible').uncheck();
  await expect(page.locator('#body-assessment')).toBeHidden();
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await page.locator('#analyze').click();
  await expect(page.locator('#eligible-error')).toBeVisible();
});

test('combined calculation saves shared inputs, not eligibility or prior results', async ({ page }) => {
  await measurements(page);
  await page.locator('#remember').check();
  await page.locator('#analyze').click();
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
  expect(saved.version).toBe(5);
  expect(saved.profile.body.waistRfm).toBe(80);
  expect(saved.profile.body.waistWhtr).toBeNull();
  expect(saved.profile.goal).toBe('maintain');
  expect(saved.profile).not.toHaveProperty('eligible');
  expect(saved).not.toHaveProperty('assessment');
  await page.reload();
  await expect(page.locator('#waistRfm')).toHaveValue('80');
  await expect(page.locator('#eligible')).not.toBeChecked();
  await expect(page.locator('#body-assessment')).toBeHidden();
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

for (const [site, rfm, midpoint] of [['iliac', '80', ''], ['midpoint', '', '80']]) {
  test(`legacy ${site} waist restores only its original measurement`, async ({ page }) => {
    await page.evaluate(({ key, site }) => localStorage.setItem(key, JSON.stringify({ version: 4, remember: true, profile: { age: 30, sex: 'male', height: 180, weight: 70, activity: 'moderate', goal: 'maintain', targetWeight: 70, weeklyRate: '0', body: { waist: 80, waistSite: site, bodyDescription: 'muscular' } } })), { key, site });
    await page.reload();
    await expect(page.locator('#waistRfm')).toHaveValue(rfm);
    await expect(page.locator('#waistWhtr')).toHaveValue(midpoint);
    await expect(page.locator('#regularTraining')).not.toBeChecked();
    await expect(page.locator('#body-assessment')).toBeHidden();
  });
}

test('malformed storage is not restored and does not stop unsaved analysis', async ({ page }) => {
  await page.evaluate(k => localStorage.setItem(k, '{broken'), key);
  await page.reload();
  await expect(page.locator('#storage-status')).toContainText('не могат да бъдат възстановени');
  await expect(page.locator('#weight')).toHaveValue('');
  await measurements(page);
  await page.locator('#analyze').click();
  await expect(page.locator('#body-assessment')).toBeVisible();
});

test('unavailable storage leaves unsaved analysis functional', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Blocked'); };
  });
  await page.reload();
  await measurements(page);
  await page.locator('#remember').check();
  await page.locator('#analyze').click();
  await expect(page.locator('#body-fat-calculated')).toHaveText('19,0%');
  await expect(page.locator('#storage-status')).toContainText('не са запазени');
});

test('delete resets inputs and app-owned storage without deleting unrelated data', async ({ page }) => {
  await page.evaluate(() => { localStorage.setItem('unrelated', 'keep'); localStorage.setItem('liftfuel.language', 'en'); });
  await measurements(page);
  await page.locator('#remember').check();
  await page.locator('#analyze').click();
  await page.locator('#delete-data').click();
  await expect(page.locator('#weight')).toHaveValue('');
  await expect(page.locator('#body-assessment')).toBeHidden();
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('liftfuel.language'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
});

test('failed deletion explicitly warns that saved health data remains', async ({ page }) => {
  await measurements(page);
  await page.locator('#remember').check();
  await page.locator('#analyze').click();
  await page.evaluate(() => { Storage.prototype.removeItem = () => { throw new Error('Blocked'); }; });
  await page.locator('#delete-data').click();
  await expect(page.locator('#storage-status')).toContainText('Запазеният профил не можа да бъде изтрит');
  expect(await page.evaluate(k => localStorage.getItem(k), key)).not.toBeNull();
});

test('a cached previous unversioned entry point cannot disable the current form', async ({ page }) => {
  await page.route('**/js/app.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: "document.querySelector('#clear-nutrition').addEventListener('click', () => {});"
  }));
  await page.reload();
  await expect(page.locator('#analyze')).toBeEnabled();
  await measurements(page);
  await page.locator('#analyze').click();
  expect((await page.getByTestId('calories').textContent()).replace(/\s/g, '')).toBe('2604');
  await expect(page.locator('#body-fat-calculated')).toHaveText('19,0%');
});

for (const failure of ['network', 'initialization']) {
  test(`${failure} startup failure explains the disabled button without exposing profile data`, async ({ page }) => {
    await page.route('**/js/app.js*', route => failure === 'network'
      ? route.abort()
      : route.fulfill({ contentType: 'text/javascript', body: 'throw new Error("Startup failure");' }));
    await page.reload();
    await expect(page.locator('#app-status')).toContainText('Неуспешно зареждане');
    await expect(page.locator('#reload-app')).toBeVisible();
    await expect(page.locator('#analyze')).toBeDisabled();
    await measurements(page);
    await page.locator('#waistRfm').press('Enter');
    await expect(page).toHaveURL('http://127.0.0.1:4173/');
    await page.unroute('**/js/app.js*');
    await page.locator('#reload-app').click();
    await expect(page.locator('#analyze')).toBeEnabled();
    await expect(page.locator('#app-status')).toBeHidden();
  });
}

for (const mode of ['blocked-module', 'disabled-javascript']) {
  test(`${mode} cannot submit private measurements through a native form request`, async ({ page, browser }) => {
    let context;
    if (mode === 'blocked-module') {
      await page.route('**/js/app.js*', route => route.abort());
      await page.reload();
    } else {
      context = await browser.newContext({ javaScriptEnabled: false });
      page = await context.newPage();
      await page.goto('http://127.0.0.1:4173/');
    }
    try {
      await measurements(page);
      await expect(page.locator('#analyze')).toBeDisabled();
      await page.locator('#waistRfm').press('Enter');
      await expect(page).toHaveURL('http://127.0.0.1:4173/');
    } finally { if (context) await context.close(); }
  });
}

test('complete layout reflows at 320px and optional readings cause no remote requests', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await measurements(page);
  await nutrition(page);
  await page.locator('#analyze').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.addStyleTag({ content: ':root { --body: Arial, sans-serif; } .brand { font-family: Arial, sans-serif; }' });
  const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(node => {
    const box = node.getBoundingClientRect();
    return box.width > 0 && box.right > innerWidth;
  }).map(node => ({ tag: node.tagName, id: node.id, className: node.className })));
  expect(overflow).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(requests).toEqual([]);
});

test('training action opens its separate page in the same tab without health data in the URL', async ({ page, context }) => {
  await measurements(page);
  await page.locator('#analyze').click();
  await page.locator('#training-link').click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/training.html');
  expect(context.pages()).toHaveLength(1);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bg');
  await expect(page.locator('main')).toContainText('все още не създава тренировъчна програма');
  await page.getByRole('link', { name: 'Обратно към анализа', exact: true }).click();
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator('#analyze')).toBeEnabled();
});
