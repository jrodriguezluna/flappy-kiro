# Implementation Plan: Flappy Kiro

## Overview

Flappy Kiro is a browser-based endless scroller game built with vanilla JavaScript and HTML5 Canvas. All game logic is embedded inline in a single `index.html` file, with classes organized in dependency order: configuration constants first, then individual subsystems (Ghost, PipeSystem, CollisionSystem, ScoreSystem, AudioSystem, Renderer), and finally the GameEngine that composes them. The implementation follows a bottom-up approach where each module is implemented and tested incrementally.

Property-based tests using `fast-check` validate the 14 correctness properties from the design document. Unit tests cover rendering behavior and specific examples. Integration tests verify side-effect operations (localStorage, Audio, Canvas) using mocks. All tests run via Vitest and live in `test/flappy-kiro.test.js`, with shared mocks in `test/setup.js`.

## Tasks

- [x] 1. Set up project structure and test infrastructure
  - [x] 1.1 Create package.json with dev dependencies and test scripts
    - Add `vitest` and `fast-check` as devDependencies
    - Add `"test": "vitest run --passWithNoTests"` script for single-execution test runs (the `--passWithNoTests` flag lets checkpoints pass when optional test tasks are skipped)
    - Configure Vitest to use jsdom environment (for DOM, Canvas, localStorage APIs)
    - _Requirements: 9.1_
  - [x] 1.2 Create test/setup.js with mocks and class loader
    - Mock `CanvasRenderingContext2D` methods (fillRect, drawImage, fillText, arc, beginPath, etc.) as no-op spies
    - Mock `localStorage` with getItem/setItem/removeItem backed by a plain object
    - Mock `HTMLAudioElement` with configurable `play()` that can succeed or throw
    - Create a helper function that reads `index.html`, extracts the inline `<script>` content, evaluates it in the test context (with mocks installed), and returns access to the global classes (Ghost, PipeSystem, CollisionSystem, ScoreSystem, AudioSystem, Renderer, GameEngine, CONFIG, GameState)
    - _Requirements: 5.5, 6.3_

- [x] 2. Create HTML structure and configuration constants
  - [x] 2.1 Create index.html with HTML structure, canvas element, responsive CSS, and CONFIG constants
    - Create HTML boilerplate with `<canvas id="gameCanvas" width="800" height="600">` and references to `assets/ghosty.png`, `assets/jump.wav`, `assets/game_over.wav`
    - Add CSS for responsive canvas scaling: canvas scales via CSS width/height to fit viewport while preserving 800:600 (4:3) aspect ratio, internal resolution stays 800x600
    - Define `CONFIG` object inline: canvas dimensions (800x600), ghost params (x=400, y=300, 40x40), physics (GRAVITY=900, JUMP_IMPULSE=-350, MAX_FALL_SPEED=700), pipe params (width=60, capWidth=68, capHeight=20, gapSize=150, gapMinY=75, gapMaxY=225, speed=120, spawnInterval=1.5), storage key "flappyKiroHighScore", cloud positions
    - Define `GameState` enum: START, PLAYING, GAME_OVER
    - _Requirements: 1.4, 2.1, 2.2, 3.2, 3.5, 5.4, 8.1, 9.3_

- [x] 3. Implement Ghost module (player physics)
  - [x] 3.1 Implement Ghost class inline in index.html
    - Constructor: initialize position (x=400, y=300), velocityY=0, width=40, height=40
    - `reset()`: return to initial position (400, 300) and zero velocity
    - `applyJump()`: set velocityY to CONFIG.PHYSICS.JUMP_IMPULSE (-350 px/s)
    - `update(dt)`: apply gravity to velocity (`velocityY += GRAVITY * dt`), clamp to MAX_FALL_SPEED, update position (`y += velocityY * dt`)
    - `getBoundingBox()`: return `{x, y, width, height}`
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ]* 3.2 Write property test for jump impulse
    - **Property 1: Jump impulse resets velocity**
    - **Validates: Requirements 2.1**
    - For any initial velocity, applyJump() sets velocityY to exactly JUMP_IMPULSE
  - [ ]* 3.3 Write property test for gravity acceleration
    - **Property 2: Gravity uniformly accelerates**
    - **Validates: Requirements 2.2**
    - For any velocity v and dt, update produces v' = v + GRAVITY * dt (before clamping)
  - [ ]* 3.4 Write property test for position update
    - **Property 3: Position update follows velocity**
    - **Validates: Requirements 2.3**
    - For any position y, velocity v, and dt, updated y' = y + v * dt

