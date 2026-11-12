import { test, expect } from '@playwright/test';

async function setup(page, overrides = {}) {
  const input = { age: '30', environment: 'gym', experience: 'beginner', days: '3', duration: '30', activity: 'sedentary', currentTraining: 'none', goal: 'maintain', ...overrides };
  if (overrides.activity || overrides.goal || overrides.age) {
    await page.evaluate(async input => {
      const { readSharedPlan, writeSharedPlan } = await import('/js/shared-plan.js');
      const shared = readSharedPlan();
      writeSharedPlan({ ...shared, profile: { ...shared.profile, age: Number(input.age), activity: input.activity, goal: input.goal, targetWeight: input.goal === 'lose' ? 65 : 70, weeklyRate: input.goal === 'lose' ? '0.25' : '0' }, workoutSetup: null });
      window.dispatchEvent(new PageTransitionEvent('pageshow'));
    }, input);
  }
  for (const field of ['environment', 'experience', 'days', 'duration', 'currentTraining']) {
    await page.locator(`#workout-${field}`).selectOption(input[field]);
  }
  await page.locator('#workout-eligible').check();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('training-fixture-seeded')) return;
    sessionStorage.setItem('training-fixture-seeded', 'true');
    sessionStorage.setItem('liftfuel.shared.session.v1', JSON.stringify({ version: 1, remember: false, workoutSetup: null, profile: { version: 6, remember: true, profile: { age: 30, sex: 'male', height: 180, weight: 70, activity: 'sedentary', goal: 'maintain', targetWeight: 70, weeklyRate: '0', body: { waistRfm: 80, waistWhtr: null, hip: null, chest: null, arm: null, thigh: null, wrist: null, regularTraining: false } } } }));
  });
  await page.route(/https:\/\/(www\.google\.com|www\.youtube-nocookie\.com)\//, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Fixture</title><p>Third party fixture</p>' }));
  await page.goto('/training.html');
  await expect(page.locator('#generate-workout')).toBeEnabled();
});

test('training uses shared inputs without touching legacy storage or saving locally without consent', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('liftfuel.profile.v1', 'existing-private-profile'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bg');
  await expect(page.locator('#generate-workout')).toBeEnabled();
  await expect(page.locator('#workout-age, #workout-goal, #workout-activity')).toHaveCount(0);
  await expect(page.locator('#shared-profile-summary')).toContainText('70');
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
  await expect(page.locator('#workout-result')).toBeHidden();
  await setup(page);
  await page.locator('#generate-workout').click();
  expect(await page.evaluate(() => Object.entries(localStorage))).toEqual([['liftfuel.profile.v1', 'existing-private-profile']]);
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('liftfuel.shared.session.v1')));
  expect(saved.workoutSetup.days).toBe('3');
  expect(saved.workoutSetup.eligible).toBeUndefined();
});

test('standalone training requires a current shared nutrition profile', async ({ page }) => {
  await page.evaluate(() => sessionStorage.removeItem('liftfuel.shared.session.v1'));
  await page.reload();
  await expect(page.locator('#generate-workout')).toBeDisabled();
  await expect(page.locator('#shared-profile-status')).toContainText('хранителния');
  await expect(page.locator('#shared-profile-edit')).toHaveAttribute('href', './index.html');
});

test('one gym submission renders schedule, exercise instructions, progression and separate movement guidance', async ({ page }) => {
  await expect(page.locator('#generate-workout')).toBeEnabled();
  const requests = [];
  await setup(page);
  await page.locator('#gym-map iframe').scrollIntoViewIfNeeded();
  await expect(page.frameLocator('#gym-map iframe').locator('p')).toHaveText('Third party fixture');
  page.on('request', request => requests.push(request.url()));
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-result')).toBeFocused();
  await expect(page.locator('.workout-session')).toHaveCount(3);
  await expect(page.locator('.workout-session').first()).toContainText('Понеделник');
  await expect(page.locator('.workout-session').first()).toContainText('Лег преса');
  await expect(page.locator('.workout-session').first()).toContainText('8-10');
  await expect(page.locator('.workout-session').first()).toContainText('90 сек');
  await expect(page.locator('.exercise-cues').first()).not.toBeEmpty();
  await expect(page.locator('#workout-progression li')).toHaveCount(4);
  await expect(page.locator('#movement-items')).toContainText('5-10');
  await expect(page.locator('#workout-warnings')).toContainText('не са клинично валидирани');
  expect(requests).toEqual([]);
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
});

