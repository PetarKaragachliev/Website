import test from 'node:test';
import assert from 'node:assert/strict';
import { readSharedPlan, writeSharedPlan, clearSharedPlan, invalidateSharedPlan, SHARED_SESSION_KEY, SHARED_LOCAL_KEY } from '../../public/js/shared-plan.js';

const body = { waistRfm: 80, waistWhtr: null, hip: null, chest: null, arm: null, thigh: null, wrist: null, regularTraining: false };
const profile = { age: 30, sex: 'male', height: 180, weight: 80, activity: 'light', goal: 'maintain', targetWeight: 80, weeklyRate: '0', body };
const workoutSetup = { environment: 'gym', equipment: [], experience: 'beginner', days: '3', duration: '45', currentTraining: 'none' };
const blockedProfile = { ...profile, age: 56, sex: 'female', height: 160, weight: 50, activity: 'sedentary', goal: 'lose', targetWeight: 49, weeklyRate: '', body: { ...body, waistRfm: 70 } };

function storage(t) {
  for (const key of ['sessionStorage', 'localStorage']) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    const records = new Map();
    Object.defineProperty(globalThis, key, { configurable: true, value: { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) } });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
  }
}

test('session and remembered persistence round trip only allowlisted v6 inputs', t => {
  storage(t);
  assert.equal(SHARED_SESSION_KEY, 'liftfuel.shared.session.v1');
  assert.equal(SHARED_LOCAL_KEY, 'liftfuel.shared.saved.v1');
  assert.deepEqual(writeSharedPlan({ profile: { ...profile, eligible: true, results: { calories: 1 } }, workoutSetup: { ...workoutSetup, eligible: true, health: true, goal: 'lose', result: {} }, remember: true }), { session: true, persistent: true });
  assert.deepEqual(readSharedPlan(), { profile, workoutSetup, remember: true });
  const raw = sessionStorage.getItem(SHARED_SESSION_KEY);
  assert.equal(JSON.parse(raw).version, 1);
  assert.equal(JSON.parse(raw).profile.version, 6);
  assert.equal(/eligible|results|health/.test(raw), false);
  sessionStorage.removeItem(SHARED_SESSION_KEY);
  assert.deepEqual(readSharedPlan(), { profile, workoutSetup, remember: true });
});

test('default write is tab-only and removes previously remembered data', t => {
  storage(t);
  writeSharedPlan({ profile, workoutSetup, remember: true });
  assert.deepEqual(writeSharedPlan({ profile }), { session: true, persistent: false });
  assert.equal(localStorage.getItem(SHARED_LOCAL_KEY), null);
  assert.deepEqual(readSharedPlan(), { profile, workoutSetup: null, remember: false });
  sessionStorage.removeItem(SHARED_SESSION_KEY);
  assert.equal(readSharedPlan(), null);
});

test('a pending nutrition draft blocks stale inputs even when the tombstone write failed', t => {
  storage(t);
  writeSharedPlan({ profile, workoutSetup, remember: true });
  sessionStorage.setItem('liftfuel.nutrition.draft.v1', JSON.stringify({ version: 1, invalid: true }));
  assert.equal(readSharedPlan(), null);
  assert.equal(JSON.parse(localStorage.getItem(SHARED_LOCAL_KEY)).profile.profile.weight, 80);
});

test('corrupt present session never falls back to stale local', t => {
  storage(t);
  writeSharedPlan({ profile, remember: true });
  for (const raw of ['{', 'null', '{}', JSON.stringify({ version: 99 }), JSON.stringify({ version: 1, remember: true, profile, workoutSetup })]) {
    sessionStorage.setItem(SHARED_SESSION_KEY, raw);
    assert.equal(readSharedPlan(), null);
  }
  sessionStorage.removeItem(SHARED_SESSION_KEY);
  assert.deepEqual(readSharedPlan().profile, profile);
  const saved = JSON.parse(localStorage.getItem(SHARED_LOCAL_KEY));
  saved.remember = false;
  localStorage.setItem(SHARED_LOCAL_KEY, JSON.stringify(saved));
  assert.equal(readSharedPlan(), null);
});

