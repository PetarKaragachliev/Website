import { test, expect } from '@playwright/test';

const languageKey = 'liftfuel.language';
async function switchTo(page, language) {
  if (await page.locator('html').getAttribute('lang') === language) return;
  await page.locator('#language-toggle > summary').click();
  await page.locator(`#language-toggle [data-language="${language}"]`).click();
}

for (const path of ['/', '/training.html']) {
  test(`language dropdown shows only the current language until opened on ${path}`, async ({ page }) => {
    await page.goto(path);
    const dropdown = page.locator('#language-toggle');
    const trigger = dropdown.locator('summary');
    const english = dropdown.locator('[data-language="en"]');
    const bulgarian = dropdown.locator('[data-language="bg"]');
    await expect(trigger).toHaveText('BG');
    await expect(english).toBeHidden();
    await expect(bulgarian).toBeHidden();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(english).toBeVisible();
    await expect(bulgarian).toBeHidden();
    const head = await trigger.boundingBox();
    const option = await english.boundingBox();
    expect(option.y).toBeGreaterThanOrEqual(head.y + head.height);
    await page.keyboard.press('Tab');
    await expect(english).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveText('EN');
    await expect(trigger).toBeFocused();
    await expect(dropdown).not.toHaveAttribute('open');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await trigger.click();
    await expect(bulgarian).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dropdown).not.toHaveAttribute('open');
    await trigger.click();
    await page.locator('.hero h1').click();
    await expect(dropdown).not.toHaveAttribute('open');
    await switchTo(page, 'bg');
    await expect(trigger).toHaveText('BG');
    await expect(page.locator('html')).toHaveAttribute('lang', 'bg');
  });
}

async function nutrition(page) {
  await page.goto('/index.html');
  await expect(page.locator('#analyze')).toBeEnabled();
  for (const [field, value] of Object.entries({ age: '30', weight: '70', height: '180', waistRfm: '80' })) await page.locator(`#${field}`).fill(value);
  await page.locator('#sex').selectOption('male');
  await page.locator('#activity').selectOption('moderate');
  await page.locator('[name="goal"][value="maintain"]').check();
  await page.locator('#eligible').check();
  await page.locator('#analyze').click();
  await expect(page.locator('#nutrition-result')).toBeVisible();
}

async function snapshot(page) {
  return page.evaluate(() => ({
    fields: [...document.querySelectorAll('input, select')].map(node => [node.id || node.name, node.value, node.checked]),
    session: Object.fromEntries(Object.entries(sessionStorage)),
    persistent: Object.fromEntries(Object.entries(localStorage).filter(([key]) => key !== 'liftfuel.language')),
    disclosures: [...document.querySelectorAll('details')].map(node => node.open)
  }));
}

async function expectEnglish(page) {
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const untranslated = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.parentElement.closest('script, style, noscript') && /[а-яА-Я]/.test(node.nodeValue)) texts.push(node.nodeValue.trim());
    }
    return texts;
  });
  expect(untranslated).toEqual([]);
}