- [x] 4. Implement PipeSystem module (pipe generation and scrolling)
  - [x] 4.1 Implement PipeSystem class and PipePair model inline in index.html
    - `PipePair` model: x (left edge), gapCenterY, gapSize (150), width (60), capWidth (68), capHeight (20), scored (boolean)
    - Constructor: store canvasWidth and canvasHeight, initialize spawnTimer=0 and empty pipes array
    - `update(dt)`: move all pipes left by `SPEED * dt`, remove pipes where `x + width < 0`, increment spawnTimer, spawn new pipe when `spawnTimer >= SPAWN_INTERVAL` (1.5s)
    - `spawnPipePair()`: create PipePair at `x = canvasWidth` with `gapCenterY` randomized in [75, 225], gapSize=150, reset spawnTimer
    - `getActivePipes()`: return active pipes array
    - `reset()`: clear pipes array, reset spawnTimer to 0
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]* 4.2 Write property test for pipe gap bounds
    - **Property 5: Pipe gap bounds invariant**
    - **Validates: Requirements 3.2**
    - For any generated PipePair, gapCenterY is in [75, 225] and gapSize is exactly 150
  - [ ]* 4.3 Write property test for pipe movement and lifecycle
    - **Property 6: Pipe movement and lifecycle**
    - **Validates: Requirements 3.1, 3.3, 3.4**
    - After update, x' = x - SPEED * dt; pipes with x + width < 0 are removed; new pipes spawn at right edge when timer >= 1.5s
  - [ ]* 4.4 Write property test for pipe dimensions
    - **Property 7: Pipe dimensions invariant**
    - **Validates: Requirements 3.5**
    - For any PipePair: body width=60, cap width=68 (wider than body), cap height=20

- [x] 5. Implement CollisionSystem module (AABB intersection)
  - [x] 5.1 Implement CollisionSystem class inline in index.html
    - `static aabbIntersect(boxA, boxB)`: return true if boxes overlap on both x and y axes (separating-axis test)
    - `static checkGhostPipes(ghostBox, pipes)`: return true if ghost box intersects any pipe's box
    - `static checkBoundaries(ghostBox, canvas)`: return 'top' if `ghostBox.y <= 0`, return 'bottom' if `ghostBox.y + ghostBox.height >= canvasHeight`, return null otherwise
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 5.2 Write property test for boundary detection
    - **Property 4: Boundary detection correctness**
    - **Validates: Requirements 2.4, 4.3, 4.4**
    - Returns 'top' when y <= 0, 'bottom' when y+height >= 600, null otherwise; boundary-exact positions are violations
  - [ ]* 5.3 Write property test for AABB collision
    - **Property 8: AABB collision correctness**
    - **Validates: Requirements 4.1, 4.2**
    - Returns true iff ghost box overlaps at least one pipe box on both axes simultaneously

- [x] 6. Implement ScoreSystem module (scoring and localStorage)
  - [x] 6.1 Implement ScoreSystem class inline in index.html
    - Constructor: call `loadHighScore()` to initialize highScore, set currentScore to 0
    - `reset()`: set currentScore to 0
    - `checkPipePassed(ghost, pipePair)`: if `ghost.x >= pipePair.x + pipePair.width / 2` and `!pipePair.scored`, mark scored and increment currentScore by 1, return true; otherwise return false
    - `updateHighScore()`: if `currentScore > highScore`, set `highScore = currentScore` and persist to localStorage under key "flappyKiroHighScore"
    - `loadHighScore()`: read from localStorage, parse as integer; if NaN, negative, missing, or non-numeric, default to 0
    - `getCurrentScore()` and `getHighScore()` getters
    - _Requirements: 5.1, 5.3, 5.4, 5.5_
  - [ ]* 6.2 Write property test for score increment on pipe pass
    - **Property 9: Score increment on pipe pass**
    - **Validates: Requirements 5.1**
    - When ghost.x >= pipe center, score increments by exactly 1 and pipe is marked scored; each pipe increments at most once
  - [ ]* 6.3 Write property test for high score maximum
    - **Property 10: High score is the maximum**
    - **Validates: Requirements 5.3**
    - After updateHighScore(), new high score is max(currentScore, highScore); high score never decreases
  - [ ]* 6.4 Write property test for high score load validation
    - **Property 11: High score load validation**
    - **Validates: Requirements 5.5**
    - Loaded high score is parsed integer if valid non-negative, or 0 if missing/NaN/negative/non-numeric

