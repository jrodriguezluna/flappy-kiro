# Requirements Document

## Introduction

Flappy Kiro is a browser-based endless scroller game inspired by the classic Flappy Bird. The player controls a ghost character that must navigate through gaps between green pipes by timing jumps. The game features a retro/sketch aesthetic with a blue background, decorative clouds, and a score display. The game runs entirely in the browser using vanilla JavaScript and HTML5 Canvas, requiring no external dependencies or build tools.

## Glossary

- **Game_Engine**: The core JavaScript module that manages game state, the game loop, and coordinates all subsystems.
- **Ghost**: The player-controlled character rendered using `assets/ghosty.png` that the player navigates through pipe gaps.
- **Pipe_System**: The subsystem responsible for generating, moving, and rendering pipe obstacles.
- **Collision_System**: The subsystem that detects intersections between the Ghost and pipes or canvas boundaries.
- **Score_System**: The subsystem that tracks the current score, high score, and persists the high score to localStorage.
- **Audio_System**: The subsystem that plays sound effects using `assets/jump.wav` and `assets/game_over.wav`.
- **Renderer**: The subsystem that draws all visual elements on the HTML5 Canvas.
- **Pipe_Pair**: A pair of pipes (one from the top, one from the bottom) with a gap between them that the Ghost must pass through.
- **START state**: The initial state showing instructions before the game begins.
- **PLAYING state**: The active gameplay state where the Ghost is subject to gravity and pipes scroll.
- **GAME_OVER state**: The state displayed after a collision, showing the final score and restart prompt.

## Requirements

### Requirement 1: Game Initialization and Asset Loading

**User Story:** As a player, I want the game to load all assets and display a start screen, so that I know the game is ready to play.

#### Acceptance Criteria

1. WHEN the browser loads the game page, THE Game_Engine SHALL load the ghost sprite, jump sound, and game over sound before displaying any game content
2. IF any asset fails to load, THE Game_Engine SHALL display an error message and halt initialization rather than proceeding with missing assets
3. WHEN all assets have loaded, THE Game_Engine SHALL display the START state with the Ghost visible at the horizontal center and 50% canvas height, the background rendered, and instructions reading "Press Space, Click, or Tap to begin"
4. THE Game_Engine SHALL initialize the HTML5 Canvas to 800×600 pixels and scale it to fit the browser viewport preserving the original aspect ratio, with no distortion

### Requirement 2: Player Movement and Physics

**User Story:** As a player, I want to control the Ghost's vertical movement with intuitive input, so that I can navigate through the pipe gaps.

#### Acceptance Criteria

1. WHILE the game is in the PLAYING state, WHEN the player presses the Spacebar, clicks the mouse, or taps the touchscreen, THE Game_Engine SHALL apply an upward velocity impulse to the Ghost
2. WHILE the game is in the PLAYING state, THE Game_Engine SHALL apply a constant downward gravity force to the Ghost on every frame
3. WHILE the game is in the PLAYING state, THE Game_Engine SHALL update the Ghost's vertical position based on its current velocity on every frame
4. IF the Ghost's bounding box extends above the top edge of the canvas, THEN THE Game_Engine SHALL transition to the GAME_OVER state

### Requirement 3: Pipe Generation and Scrolling

**User Story:** As a player, I want pipe obstacles to appear and scroll from right to left, so that I have challenges to navigate.

#### Acceptance Criteria

1. WHILE the game is in the PLAYING state, THE Pipe_System SHALL generate a new Pipe_Pair at the right edge of the canvas at intervals of 1.5 seconds
2. WHEN a Pipe_Pair is generated, THE Pipe_System SHALL position its gap center at a random vertical position between 75 and 225 pixels from the top of the canvas, with a fixed gap size of 150 pixels
3. WHILE the game is in the PLAYING state, THE Pipe_System SHALL move all Pipe_Pairs from right to left at 120 pixels per second
4. WHEN the right edge of a Pipe_Pair has moved past the left edge of the canvas, THE Pipe_System SHALL remove that Pipe_Pair from the active list
5. WHILE the game is in the PLAYING state, THE Renderer SHALL draw each pipe as a green rectangle 60 pixels wide with a green cap 68 pixels wide and 20 pixels tall at the gap-facing end

### Requirement 4: Collision Detection

**User Story:** As a player, I want the game to detect collisions accurately, so that the game ends when I hit an obstacle.

#### Acceptance Criteria

