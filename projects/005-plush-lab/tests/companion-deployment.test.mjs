import test from 'node:test';
import assert from 'node:assert/strict';
import {supportsLocalCompanionService} from '../src/companion-deployment.js';

test('public Pages and remote origins never enable loopback AI requests', () => {
  for (const url of ['https://yydshly.github.io/0930_codex_project/', 'https://localhost.example.com/', 'https://example.com/', 'file:///studio.html']) {
    assert.equal(supportsLocalCompanionService(new URL(url)), false, url);
  }
});
test('the existing HTTP loopback development service remains available', () => {
  for (const url of ['http://localhost:8875/', 'http://127.0.0.1:8875/', 'http://[::1]:8875/']) {
    assert.equal(supportsLocalCompanionService(new URL(url)), true, url);
  }
});