- [x] 7. Implement AudioSystem module (sound playback)
  - [x] 7.1 Implement AudioSystem class inline in index.html
    - Constructor: create `Audio` objects for jump and game over sounds from asset paths
    - `playJump()`: reset `currentTime = 0`, call `play()` in try/catch
    - `playGameOver()`: reset `currentTime = 0`, call `play()` in try/catch
    - All play failures silently caught: no crash, no state change, no error message
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 7.2 Write property test for audio failure resilience
    - **Property 12: Audio failure resilience**
    - **Validates: Requirements 6.3**
    - If AudioSystem.play() throws, GameEngine catches error and continues; state, score, physics unaffected

- [x] 8. Implement Renderer module (canvas drawing)
  - [x] 8.1 Implement Renderer class inline in index.html
    - Constructor: store ctx, canvasWidth, canvasHeight, ghostImage reference
    - `render(state, ghost, pipes, currentScore, highScore)`: call sub-draw methods in z-order: drawBackground → drawClouds → drawPipePair (each) → drawGhost → drawScoreBar; add state-specific overlays (drawStartScreen or drawGameOverScreen)
    - `drawBackground()`: fill entire canvas with blue color
    - `drawClouds()`: draw white circles at fixed CONFIG.CLOUDS positions
    - `drawPipePair(pipePair)`: draw green body rectangle (60px wide) and green cap rectangle (68px wide, 20px tall) at gap-facing ends of top and bottom pipe segments
    - `drawGhost(ghost)`: draw ghosty.png sprite at ghost's current position
    - `drawScoreBar(currentScore, highScore)`: draw dark bar at bottom of canvas with text "Score: X | High: Y"
    - `drawStartScreen()`: draw Ghost at center, instructions text "Press Space, Click, or Tap to begin"
    - `drawGameOverScreen()`: draw game over message and restart prompt
    - _Requirements: 1.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [ ]* 8.2 Write unit tests for rendering
    - Test score bar format string: "Score: X | High: Y" with correct values
    - Test z-order: drawBackground called before drawClouds, before pipes, before drawGhost, before drawScoreBar
    - Test pipe rendering: green body 60px wide, green cap 68px wide and 20px tall, cap wider than body
    - Test cloud rendering: drawn at fixed CONFIG.CLOUDS positions with white color
    - Test START screen: Ghost visible at center, instruction text present
    - Test canvas initialized to 800x600 internal resolution
    - _Requirements: 1.3, 1.4, 5.2, 8.1-8.6_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement GameEngine module (game loop and state machine)
  - [x] 10.1 Implement GameEngine class inline in index.html
    - Constructor: store canvas and ctx, create subsystem instances (Ghost, PipeSystem, CollisionSystem, ScoreSystem, AudioSystem, Renderer), set state to START, initialize lastTime for delta calculation
    - `start()`: attach event listeners (keydown for Space, click, touchstart), begin requestAnimationFrame loop
    - `handleInput()`: route based on state — START: transition to PLAYING + applyJump; PLAYING: applyJump + playJump sound; GAME_OVER: reset() + transition to PLAYING + applyJump
    - `update(dt)`: when PLAYING — update Ghost, update PipeSystem, check collisions via CollisionSystem, check boundaries, update score via ScoreSystem.checkPipePassed, transition to GAME_OVER on collision/boundary hit
    - `render()`: delegate to Renderer.render() with current state, ghost, pipes, scores
    - `transitionTo(newState)`: update state, trigger side effects (on GAME_OVER: call ScoreSystem.updateHighScore() + AudioSystem.playGameOver())
    - `reset()`: call ScoreSystem.reset(), PipeSystem.reset(), Ghost.reset(), set state to PLAYING
    - Game loop: calculate `deltaTime = (timestamp - lastTime) / 1000`, clamp to max ~33ms, call update() and render(), request next frame
    - _Requirements: 1.1, 1.3, 2.1, 7.1, 7.2, 7.3, 7.4_
  - [ ]* 10.2 Write property test for game over reset invariant
    - **Property 13: Game over reset invariant**
    - **Validates: Requirements 7.4**
    - After restart from GAME_OVER: score is 0, pipe list is empty, ghost at (400, 300) with zero velocity, state is PLAYING

