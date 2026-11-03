import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync, mkdtempSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = fileURLToPath(new URL('../../scripts/check-workspace.js', import.meta.url));

test('development guard accepts the active checkout outside sync roots', () => {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('development guard resolves a synced-root alias before checking containment', () => {
  const parent = join(tmpdir(), 'opencode');
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(join(parent, 'workspace-guard-'));
  try {
    const target = join(directory, 'synced-data');
    const alias = join(directory, 'sync-alias');
    mkdirSync(target);
    symlinkSync(target, alias, 'junction');
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^onedrive(?:consumer|commercial)?$/i.test(name)));
    env.OneDrive = alias;
    const result = spawnSync(process.execPath, [script], { cwd: target, env, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Refusing to run.*OneDrive/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('development guard rejects a workspace within a configured OneDrive root without creating files', () => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^onedrive(?:consumer|commercial)?$/i.test(name)));
  env.OneDrive = process.cwd();
  const result = spawnSync(process.execPath, [script], { env, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing to run.*OneDrive/);
});