test('top language buttons translate results without changing inputs, consent or calculations', async ({ page }) => {
  await nutrition(page);
  const before = await snapshot(page);
  const bulgarianResult = await page.locator('#nutrition-result').textContent();
  const bodyResult = await page.locator('#body-assessment').textContent();
  await switchTo(page, 'en');
  await expectEnglish(page);
  await expect(page.locator('#analyze')).toHaveText('Calculate my results');
  await expect(page.locator('#body-bmi')).toHaveText('21.6');
  await expect(page.locator('#body-fat-calculated')).toHaveText('19.0%');
  await expect(page.getByTestId('protein')).toHaveText('140');
  expect(await snapshot(page)).toEqual(before);
  await expect(page.locator('#language-toggle [data-language="en"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(key => localStorage.getItem(key), languageKey)).toBe('en');
  await switchTo(page, 'bg');
  await expect(page.locator('#nutrition-result')).toHaveText(bulgarianResult);
  await expect(page.locator('#body-assessment')).toHaveText(bodyResult);
  expect(await snapshot(page)).toEqual(before);
});

test('English selection survives navigation and translates new workouts, tables and media', async ({ page }) => {
  await nutrition(page);
  await switchTo(page, 'en');
  await page.locator('#training-link').click();
  await expect(page.locator('#generate-workout')).toBeEnabled();
  await expectEnglish(page);
  for (const [field, value] of Object.entries({ environment: 'gym', experience: 'beginner', days: '3', duration: '60', currentTraining: 'none' })) await page.locator(`#workout-${field}`).selectOption(value);
  await page.locator('#workout-eligible').check();
  await page.locator('#generate-workout').click();
  await expect(page.locator('#workout-result')).toBeVisible();
  await expect(page.getByTestId('weekly-nutrition').locator('tbody tr')).toHaveCount(7);
  await expectEnglish(page);
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
  await page.locator('.workout-session').nth(1).locator('summary').click();
  await expect(page.locator('.workout-session').nth(1)).toHaveAttribute('open');
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html lang="en"><title>Media fixture</title></html>' }));
  await page.locator('.media-button').first().click();
  const frame = page.locator('#workout-media iframe').first();
  await expect(frame).toBeVisible();
  const originalFrame = await frame.elementHandle();
  const before = await snapshot(page);
  await switchTo(page, 'bg');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bg');
  await expect(page.locator('#generate-workout')).toHaveText('Създай тренировъчния ми план');
  expect(await snapshot(page)).toEqual(before);
  expect(await originalFrame.evaluate(node => node === document.querySelector('#workout-media iframe'))).toBe(true);
  await switchTo(page, 'en');
  await expectEnglish(page);
  expect(await snapshot(page)).toEqual(before);
  await page.reload();
  await expect(page.locator('#generate-workout')).toBeEnabled();
  await expectEnglish(page);
  await expect(page.locator('#workout-experience')).toHaveValue('beginner');
  await expect(page.locator('#workout-eligible')).not.toBeChecked();
});

test('English validation translates and language switching never submits the form', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#analyze')).toBeEnabled();
  await switchTo(page, 'en');
  await expect(page.locator('#error-summary')).toBeHidden();
  await page.locator('#analyze').click();
  await expect(page.locator('#error-summary')).toBeFocused();
  await expectEnglish(page);
  await expect(page.locator('#age-error')).toContainText('18');
  await switchTo(page, 'bg');
  await expect(page.locator('#age-error')).toHaveText('Въведете възраст от 18 до 56 навършени години като цяло число.');
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

test('language switching works with blocked storage and explains that preference is not saved', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  });
  await nutrition(page);
  await switchTo(page, 'en');
  await expect(page.locator('#language-status')).toContainText('could not save');
  await expectEnglish(page);
  await expect(page.locator('#nutrition-result')).toBeVisible();
  await switchTo(page, 'bg');
  await expect(page.locator('#analyze')).toHaveText('Изчисли моите резултати');
});

test('deletion clears independent language preference and returns to Bulgarian', async ({ page }) => {
  await nutrition(page);
  await switchTo(page, 'en');
  await page.locator('#profile-panel > summary').click();
  await page.locator('#delete-data').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bg');
  await expect(page.locator('#weight')).toHaveValue('');
  expect(await page.evaluate(key => localStorage.getItem(key), languageKey)).toBeNull();
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

for (const [path, dependency, button, status] of [
  ['/', '**/js/day-nutrition-view.js', '#analyze', '#app-status'],
  ['/training.html', '**/js/training-app.js?*', '#generate-workout', '#workout-load-status']
]) {
  test(`saved English also translates startup failure on ${path}`, async ({ page }) => {
    await page.addInitScript(key => localStorage.setItem(key, 'en'), languageKey);
    await page.route(dependency, route => route.abort());
    await page.goto(path);
    await expect(page.locator(status)).toContainText(/failed|Unable|Could not/i);
    await expect(page.locator(button)).toBeDisabled();
    await expectEnglish(page);
  });
}

test('English pages fit a narrow viewport with the language controls visible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ['/', '/training.html']) {
    await page.goto(path);
    await expect(page.locator('#language-toggle')).toBeVisible();
    await switchTo(page, 'en');
    await expectEnglish(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