test('home band plan uses declared gear and never invents gym machines', async ({ page }) => {
  await setup(page, { environment: 'home' });
  await page.locator('input[name="equipment"][value="bands"]').check();
  await page.locator('#generate-workout').click();
  await expect(page.locator('.workout-session')).toHaveCount(3);
  await expect(page.locator('#workout-sessions')).toContainText('Гребане с ластик');
  await expect(page.locator('#workout-sessions')).not.toContainText('Лег преса');
  await expect(page.locator('#workout-sessions')).not.toContainText('Дъмбели');
});

test('unsupported home pulling equipment gives a focused linked error instead of a fake complete plan', async ({ page }) => {
  await setup(page, { environment: 'home' });
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-errors')).toBeFocused();
  await expect(page.locator('#workout-equipment-error')).toContainText('дърпане');
  await expect(page.locator('#workout-result')).toBeHidden();
  await page.locator('#workout-error-list a[href="#workout-equipment"]').click();
  await expect(page.locator('#workout-equipment')).toBeFocused();
});

test('very active worker with existing training receives recovery guidance not automatic extra cardio', async ({ page }) => {
  await setup(page, { activity: 'very', currentTraining: 'three-plus', goal: 'lose' });
  await page.locator('#generate-workout').click();
  await expect(page.locator('#movement-items')).toContainText('не добавяй задължително');
  await expect(page.locator('#movement-items')).toContainText('заменя');
  await expect(page.locator('#movement-items')).not.toContainText('10 000');
  await expect(page.locator('#workout-result')).toBeVisible();
});

