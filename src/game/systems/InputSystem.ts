/**
 * Keyboard input handler for tracking pressed keys.
 * Supports WASD and arrow key controls.
 */
export class InputSystem {
  private pressedKeys: Set<string> = new Set();
  private justPressed: Set<string> = new Set();
  private justReleased: Set<string> = new Set();

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Sets up keyboard event listeners.
   */
  private setupEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));
  }

  /**
   * Handles keydown events.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    // Prevent default for game keys to avoid scrolling
    if (this.isGameKey(key)) {
      event.preventDefault();
    }

    if (!this.pressedKeys.has(key)) {
      this.justPressed.add(key);
    }
    this.pressedKeys.add(key);
  }

  /**
   * Handles keyup events.
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    this.pressedKeys.delete(key);
    this.justReleased.add(key);
  }

  /**
   * Handles window blur - releases all keys.
   */
  private handleBlur(): void {
    this.pressedKeys.clear();
  }

  /**
   * Checks if a key is a game control key.
   */
  private isGameKey(key: string): boolean {
    const gameKeys = [
      'w', 'a', 's', 'd', 'e',
      'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
      ' ', 'shift', 'control'
    ];
    return gameKeys.includes(key);
  }

  /**
   * Checks if a key is currently pressed.
   */
  isKeyDown(key: string): boolean {
    return this.pressedKeys.has(key.toLowerCase());
  }

  /**
   * Checks if a key was just pressed this frame.
   */
  isKeyJustPressed(key: string): boolean {
    return this.justPressed.has(key.toLowerCase());
  }

  /**
   * Checks if a key was just released this frame.
   */
  isKeyJustReleased(key: string): boolean {
    return this.justReleased.has(key.toLowerCase());
  }

  /**
   * Checks if any of the given keys are pressed.
   */
  isAnyKeyDown(...keys: string[]): boolean {
    return keys.some(key => this.isKeyDown(key));
  }

  /**
   * Returns the horizontal input axis (-1 to 1).
   * Left/A = -1, Right/D = 1
   */
  getHorizontalAxis(): number {
    let value = 0;
    if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) {
      value -= 1;
    }
    if (this.isKeyDown('d') || this.isKeyDown('arrowright')) {
      value += 1;
    }
    return value;
  }

  /**
   * Returns the vertical input axis (-1 to 1).
   * Up/W = -1, Down/S = 1 (in screen coordinates)
   */
  getVerticalAxis(): number {
    let value = 0;
    if (this.isKeyDown('w') || this.isKeyDown('arrowup')) {
      value -= 1;
    }
    if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) {
      value += 1;
    }
    return value;
  }

  /**
   * Returns the thrust input (forward/backward).
   * W/Up = 1 (forward), S/Down = -1 (backward)
   */
  getThrustInput(): number {
    let value = 0;
    if (this.isKeyDown('w') || this.isKeyDown('arrowup')) {
      value += 1;
    }
    if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) {
      value -= 1;
    }
    return value;
  }

  /**
   * Returns the rotation input.
   * A/Left = -1 (counter-clockwise), D/Right = 1 (clockwise)
   */
  getRotationInput(): number {
    let value = 0;
    if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) {
      value -= 1;
    }
    if (this.isKeyDown('d') || this.isKeyDown('arrowright')) {
      value += 1;
    }
    return value;
  }

  /**
   * Clears the just pressed/released states.
   * Should be called at the end of each frame.
   */
  update(): void {
    this.justPressed.clear();
    this.justReleased.clear();
  }

  /**
   * Cleans up event listeners.
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    window.removeEventListener('blur', this.handleBlur.bind(this));
  }
}
