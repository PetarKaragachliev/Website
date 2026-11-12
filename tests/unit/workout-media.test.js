import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workoutMedia } from '../../public/js/workout-media.js';

test('only the eight researched candidates are mapped with source and variant caveats', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(workoutMedia).map(([id, media]) => [id, media.videoId])), {
    'leg-press': 'sEM_zo9w2ss', 'db-hinge': 'xAL7lHwj30E', 'chest-press': 'sqNwDkUU_Ps', 'cable-row': 'lJoozxC0Rns',
    'wall-pushup': '-VmCZ7BuAbQ', bridge: 'mm4wbmtDrUc', 'db-row': 'DhewkuU_95s', core: 'eEhoSeBFoBk'
  });
  for (const media of Object.values(workoutMedia)) {
    assert.ok(media.source.length > 0);
    assert.ok(media.caveat.length > 0);
  }
  assert.match(workoutMedia['db-hinge'].source, /Onnit Academy/);
  assert.match(workoutMedia['chest-press'].source, /PureGym/);
  assert.equal(workoutMedia['band-row'], undefined);
});