test('five days includes a lighter fifth session and fits the requested time budget at 320px', async ({ page }) => {
  await setup(page, { experience: 'advanced', days: '5' });
  await page.locator('#generate-workout').click();
  await expect(page.locator('.workout-session')).toHaveCount(5);
  await expect(page.locator('.workout-session').last()).toContainText('Лека техника');
  const minutes = await page.locator('[data-session-minutes]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.sessionMinutes)));
  expect(minutes.every(value => value <= 30 && value > 0)).toBe(true);
  expect(minutes[4]).toBeLessThan(minutes[0]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('edits invalidate the previous plan and eligibility must be confirmed for each generation', async ({ page }) => {
  await setup(page);
  await page.locator('#generate-workout').click();
  await page.locator('#workout-profile > summary').click();
  await page.locator('#workout-days').selectOption('2');
  await expect(page.locator('#workout-result')).toBeHidden();
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-eligible-error')).toBeVisible();
  await page.locator('#workout-eligible').check();
  await page.locator('#generate-workout').click();
  await expect(page.locator('.workout-session')).toHaveCount(2);
});

test('browser-restored home setup synchronizes equipment and cannot restore eligibility', async ({ page }) => {
  await page.route('**/js/training-app.js*', async route => {
    const response = await route.fetch();
    const restored = "document.querySelector('#workout-environment').value='home'; document.querySelector('#workout-eligible').checked=true;";
    await route.fulfill({ response, body: restored + await response.text() });
  });
  await page.reload();
  await expect(page.locator('#generate-workout')).toBeEnabled();
  await expect(page.locator('#workout-equipment')).toBeVisible();
  await expect(page.locator('#workout-equipment')).toBeEnabled();
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
});

test('history restoration hides the old plan and requires fresh eligibility', async ({ page }) => {
  await setup(page);
  await page.locator('#generate-workout').click();
  await page.locator('#workout-eligible').evaluate(node => { node.checked = true; });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
  await expect(page.locator('#workout-result')).toBeHidden();
});

test('age 18 permits exercises while withholding training energy estimates', async ({ page }) => {
  await setup(page, { age: '18' });
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-result')).toBeVisible();
  await expect(page.locator('#training-nutrition')).toContainText('18');
  await expect(page.locator('[data-training="true"] [data-day-field="calories"]').first()).not.toHaveText(/\d/);
  await expect(page.locator('input[name="weight"], input[name="sex"], input[name="waistRfm"]')).toHaveCount(0);
});

test('failed workout module keeps private setup out of native form requests and offers retry', async ({ page }) => {
  await page.route('**/js/training-app.js*', route => route.abort());
  await page.reload();
  await expect(page.locator('#workout-load-status')).toContainText('Неуспешно зареждане');
  await setup(page);
  await expect(page.locator('#generate-workout')).toBeDisabled();
  await page.locator('#workout-eligible').press('Enter');
  await expect(page).toHaveURL('http://127.0.0.1:4173/training.html');
  await page.unroute('**/js/training-app.js*');
  await page.locator('#reload-workout').click();
  await expect(page.locator('#generate-workout')).toBeEnabled();
});

test('disabled JavaScript cannot submit workout setup to the server', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/training.html');
    await setup(page);
    await expect(page.locator('#generate-workout')).toBeDisabled();
    await page.locator('#workout-eligible').press('Enter');
    await expect(page).toHaveURL('http://127.0.0.1:4173/training.html');
  } finally { await context.close(); }
});

test('expanded home controls preserve original choices, clarify bench and keep only two nav anchors', async ({ page }) => {
  await setup(page, { environment: 'home' });
  await expect(page.locator('nav[aria-label="Основна навигация"] a')).toHaveCount(2);
  await expect(page.locator('nav a').nth(0)).toContainText('01');
  await expect(page.locator('nav a').nth(1)).toContainText('02');
  await expect(page.locator('#training-method summary')).toHaveText('Методика и ограничения');
  await expect(page.locator('nav a').nth(0)).toContainText('Хранителен режим');
  await expect(page.getByLabel('Тренировъчна лежанка или пейка', { exact: true })).toHaveCount(1);
  await expect(page.locator('input[name="equipment"][value="bench"]')).toHaveCount(1);
  await expect(page.locator('#workout-extra-equipment')).toHaveCount(0);
  await expect(page.locator('#workout-equipment input[name="equipment"]')).toHaveCount(9);
  await expect(page.locator('input[value$="-ready"], input[value="rack-safe"]')).toHaveCount(0);
  for (const label of ['Тренировъчни ластици', 'Лост за набирания', 'Щанга и тежести', 'Успоредка за кофички', 'Пудовка', 'Стойка за клекове', 'Комбиниран фитнес уред']) await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const [title, equipment, ids] of [
  ['barbell rows and hinge', ['barbell'], ['squat', 'barbell-hinge', 'wall-pushup', 'barbell-row']],
  ['controlled kettlebell', ['kettlebell'], ['kb-squat', 'kb-hinge', 'wall-pushup', 'kb-row']],
  ['bench with dumbbells', ['dumbbells', 'bench'], ['squat', 'db-hinge', 'bench-press', 'db-row']],
  ['controlled row from rack', ['barbell', 'rack'], ['squat', 'barbell-hinge', 'wall-pushup', 'rack-row']],
  ['dip station without assumed dips', ['bands', 'dips'], ['squat', 'bridge', 'wall-pushup', 'band-row']],
  ['multi gym stations', ['multigym'], ['squat', 'bridge', 'multi-press', 'multi-row']]
]) test(`home ${title} renders the real selected route and setup time`, async ({ page }) => {
  await setup(page, { environment: 'home', experience: 'advanced', days: '5' });
  for (const value of equipment) await page.locator(`input[name="equipment"][value="${value}"]`).check();
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-result')).toBeVisible();
  const first = page.locator('.workout-session').first();
  expect(await first.locator('[data-exercise]').evaluateAll(nodes => nodes.slice(0, 2).map(node => node.dataset.exercise))).toEqual(ids.slice(2));
  expect(await page.locator('.workout-session').nth(1).locator('[data-exercise]').evaluateAll(nodes => nodes.slice(0, 2).map(node => node.dataset.exercise))).toEqual(ids.slice(0, 2));
  expect(await page.locator('.workout-session').last().locator('[data-exercise]').evaluateAll(nodes => nodes.map(node => node.dataset.exercise))).toEqual(ids);
  await expect(first).toContainText('подготовка:');
  const minutes = await page.locator('[data-session-minutes]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.sessionMinutes)));
  expect(minutes).toHaveLength(5);
  expect(minutes.every(value => value > 0 && value <= 30)).toBe(true);
  await expect(page.locator('.workout-session').last()).toContainText('Лека техника');
  await expect(page.locator('#workout-sessions')).not.toContainText('Лег преса');
});

test('dip bars enable a supported calf accessory when time permits, without hanging or dips', async ({ page }) => {
  await setup(page, { environment: 'home', duration: '60' });
  for (const value of ['bands', 'dips']) await page.locator(`input[value="${value}"]`).check();
  await page.locator('#generate-workout').click();
  const calf = page.locator('.workout-session').first().locator('[data-exercise="supported-calf"]');
  await expect(calf).toBeVisible();
  await expect(calf).toContainText('Успоредка за кофички');
  await expect(calf).toContainText('лек допир');
  await expect(calf).toContainText('равен нехлъзгав под');
  await expect(calf).toContainText('без висене');
  await expect(page.locator('[data-exercise="calf"], [data-exercise="dips"]')).toHaveCount(0);
  await page.locator('#workout-profile > summary').click();
  await page.locator('input[value="dips"]').uncheck();
  await page.locator('#workout-eligible').check();
  await page.locator('#generate-workout').click();
  await expect(page.locator('.workout-session').first().locator('[data-exercise="calf"]')).toBeVisible();
  await expect(page.locator('[data-exercise="supported-calf"]')).toHaveCount(0);
});

test('advanced experience never enables rack squat or dips and station limits remain visible', async ({ page }) => {
  await setup(page, { environment: 'home', experience: 'advanced' });
  for (const value of ['barbell', 'rack', 'dips', 'multigym']) await page.locator(`input[value="${value}"]`).check();
  await page.locator('#generate-workout').click();
  const first = page.locator('.workout-session').first();
  await expect(first.locator('[data-exercise="squat"]')).toBeVisible();
  await expect(first.locator('[data-exercise="multi-press"]')).toBeVisible();
  await expect(page.locator('[data-exercise="barbell-squat"], [data-exercise="dips"]')).toHaveCount(0);
  await expect(page.locator('#workout-warnings')).toContainText('не означава усвоени кофички');
  await expect(page.locator('#workout-warnings')).toContainText('използваеми станции');
});

test('multi gym gives conditional station guidance and removing it invalidates the plan', async ({ page }) => {
  await setup(page, { environment: 'home' });
  const multi = page.locator('input[value="multigym"]');
  await multi.check();
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-result')).toBeVisible();
  await expect(page.locator('#workout-warnings')).toContainText('не е изпълним');
  await page.locator('#workout-profile > summary').click();
  await multi.uncheck();
  await expect(page.locator('#workout-result')).toBeHidden();
  await page.locator('#workout-eligible').check();
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-equipment-error')).toContainText('дърпане');
});

test('profile collapses only on success and result scrolls to the start on desktop and mobile', async ({ page }) => {
  await expect(page.locator('#workout-profile')).toHaveAttribute('open', '');
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-profile')).toHaveAttribute('open', '');
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await setup(page);
    await page.locator('#generate-workout').click();
    await expect(page.locator('#workout-profile')).not.toHaveAttribute('open', '');
    await expect(page.locator('#workout-result')).toBeFocused();
    expect(await page.locator('#workout-result').evaluate(node => Math.abs(node.getBoundingClientRect().top))).toBeLessThan(2);
    await page.getByText('Твоите данни', { exact: true }).click();
    await expect(page.locator('#workout-environment')).toBeVisible();
  }
});

test('active day owns exact media identities and embeds are click-only and disposable', async ({ page }) => {
  const videoRequests = [];
  page.on('request', request => { if (/youtube|ytimg/.test(request.url())) videoRequests.push(request.url()); });
  await setup(page, { days: '4', duration: '60' });
  await page.locator('#generate-workout').click();
  const days = page.locator('.workout-session');
  const media = page.locator('#workout-media-list');
  const assertIdentity = async index => {
    expect(await media.locator('[data-media-exercise]').evaluateAll(nodes => nodes.map(n => n.dataset.mediaExercise))).toEqual(await days.nth(index).locator('[data-exercise]').evaluateAll(nodes => nodes.map(n => n.dataset.exercise)));
    expect(await media.locator('h4').allTextContents()).toEqual(await days.nth(index).locator('h4').allTextContents());
  };
  await assertIdentity(0);
  await expect(media.locator('iframe, img')).toHaveCount(0);
  expect(videoRequests).toEqual([]);
  await expect(media.locator('a').first()).toHaveAttribute('href', 'https://www.youtube.com/watch?v=sqNwDkUU_Ps');
  await expect(media).toContainText('PureGym');
  await media.getByRole('button').first().click();
  await expect(media.locator('iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/sqNwDkUU_Ps');
  await expect(media.locator('iframe')).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  await expect(media.locator('iframe')).not.toHaveAttribute('allow', /autoplay/);
  await days.nth(1).locator('summary').click();
  await expect(days.first()).not.toHaveAttribute('open', '');
  await assertIdentity(1);
  await expect(media.locator('iframe')).toHaveCount(0);
  await media.getByRole('button').first().click();
  await days.nth(1).locator('summary').click();
  await expect(media.locator('[data-media-exercise], iframe')).toHaveCount(0);
  await days.first().locator('summary').click();
  await media.getByRole('button').first().click();
  await page.locator('#workout-profile > summary').click();
  await page.locator('#workout-duration').selectOption('45');
  await expect(page.locator('#workout-sessions')).toBeEmpty();
  await expect(media).toBeEmpty();
  await page.locator('#workout-eligible').check();
  await page.locator('#generate-workout').click();
  await expect(media.locator('iframe')).toHaveCount(0);
  await media.getByRole('button').first().click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(media).toBeEmpty();
  await expect(page.locator('#workout-profile')).toHaveAttribute('open', '');
});

test('training theme and wide layout stay scoped while previews fit 320px', async ({ page }) => {
  const colors = await page.locator('body').evaluate(body => ({
    accent: getComputedStyle(body).getPropertyValue('--accent').trim(),
    sidebar: getComputedStyle(document.querySelector('.sidebar')).backgroundColor,
    field: getComputedStyle(document.querySelector('#workout-environment')).backgroundColor,
    background: getComputedStyle(body).backgroundColor,
    panel: getComputedStyle(document.querySelector('#workout-profile')).backgroundColor
  }));
  expect(colors).toEqual({ accent: '#009dff', sidebar: 'rgb(14, 17, 21)', field: 'rgb(13, 17, 23)', background: 'rgb(11, 15, 12)', panel: 'rgb(16, 23, 32)' });
  const contrast = await page.evaluate(() => {
    const luminance = color => {
      const channels = color.match(/\d+/g).slice(0, 3).map(Number).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    return ['#workout-profile > summary', '#generate-workout'].map(selector => {
      const element = document.querySelector(selector);
      const style = getComputedStyle(element);
      const foreground = luminance(style.color);
      const background = luminance(selector.includes('summary') ? getComputedStyle(element.parentElement).backgroundColor : style.backgroundColor);
      return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
    });
  });
  for (const ratio of contrast) expect(ratio).toBeGreaterThanOrEqual(4.5);
  await setup(page);
  const form = await page.locator('#workout-profile').boundingBox();
  const plan = await page.locator('.workout-output').boundingBox();
  const media = await page.locator('#workout-media').boundingBox();
  expect(form.y + form.height).toBeLessThanOrEqual(plan.y);
  if (page.viewportSize().width > 960) {
    expect(plan.width).toBeGreaterThan(media.width);
    expect(plan.x + plan.width).toBeLessThan(media.x);
  }
  await page.locator('#generate-workout').click();
  const map = await page.locator('#gym-map').boundingBox();
  const output = await page.locator('.workout-output').boundingBox();
  const demos = await page.locator('#workout-media').boundingBox();
  expect(map.y).toBeGreaterThanOrEqual(Math.max(output.y + output.height, demos.y + demos.height));
  await page.setViewportSize({ width: 320, height: 800 });
  await page.locator('#workout-media-list button').first().click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/index.html');
  expect(await page.locator('body').evaluate(body => getComputedStyle(body).getPropertyValue('--accent').trim())).toBe('#c4f542');
});

test('map follows workout days before warnings, movement and progression', async ({ page }) => {
  await setup(page);
  await page.locator('#generate-workout').click();
  const order = await page.locator('#gym-map, section[aria-labelledby="warnings-title"], section[aria-labelledby="movement-title"], section[aria-labelledby="progression-title"]').evaluateAll(nodes => nodes.map(node => node.id || node.getAttribute('aria-labelledby')));
  expect(order).toEqual(['gym-map', 'warnings-title', 'movement-title', 'progression-title']);
  const map = await page.locator('#gym-map').boundingBox();
  const guidance = await page.locator('#workout-guidance').boundingBox();
  const layout = await page.locator('.training-layout').boundingBox();
  expect(guidance.y).toBeGreaterThanOrEqual(map.y + map.height);
  expect(Math.abs(map.width - layout.width)).toBeLessThan(2);
  await page.locator('#workout-profile > summary').click();
  await page.locator('#workout-duration').selectOption('45');
  await expect(page.locator('#workout-guidance')).toBeHidden();
});

test('gym map uses only the verified Markovo Tepe place and home removes all map network surfaces', async ({ page }) => {
  await expect(page.locator('#gym-map')).toBeHidden();
  await expect(page.locator('#gym-map iframe')).toHaveCount(0);
  await page.locator('#workout-environment').selectOption('gym');
  const map = page.locator('#gym-map');
  await expect(map).toBeVisible();
  await expect(map).toContainText('Атлетик Фитнес Марково тепе');
  await expect(map).toContainText('Пловдив, Мол Марково тепе, бул. „Руски“ 52-54, ет. 3');
  await expect(map.locator('a')).toHaveAttribute('href', 'https://www.google.com/maps?cid=5854447715591440372');
  await expect(map.locator('iframe')).toHaveAttribute('src', 'https://www.google.com/maps?cid=5854447715591440372&output=embed');
  await expect(map.locator('iframe')).toHaveAttribute('title', 'Атлетик Фитнес Марково тепе / примерна зала');
  await expect(map.locator('iframe')).toHaveAttribute('referrerpolicy', 'no-referrer');
  await map.locator('iframe').scrollIntoViewIfNeeded();
  await expect(page.frameLocator('#gym-map iframe').locator('p')).toHaveText('Third party fixture');
  await page.locator('#workout-duration').selectOption('45');
  await expect(map.locator('iframe')).toHaveAttribute('src', 'https://www.google.com/maps?cid=5854447715591440372&output=embed');
  await page.locator('#workout-environment').selectOption('home');
  await expect(map).toBeHidden();
  await expect(map.locator('iframe')).toHaveCount(0);
  await page.locator('#workout-environment').selectOption('');
  await expect(map.locator('iframe')).toHaveCount(0);
});

test('unmapped exercises retain real cues without invented video and reset clears previews', async ({ page }) => {
  await setup(page, { environment: 'home' });
  await page.locator('input[value="bands"]').check();
  await page.locator('#generate-workout').click();
  const row = page.locator('[data-media-exercise="band-row"]');
  await expect(row).toContainText('Предстои проверена демонстрация');
  await expect(row).toContainText('неповреден ластик');
  await expect(row.locator('button, a, iframe')).toHaveCount(0);
  await page.locator('#workout-media-list button').first().click();
  await page.locator('#workout-form').evaluate(form => form.reset());
  await expect(page.locator('#workout-media-list')).toBeEmpty();
  await expect(page.locator('#gym-map iframe')).toHaveCount(0);
  await expect(page.locator('#workout-result')).toBeHidden();
});

test('home equipment does not leak into a gym submission after history restoration', async ({ page }) => {
  await setup(page, { environment: 'home' });
  for (const value of ['barbell', 'rack', 'dips', 'multigym']) await page.locator(`input[value="${value}"]`).check();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
  await page.locator('#workout-environment').selectOption('gym');
  await expect(page.locator('#workout-equipment')).toHaveAttribute('disabled', '');
  await expect(page.locator('input[value="barbell"]')).toBeDisabled();
  expect(await page.locator('#workout-form').evaluate(form => new FormData(form).getAll('equipment'))).toEqual([]);
  await page.locator('#workout-eligible').check();
  await page.locator('#generate-workout').click();
  await expect(page.locator('.workout-session').first()).toContainText('Лег преса');
  await expect(page.locator('[data-exercise="barbell-squat"]')).toHaveCount(0);
});
