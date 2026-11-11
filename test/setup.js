/**
 * test/setup.js
 *
 * Shared mock setup and class loader for Flappy Kiro tests.
 *
 * Provides:
 *  - Canvas 2D context mocks (CanvasRenderingContext2D.prototype spies)
 *  - localStorage mock (plain-object backed)
 *  - Audio mock (configurable play() that can succeed or throw)
 *  - loadGameClasses() helper that reads index.html, extracts the inline
 *    <script> block, and evaluates it so game classes land on globalThis.
 */

import { vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(PROJECT_ROOT, 'index.html');

// ---------------------------------------------------------------------------
// 1. Canvas 2D context mock
//    Patches CanvasRenderingContext2D.prototype with vi.fn() spies.
//    measureText returns { width: 0 } so layout code doesn't crash.
// ---------------------------------------------------------------------------
export function installCanvasMocks() {
  const proto = globalThis.CanvasRenderingContext2D?.prototype;
  if (!proto) return; // jsdom may not expose this — guard gracefully

  const noOp = () => {};
  const methods = [
    'fillRect',
    'clearRect',
    'drawImage',
    'fillText',
    'strokeText',
    'arc',
    'beginPath',
    'closePath',
    'fill',
    'stroke',
    'moveTo',
    'lineTo',
    'save',
    'restore',
    'translate',
    'scale',
  ];

  for (const method of methods) {
    proto[method] = vi.fn(noOp);
  }

  // measureText must return an object with a width property
  proto.measureText = vi.fn(() => ({ width: 0 }));
}

// ---------------------------------------------------------------------------
// 2. localStorage mock
//    A plain-object store with getItem / setItem / removeItem / clear.
//    Replaces globalThis.localStorage so game code hits this mock.
// ---------------------------------------------------------------------------
export function createLocalStorageMock() {
  let store = {};

  const mock = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    // Convenience: expose the backing store for test assertions
    _store() {
      return store;
    },
  };

  return mock;
}

export function installLocalStorageMock() {
  const mock = createLocalStorageMock();
  Object.defineProperty(globalThis, 'localStorage', {
    value: mock,
    writable: true,
    configurable: true,
  });
  return mock;
}

// ---------------------------------------------------------------------------
// 3. Audio mock
//    A class that mimics HTMLAudioElement for game code.
//    - mockAudioShouldFail: module-level flag; set to true to make play() throw.
//    - mockAudioError: the Error thrown when mockAudioShouldFail is true.
// ---------------------------------------------------------------------------
export let mockAudioShouldFail = false;
export let mockAudioError = new Error('Audio play() blocked by mock');

export function setMockAudioShouldFail(value, error) {
  mockAudioShouldFail = value;
  if (error !== undefined) mockAudioError = error;
}

export class MockAudio {
  constructor(src) {
    this.src = src || '';
    this.currentTime = 0;
  }

  play() {
    if (mockAudioShouldFail) {
      throw mockAudioError;
    }
    // Return a resolved Promise to match the real HTMLAudioElement.play() API
    return Promise.resolve();
  }
}

export function installAudioMock() {
  globalThis.Audio = MockAudio;
}

// ---------------------------------------------------------------------------
// 4. Install all mocks at once (convenience)
// ---------------------------------------------------------------------------
export function installAllMocks() {
  installCanvasMocks();
  const localStorageMock = installLocalStorageMock();
  installAudioMock();
  return { localStorageMock };
}

// ---------------------------------------------------------------------------
// 5. loadGameClasses()
//    Reads index.html, extracts the inline <script>…</script> content,
//    installs mocks, evaluates the script so classes land on globalThis,
//    and returns references to all game classes and constants.
//
//    If index.html does not exist yet (it is created in task 2.1), this
//    function throws a descriptive error so tests can skip gracefully.
// ---------------------------------------------------------------------------
export function loadGameClasses() {
  if (!fs.existsSync(INDEX_HTML)) {
    throw new Error(
      `index.html not found at ${INDEX_HTML}. ` +
        'Game classes are not available yet (task 2.1 creates index.html).'
    );
  }

  const html = fs.readFileSync(INDEX_HTML, 'utf8');

  // Extract the first <script>…</script> block (inline game script)
  // The regex is non-greedy and handles multi-line content.
  const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  if (!scriptMatch) {
    throw new Error('No <script> block found in index.html.');
  }

  const scriptContent = scriptMatch[1];

  // Ensure mocks are installed before evaluating game code
  installAllMocks();

  // Evaluate the script in the current global context so that class
  // declarations (which are NOT auto-global via `var`) are hoisted onto
  // globalThis by wrapping them with explicit global assignments.
  //
  // Strategy: use vm.runInThisContext so the script runs in the same realm
  // as the test, letting it read/write globalThis naturally.
  try {
    vm.runInThisContext(scriptContent);
  } catch (err) {
    throw new Error(`Failed to evaluate inline script from index.html: ${err.message}`);
  }

  // Return named references; each may be undefined if the script doesn't
  // define that name yet — callers should guard accordingly.
  return {
    Ghost: globalThis.Ghost,
    PipeSystem: globalThis.PipeSystem,
    CollisionSystem: globalThis.CollisionSystem,
    ScoreSystem: globalThis.ScoreSystem,
    AudioSystem: globalThis.AudioSystem,
    Renderer: globalThis.Renderer,
    GameEngine: globalThis.GameEngine,
    CONFIG: globalThis.CONFIG,
    GameState: globalThis.GameState,
  };
}
