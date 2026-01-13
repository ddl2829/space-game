/**
 * Virtual controller overlay for mobile/touch devices.
 * Provides a joystick for movement and a context-sensitive action button.
 */

export interface VirtualControllerConfig {
  joystickSize?: number; // default 120
  buttonSize?: number;   // default 60
  opacity?: number;      // default 0.6
  deadzone?: number;     // default 0.15
}

export interface VirtualControllerState {
  // Joystick - now provides absolute world direction
  joystickX: number;      // -1 to 1 (left to right in world space)
  joystickY: number;      // -1 to 1 (up to down in world space)
  joystickMagnitude: number; // 0 to 1 (how far the joystick is pushed)
  joystickAngle: number;  // angle in radians (0 = right, PI/2 = down)

  // Legacy relative inputs (kept for compatibility but deprecated)
  thrustInput: number;    // -1 to 1 (back to forward)
  rotationInput: number;  // -1 to 1 (left to right)

  // Button - context-sensitive (fires when not near station, docks when near)
  actionPressed: boolean; // Fire/Mine/Dock
  interactPressed: boolean; // Same as actionPressed when in dock mode
}

type ButtonMode = 'fire' | 'dock';

interface Point {
  x: number;
  y: number;
}

/**
 * Touch-based virtual controller with joystick and context-sensitive action button.
 * Automatically enables on touch devices.
 */
