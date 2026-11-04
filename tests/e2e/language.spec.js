import { test, expect } from '@playwright/test';

const profileKey = 'liftfuel.profile.v1';
const languageKey = 'liftfuel.language';

async function enterProfile(page, body = false) {
  await page.locator('#age').fill('30');
  await page.locator('#weight').fill('70');
  await page.locator('#height').fill('180');
  await page.locator('#sex').selectOption('male');
  await page.locator('#activity').selectOption('moderate');
  await page.locator('input[name="goal"][value="maintain"]').check();
  if (body) {
    await page.locator('#includeAssessment').check();
    await page.locator('#waist').fill('80');
  }
  await page.locator('#eligible').check();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('language switch translates the static interface and accessible labels', async ({ page }) => {
  await page.locator('#language').selectOption('bg');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bg');
  await expect(page).toHaveTitle('LiftFuel | Зареди усилията');
  await expect(page.getByLabel('Възраст', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Тегло (кг)', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Изчисляване на целите ми' })).toBeVisible();
  await expect(page.locator('#sex option[value="male"]')).not.toHaveText('Male equation');
  await expect(page.locator('nav')).toHaveAttribute('aria-label', 'Основна навигация');
  await expect(page.getByRole('note')).toContainText('Предварителна версия');
});

test('Bulgarian output translates nutrients, body assessment, meals and numeric formatting', async ({ page }) => {
  await page.locator('#language').selectOption('bg');
  await enterProfile(page, true);
  await page.locator('button[type="submit"]').click();
  expect((await page.getByTestId('calories').textContent()).replace(/\s/g, '')).toBe('2604');
  await expect(page.locator('[data-nutrient="free-sugars"]')).toContainText('Свободни / добавени захари');
  await expect(page.locator('[data-nutrient="free-sugars"]')).toContainText('32,6');
  await expect(page.locator('[data-nutrient="omega-3"]')).toContainText('мг/ден');
  await expect(page.locator('#body-fat-calculated')).toHaveText('Около 19% (RFM)');
  await expect(page.locator('#body-summary')).not.toContainText('Mid-range');
  await expect(page.locator('#meal-summary')).toContainText('651');
  await expect(page.locator('#meal-summary')).not.toContainText('If divided evenly');
  await expect(page.locator('#meal-times li').first()).toContainText('Хранене 1');
});