1. WHILE the game is in the PLAYING state, THE Collision_System SHALL check for intersection between the Ghost's bounding box and each pipe currently visible within the canvas boundaries on every frame
2. IF the Ghost's bounding box intersects any pipe's bounding box, THEN THE Game_Engine SHALL transition to the GAME_OVER state
3. IF the Ghost's bounding box reaches or extends beyond the bottom edge of the canvas, THEN THE Game_Engine SHALL transition to the GAME_OVER state
4. IF the Ghost's bounding box reaches or extends beyond the top edge of the canvas, THEN THE Game_Engine SHALL transition to the GAME_OVER state

### Requirement 5: Scoring and High Score Persistence

**User Story:** As a player, I want to see my current score and high score, so that I can track my performance across sessions.

#### Acceptance Criteria

1. WHEN the Ghost's horizontal position passes the center of a Pipe_Pair for the first time, THE Score_System SHALL increment the current score by exactly one
2. WHILE the game is in the PLAYING or GAME_OVER state, THE Renderer SHALL display the current score and high score in a dark bar at the bottom of the canvas in the format "Score: X | High: Y"
3. WHEN the game transitions to the GAME_OVER state, THE Score_System SHALL compare the current score with the stored high score and update the high score if the current score is greater
4. WHEN the high score is updated, THE Score_System SHALL persist the new high score to the browser's localStorage under the key "flappyKiroHighScore"
5. WHEN the Game_Engine loads, THE Score_System SHALL read the high score from localStorage; IF no value exists or the value is not a valid non-negative integer, THE Score_System SHALL initialize the displayed high score to zero

### Requirement 6: Audio System

**User Story:** As a player, I want sound effects for jumping and game over, so that the game provides audio feedback.

#### Acceptance Criteria

1. WHILE the game is NOT in the GAME_OVER state, WHEN the player triggers a jump action, THE Audio_System SHALL play the jump sound effect
2. WHEN the Game_Engine transitions to the GAME_OVER state, THE Audio_System SHALL play the game over sound effect
3. IF the Audio_System fails to play a sound effect, THE Game_Engine SHALL continue operating normally without interruption

### Requirement 7: Game State Management

**User Story:** As a player, I want clear game states with smooth transitions, so that I understand when to start, play, and restart.

#### Acceptance Criteria

1. THE Game_Engine SHALL maintain exactly three states: START, PLAYING, and GAME_OVER, and SHALL initialize to the START state on page load
2. WHILE the game is in the START state, WHEN the player triggers a jump action, THE Game_Engine SHALL transition to the PLAYING state
3. WHILE the game is in the PLAYING state, WHEN the Collision_System detects the Ghost hitting a pipe or the Ghost's bounding box moving beyond the top or bottom edge of the canvas, THE Game_Engine SHALL transition to the GAME_OVER state
4. WHILE the game is in the GAME_OVER state, WHEN the player triggers a restart action, THE Game_Engine SHALL reset the score to zero, clear all active Pipe_Pairs, reposition the Ghost to its initial position, and transition to the PLAYING state

### Requirement 8: Visual Rendering

**User Story:** As a player, I want a retro-styled visual experience, so that the game looks nostalgic and appealing.

#### Acceptance Criteria

1. THE Renderer SHALL draw a blue background covering the full canvas area on every frame
2. THE Renderer SHALL draw non-interactive white clouds at fixed positions within the background on every frame
3. THE Renderer SHALL draw the Ghost using the ghosty.png sprite at the Ghost's current position on every frame
4. THE Renderer SHALL draw each pipe with a green body and a green cap segment wider than the body at the gap-facing end
5. THE Renderer SHALL draw a dark score bar at the bottom of the canvas displaying "Score: X | High: Y" where X is the current score and Y is the high score
6. THE Renderer SHALL draw visual elements in the following z-order: background first, then clouds, then pipes, then Ghost, then score bar on top of all other elements

### Requirement 9: Browser Compatibility and Independence

**User Story:** As a player, I want the game to run in any modern browser without installation, so that I can play immediately.

#### Acceptance Criteria

1. THE Game_Engine SHALL run entirely in the browser using vanilla JavaScript and HTML5 Canvas without requiring external libraries or build tools
2. THE Game_Engine SHALL load and run by opening a single HTML entry file in any modern browser (Chrome, Firefox, Safari, Edge), where that entry file is permitted to reference accompanying local asset files
3. WHEN the browser viewport is resized, THE Game_Engine SHALL scale the canvas to fit within the available space while preserving the game's fixed aspect ratio established at initialization