- [x] 11. Implement asset loading and initialization
  - [x] 11.1 Implement asset loading with error handling and GameEngine start inline in index.html
    - Load `assets/ghosty.png` as `Image`, `assets/jump.wav` and `assets/game_over.wav` as `Audio` objects
    - Track loading progress with a counter; only proceed when all three assets loaded (onload/oncanplaythrough)
    - If any asset fails (onerror): display error message on canvas ("Failed to load game assets. Please refresh the page."), halt initialization (no game loop starts)
    - On successful load: create GameEngine instance, call `start()`
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ]* 11.2 Write smoke tests for asset loading
    - Test asset loading success: all assets load, GameEngine starts, START state displayed
    - Test asset loading failure: one asset fails, error message displayed, game loop does not start
    - Test initial state is START on page load
    - _Requirements: 1.1, 1.2, 7.1_

- [x] 12. Implement responsive canvas scaling
  - [x] 12.1 Implement canvas resize handler inline in index.html
    - Add `window.addEventListener('resize', ...)` listener
    - On resize: compute available viewport space, scale canvas CSS width/height to fit while preserving 800:600 (4:3) aspect ratio
    - Internal canvas resolution remains 800x600 (canvas.width/height attributes unchanged); only CSS dimensions change
    - Call resize handler once on load to fit initial viewport
    - _Requirements: 9.3_
  - [ ]* 12.2 Write property test for aspect ratio preservation
    - **Property 14: Aspect ratio preservation on resize**
    - **Validates: Requirements 9.3**
    - For any viewport dimensions, scaled canvas CSS aspect ratio remains 4:3 (800:600); internal resolution stays 800x600

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Integration and wiring
  - [x] 14.1 Wire all modules together in the game loop for end-to-end gameplay
    - Connect input handlers (Spacebar keydown, mouse click, touchstart tap) to `GameEngine.handleInput()`
    - Verify state transitions: START → PLAYING (on input), PLAYING → GAME_OVER (on collision or boundary), GAME_OVER → PLAYING (on restart input)
    - Verify update loop integrates: Ghost physics, pipe scrolling, collision checks, score updates all run per frame during PLAYING
    - Verify render loop integrates: background, clouds, pipes, ghost, score bar drawn in correct z-order each frame
    - Verify game-over side effects: high score updated and persisted, game over sound played
    - Ensure no orphaned code; all modules are instantiated and used through GameEngine
    - _Requirements: 2.1, 5.4, 7.1, 7.2, 7.3, 7.4_
  - [ ]* 14.2 Write integration tests for full game cycle
    - Test full game cycle: START → PLAYING (on input) → GAME_OVER (on collision) → PLAYING (on restart)
    - Test START → PLAYING transition on jump input
    - Test localStorage write on high score update (mocked localStorage)
    - Test audio playback triggered on jump event (mocked Audio)
    - Test audio playback triggered on game over event (mocked Audio)
    - Test audio failure does not crash the game or change state
    - _Requirements: 5.4, 6.1, 6.2, 6.3, 7.1-7.4_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key breakpoints
- All 14 correctness properties from the design are covered as individual property test sub-tasks
- Property tests use `fast-check` with minimum 100 iterations per property
- Unit tests cover rendering behavior, score bar format, and specific UI examples
- Integration tests verify side-effect operations (localStorage, Audio) with mocked browser APIs
- All game logic is inline in `index.html`; test access to classes is provided via `test/setup.js` helper that evaluates the inline script in a mocked context
- The game runs by opening `index.html` directly in any modern browser via `file://` protocol
- No external runtime libraries or build tools are required; only dev dependencies (vitest, fast-check) for testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["4.1", "3.2"] },
    { "id": 4, "tasks": ["5.1", "3.3"] },
    { "id": 5, "tasks": ["6.1", "3.4"] },
    { "id": 6, "tasks": ["7.1", "4.2"] },
    { "id": 7, "tasks": ["8.1", "4.3"] },
    { "id": 8, "tasks": ["10.1", "4.4"] },
    { "id": 9, "tasks": ["11.1", "5.2"] },
    { "id": 10, "tasks": ["12.1", "5.3"] },
    { "id": 11, "tasks": ["14.1", "6.2"] },
    { "id": 12, "tasks": ["6.3"] },
    { "id": 13, "tasks": ["6.4"] },
    { "id": 14, "tasks": ["7.2"] },
    { "id": 15, "tasks": ["8.2"] },
    { "id": 16, "tasks": ["10.2"] },
    { "id": 17, "tasks": ["11.2"] },
    { "id": 18, "tasks": ["12.2"] },
    { "id": 19, "tasks": ["14.2"] }
  ]
}
```
