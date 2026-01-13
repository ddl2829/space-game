/**
 * Projectile entity for weapon system
 * Handles player and enemy projectiles with physics and rendering
 */

import { Vector2 } from '../../utils/Vector2';

export interface ProjectileConfig {
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: number;
  owner: 'player' | 'enemy';
  color: string;
  lifetime: number;
}

export class Projectile {
  public position: Vector2;
  public velocity: Vector2;
  public damage: number;
  public owner: 'player' | 'enemy';
  public color: string;
  public active: boolean = true;

  private lifetime: number;
  private maxLifetime: number;
  private length: number = 12;
  private width: number = 3;
  private angle: number;

  constructor(config: ProjectileConfig) {
    this.position = new Vector2(config.x, config.y);
    this.angle = config.angle;
    this.velocity = new Vector2(
      Math.cos(config.angle) * config.speed,
      Math.sin(config.angle) * config.speed
    );
    this.damage = config.damage;
    this.owner = config.owner;
    this.color = config.color;
    this.lifetime = config.lifetime;
    this.maxLifetime = config.lifetime;
  }

  /**
   * Update projectile position and lifetime
   */
  public update(deltaTime: number): void {
    if (!this.active) return;

    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Update lifetime
    this.lifetime -= deltaTime;
    if (this.lifetime <= 0) {
      this.active = false;
    }
  }

  /**
   * Render the projectile as a glowing laser bolt
   */
  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    if (!this.active) return;

    const screenX = this.position.x - cameraX;
    const screenY = this.position.y - cameraY;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.angle);

    // Calculate fade based on remaining lifetime
    const lifetimeRatio = this.lifetime / this.maxLifetime;
    const alpha = Math.min(1, lifetimeRatio * 2);

    // Outer glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;

    // Draw elongated laser bolt
    const gradient = ctx.createLinearGradient(-this.length, 0, this.length / 2, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.3, this.color);
    gradient.addColorStop(0.7, '#fff');
    gradient.addColorStop(1, this.color);

    ctx.globalAlpha = alpha;

    // Main bolt body
    ctx.beginPath();
    ctx.moveTo(-this.length, 0);
    ctx.lineTo(this.length / 2, -this.width / 2);
    ctx.lineTo(this.length, 0);
    ctx.lineTo(this.length / 2, this.width / 2);
    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.fill();

    // Core white center
    ctx.beginPath();
    ctx.moveTo(-this.length * 0.5, 0);
    ctx.lineTo(this.length * 0.3, -this.width / 4);
    ctx.lineTo(this.length * 0.6, 0);
    ctx.lineTo(this.length * 0.3, this.width / 4);
    ctx.closePath();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    ctx.restore();
  }

  /**
   * Check if projectile has expired
   */
  public isExpired(): boolean {
    return !this.active || this.lifetime <= 0;
  }

  /**
   * Get collision radius for hit detection
   */
  public getCollisionRadius(): number {
    return this.length / 2;
  }

  /**
   * Deactivate the projectile (when hitting something)
   */
  public destroy(): void {
    this.active = false;
  }
}
