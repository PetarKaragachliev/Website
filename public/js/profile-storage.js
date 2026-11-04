import { parseMetric } from './measurements.js';
import { validateProfile } from './nutrition.js';
import { validateBodyMeasurements } from './body-assessment.js';

export const PROFILE_STORAGE_KEY = 'liftfuel.profile.v1';
const bodyFields = ['waistRfm', 'waistWhtr', 'hip', 'chest', 'arm', 'thigh', 'wrist'];

// Pure JSON boundary: throws on invalid records; returns inputs only, never eligibility/results.
export function decodeProfile(raw) {
  const saved = JSON.parse(raw);
  if (!saved || ![1, 2, 3, 4, 5].includes(saved.version) || saved.remember !== true) throw new Error('Invalid saved record');
  const source = saved.profile;
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Invalid saved profile');
  for (const [field, min, max, whole] of [['age', 18, 56, true], ['height', 130, 230, false], ['weight', 35, 250, false]]) {
    if (typeof source[field] !== 'number' || parseMetric(source[field], min, max, whole) === null) throw new Error('Invalid saved measurement');
  }
  if (!['male', 'female'].includes(source.sex)) throw new Error('Invalid saved sex');
  if (!['', 'sedentary', 'light', 'moderate', 'very'].includes(source.activity) || !['', 'lose', 'maintain', 'muscle', 'gain'].includes(source.goal)) throw new Error('Invalid saved selection');
  const profile = Object.fromEntries(['age', 'sex', 'height', 'weight', 'activity', 'goal'].map(field => [field, source[field]]));
  if (saved.version === 5 && (!Object.hasOwn(source, 'targetWeight') || !Object.hasOwn(source, 'weeklyRate') || typeof source.weeklyRate !== 'string')) throw new Error('Incomplete or incorrectly typed saved diet fields');
  profile.targetWeight = source.targetWeight ?? null;
  profile.weeklyRate = source.weeklyRate ?? '';
  const noDiet = source.activity === '' && source.goal === '';
  const legacyTargetMissing = saved.version === 1 && source.goal !== 'maintain' && source.targetWeight === undefined && source.weeklyRate === undefined;
  if (noDiet) {
    if (profile.targetWeight !== null || profile.weeklyRate !== '') throw new Error('Unexpected saved diet choices');
  } else if (!legacyTargetMissing) {
    if (saved.version === 1 && source.goal === 'maintain') {
      profile.targetWeight = source.weight;
      profile.weeklyRate = '0';
    }
    if (typeof profile.targetWeight !== 'number' || typeof profile.weeklyRate !== 'string') throw new Error('Invalid saved diet types');
    const validated = validateProfile({ ...profile, includeAssessment: false });
    if (Object.keys(validated.errors).length) throw new Error('Invalid saved diet');
    profile.targetWeight = validated.profile.targetWeight;
    profile.weeklyRate = validated.profile.weeklyRate;
  } else if (!source.activity) throw new Error('Missing saved activity');

  const body = Object.fromEntries(bodyFields.map(field => [field, null]));
  body.regularTraining = false;
  const stored = source.body;
  if (saved.version === 5) {
    if (!stored || typeof stored !== 'object' || Array.isArray(stored) || typeof stored.regularTraining !== 'boolean') throw new Error('Invalid saved body');
    for (const field of bodyFields) {
      if (!Object.hasOwn(stored, field) || (stored[field] !== null && (typeof stored[field] !== 'number' || !Number.isFinite(stored[field])))) throw new Error('Invalid saved body type');
      body[field] = stored[field];
    }
    body.regularTraining = stored.regularTraining;
    if (Object.keys(validateBodyMeasurements(body).errors).length) throw new Error('Invalid saved body measurements');
  } else if (saved.version >= 3 && stored !== null && stored !== undefined) {
    if (typeof stored !== 'object' || Array.isArray(stored) || typeof stored.waist !== 'number' || parseMetric(stored.waist, 35, 200) === null) throw new Error('Invalid legacy waist');
    if (saved.version === 4 && !['iliac', 'midpoint'].includes(stored.waistSite)) throw new Error('Unknown legacy waist protocol');
    body[saved.version === 4 && stored.waistSite === 'iliac' ? 'waistRfm' : 'waistWhtr'] = stored.waist;
  }
  profile.body = body;
  return profile;
}

// Accepts a canonical, normalized profile and emits the consented v5 record.
export function encodeProfile(profile) {
  const canonical = decodeProfile(JSON.stringify({ version: 5, remember: true, profile }));
  return JSON.stringify({ version: 5, remember: true, profile: canonical });
}