test('switching language preserves and translates withheld nutrition and unavailable RFM', async ({ page }) => {
  await enterProfile(page, true);
  await page.locator('#age').fill('18');
  await page.locator('#weight').fill('50');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#limitation')).toBeVisible();
  await expect(page.locator('#nutrition-result')).toBeHidden();
  await page.locator('#language').selectOption('bg');
  await expect(page.locator('#limitation-detail')).toContainText('под поддържания диапазон');
  await expect(page.locator('#body-fat-calculated')).not.toHaveText('Estimate unavailable');
  await expect(page.locator('#body-rfm-note')).toContainText('18-19');
  await expect(page.locator('#body-rfm-note')).not.toContainText('The cited adult');
  await expect(page.locator('#body-assessment')).toBeVisible();
  await page.locator('#language').selectOption('en');
  await expect(page.locator('#limitation-detail')).toContainText('below this calculator');
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

test('switching back and forth preserves inputs, consent, results and saved profile data', async ({ page }) => {
  await enterProfile(page, true);
  await page.locator('#remember').check();
  await page.locator('button[type="submit"]').click();
  const saved = await page.evaluate(key => localStorage.getItem(key), profileKey);
  await page.locator('#language').focus();
  await page.locator('#language').selectOption('bg');
  await expect(page.locator('#body-assessment')).toBeVisible();
  await expect(page.locator('#waist')).toHaveValue('80');
  await expect(page.locator('#eligible')).toBeChecked();
  expect(await page.evaluate(key => localStorage.getItem(key), profileKey)).toBe(saved);
  await page.locator('#language').selectOption('en');
  await expect(page.getByTestId('calories')).toHaveText('2,604');
  await expect(page.locator('#body-fat-calculated')).toHaveText('About 19% (RFM)');
  await expect(page.getByRole('button', { name: 'Calculate my targets' })).toBeVisible();
  await expect(page.locator('#language')).toBeFocused();
});

test('validation translates in place and does not resurrect corrected errors', async ({ page }) => {
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#error-list li')).toHaveCount(7);
  await page.locator('#language').focus();
  await page.locator('#language').selectOption('bg');
  await expect(page.locator('#age-error')).toContainText('Въведете');
  await expect(page.locator('#language')).toBeFocused();
  await page.locator('#age').fill('30');
  await expect(page.locator('#age-error')).toBeHidden();
  await page.locator('#language').selectOption('en');
  await expect(page.locator('#error-list li')).toHaveCount(6);
  await expect(page.locator('#age-error')).toBeHidden();
  await page.locator('#error-list a').first().click();
  await expect(page.locator('#weight')).toBeFocused();
});

test('language preference restores without saving health inputs or eligibility', async ({ page }) => {
  await page.locator('#language').selectOption('bg');
  expect(await page.evaluate(key => localStorage.getItem(key), profileKey)).toBeNull();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bg');
  await expect(page.locator('#language')).toHaveValue('bg');
  await expect(page.locator('#weight')).toHaveValue('');
  await expect(page.locator('#eligible')).not.toBeChecked();
  await expect(page.locator('#nutrition-result')).toBeHidden();
});

test('delete removes app language/profile preferences but keeps unrelated browser data', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('unrelated-setting', 'keep'));
  await page.locator('#language').selectOption('bg');
  await enterProfile(page);
  await page.locator('#remember').check();
  await page.locator('button[type="submit"]').click();
  await page.locator('#delete-data').click();
  expect(await page.evaluate(key => localStorage.getItem(key), languageKey)).toBeNull();
  expect(await page.evaluate(key => localStorage.getItem(key), profileKey)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated-setting'))).toBe('keep');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('failed deletion does not hide that saved health-profile data remains', async ({ page }) => {
  await enterProfile(page);
  await page.locator('#remember').check();
  await page.locator('button[type="submit"]').click();
  await page.locator('#language').selectOption('bg');
  await page.evaluate(() => { Storage.prototype.removeItem = () => { throw new Error('Removal blocked'); }; });
  await page.locator('#delete-data').click();
  await expect(page.locator('#storage-status')).toContainText('Запазените данни не могат да бъдат премахнати');
  expect(await page.evaluate(key => localStorage.getItem(key), profileKey)).not.toBeNull();
});

test('language-only deletion failure does not claim that the deleted profile remains', async ({ page }) => {
  await enterProfile(page);
  await page.locator('#remember').check();
  await page.locator('button[type="submit"]').click();
  await page.locator('#language').selectOption('bg');
  await page.evaluate(key => {
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (name) {
      if (name === key) throw new Error('Language removal blocked');
      return remove.call(this, name);
    };
  }, languageKey);
  await page.locator('#delete-data').click();
  await expect(page.locator('#storage-status')).toContainText('Предпочитаният език не може да бъде изтрит');
  expect(await page.evaluate(key => localStorage.getItem(key), profileKey)).toBeNull();
});

test('Bulgarian stays usable without browser storage', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  await page.reload();
  await page.locator('#language').selectOption('bg');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bg');
  await enterProfile(page);
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#nutrition-result')).toBeVisible();
  await expect(page.locator('#language-status')).toContainText('език');
});

test('Bulgarian reflows on small screens and does not use a translation service', async ({ page }) => {
  const external = [];
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url());
  });
  await page.locator('#language').selectOption('bg');
  await enterProfile(page, true);
  await page.locator('button[type="submit"]').click();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#body-assessment')).toBeVisible();
  expect(external).toEqual([]);
});

test('Bulgarian has no leftover English interface sentences beyond names and scientific abbreviations', async ({ page }) => {
  const missing = await page.evaluate(async () => {
    const { hasBulgarianTranslation } = await import('/js/i18n.js');
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    const messages = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement.closest('script,style,noscript,[data-no-translate]')) continue;
      const value = node.nodeValue.replace(/\s+/g, ' ').trim();
      if (/[A-Za-z]/.test(value) && !['LF', 'LIFT', 'FUEL', 'LIFTFUEL.'].includes(value) && !hasBulgarianTranslation(value)) messages.push(value);
    }
    return messages;
  });
  expect(missing).toEqual([]);
  await page.locator('#language').selectOption('bg');
  await enterProfile(page, true);
  await page.locator('button[type="submit"]').click();
  await page.locator('.body-method summary').click();
  const leftovers = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const messages = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement.closest('script,style,noscript,[data-no-translate]')) continue;
      const value = node.nodeValue.replace(/\s+/g, ' ').trim();
      const withoutNames = value.replace(/Mifflin-St Jeor|JavaScript|LiftFuel|LIFTFUEL|LIFT|FUEL|\b(?:LF|RFM|NICE|NHS|FDA|RDA|AI|ALA|RAE|DXA|EPA|DHA|NIH|ODS)\b/g, '');
      if (/[A-Za-z]{2,}/.test(withoutNames)) messages.push(value);
    }
    return messages;
  });
  expect(leftovers).toEqual([]);
});