test('invalid writes throw before changing either previous record; BMI limits do not invalidate profiles', t => {
  storage(t);
  writeSharedPlan({ profile, workoutSetup, remember: true });
  const previous = sessionStorage.getItem(SHARED_SESSION_KEY);
  for (const patch of [{ profile: { ...profile, activity: '', goal: '', targetWeight: null, weeklyRate: '' } }, { workoutSetup: { ...workoutSetup, days: '7' } }, { remember: 'true' }, { profile: { ...profile, age: '30' } }]) {
    assert.throws(() => writeSharedPlan({ profile, workoutSetup, remember: true, ...patch }));
    assert.equal(sessionStorage.getItem(SHARED_SESSION_KEY), previous);
    assert.equal(localStorage.getItem(SHARED_LOCAL_KEY), previous);
  }
  writeSharedPlan({ profile: { ...profile, weight: 110, targetWeight: 110 }, workoutSetup });
  assert.equal(readSharedPlan().profile.weight, 110);
});

test('blocked global storage getters and individual failures are guarded and reported honestly', t => {
  storage(t);
  const local = localStorage;
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('blocked'); } });
  assert.deepEqual(writeSharedPlan({ profile, remember: true }), { session: false, persistent: true });
  assert.equal(readSharedPlan(), null);
  assert.equal(clearSharedPlan(), false);
  assert.equal(local.getItem(SHARED_LOCAL_KEY), null);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
  assert.deepEqual(writeSharedPlan({ profile }), { session: false, persistent: false });
  assert.equal(clearSharedPlan(), false);
});

test('clear attempts both targeted removals without clearing other application data', t => {
  storage(t);
  writeSharedPlan({ profile, remember: true });
  sessionStorage.setItem('other', 'keep');
  localStorage.setItem('other', 'keep');
  assert.equal(clearSharedPlan(), true);
  assert.equal(readSharedPlan(), null);
  assert.equal(sessionStorage.getItem('other'), 'keep');
  assert.equal(localStorage.getItem('other'), 'keep');
  writeSharedPlan({ profile, remember: true });
  sessionStorage.removeItem = () => { throw new Error('blocked'); };
  assert.equal(clearSharedPlan(), false);
  assert.equal(localStorage.getItem(SHARED_LOCAL_KEY), null);
});

test('a failed local write leaves a readable tab plan and cannot claim persistence', t => {
  storage(t);
  localStorage.setItem = () => { throw new Error('quota'); };
  assert.deepEqual(writeSharedPlan({ profile, workoutSetup, remember: true }), { session: true, persistent: false });
  assert.deepEqual(readSharedPlan(), { profile, workoutSetup, remember: false });
  assert.equal(JSON.parse(sessionStorage.getItem(SHARED_SESSION_KEY)).remember, false);
  assert.equal(localStorage.getItem(SHARED_LOCAL_KEY), null);
});

test('another tab revoking persistence invalidates and removes a remembered session', t => {
  storage(t);
  writeSharedPlan({ profile, workoutSetup, remember: true });
  localStorage.removeItem(SHARED_LOCAL_KEY);
  assert.equal(readSharedPlan(), null);
  assert.equal(sessionStorage.getItem(SHARED_SESSION_KEY), null);
  assert.equal(readSharedPlan(), null);
});

test('a valid local replacement wins over a stale remembered session and refreshes inputs only', t => {
  storage(t);
  writeSharedPlan({ profile, workoutSetup, remember: true });
  const stale = sessionStorage.getItem(SHARED_SESSION_KEY);
  const newer = { ...profile, age: 31 };
  writeSharedPlan({ profile: newer, remember: true });
  const saved = JSON.parse(localStorage.getItem(SHARED_LOCAL_KEY));
  saved.profile.profile.eligible = true;
  saved.profile.profile.results = { calories: 1 };
  localStorage.setItem(SHARED_LOCAL_KEY, JSON.stringify(saved));
  sessionStorage.setItem(SHARED_SESSION_KEY, stale);
  assert.deepEqual(readSharedPlan(), { profile: newer, workoutSetup: null, remember: true });
  const refreshed = sessionStorage.getItem(SHARED_SESSION_KEY);
  assert.equal(/eligible|results/.test(refreshed), false);
  assert.equal(JSON.parse(refreshed).profile.profile.age, 31);
  assert.equal(JSON.parse(localStorage.getItem(SHARED_LOCAL_KEY)).profile.profile.eligible, true);
});

