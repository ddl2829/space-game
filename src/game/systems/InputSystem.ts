import { VirtualController } from '../ui/VirtualController';

/**
 * Keyboard input handler for tracking pressed keys.
 * Supports WASD and arrow key controls, plus virtual controller for touch devices.
 */
export class InputSystem {
  private pressedKeys: Set<string> = new Set();
  private justPressed: Set<string> = new Set();
  private justReleased: Set<string> = new Set();

  // Virtual controller for touch devices
  private virtualController: VirtualController | null = null;

  // Track virtual controller button states for just-pressed detection
  private prevVirtualAction: boolean = false;
  private prevVirtualInteract: boolean = false;
  private virtualActionJustPressed: boolean = false;
  private virtualInteractJustPressed: boolean = false;

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
   * For virtual controller, returns the joystick magnitude (always positive thrust in facing direction).
   */
  getThrustInput(): number {
    let value = 0;
    if (this.isKeyDown('w') || this.isKeyDown('arrowup')) {
      value += 1;
    }
    if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) {
      value -= 1;
    }

    // For virtual controller, use joystick magnitude as thrust
    // (ship will rotate to face the joystick direction via getTargetAngle)
    if (this.virtualController?.isEnabled()) {
      const virtualState = this.virtualController.getState();
      // Use virtual joystick magnitude if keyboard has no input
      if (value === 0 && virtualState.joystickMagnitude > 0) {
        value = virtualState.joystickMagnitude;
      }
    }

    return value;
  }

  /**
   * Returns the rotation input.
   * A/Left = -1 (counter-clockwise), D/Right = 1 (clockwise)
   * Note: For virtual controller, rotation is handled automatically via getTargetAngle().
   */
  getRotationInput(): number {
    let value = 0;
    if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) {
      value -= 1;
    }
    if (this.isKeyDown('d') || this.isKeyDown('arrowright')) {
      value += 1;
    }

    // Virtual controller doesn't use rotation input directly anymore
    // The ship auto-rotates to face the joystick direction via getTargetAngle()

    return value;
  }

  /**
   * Returns the target angle for the ship to face (in radians).
   * Used by virtual controller for absolute direction movement.
   * Returns null if no virtual controller input or using keyboard.
   */
  getTargetAngle(): number | null {
    if (this.virtualController?.isEnabled()) {
      const virtualState = this.virtualController.getState();
      if (virtualState.joystickMagnitude > 0) {
        return virtualState.joystickAngle;
      }
    }
    return null;
  }

  /**
   * Check if using virtual controller for movement (absolute direction mode).
   */
  isUsingVirtualJoystick(): boolean {
    if (this.virtualController?.isEnabled()) {
      const virtualState = this.virtualController.getState();
      return virtualState.joystickMagnitude > 0;
    }
    return false;
  }

  /**
   * Checks if the action key (spacebar) is currently pressed.
   * Used for shooting or mining in the ship's facing direction.
   * Combines keyboard and virtual controller input.
   */
  isActionPressed(): boolean {
    const keyboardAction = this.isKeyDown(' ');

    // Check virtual controller
    if (this.virtualController?.isEnabled()) {
      const virtualState = this.virtualController.getState();
      return keyboardAction || virtualState.actionPressed;
    }

    return keyboardAction;
  }

  /**
   * Checks if the action key was just pressed this frame.
   */
  isActionJustPressed(): boolean {
    return this.isKeyJustPressed(' ') || this.virtualActionJustPressed;
  }

  /**
   * Checks if the action key was just released this frame.
   */
  isActionJustReleased(): boolean {
    return this.isKeyJustReleased(' ');
  }

  /**
   * Checks if the interact key (E) is currently pressed.
   * Used for docking and interacting with objects.
   * Combines keyboard and virtual controller input.
   */
  isInteractPressed(): boolean {
    const keyboardInteract = this.isKeyDown('e');

    // Check virtual controller
    if (this.virtualController?.isEnabled()) {
      const virtualState = this.virtualController.getState();
      return keyboardInteract || virtualState.interactPressed;
    }

    return keyboardInteract;
  }

  /**
   * Checks if the interact key was just pressed this frame.
   */
  isInteractJustPressed(): boolean {
    return this.isKeyJustPressed('e') || this.virtualInteractJustPressed;
  }

  /**
   * Sets the virtual controller instance.
   * The virtual controller provides touch input for mobile devices.
   */
  setVirtualController(controller: VirtualController): void {
    this.virtualController = controller;
  }

  /**
   * Gets the virtual controller instance.
   */
  getVirtualController(): VirtualController | null {
    return this.virtualController;
  }

  /**
   * Clears the just pressed/released states.
   * Should be called at the end of each frame.
   */
  update(): void {
    this.justPressed.clear();
    this.justReleased.clear();

    // Track virtual controller button state changes
    if (this.virtualController?.isEnabled()) {
      const state = this.virtualController.getState();

      // Detect just-pressed for action button
      this.virtualActionJustPressed = state.actionPressed && !this.prevVirtualAction;
      this.prevVirtualAction = state.actionPressed;

      // Detect just-pressed for interact button
      this.virtualInteractJustPressed = state.interactPressed && !this.prevVirtualInteract;
      this.prevVirtualInteract = state.interactPressed;

      // Render virtual controller
      this.virtualController.render();
    } else {
      this.virtualActionJustPressed = false;
      this.virtualInteractJustPressed = false;
      this.prevVirtualAction = false;
      this.prevVirtualInteract = false;
    }
  }

  /**
   * Cleans up event listeners and virtual controller.
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    window.removeEventListener('blur', this.handleBlur.bind(this));

    // Clean up virtual controller
    if (this.virtualController) {
      this.virtualController.destroy();
      this.virtualController = null;
    }
  }
}
