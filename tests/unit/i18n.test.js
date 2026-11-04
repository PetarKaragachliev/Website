import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLanguage, translate, hasBulgarianTranslation } from '../../public/js/i18n.js';
import { calculateNutrition } from '../../public/js/nutrition.js';

test('Bulgarian translation preserves whitespace and interpolates text as data', () => {
  assert.equal(translate(' Age ', 'bg'), ' Възраст ');
  assert.equal(translate('About {percent}% (RFM)', 'bg', { percent: 19 }), 'Около 19% (RFM)');
  assert.equal(translate('About {percent}% (RFM)', 'en', { percent: 19 }), 'About 19% (RFM)');
});

test('unknown language settings safely fall back to English', () => {
  assert.equal(resolveLanguage('bg'), 'bg');
  assert.equal(resolveLanguage('en'), 'en');
  assert.equal(resolveLanguage('<script>'), 'en');
  assert.equal(translate('Age', 'unknown'), 'Age');
});

test('missing template values fail explicitly instead of exposing placeholders', () => {
  assert.throws(() => translate('About {percent}% (RFM)', 'bg'), /Missing translation value: percent/);
});

test('all displayed nutrient reference fields have Bulgarian translations', () => {
  const { nutrients } = calculateNutrition({ age: '30', weight: '70', height: '180', sex: 'male', activity: 'moderate', goal: 'maintain', eligible: true }).result.guidance;
  for (const nutrient of nutrients) {
    for (const message of [nutrient.name, nutrient.unit, nutrient.basis, nutrient.note]) {
      assert.ok(hasBulgarianTranslation(message), `Missing Bulgarian: ${message}`);
      assert.notEqual(translate(message, 'bg'), undefined);
    }
  }
});