test('unreadable local consent never revives a remembered session or causes writes', t => {
  storage(t);
  writeSharedPlan({ profile, remember: true });
  const stale = sessionStorage.getItem(SHARED_SESSION_KEY);
  for (const key of ['getItem', 'setItem', 'removeItem']) localStorage[key] = () => { throw new Error('blocked'); };
  assert.equal(readSharedPlan(), null);
  assert.equal(sessionStorage.getItem(SHARED_SESSION_KEY), stale);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked getter'); } });
  assert.equal(readSharedPlan(), null);
  assert.equal(sessionStorage.getItem(SHARED_SESSION_KEY), stale);
});

test('tab-only snapshots survive local revocation without regaining persistence', t => {
  storage(t);
  writeSharedPlan({ profile, workoutSetup });
  localStorage.getItem = () => { throw new Error('blocked'); };
  assert.deepEqual(readSharedPlan(), { profile, workoutSetup, remember: false });
});

test('failed persistent replacement retains the new tab-only inputs, not the old saved plan', t => {
  storage(t);
  writeSharedPlan({ profile, remember: true });
  const saved = localStorage.getItem(SHARED_LOCAL_KEY);
  localStorage.setItem = () => { throw new Error('quota'); };
  const newer = { ...profile, age: 31 };
  assert.deepEqual(writeSharedPlan({ profile: newer, workoutSetup, remember: true }), { session: true, persistent: false });
  assert.deepEqual(readSharedPlan(), { profile: newer, workoutSetup, remember: false });
  assert.equal(localStorage.getItem(SHARED_LOCAL_KEY), saved);
});

test('corrupt or unconsented local replacement cannot revive a remembered session', t => {
  storage(t);
  writeSharedPlan({ profile, remember: true });
  const saved = JSON.parse(localStorage.getItem(SHARED_LOCAL_KEY));
  for (const raw of ['{', 'null', JSON.stringify({ ...saved, remember: false })]) {
    localStorage.setItem(SHARED_LOCAL_KEY, raw);
    assert.equal(readSharedPlan(), null);
  }
});

test('pending invalidation is a tab tombstone that blocks fallback without deleting saved inputs', t => {
  storage(t);
  writeSharedPlan({ profile, remember: true });
  const saved = localStorage.getItem(SHARED_LOCAL_KEY);
  assert.equal(invalidateSharedPlan(), true);
  assert.equal(readSharedPlan(), null);
  assert.equal(localStorage.getItem(SHARED_LOCAL_KEY), saved);
  writeSharedPlan({ profile: { ...profile, age: 31 } });
  assert.equal(readSharedPlan().profile.age, 31);
});

test('revocation and replacement remain authoritative even when session cache changes fail', t => {
  storage(t);
  writeSharedPlan({ profile, remember: true });
  const stale = sessionStorage.getItem(SHARED_SESSION_KEY);
  writeSharedPlan({ profile: { ...profile, age: 31 }, remember: true });
  sessionStorage.setItem(SHARED_SESSION_KEY, stale);
  sessionStorage.setItem = () => { throw new Error('quota'); };
  assert.equal(readSharedPlan().profile.age, 31);
  assert.equal(sessionStorage.getItem(SHARED_SESSION_KEY), stale);
  localStorage.removeItem(SHARED_LOCAL_KEY);
  sessionStorage.removeItem = () => { throw new Error('blocked'); };
  assert.equal(readSharedPlan(), null);
  assert.equal(readSharedPlan(), null);
  assert.equal(invalidateSharedPlan(), false);
});

test('failed persistent deletion leaves a tombstone rather than falling back to saved data', t => {
  storage(t);
  writeSharedPlan({ profile, remember: true });
  const saved = localStorage.getItem(SHARED_LOCAL_KEY);
  localStorage.removeItem = () => { throw new Error('blocked'); };
  assert.equal(clearSharedPlan(), false);
  assert.equal(localStorage.getItem(SHARED_LOCAL_KEY), saved);
  assert.equal(readSharedPlan(), null);
});

test('persistent write happens before the session claims it is remembered', t => {
  storage(t);
  const calls = [];
  for (const [name, store] of [['local', localStorage], ['session', sessionStorage]]) {
    const set = store.setItem;
    store.setItem = (key, value) => { calls.push(name); set(key, value); };
  }
  assert.deepEqual(writeSharedPlan({ profile, remember: true }), { session: true, persistent: true });
  assert.deepEqual(calls, ['local', 'session']);
  assert.equal(readSharedPlan().remember, true);
});

