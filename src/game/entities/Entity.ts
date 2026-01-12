import { Vector2 } from '../../utils/Vector2';
import type { Renderable, Updateable } from '../../types';

/**
 * Base entity class for all game objects.
 * Provides position, velocity, and rotation handling.
 */
export abstract class Entity implements Renderable, Updateable {
  /** Position in world coordinates */
  position: Vector2;

  /** Velocity in units per second */
  velocity: Vector2;

  /** Rotation in radians (0 = pointing right) */
  rotation: number;

  /** Rotational velocity in radians per second */
  rotationVelocity: number;

  /** Whether the entity is active and should be updated/rendered */
  active: boolean = true;

  /** Unique identifier for the entity */
  readonly id: string;

  /** Static counter for generating unique IDs */
  private static nextId: number = 0;

  constructor(x: number = 0, y: number = 0, rotation: number = 0) {
    this.position = new Vector2(x, y);
    this.velocity = Vector2.zero();
    this.rotation = rotation;
    this.rotationVelocity = 0;
    this.id = `entity_${Entity.nextId++}`;
  }

  /**
   * Updates the entity state. Override for custom behavior.
   * @param deltaTime Time elapsed since last frame in seconds
   */
  update(deltaTime: number): void {
    if (!this.active) return;

    // Apply velocity to position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Apply rotational velocity
    this.rotation += this.rotationVelocity * deltaTime;

    // Normalize rotation to [0, 2*PI)
    this.rotation = this.normalizeAngle(this.rotation);
  }

  /**
   * Renders the entity. Must be implemented by subclasses.
   * @param ctx Canvas rendering context
   */
  abstract render(ctx: CanvasRenderingContext2D): void;

  /**
   * Returns the forward direction vector based on current rotation.
   */
  getForward(): Vector2 {
    return Vector2.fromAngle(this.rotation);
  }

  /**
   * Returns the right direction vector (perpendicular to forward).
   */
  getRight(): Vector2 {
    return Vector2.fromAngle(this.rotation + Math.PI / 2);
  }

  /**
   * Normalizes an angle to the range [0, 2*PI).
   */
  protected normalizeAngle(angle: number): number {
    const TWO_PI = Math.PI * 2;
    angle = angle % TWO_PI;
    if (angle < 0) {
      angle += TWO_PI;
    }
    return angle;
  }

  /**
   * Calculates distance to another entity.
   */
  distanceTo(other: Entity): number {
    return this.position.distance(other.position);
  }

  /**
   * Calculates angle to another entity.
   */
  angleTo(other: Entity): number {
    return this.position.angleTo(other.position);
  }

  /**
   * Sets the entity's position.
   */
  setPosition(x: number, y: number): void {
    this.position.set(x, y);
  }

  /**
   * Sets the entity's velocity.
   */
  setVelocity(vx: number, vy: number): void {
    this.velocity.set(vx, vy);
  }

  /**
   * Adds to the current velocity.
   */
  addVelocity(vx: number, vy: number): void {
    this.velocity.x += vx;
    this.velocity.y += vy;
  }

  /**
   * Sets the entity's rotation.
   */
  setRotation(rotation: number): void {
    this.rotation = this.normalizeAngle(rotation);
  }

  /**
   * Deactivates the entity.
   */
  destroy(): void {
    this.active = false;
  }
}
