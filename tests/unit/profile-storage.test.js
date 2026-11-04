import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeProfile, encodeProfile } from '../../public/js/profile-storage.js';

const body = { waistRfm: 80, waistWhtr: 78, hip: null, chest: 100, arm: null, thigh: null, wrist: 17, regularTraining: true };
const profile = { age: 30, sex: 'male', height: 180, weight: 75, activity: '', goal: '', targetWeight: null, weeklyRate: '', body };
const record = (version, value) => JSON.stringify({ version, remember: true, profile: value });
const diet = { activity: 'moderate', goal: 'maintain', targetWeight: 75, weeklyRate: '0' };

test('v5 body-only round trip stores only canonical inputs, never consent or results', () => {
  const raw = encodeProfile({ ...profile, eligible: true, assessment: { bmi: 23 } });
  assert.equal(JSON.parse(raw).version, 5);
  assert.deepEqual(decodeProfile(raw), profile);
  assert.equal(raw.includes('eligible'), false);
  assert.equal(raw.includes('assessment'), false);
});

test('v5 nutrition selections survive a round trip', () => {
  const value = { ...profile, ...diet };
  assert.deepEqual(decodeProfile(encodeProfile(value)), value);
});

test('v5 does not silently normalize an incorrectly typed weeklyRate', () => {
  assert.throws(() => decodeProfile(record(5, { ...profile, weeklyRate: null })));
  assert.throws(() => encodeProfile({ ...profile, weeklyRate: null }));
});

test('v4 iliac and midpoint retain their distinct measurement origins', () => {
  for (const site of ['iliac', 'midpoint']) {
    const restored = decodeProfile(record(4, { ...profile, ...diet, body: { waist: 82, waistSite: site, bodyDescription: 'muscular', bodyFat: 18 } }));
    assert.equal(restored.body.waistRfm, site === 'iliac' ? 82 : null);
    assert.equal(restored.body.waistWhtr, site === 'midpoint' ? 82 : null);
    assert.equal(restored.body.regularTraining, false);
    assert.equal(Object.hasOwn(restored.body, 'bodyFat'), false);
  }
});

test('v3 waist is midpoint, never an invented RFM measurement', () => {
  const restored = decodeProfile(record(3, { ...profile, ...diet, body: { waist: 82 } }));
  assert.equal(restored.body.waistWhtr, 82);
  assert.equal(restored.body.waistRfm, null);
});

test('v1/v2 absent body restores blank waists and v1 preserves its old goal', () => {
  for (const version of [1, 2]) {
    const restored = decodeProfile(record(version, { ...profile, ...diet, body: null }));
    assert.equal(restored.body.waistWhtr, null);
    assert.equal(restored.body.waistRfm, null);
    assert.equal(restored.body.regularTraining, false);
  }
  const restored = decodeProfile(record(1, { age: 30, sex: 'male', height: 180, weight: 75, activity: 'light', goal: 'lose' }));
  assert.equal(restored.goal, 'lose');
  assert.equal(restored.targetWeight, null);
  assert.equal(restored.weeklyRate, '');
});

test('malformed records and unknown v4 waist protocols are rejected', () => {
  for (const raw of ['{', 'null', '[]', record(6, profile), JSON.stringify({ version: 5, remember: false, profile }), record(4, { ...profile, ...diet, body: { waist: 80, waistSite: 'unknown' } })]) {
    assert.throws(() => decodeProfile(raw));
  }
});

test('v5 rejects incomplete bodies, incorrectly typed extras and invalid diet choices', () => {
  for (const patch of [{ regularTraining: 'false' }, { hip: '95' }, { arm: -1 }, { waistRfm: null }, { waistWhtr: {} }, { wrist: undefined }]) {
    assert.throws(() => decodeProfile(record(5, { ...profile, body: { ...body, ...patch } })));
  }
  for (const patch of [{ age: '30' }, { sex: '' }, { activity: 'unknown' }, { goal: 'unknown' }, { activity: 'light' }, { targetWeight: 'bad' }, { weeklyRate: 'bad' }, { targetWeight: undefined }, { weeklyRate: undefined }]) {
    assert.throws(() => decodeProfile(record(5, { ...profile, ...patch })));
  }
});

test('eligibility is never returned from any stored version', () => {
  for (const version of [1, 2, 3, 4, 5]) {
    const value = version === 5 ? profile : { ...profile, ...diet, body: version < 3 ? null : { waist: 80, waistSite: 'iliac' } };
    const restored = decodeProfile(record(version, { ...value, eligible: true, includeAssessment: true }));
    assert.equal(Object.hasOwn(restored, 'eligible'), false);
    assert.equal(Object.hasOwn(restored, 'includeAssessment'), false);
  }
});
