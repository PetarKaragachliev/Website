import { decodeProfile, encodeProfile } from './profile-storage.js';
import { calculateWorkout } from './workout.js';
import { calculateNutrition, getWeeklyPaces } from './nutrition.js';

export const SHARED_SESSION_KEY = 'liftfuel.shared.session.v1';
export const SHARED_LOCAL_KEY = 'liftfuel.shared.saved.v1';
const setupFields = ['environment', 'equipment', 'experience', 'days', 'duration', 'currentTraining'];

export function normalizeSharedProfile(profile) {
  if (profile?.weeklyRate !== '' || !profile.activity || !profile.goal) return decodeProfile(encodeProfile(profile));
  const paces = getWeeklyPaces(profile.goal, profile.weight);
  if (!paces.length) throw new Error('Invalid shared diet choices');
  // A candidate validates all other codec fields, but is never a selected or saved pace.
  const canonical = decodeProfile(encodeProfile({ ...profile, weeklyRate: paces[0].value }));
  const allBlocked = paces.every(({ value }) => {
    const output = calculateNutrition({ ...canonical, weeklyRate: value, eligible: true, includeAssessment: false });
    return !Object.keys(output.errors).length && output.result === null && ['calories-range', 'pace-range'].includes(output.limitation);
  });
  if (!allBlocked) throw new Error('Choose an available weekly pace');
  return { ...canonical, weeklyRate: '' };
}

function canonicalInputs({ profile, workoutSetup = null, remember = false }) {
  if (typeof remember !== 'boolean') throw new Error('Invalid remember preference');
  const canonical = normalizeSharedProfile(profile);
  if (!canonical.activity || !canonical.goal) throw new Error('A shared plan requires activity and goal');
  let setup = null;
  if (workoutSetup !== null) {
    if (!workoutSetup || typeof workoutSetup !== 'object' || Array.isArray(workoutSetup)) throw new Error('Invalid workout setup');
    const { errors } = calculateWorkout({ ...workoutSetup, age: String(canonical.age), goal: canonical.goal, activity: canonical.activity, eligible: true });
    if (Object.keys(errors).length) throw new Error('Invalid workout setup');
    setup = Object.fromEntries(setupFields.map(field => [field, field === 'equipment' ? [...workoutSetup.equipment] : workoutSetup[field]]));
  }
  return { profile: canonical, workoutSetup: setup, remember };
}

function decodeSharedPlan(raw) {
  const saved = JSON.parse(raw);
  if (!saved || saved.version !== 1 || saved.invalidated === true || typeof saved.remember !== 'boolean' || !Object.hasOwn(saved, 'workoutSetup') || saved.profile?.version !== 6 || saved.profile.remember !== true) throw new Error('Invalid shared record');
  return canonicalInputs({ profile: saved.profile.profile, workoutSetup: saved.workoutSetup, remember: saved.remember });
}

function encodeSharedPlan({ profile, workoutSetup, remember }) {
  return JSON.stringify({ version: 1, profile: { version: 6, remember: true, profile }, workoutSetup, remember });
}

export function readSharedPlan() {
  try {
    if ((globalThis.sessionStorage?.getItem('liftfuel.nutrition.draft.v1') ?? null) !== null) return null;
    const session = globalThis.sessionStorage?.getItem(SHARED_SESSION_KEY) ?? null;
    const tab = session === null ? null : decodeSharedPlan(session);
    if (tab?.remember === false) return tab;
    // Remembered tab snapshots are caches, never independent proof of current consent.
    const local = globalThis.localStorage?.getItem(SHARED_LOCAL_KEY) ?? null;
    if (local === null) {
      if (tab) {
        try { globalThis.sessionStorage?.removeItem(SHARED_SESSION_KEY); } catch { /* Revoked even if cache removal fails. */ }
      }
      return null;
    }
    const saved = decodeSharedPlan(local);
    if (!saved.remember) return null;
    if (tab && session !== local) {
      try { globalThis.sessionStorage?.setItem(SHARED_SESSION_KEY, encodeSharedPlan(saved)); } catch { /* A failed cache refresh cannot make the older snapshot authoritative. */ }
    }
    return saved;
  } catch {
    // An unreadable/present session must not revive a stale persistent plan.
    return null;
  }
}

// Invalid inputs throw before either store is touched, preserving previous records.
// Flags mean a successful write to that store; tab-only writes report persistent:false.
export function writeSharedPlan({ profile, workoutSetup = null, remember = false }) {
  const canonical = canonicalInputs({ profile, workoutSetup, remember });
  const raw = encodeSharedPlan(canonical);
  const flags = { session: false, persistent: false };
  try {
    if (remember && globalThis.localStorage) {
      globalThis.localStorage.setItem(SHARED_LOCAL_KEY, raw);
      flags.persistent = true;
    } else if (!remember) globalThis.localStorage?.removeItem(SHARED_LOCAL_KEY);
  } catch { /* A failed persistent write must not hide a successful tab write. */ }
  try {
    if (globalThis.sessionStorage) {
      globalThis.sessionStorage.setItem(SHARED_SESSION_KEY, flags.persistent ? raw : encodeSharedPlan({ ...canonical, remember: false }));
      flags.session = true;
    }
  } catch { /* Storage can be denied or full independently of the other store. */ }
  return flags;
}

// Pending edits block this tab's fallback without modifying saved inputs or consent.
export function invalidateSharedPlan() {
  try {
    if (!globalThis.sessionStorage) return false;
    globalThis.sessionStorage.setItem(SHARED_SESSION_KEY, JSON.stringify({ version: 1, invalidated: true }));
    return true;
  } catch {
    return false;
  }
}

export function clearSharedPlan() {
  let cleared = true;
  for (const [store, key] of [['sessionStorage', SHARED_SESSION_KEY], ['localStorage', SHARED_LOCAL_KEY]]) {
    try {
      if (!globalThis[store]) cleared = false;
      else globalThis[store].removeItem(key);
    } catch {
      cleared = false;
    }
  }
  if (!cleared) invalidateSharedPlan();
  return cleared;
}