export class VirtualController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private enabled: boolean = false;

  // Configuration
  private joystickSize: number;
  private buttonSize: number;
  private opacity: number;
  private deadzone: number;

  // Joystick state
  private joystickActive: boolean = false;
  private joystickTouchId: number | null = null;
  private joystickCenter: Point;
  private joystickPosition: Point;
  private joystickMaxDistance: number;

  // Button state
  private actionTouchId: number | null = null;
  private buttonMode: ButtonMode = 'fire';

  // Button position (calculated on resize)
  private actionButtonCenter: Point;

  // Bound event handlers for cleanup
  private boundHandleTouchStart: (e: TouchEvent) => void;
  private boundHandleTouchMove: (e: TouchEvent) => void;
  private boundHandleTouchEnd: (e: TouchEvent) => void;
  private boundHandleResize: () => void;

  constructor(config?: VirtualControllerConfig) {
    // Apply configuration with defaults
    this.joystickSize = config?.joystickSize ?? 120;
    this.buttonSize = config?.buttonSize ?? 60;
    this.opacity = config?.opacity ?? 0.6;
    this.deadzone = config?.deadzone ?? 0.15;

    this.joystickMaxDistance = this.joystickSize / 2;

    // Initialize positions (will be updated on resize)
    this.joystickCenter = { x: 0, y: 0 };
    this.joystickPosition = { x: 0, y: 0 };
    this.actionButtonCenter = { x: 0, y: 0 };

    // Create canvas overlay
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'virtual-controller-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '1000';
    this.canvas.style.touchAction = 'none';

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context for virtual controller canvas');
    }
    this.ctx = ctx;

    // Bind event handlers
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    this.boundHandleResize = this.handleResize.bind(this);

    // Auto-enable on touch devices
    if (this.isTouchDevice()) {
      this.enable();
    }
  }

  /**
   * Detects if the current device supports touch input.
   */
  isTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - for older browsers
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Sets the button mode - changes what the action button does and how it's labeled.
   * @param mode 'fire' for shooting/mining, 'dock' for docking at stations
   */
  setButtonMode(mode: ButtonMode): void {
    if (this.buttonMode !== mode) {
      this.buttonMode = mode;
      if (this.enabled) {
        this.render();
      }
    }
  }

  /**
   * Gets the current button mode.
   */
  getButtonMode(): ButtonMode {
    return this.buttonMode;
  }

  /**
   * Enables the virtual controller.
   */
  enable(): void {
    if (this.enabled) return;

    this.enabled = true;

    // Add canvas to DOM
    document.body.appendChild(this.canvas);

    // Set up canvas size
    this.handleResize();

    // Enable pointer events for touch
    this.canvas.style.pointerEvents = 'auto';

    // Add event listeners
    this.canvas.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.boundHandleTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', this.boundHandleTouchEnd, { passive: false });
    window.addEventListener('resize', this.boundHandleResize);

    // Initial render
    this.render();
  }

  /**
   * Disables the virtual controller.
   */
  disable(): void {
    if (!this.enabled) return;

    this.enabled = false;

    // Remove event listeners
    this.canvas.removeEventListener('touchstart', this.boundHandleTouchStart);
    this.canvas.removeEventListener('touchmove', this.boundHandleTouchMove);
    this.canvas.removeEventListener('touchend', this.boundHandleTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.boundHandleTouchEnd);
    window.removeEventListener('resize', this.boundHandleResize);

    // Remove canvas from DOM
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    // Reset state
    this.resetState();
  }

  /**
   * Checks if the virtual controller is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Resets all input state.
   */
  private resetState(): void {
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.joystickPosition = { ...this.joystickCenter };
    this.actionTouchId = null;
  }

  /**
   * Handles window resize events.
   */
  private handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);

    // Calculate control positions
    const padding = 30;
    const joystickOffset = this.joystickSize / 2 + padding;
    const buttonOffset = this.buttonSize / 2 + padding;

    // Joystick in bottom-left corner
    this.joystickCenter = {
      x: joystickOffset + 20,
      y: height - joystickOffset - 20
    };
    this.joystickPosition = { ...this.joystickCenter };

    // Single action button in bottom-right corner
    this.actionButtonCenter = {
      x: width - buttonOffset - 20,
      y: height - buttonOffset - 20
    };

    // Re-render after resize
    if (this.enabled) {
      this.render();
    }
  }

  /**
   * Handles touch start events.
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const point = this.getTouchPoint(touch);

      // Check if touch is on joystick area
      if (this.joystickTouchId === null && this.isInJoystickArea(point)) {
        this.joystickTouchId = touch.identifier;
        this.joystickActive = true;
        this.updateJoystickPosition(point);
        continue;
      }

      // Check if touch is on action button
      if (this.actionTouchId === null && this.isInButtonArea(point, this.actionButtonCenter)) {
        this.actionTouchId = touch.identifier;
        continue;
      }
    }

    this.render();
  }

  /**
   * Handles touch move events.
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];

      // Update joystick if this is the joystick touch
      if (touch.identifier === this.joystickTouchId) {
        const point = this.getTouchPoint(touch);
        this.updateJoystickPosition(point);
      }
    }

    this.render();
  }

  /**
   * Handles touch end and cancel events.
   */
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];

      // Release joystick
      if (touch.identifier === this.joystickTouchId) {
        this.joystickTouchId = null;
        this.joystickActive = false;
        this.joystickPosition = { ...this.joystickCenter };
      }

      // Release action button
      if (touch.identifier === this.actionTouchId) {
        this.actionTouchId = null;
      }
    }

    this.render();
  }

  /**
   * Gets the touch point in canvas coordinates.
   */
  private getTouchPoint(touch: Touch): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  /**
   * Checks if a point is within the joystick area.
   */
  private isInJoystickArea(point: Point): boolean {
    const dx = point.x - this.joystickCenter.x;
    const dy = point.y - this.joystickCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Allow slightly larger touch area for easier targeting
    return distance <= this.joystickSize * 0.75;
  }

  /**
   * Checks if a point is within a button area.
   */
  private isInButtonArea(point: Point, buttonCenter: Point): boolean {
    const dx = point.x - buttonCenter.x;
    const dy = point.y - buttonCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Allow slightly larger touch area for easier targeting
    return distance <= this.buttonSize * 0.75;
  }

  /**
   * Updates the joystick position based on touch input.
   */
  private updateJoystickPosition(point: Point): void {
    const dx = point.x - this.joystickCenter.x;
    const dy = point.y - this.joystickCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= this.joystickMaxDistance) {
      this.joystickPosition = point;
    } else {
      // Clamp to max distance
      const angle = Math.atan2(dy, dx);
      this.joystickPosition = {
        x: this.joystickCenter.x + Math.cos(angle) * this.joystickMaxDistance,
        y: this.joystickCenter.y + Math.sin(angle) * this.joystickMaxDistance
      };
    }
  }

  /**
   * Gets the current input state from the virtual controller.
   */
  getState(): VirtualControllerState {
    // Calculate joystick input
    const dx = this.joystickPosition.x - this.joystickCenter.x;
    const dy = this.joystickPosition.y - this.joystickCenter.y;

    // Calculate magnitude and angle for absolute direction
    const rawMagnitude = Math.sqrt(dx * dx + dy * dy) / this.joystickMaxDistance;
    let magnitude = Math.min(1, rawMagnitude);

    // Apply deadzone to magnitude
    if (magnitude < this.deadzone) {
      magnitude = 0;
    }

    // Normalize to -1 to 1 range for X and Y
    let joystickX = dx / this.joystickMaxDistance;
    let joystickY = dy / this.joystickMaxDistance;

    // Apply deadzone
    if (magnitude === 0) {
      joystickX = 0;
      joystickY = 0;
    }

    // Calculate angle (0 = right, PI/2 = down, PI = left, -PI/2 = up)
    const joystickAngle = Math.atan2(dy, dx);

    // Legacy relative inputs (still calculated for backwards compatibility)
    let rotationInput = joystickX;
    let thrustInput = -joystickY; // Invert Y (up = positive thrust)

    // Clamp values
    joystickX = Math.max(-1, Math.min(1, joystickX));
    joystickY = Math.max(-1, Math.min(1, joystickY));
    rotationInput = Math.max(-1, Math.min(1, rotationInput));
    thrustInput = Math.max(-1, Math.min(1, thrustInput));

    const isPressed = this.actionTouchId !== null;

    return {
      joystickX,
      joystickY,
      joystickMagnitude: magnitude,
      joystickAngle,
      thrustInput,
      rotationInput,
      // When in dock mode, the action button triggers interact
      // When in fire mode, it triggers action (fire/mine)
      actionPressed: this.buttonMode === 'fire' && isPressed,
      interactPressed: this.buttonMode === 'dock' && isPressed
    };
  }

  /**
   * Renders the virtual controller overlay.
   */
  render(): void {
    if (!this.enabled) return;

    const ctx = this.ctx;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set global opacity
    ctx.globalAlpha = this.opacity;

    // Render joystick
    this.renderJoystick(ctx);

    // Render single action button
    this.renderActionButton(ctx);

    // Reset opacity
    ctx.globalAlpha = 1;
  }

  /**
   * Renders the joystick control.
   */
  private renderJoystick(ctx: CanvasRenderingContext2D): void {
    const center = this.joystickCenter;
    const radius = this.joystickSize / 2;
    const knobRadius = radius * 0.4;

    // Outer ring (boundary)
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Direction indicators (crosshair lines)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    // Vertical line
    ctx.moveTo(center.x, center.y - radius + 10);
    ctx.lineTo(center.x, center.y + radius - 10);
    // Horizontal line
    ctx.moveTo(center.x - radius + 10, center.y);
    ctx.lineTo(center.x + radius - 10, center.y);
    ctx.stroke();

    // Inner knob (movable)
    const knobCenter = this.joystickActive ? this.joystickPosition : center;

    // Glow effect when active
    if (this.joystickActive) {
      ctx.beginPath();
      ctx.arc(knobCenter.x, knobCenter.y, knobRadius + 5, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(
        knobCenter.x, knobCenter.y, knobRadius,
        knobCenter.x, knobCenter.y, knobRadius + 15
      );
      gradient.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(knobCenter.x, knobCenter.y, knobRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.joystickActive ? 'rgba(100, 200, 255, 0.8)' : 'rgba(200, 200, 200, 0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * Renders the context-sensitive action button (Fire/Dock).
   */
  private renderActionButton(ctx: CanvasRenderingContext2D): void {
    const center = this.actionButtonCenter;
    const radius = this.buttonSize / 2;
    const isPressed = this.actionTouchId !== null;
    const isDockMode = this.buttonMode === 'dock';

    // Colors based on mode
    const baseColor = isDockMode
      ? { r: 100, g: 150, b: 255 }  // Blue for dock
      : { r: 255, g: 100, b: 100 }; // Red for fire

    // Glow effect when pressed
    if (isPressed) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius + 10, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(
        center.x, center.y, radius,
        center.x, center.y, radius + 20
      );
      gradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.5)`);
      gradient.addColorStop(1, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Button background
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isPressed
      ? `rgba(${baseColor.r - 20}, ${baseColor.g - 20}, ${baseColor.b - 20}, 0.8)`
      : 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    ctx.strokeStyle = isPressed
      ? `rgba(${Math.min(255, baseColor.r + 50)}, ${Math.min(255, baseColor.g + 50)}, ${Math.min(255, baseColor.b + 50)}, 0.9)`
      : `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.6)`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Button label
    const label = isDockMode ? 'DOCK' : 'FIRE';
    ctx.fillStyle = isPressed
      ? 'rgba(255, 255, 255, 1)'
      : `rgba(${Math.min(255, baseColor.r + 100)}, ${Math.min(255, baseColor.g + 100)}, ${Math.min(255, baseColor.b + 100)}, 0.8)`;
    ctx.font = `bold ${radius * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, center.x, center.y);
  }

  /**
   * Cleans up the virtual controller and removes event listeners.
   */
  destroy(): void {
    this.disable();

    // Additional cleanup if needed
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
