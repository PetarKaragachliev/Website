import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as model from '../../public/js/workout.js';

const { calculateWorkout } = model;
const baseline = { age: '30', eligible: true, environment: 'gym', experience: 'beginner', days: '3', duration: '30', activity: 'sedentary', currentTraining: 'none', goal: 'maintain', equipment: [] };
const bg = /[А-Яа-я]/;
const schedules = {
  2: ['Понеделник', 'Четвъртък'],
  3: ['Понеделник', 'Сряда', 'Петък'],
  4: ['Понеделник', 'Вторник', 'Четвъртък', 'Петък'],
  5: ['Понеделник', 'Вторник', 'Четвъртък', 'Петък', 'Събота']
};
const patterns = {
  squat: ['leg-press', 'squat', 'kb-squat'], hinge: ['db-hinge', 'bridge', 'barbell-hinge', 'kb-hinge'],
  push: ['chest-press', 'floor-press', 'wall-pushup', 'bench-press', 'multi-press'],
  pull: ['cable-row', 'db-row', 'band-row', 'pullup', 'barbell-row', 'rack-row', 'kb-row', 'multi-row']
};
const setupSeconds = id => ({ 'rack-row': 120, 'barbell-hinge': 120, 'barbell-row': 120, 'bench-press': 120, 'multi-press': 90, 'multi-row': 90 })[id] ?? 60;

