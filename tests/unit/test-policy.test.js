import test from 'node:test';
import assert from 'node:assert/strict';
import { isAbsolute, relative } from 'node:path';
import config from '../../playwright.config.js';

test('browser tests cannot enable default media capture or write diagnostics into the project', () => {
  assert.equal(config.use.screenshot, 'off');
  assert.equal(config.use.trace, 'off');
  assert.equal(config.use.video, 'off');
  const location = relative(process.cwd(), config.outputDir);
  assert.ok(location.startsWith('..') || isAbsolute(location), 'test output must stay outside the project and its OneDrive folder');
});
