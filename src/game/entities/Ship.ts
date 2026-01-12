import { Entity } from './Entity';
import type { ShipConfig } from '../../types';
import type { InputSystem } from '../systems/InputSystem';
import type { ShipStats } from '../components/ShipStats';

/**
 * Default ship configuration values.
 */
const DEFAULT_CONFIG: ShipConfig = {
  thrustPower: 400,      // Acceleration units per second squared
  rotationSpeed: 4,      // Radians per second
  friction: 0.985,       // Velocity multiplier per frame (at 60fps)
  maxSpeed: 500          // Maximum velocity magnitude
};

/**
 * Player-controlled spaceship entity.
 * Features thrust-based movement with momentum and drag.
 */
export class Ship extends Entity {
  /** Ship physics configuration */
  private config: ShipConfig;

  /** Input system reference */
  private input: InputSystem;

  /** Ship visual size */
  private size: number = 20;

  /** Whether thrusters are currently firing */
  isThrusting: boolean = false;

  /** Thrust direction (-1 = reverse, 0 = none, 1 = forward) */
  thrustDirection: number = 0;

  /** Optional ShipStats reference for dynamic stat updates */
  private shipStats: ShipStats | null = null;

  constructor(input: InputSystem, x: number = 0, y: number = 0, config: Partial<ShipConfig> = {}) {
    super(x, y, 0);
    this.input = input;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to a ShipStats manager for dynamic stat updates.
   * When connected, ship will read thrust/speed from ShipStats.
   */
  connectStats(stats: ShipStats): void {
    this.shipStats = stats;
    this.syncFromStats();

    // Listen for stat changes
    stats.on((event) => {
      if (event.type === 'stats-changed') {
        this.syncFromStats();
      }
    });
  }

  /**
   * Sync ship config from ShipStats.
   */
  private syncFromStats(): void {
    if (!this.shipStats) return;

    this.config.thrustPower = this.shipStats.getStat('thrustPower');
    this.config.maxSpeed = this.shipStats.getStat('maxSpeed');
    this.config.rotationSpeed = this.shipStats.getStat('rotationSpeed');

    console.log('[Ship] Stats synced:', {
      thrust: this.config.thrustPower,
      maxSpeed: this.config.maxSpeed,
      rotation: this.config.rotationSpeed,
    });
  }

  /**
   * Get the connected ShipStats (if any).
   */
  getStats(): ShipStats | null {
    return this.shipStats;
  }

  /**
   * Updates ship state based on input and physics.
   */
  update(deltaTime: number): void {
    if (!this.active) return;

    this.handleInput(deltaTime);
    this.applyPhysics(deltaTime);

    // Call parent update for position integration
    super.update(deltaTime);
  }

  /**
   * Processes player input for movement and rotation.
   */
  private handleInput(deltaTime: number): void {
    // Rotation input (A/D or Left/Right)
    const rotationInput = this.input.getRotationInput();
    this.rotationVelocity = rotationInput * this.config.rotationSpeed;

    // Thrust input (W/S or Up/Down)
    this.thrustDirection = this.input.getThrustInput();
    this.isThrusting = this.thrustDirection !== 0;

    if (this.isThrusting) {
      // Calculate thrust vector based on ship's facing direction
      const thrustVector = this.getForward().multiply(
        this.config.thrustPower * this.thrustDirection * deltaTime
      );

      // Apply thrust as acceleration
      this.velocity.add(thrustVector);
    }
  }

  /**
   * Applies friction and speed limits.
   */
  private applyPhysics(deltaTime: number): void {
    // Apply friction (frame-rate independent)
    const frictionPerFrame = Math.pow(this.config.friction, deltaTime * 60);
    this.velocity.multiply(frictionPerFrame);

    // Clamp to max speed
    this.velocity.limit(this.config.maxSpeed);

    // Stop very small velocities to prevent drift
    if (this.velocity.magnitude() < 0.1) {
      this.velocity.set(0, 0);
    }
  }

  /**
   * Renders the ship as a triangle pointing in the direction of rotation.
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.save();

    // Transform to ship position and rotation
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);

    // Draw thruster flame when thrusting forward
    if (this.isThrusting && this.thrustDirection > 0) {
      this.renderThrusterFlame(ctx);
    }

    // Draw reverse thrusters when going backward
    if (this.isThrusting && this.thrustDirection < 0) {
      this.renderReverseFlame(ctx);
    }

    // Draw ship body (triangle pointing right at rotation 0)
    this.renderBody(ctx);

    ctx.restore();
  }

  /**
   * Renders the ship body as a triangle.
   */
  private renderBody(ctx: CanvasRenderingContext2D): void {
    const s = this.size;

    ctx.beginPath();
    // Nose (front)
    ctx.moveTo(s, 0);
    // Bottom wing
    ctx.lineTo(-s * 0.7, s * 0.6);
    // Back indent
    ctx.lineTo(-s * 0.4, 0);
    // Top wing
    ctx.lineTo(-s * 0.7, -s * 0.6);
    ctx.closePath();

    // Fill
    ctx.fillStyle = '#4a9eff';
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#7bb8ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cockpit
    ctx.beginPath();
    ctx.arc(s * 0.2, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#1a3a5c';
    ctx.fill();
    ctx.strokeStyle = '#7bb8ff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * Renders the thruster flame effect.
   */
  private renderThrusterFlame(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const flameLength = s * (0.6 + Math.random() * 0.4); // Flickering flame

    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.2);
    ctx.lineTo(-s * 0.4 - flameLength, 0);
    ctx.lineTo(-s * 0.4, s * 0.2);
    ctx.closePath();

    // Gradient for flame
    const gradient = ctx.createLinearGradient(-s * 0.4, 0, -s * 0.4 - flameLength, 0);
    gradient.addColorStop(0, '#ff6600');
    gradient.addColorStop(0.5, '#ffaa00');
    gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fill();
  }

  /**
   * Renders reverse thruster flames at the front.
   */
  private renderReverseFlame(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const flameLength = s * (0.3 + Math.random() * 0.2);

    // Top reverse thruster
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -s * 0.3);
    ctx.lineTo(s * 0.5 + flameLength, -s * 0.2);
    ctx.lineTo(s * 0.5, -s * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#ff4400';
    ctx.fill();

    // Bottom reverse thruster
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.3);
    ctx.lineTo(s * 0.5 + flameLength, s * 0.2);
    ctx.lineTo(s * 0.5, s * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#ff4400';
    ctx.fill();
  }

  /**
   * Gets the current speed (velocity magnitude).
   */
  getSpeed(): number {
    return this.velocity.magnitude();
  }

  /**
   * Sets the ship size.
   */
  setSize(size: number): void {
    this.size = size;
  }

  /**
   * Updates ship configuration.
   */
  setConfig(config: Partial<ShipConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