test('only the pure calculator is exported; nutrition and browser APIs are absent', async () => {
  assert.deepEqual(Object.keys(model), ['calculateWorkout']);
  const source = await readFile(new URL('../../public/js/workout.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bimport\b|\bdocument\b|\bwindow\b|localStorage|sessionStorage|Math\.random|fetch\(/);
  const input = Object.freeze({ ...baseline, equipment: Object.freeze([]) });
  const a = calculateWorkout(input);
  const b = calculateWorkout(input);
  assert.deepEqual(a, b);
  a.plan.sessions[0].exercises[0].cues.push('промяна');
  assert.deepEqual(calculateWorkout(input), b);
  assert.deepEqual(Object.keys(b).sort(), ['errors', 'plan']);
});

for (const experience of ['beginner', 'intermediate', 'advanced']) {
  for (const days of ['2', '3', '4', '5']) {
    for (const duration of ['30', '45', '60']) {
      test(`complete bounded schedule ${experience}/${days}/${duration}`, () => {
        const { errors, plan } = calculateWorkout({ ...baseline, experience, days, duration });
        assert.deepEqual(errors, {});
        assert.equal(plan.sessions.length, Number(days));
        assert.deepEqual(plan.sessions.map(s => s.dayLabel), schedules[days]);
        assert.match(plan.title, bg);
        assert.match(plan.summary, /предварителен/i);
        assert.ok(plan.warnings.some(s => /клинично|валидира/i.test(s)));
        assert.ok(plan.warnings.some(s => /48/.test(s)));
        assert.ok(plan.progression.length > 0);
        for (const [index, session] of plan.sessions.entries()) {
          assert.equal(session.warmupMinutes, 5);
          assert.equal(session.cooldownMinutes, 3);
          assert.ok(session.exercises.length >= 2);
          assert.equal(new Set(session.exercises.map(e => e.id)).size, session.exercises.length);
          const seconds = session.exercises.reduce((sum, exercise) => {
            assert.ok(Number.isInteger(exercise.sets) && exercise.sets >= 1 && exercise.sets <= 3);
            assert.match(exercise.reps, /^\d+-\d+$/);
            const maxReps = Number(exercise.reps.split('-')[1]);
            assert.ok(maxReps <= 12);
            assert.ok(exercise.restSeconds >= 60);
            assert.match(exercise.name, bg);
            assert.ok(exercise.cues.length > 0 && exercise.cues.every(c => bg.test(c)));
            assert.match(exercise.progression, bg);
            assert.ok(exercise.equipment.every(e => bg.test(e)));
            return sum + exercise.sets * maxReps * 4 + (exercise.sets - 1) * exercise.restSeconds + setupSeconds(exercise.id);
          }, 0) + 8 * 60;
          assert.equal(session.estimatedMinutes, seconds / 60);
          assert.ok(seconds <= Number(duration) * 60, 'never round down an over-budget session');
          const required = Number(days) <= 3 || index === 4 ? ['squat', 'hinge', 'push', 'pull'] : index % 2 === 0 ? ['push', 'pull'] : ['squat', 'hinge'];
          for (const pattern of required) assert.ok(session.exercises.some(e => patterns[pattern].includes(e.id)), `missing ${pattern}`);
          if (index === 4) {
            assert.match(session.title, /лека|техника/i);
            assert.ok(session.exercises.every(e => e.sets === 1));
          }
        }
      });
    }
  }
}

for (const [field, values] of Object.entries({
  age: ['', ' ', '17', '57', 17, 57, '30.5', 30.5, Infinity, true, [], '3e1', '0x1e'],
  eligible: [false, undefined, 'true', 1],
  environment: ['', 'outside', ['gym']], experience: ['', 'expert', ['beginner']],
  days: ['1', '6', 3, ['3']], duration: ['20', 30, ['30']],
  activity: ['', 'active', ['light']], currentTraining: ['', 'daily', ['none']],
  goal: ['', 'cut', ['lose']], equipment: [undefined, null, 'bands', ['door'], ['bands', 1], ['bands', 'bands'], new Array(1)]
})) {
  for (const value of values) test(`invalid ${field}: ${JSON.stringify(value)}`, () => {
    const output = calculateWorkout({ ...baseline, [field]: value });
    assert.equal(output.plan, null);
    assert.match(output.errors[field], bg);
  });
}

test('missing and malformed input fails closed with field errors', () => {
  for (const input of [undefined, null, {}, [], 'profile']) {
    const output = calculateWorkout(input);
    assert.equal(output.plan, null);
    assert.match(output.errors.age, bg);
    assert.match(output.errors.eligible, bg);
  }
});

test('age boundaries and all goals work without BMI or calorie gates', () => {
  for (const age of [18, '18', 56, '56']) for (const goal of ['lose', 'maintain', 'muscle', 'gain']) {
    const output = calculateWorkout({ ...baseline, age, goal, weight: 20, height: 230, bmi: 5, calories: 500, limitation: 'calories-range' });
    assert.deepEqual(output.errors, {});
    assert.deepEqual(output.plan.sessions, calculateWorkout(baseline).plan.sessions);
    assert.doesNotMatch(JSON.stringify(output.plan), /\b500\b|\b10000\b|ккал|изгаря/);
  }
});

test('bodyweight and bench alone cannot supply a pulling program', () => {
  for (const equipment of [[], ['bench']]) {
    const output = calculateWorkout({ ...baseline, environment: 'home', equipment });
    assert.equal(output.plan, null);
    assert.match(output.errors.equipment, /дърпан/i);
  }
  const noviceBar = calculateWorkout({ ...baseline, environment: 'home', equipment: ['pullup'] });
  assert.equal(noviceBar.plan, null);
  assert.match(noviceBar.errors.equipment, bg);
});

test('all home equipment subsets use only declared safe equipment', () => {
  const tokens = ['dumbbells', 'bands', 'bench', 'pullup'];
  const labels = { dumbbells: 'Дъмбели', bands: 'Ластици', bench: 'Пейка', pullup: 'Лост за набиране' };
  for (let mask = 0; mask < 16; mask++) for (const experience of ['beginner', 'intermediate', 'advanced']) {
    const equipment = tokens.filter((_, i) => mask & (1 << i));
    const supported = equipment.includes('dumbbells') || equipment.includes('bands') || (experience !== 'beginner' && equipment.includes('pullup'));
    const output = calculateWorkout({ ...baseline, environment: 'home', equipment, experience, days: '5', duration: '60' });
    assert.equal(output.plan !== null, supported);
    if (!supported) { assert.match(output.errors.equipment, bg); continue; }
    const allowed = ['Собствено тегло', ...equipment.map(e => labels[e])];
    for (const session of output.plan.sessions) for (const exercise of session.exercises) {
      assert.ok(exercise.equipment.every(e => allowed.includes(e)));
      assert.doesNotMatch(exercise.name, /врат|кърп|маса/i);
    }
    assert.ok(output.plan.sessions[0].exercises.some(e => patterns.pull.includes(e.id)));
    if (equipment.includes('bands') && !equipment.includes('dumbbells')) assert.ok(output.plan.warnings.some(w => /стъпал|закреп/i.test(w)));
    if (equipment.includes('pullup') && !equipment.includes('bands') && !equipment.includes('dumbbells')) assert.ok(output.plan.warnings.some(w => /набирания/i.test(w)));
  }
});

test('gym assumptions, experience dosing, accessory pruning and light fifth day are explicit', () => {
  const novice = calculateWorkout(baseline).plan;
  const advanced = calculateWorkout({ ...baseline, experience: 'advanced', duration: '60' }).plan;
  assert.ok(novice.warnings.some(w => /машини|скрипец/i.test(w)));
  assert.equal(novice.sessions[0].exercises[0].sets, 2);
  assert.equal(advanced.sessions[0].exercises[0].sets, 3);
  const short = calculateWorkout({ ...baseline, experience: 'advanced' }).plan;
  assert.ok(short.sessions[0].exercises.length < advanced.sessions[0].exercises.length);
  assert.equal(short.sessions[0].exercises[0].sets, 2);
  const five = calculateWorkout({ ...baseline, days: '5' }).plan;
  assert.ok(five.warnings.some(w => /начинаещ/i.test(w)));
  assert.ok(five.sessions[4].estimatedMinutes < five.sessions[0].estimatedMinutes);
});

test('home schedule and exact time bounds hold across every supported selection', () => {
  for (const equipment of [['dumbbells'], ['bands'], ['pullup']]) {
    for (const experience of ['beginner', 'intermediate', 'advanced']) {
      if (equipment[0] === 'pullup' && experience === 'beginner') continue;
      for (const days of ['2', '3', '4', '5']) for (const duration of ['30', '45', '60']) {
        const { errors, plan } = calculateWorkout({ ...baseline, environment: 'home', equipment, experience, days, duration });
        assert.deepEqual(errors, {});
        assert.deepEqual(plan.sessions.map(s => s.dayLabel), schedules[days]);
        for (const [index, session] of plan.sessions.entries()) {
          let expectedSeconds = (session.warmupMinutes + session.cooldownMinutes) * 60;
          for (const exercise of session.exercises) {
            const [min, max] = exercise.reps.split('-').map(Number);
            assert.ok(min > 0 && max >= min && max <= 12);
            expectedSeconds += exercise.sets * max * 4 + (exercise.sets - 1) * exercise.restSeconds + setupSeconds(exercise.id);
          }
          assert.equal(session.estimatedMinutes, expectedSeconds / 60);
          assert.ok(expectedSeconds <= Number(duration) * 60);
          const required = Number(days) <= 3 || index === 4 ? ['squat', 'hinge', 'push', 'pull'] : index % 2 === 0 ? ['push', 'pull'] : ['squat', 'hinge'];
          for (const pattern of required) assert.ok(session.exercises.some(e => patterns[pattern].includes(e.id)));
        }
      }
    }
  }
});

test('all human-readable plan strings are Bulgarian; only stable exercise identifiers are machine strings', () => {
  const visit = value => {
    if (typeof value === 'string') { assert.match(value, bg); return; }
    if (Array.isArray(value)) { for (const item of value) visit(item); return; }
    if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
      if (key !== 'id' && key !== 'reps') visit(item);
    }
  };
  const { plan } = calculateWorkout(baseline);
  visit(plan);
  assert.ok(plan.sessions.length > 0);
});

test('movement reflects all activity and current-training branches without mandatory extra walking for workers', () => {
  const texts = new Set();
  for (const activity of ['sedentary', 'light', 'moderate', 'very']) for (const currentTraining of ['none', 'one-two', 'three-plus']) {
    const { plan } = calculateWorkout({ ...baseline, activity, currentTraining });
    const text = plan.movement.items.join(' ');
    texts.add(text);
    assert.match(plan.movement.title, bg);
    assert.match(plan.movement.caveat, /работ|ежеднев/i);
    assert.match(text, /възстанов|постепенно|увелич/i);
    if (activity === 'very') assert.match(text, /не добавяй задължително/i);
    if (currentTraining === 'three-plus') assert.match(text, /замен|не добав/i);
    assert.doesNotMatch(text, /10[ ,.]?000|ккал|изгаря/i);
  }
  assert.equal(texts.size, 12);
});

test('sedentary daily life does not automatically add walking on top of existing training', () => {
  for (const currentTraining of ['one-two', 'three-plus']) {
    const { plan } = calculateWorkout({ ...baseline, currentTraining });
    assert.match(plan.movement.items[0], /Не добавяй автоматично/);
    assert.doesNotMatch(plan.movement.items[0], /започни с 5-10/);
    assert.match(plan.movement.items[0], /сегашното кардио/);
  }
});

test('every equipment subset follows the equipment policy, independent of checkbox order', () => {
  const tokens = ['dumbbells', 'bands', 'bench', 'pullup', 'barbell', 'kettlebell', 'rack', 'dips', 'multigym'];
  const routes = new Map();
  const selected = new Set();
  const gear = { dumbbells: 'Дъмбели', bands: 'Ластици', bench: 'Пейка', pullup: 'Лост за набиране', barbell: 'Щанга и тежести', kettlebell: 'Пудовка', rack: 'Стойка за клекове', dips: 'Успоредка за кофички', multigym: 'Комбиниран фитнес уред' };
  for (let mask = 0; mask < 2 ** tokens.length; mask++) for (const experience of ['beginner', 'intermediate', 'advanced']) {
    const equipment = tokens.filter((_, i) => mask & (1 << i));
    const has = token => equipment.includes(token);
    const supported = has('dumbbells') || has('bands') || has('barbell') || has('kettlebell') || has('multigym') || (experience !== 'beginner' && has('pullup'));
    const input = { ...baseline, environment: 'home', equipment, experience };
    const output = calculateWorkout(input);
    assert.equal(output.plan !== null, supported, `${experience}: ${equipment}`);
    assert.deepEqual(calculateWorkout({ ...input, equipment: [...equipment].reverse() }), output);
    if (!supported) { assert.match(output.errors.equipment, bg); continue; }
    const expected = [
      has('kettlebell') ? 'kb-squat' : 'squat',
      has('barbell') ? 'barbell-hinge' : has('dumbbells') ? 'db-hinge' : has('kettlebell') ? 'kb-hinge' : 'bridge',
      has('multigym') ? 'multi-press' : has('dumbbells') ? (has('bench') ? 'bench-press' : 'floor-press') : 'wall-pushup',
      has('multigym') ? 'multi-row' : has('barbell') ? (has('rack') ? 'rack-row' : 'barbell-row') : has('dumbbells') ? 'db-row' : has('kettlebell') ? 'kb-row' : has('bands') ? 'band-row' : 'pullup'
    ];
    assert.deepEqual(output.plan.sessions[0].exercises.slice(0, 4).map(e => e.id), expected);
    const allowed = ['Собствено тегло', ...equipment.map(e => gear[e]).filter(Boolean)];
    for (const exercise of output.plan.sessions.flatMap(s => s.exercises)) {
      assert.ok(exercise.equipment.every(e => allowed.includes(e)), exercise.id);
      assert.match(exercise.name, bg);
      assert.ok(exercise.cues.length > 0 && exercise.cues.every(cue => bg.test(cue)));
      assert.match(exercise.progression, bg);
      assert.doesNotMatch(exercise.name, /суинг|изхвърляне|обръщане/i);
      selected.add(exercise.id);
    }
    routes.set(`${experience}/${expected.join('/')}/${has('dumbbells')}/${has('dips')}`, input);
    assert.deepEqual(calculateWorkout({ ...input, environment: 'gym' }), calculateWorkout({ ...baseline, experience }));
  }
  for (const id of ['rack-row', 'barbell-hinge', 'barbell-row', 'kb-squat', 'kb-hinge', 'kb-row', 'bench-press', 'multi-press', 'multi-row']) assert.ok(selected.has(id), `unexercised route: ${id}`);
  for (const input of routes.values()) for (const days of ['2', '3', '4', '5']) for (const duration of ['30', '45', '60']) {
    const { plan } = calculateWorkout({ ...input, days, duration });
    assert.deepEqual(plan.sessions.map(s => s.dayLabel), schedules[days]);
    for (const [index, session] of plan.sessions.entries()) {
      assert.equal(new Set(session.exercises.map(e => e.id)).size, session.exercises.length);
      for (const exercise of session.exercises) {
        assert.equal(exercise.setupSeconds, setupSeconds(exercise.id));
        assert.ok(Number.isInteger(exercise.sets) && exercise.sets >= 1 && exercise.sets <= 3);
        const [min, max] = exercise.reps.split('-').map(Number);
        assert.ok(min > 0 && min <= max && max <= 12);
        assert.ok(exercise.restSeconds >= 60);
        if (exercise.id === 'pullup') assert.equal(exercise.reps, index === 4 ? '3-4' : '4-6');
      }
      const seconds = 480 + session.exercises.reduce((sum, e) => sum + e.sets * Number(e.reps.split('-')[1]) * 4 + (e.sets - 1) * e.restSeconds + setupSeconds(e.id), 0);
      assert.equal(session.estimatedMinutes, seconds / 60);
      assert.ok(seconds <= Number(duration) * 60, `${input.equipment}/${input.experience}/${days}/${duration}`);
      const required = Number(days) <= 3 || index === 4 ? ['squat', 'hinge', 'push', 'pull'] : index % 2 === 0 ? ['push', 'pull'] : ['squat', 'hinge'];
      for (const pattern of required) assert.ok(session.exercises.some(e => patterns[pattern].includes(e.id)));
      if (index === 4) assert.ok(session.exercises.every(e => e.sets === 1));
    }
  }
});

test('home dip bars replace only the budgeted calf accessory with light hand support', () => {
  for (const experience of ['beginner', 'intermediate', 'advanced']) {
    const input = { ...baseline, environment: 'home', experience, equipment: ['bands', 'dips'], duration: '60' };
    const { errors, plan } = calculateWorkout(input);
    assert.deepEqual(errors, {});
    const supported = plan.sessions[0].exercises.find(e => e.id === 'supported-calf');
    assert.ok(supported);
    assert.deepEqual(supported.equipment, ['Собствено тегло', 'Успоредка за кофички']);
    assert.match(supported.cues.join(' '), /равен нехлъзгав под/);
    assert.match(supported.cues.join(' '), /лек допир/);
    assert.match(supported.cues.join(' '), /висене/);
    assert.match(supported.progression, /Не добавяй/);
    assert.ok(plan.sessions.every(s => !s.exercises.some(e => e.id === 'calf' || e.id === 'dips')));
    const plain = calculateWorkout({ ...input, equipment: ['bands'] }).plan;
    assert.deepEqual(plan.sessions, plain.sessions.map(s => ({ ...s, exercises: s.exercises.map(e => e.id === 'calf' ? supported : e) })));
    const short = calculateWorkout({ ...input, equipment: ['barbell', 'rack', 'dips'], duration: '30' }).plan;
    assert.ok(short.sessions.every(s => !s.exercises.some(e => e.id === 'supported-calf')));
    assert.ok(short.sessions.every(s => s.estimatedMinutes <= 30));
    const gym = calculateWorkout({ ...input, environment: 'gym' }).plan;
    assert.ok(gym.sessions[0].exercises.some(e => e.id === 'calf'));
    assert.ok(gym.sessions.every(s => !s.exercises.some(e => e.id === 'supported-calf')));
    const five = calculateWorkout({ ...input, days: '5' }).plan;
    assert.ok(five.sessions[1].exercises.some(e => e.id === 'supported-calf'));
    assert.ok(five.sessions[0].exercises.every(e => e.id !== 'supported-calf'));
    assert.ok(five.sessions[4].exercises.every(e => e.id !== 'supported-calf'));
  }
});

test('equipment never implies mastered squats or dips and station assumptions are explicit', () => {
  for (const experience of ['beginner', 'advanced']) {
    const home = equipment => calculateWorkout({ ...baseline, environment: 'home', experience, equipment }).plan;
    const plan = home(['barbell', 'rack', 'dips']);
    assert.deepEqual(plan.sessions[0].exercises.slice(0, 4).map(e => e.id), ['squat', 'barbell-hinge', 'wall-pushup', 'rack-row']);
    assert.match(plan.sessions[0].exercises[3].cues.join(' '), /стабил|куки/);
    assert.match(plan.warnings.join(' '), /не означава усвоени кофички/);
    assert.match(home(['multigym']).warnings.join(' '), /не е изпълним/);
  }
  for (const token of ['rack-safe', 'dips-ready', 'multigym-ready']) {
    const output = calculateWorkout({ ...baseline, equipment: ['barbell', 'rack', 'dips', 'multigym', token] });
    assert.equal(output.plan, null);
    assert.match(output.errors.equipment, bg);
  }
});
