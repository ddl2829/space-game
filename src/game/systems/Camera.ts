import { Vector2 } from '../../utils/Vector2';
import type { CameraConfig } from '../../types';
import type { Entity } from '../entities/Entity';

/**
 * Camera that follows a target entity with smooth interpolation.
 * Handles world-to-screen and screen-to-world coordinate conversion.
 */
export class Camera {
  /** Camera position in world coordinates (center of view) */
  position: Vector2 = Vector2.zero();

  /** Target position the camera is moving towards */
  private targetPosition: Vector2 = Vector2.zero();

  /** Entity the camera is following */
  private target: Entity | null = null;

  /** Viewport width */
  width: number = 0;

  /** Viewport height */
  height: number = 0;

  /** Smoothing factor for camera movement (0-1, lower = smoother) */
  private smoothing: number;

  /** Deadzone radius where camera doesn't move */
  private deadzone: number;

  /** Zoom level (1 = normal, >1 = zoomed in) */
  zoom: number = 1;

  constructor(config: CameraConfig = {}) {
    this.smoothing = config.smoothing ?? 0.1;
    this.deadzone = config.deadzone ?? 0;
  }

  /**
   * Sets the entity for the camera to follow.
   */
  follow(entity: Entity): void {
    this.target = entity;
    // Immediately snap to target on first follow
    this.position.set(entity.position.x, entity.position.y);
    this.targetPosition.copy(this.position);
  }

  /**
   * Stops following the current target.
   */
  unfollow(): void {
    this.target = null;
  }

  /**
   * Sets the viewport size (usually canvas dimensions).
   */
  setViewport(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /**
   * Updates the camera position to follow its target.
   */
  update(deltaTime: number): void {
    if (this.target) {
      this.targetPosition.set(this.target.position.x, this.target.position.y);
    }

    // Calculate distance to target
    const distance = this.position.distance(this.targetPosition);

    // Only move if outside deadzone
    if (distance > this.deadzone) {
      // Smooth interpolation towards target
      // Use frame-rate independent smoothing
      const smoothFactor = 1 - Math.pow(1 - this.smoothing, deltaTime * 60);
      this.position.lerp(this.targetPosition, smoothFactor);
    }
  }

  /**
   * Converts world coordinates to screen coordinates.
   */
  worldToScreen(worldX: number, worldY: number): Vector2 {
    const screenX = (worldX - this.position.x) * this.zoom + this.width / 2;
    const screenY = (worldY - this.position.y) * this.zoom + this.height / 2;
    return new Vector2(screenX, screenY);
  }

  /**
   * Converts screen coordinates to world coordinates.
   */
  screenToWorld(screenX: number, screenY: number): Vector2 {
    const worldX = (screenX - this.width / 2) / this.zoom + this.position.x;
    const worldY = (screenY - this.height / 2) / this.zoom + this.position.y;
    return new Vector2(worldX, worldY);
  }

  /**
   * Returns the visible world bounds.
   */
  getWorldBounds(): { left: number; right: number; top: number; bottom: number } {
    const halfWidth = (this.width / 2) / this.zoom;
    const halfHeight = (this.height / 2) / this.zoom;

    return {
      left: this.position.x - halfWidth,
      right: this.position.x + halfWidth,
      top: this.position.y - halfHeight,
      bottom: this.position.y + halfHeight
    };
  }

  /**
   * Checks if a world position is visible on screen.
   */
  isVisible(worldX: number, worldY: number, margin: number = 0): boolean {
    const bounds = this.getWorldBounds();
    return (
      worldX >= bounds.left - margin &&
      worldX <= bounds.right + margin &&
      worldY >= bounds.top - margin &&
      worldY <= bounds.bottom + margin
    );
  }

  /**
   * Applies camera transform to the canvas context.
   * Call this before rendering world objects.
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.position.x, -this.position.y);
  }

  /**
   * Restores the canvas context after camera transform.
   * Call this after rendering world objects.
   */
  restoreTransform(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  /**
   * Instantly moves camera to a position.
   */
  snapTo(x: number, y: number): void {
    this.position.set(x, y);
    this.targetPosition.set(x, y);
  }

  /**
   * Sets the smoothing factor.
   */
  setSmoothing(smoothing: number): void {
    this.smoothing = Math.max(0, Math.min(1, smoothing));
  }

  /**
   * Sets the deadzone radius.
   */
  setDeadzone(deadzone: number): void {
    this.deadzone = Math.max(0, deadzone);
  }
}
