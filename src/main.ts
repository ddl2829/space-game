import { Game } from './game/Game';

/**
 * Game entry point.
 * Initializes and starts the game when the DOM is ready.
 */
function init(): void {
  try {
    // Create game instance
    const game = new Game({
      canvasId: 'game-canvas',
      debug: false
    });

    // Start the game loop
    game.start();

    // Expose game instance globally for debugging
    (window as unknown as { game: Game }).game = game;

    // Add keyboard shortcut for debug mode
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        game.toggleDebug();
      }
    });

  } catch (error) {
    console.error('Failed to initialize game:', error);

    // Display error message on screen
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      const ctx = (canvas as HTMLCanvasElement).getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.font = '20px sans-serif';
        ctx.fillText('Failed to initialize game. Check console for details.', 50, 50);
      }
    }
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
