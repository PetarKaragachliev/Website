import test from 'node:test';
import assert from 'node:assert/strict';
import { translatePresentation } from '../../public/js/language.js';

test('English presentation preserves whitespace and decimal precision', () => {
  assert.equal(translatePresentation('  19,0%  '), '  19.0%  ');
  assert.equal(translatePresentation('2 636,56'), '2,636.56');
  assert.equal(translatePresentation('0,25'), '0.25');
  assert.equal(translatePresentation('02054'), '02054');
});

test('pace templates translate direction, decimal values and blocked-choice suffix', () => {
  assert.equal(
    translatePresentation('Намаляване с около 0,26 кг/седмица (0,25% от текущото тегло) - извън ограниченията на калкулатора'),
    'Loss of about 0.26 kg/week (0.25% of current weight) - outside calculator limits'
  );
});

test('workout prescriptions and nested shared summaries retain their numerical inputs', () => {
  assert.equal(translatePresentation('2 серии по 8-10 повторения / 90 сек почивка между сериите'), '2 sets of 8-10 repetitions / 90 sec rest between sets');
  assert.equal(
    translatePresentation('23 г. / 105 кг / Намаляване на теглото / Активност извън тренировките: Лека активност'),
    '23 yr / 105 kg / Weight loss / Activity outside workouts: Light activity'
  );
});

test('composed storage warnings preserve both failure and successful-operation feedback', () => {
  assert.equal(
    translatePresentation('Запазеният профил не можа да бъде изтрит. Изчисти данните за този сайт от настройките на браузъра. Данните са запазени на това устройство. Потвърждението за допустимост не се запазва.'),
    'The saved profile could not be deleted. Clear this site\'s data in browser settings. Inputs are saved on this device. Eligibility confirmation is not saved.'
  );
});