test('saved setup is validated on read and extras never reappear; legacy activity is not reinterpreted', t => {
  storage(t);
  writeSharedPlan({ profile, workoutSetup });
  const saved = JSON.parse(sessionStorage.getItem(SHARED_SESSION_KEY));
  saved.profile.profile.eligible = true;
  saved.workoutSetup.health = true;
  sessionStorage.setItem(SHARED_SESSION_KEY, JSON.stringify(saved));
  assert.deepEqual(readSharedPlan(), { profile, workoutSetup, remember: false });
  saved.workoutSetup.days = '7';
  sessionStorage.setItem(SHARED_SESSION_KEY, JSON.stringify(saved));
  assert.equal(readSharedPlan(), null);
  saved.workoutSetup.days = '3';
  saved.profile.version = 5;
  sessionStorage.setItem(SHARED_SESSION_KEY, JSON.stringify(saved));
  assert.equal(readSharedPlan(), null);
});

test('all-paces-blocked profiles round trip through both stores without inventing a selected pace', t => {
  storage(t);
  const before = structuredClone(blockedProfile);
  assert.deepEqual(writeSharedPlan({ profile: { ...blockedProfile, eligible: true, result: { calories: 1400 } }, workoutSetup, remember: true }), { session: true, persistent: true });
  assert.deepEqual(readSharedPlan(), { profile: blockedProfile, workoutSetup, remember: true });
  for (const raw of [sessionStorage.getItem(SHARED_SESSION_KEY), localStorage.getItem(SHARED_LOCAL_KEY)]) {
    const record = JSON.parse(raw);
    assert.equal(record.profile.version, 6);
    assert.equal(record.profile.profile.weeklyRate, '');
    assert.equal(/eligible|result/.test(raw), false);
  }
  sessionStorage.removeItem(SHARED_SESSION_KEY);
  assert.deepEqual(readSharedPlan(), { profile: blockedProfile, workoutSetup, remember: true });
  assert.deepEqual(blockedProfile, before);
});

test('blank pace is rejected if any pace is available, no choices exist, or other inputs are invalid', t => {
  storage(t);
  writeSharedPlan({ profile, remember: true });
  const previous = sessionStorage.getItem(SHARED_SESSION_KEY);
  const invalid = [
    { ...profile, goal: 'lose', targetWeight: 75, weeklyRate: '' },
    { ...blockedProfile, weight: 53, goal: 'gain', targetWeight: 54 },
    { ...blockedProfile, weight: 45, goal: 'gain', targetWeight: 49 },
    { ...blockedProfile, weeklyRate: undefined },
    { ...blockedProfile, weeklyRate: null },
    { ...blockedProfile, goal: 'unknown' },
    { ...blockedProfile, targetWeight: 51 },
    { ...blockedProfile, targetWeight: '49' },
    { ...blockedProfile, age: '56' },
    { ...blockedProfile, body: { ...body, waistRfm: '70' } },
    { ...blockedProfile, body: { ...body, regularTraining: 'false' } },
    { ...blockedProfile, body: null }
  ];
  for (const value of invalid) {
    assert.throws(() => writeSharedPlan({ profile: value, remember: true }));
    assert.equal(sessionStorage.getItem(SHARED_SESSION_KEY), previous);
    assert.equal(localStorage.getItem(SHARED_LOCAL_KEY), previous);
  }
});

test('shared-only normalizer preserves blank pace but standalone codec remains strict', async () => {
  const { normalizeSharedProfile } = await import('../../public/js/shared-plan.js');
  const { encodeProfile } = await import('../../public/js/profile-storage.js');
  assert.deepEqual(normalizeSharedProfile({ ...blockedProfile, eligible: true }), blockedProfile);
  assert.deepEqual(normalizeSharedProfile(profile), profile);
  assert.throws(() => encodeProfile(blockedProfile));
});

test('shared records require nested profile consent even for blocked blank paces', t => {
  storage(t);
  writeSharedPlan({ profile, workoutSetup });
  const record = JSON.parse(sessionStorage.getItem(SHARED_SESSION_KEY));
  record.profile.remember = false;
  sessionStorage.setItem(SHARED_SESSION_KEY, JSON.stringify(record));
  assert.equal(readSharedPlan(), null);
});
