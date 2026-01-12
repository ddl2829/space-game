/**
 * Pirate enemy ship entity
 * AI-controlled hostile ship that chases and attacks players
 */

import { Entity } from './Entity';
import { Vector2 } from '../../utils/Vector2';

export type PirateState = 'patrol' | 'chase' | 'attack' | 'flee';

export interface PirateConfig {
  maxHealth: number;
  maxSpeed: number;
  acceleration: number;
  rotationSpeed: number;
  detectionRange: number;
  attackRange: number;
  fleeHealthThreshold: number;
  loseInterestDistance: number;
  collisionDamage: number;
  lootCreditsMin: number;
  lootCreditsMax: number;
}

const DEFAULT_PIRATE_CONFIG: PirateConfig = {
  maxHealth: 50,
  maxSpeed: 400,
  acceleration: 300,
  rotationSpeed: 3,
  detectionRange: 400,
  attackRange: 50,
  fleeHealthThreshold: 0.2,
  loseInterestDistance: 800,
  collisionDamage: 15,
  lootCreditsMin: 50,
  lootCreditsMax: 150,
};

export class Pirate extends Entity {
  public config: PirateConfig;
  public state: PirateState = 'patrol';
  public health: number;
  public maxHealth: number;
  public isDestroyed: boolean = false;

  // Patrol behavior
  private patrolTarget: Vector2;
  private patrolRadius: number = 300;
  private patrolCenter: Vector2;

  // Target tracking
  private targetPosition: Vector2 | null = null;

  // Visual properties
  private size: number = 18;
  private thrusterFlicker: number = 0;
  private damageFlashTimer: number = 0;

  // State timers
  private stateTimer: number = 0;
  private attackCooldown: number = 0;

  constructor(x: number, y: number, config?: Partial<PirateConfig>) {
    super(x, y, Math.random() * Math.PI * 2);

    this.config = { ...DEFAULT_PIRATE_CONFIG, ...config };
    this.health = this.config.maxHealth;
    this.maxHealth = this.config.maxHealth;

    // Initialize patrol
    this.patrolCenter = new Vector2(x, y);
    this.patrolTarget = this.getNewPatrolTarget();
  }

  /**
   * Update pirate state and movement
   */
  public update(deltaTime: number): void {
    if (!this.active || this.isDestroyed) return;

    // Update timers
    this.stateTimer += deltaTime;
    this.thrusterFlicker += deltaTime * 10;
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= deltaTime;
    }
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    // State machine behavior
    switch (this.state) {
      case 'patrol':
        this.updatePatrol(deltaTime);
        break;
      case 'chase':
        this.updateChase(deltaTime);
        break;
      case 'attack':
        this.updateAttack(deltaTime);
        break;
      case 'flee':
        this.updateFlee(deltaTime);
        break;
    }

    // Apply friction
    this.velocity.multiply(0.98);

    // Clamp speed
    this.velocity.limit(this.config.maxSpeed);

    // Call parent update for position integration
    super.update(deltaTime);
  }

  /**
   * Patrol state - wander around patrol area
   */
  private updatePatrol(deltaTime: number): void {
    const toTarget = this.patrolTarget.subtracted(this.position);
    const distance = toTarget.magnitude();

    // Get new patrol target if close enough
    if (distance < 50) {
      this.patrolTarget = this.getNewPatrolTarget();
      return;
    }

    // Move towards patrol target
    this.moveTowards(this.patrolTarget, deltaTime, 0.5);
  }

  /**
   * Chase state - pursue the player
   */
  private updateChase(deltaTime: number): void {
    if (!this.targetPosition) {
      this.setState('patrol');
      return;
    }

    const toTarget = this.targetPosition.subtracted(this.position);
    const distance = toTarget.magnitude();

    // Switch to attack if in range
    if (distance < this.config.attackRange) {
      this.setState('attack');
      return;
    }

    // Lose interest if too far
    if (distance > this.config.loseInterestDistance) {
      this.targetPosition = null;
      this.setState('patrol');
      return;
    }

    // Check if should flee
    if (this.health / this.maxHealth < this.config.fleeHealthThreshold) {
      this.setState('flee');
      return;
    }

    // Chase at 80% speed
    this.moveTowards(this.targetPosition, deltaTime, 0.8);
  }

  /**
   * Attack state - ram into player
   */
  private updateAttack(deltaTime: number): void {
    if (!this.targetPosition) {
      this.setState('patrol');
      return;
    }

    const toTarget = this.targetPosition.subtracted(this.position);
    const distance = toTarget.magnitude();

    // If target moved away, go back to chase
    if (distance > this.config.attackRange * 2) {
      this.setState('chase');
      return;
    }

    // Check if should flee
    if (this.health / this.maxHealth < this.config.fleeHealthThreshold) {
      this.setState('flee');
      return;
    }

    // Aggressive pursuit - full speed
    this.moveTowards(this.targetPosition, deltaTime, 1.0);
  }

  /**
   * Flee state - run away from player
   */
  private updateFlee(deltaTime: number): void {
    if (!this.targetPosition) {
      this.setState('patrol');
      return;
    }

    const toTarget = this.targetPosition.subtracted(this.position);
    const distance = toTarget.magnitude();

    // If far enough, go back to patrol
    if (distance > this.config.loseInterestDistance) {
      this.targetPosition = null;
      this.patrolCenter = this.position.clone();
      this.setState('patrol');
      return;
    }

    // Move away from target
    const fleeDirection = toTarget.normalized().multiply(-1);
    const fleeTarget = this.position.added(fleeDirection.multiplied(200));
    this.moveTowards(fleeTarget, deltaTime, 1.0);
  }

  /**
   * Move towards a target position
   */
  private moveTowards(target: Vector2, deltaTime: number, speedMultiplier: number): void {
    const toTarget = target.subtracted(this.position);
    const targetAngle = toTarget.angle();

    // Rotate towards target
    const angleDiff = this.normalizeAngle(targetAngle - this.rotation);
    const rotationAmount = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.config.rotationSpeed * deltaTime);
    this.rotation += rotationAmount;

    // Thrust if facing roughly towards target
    if (Math.abs(angleDiff) < Math.PI / 2) {
      const thrust = this.getForward().multiplied(this.config.acceleration * speedMultiplier * deltaTime);
      this.velocity.add(thrust);
    }
  }

  /**
   * Get a new random patrol target
   */
  private getNewPatrolTarget(): Vector2 {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.patrolRadius;
    return new Vector2(
      this.patrolCenter.x + Math.cos(angle) * distance,
      this.patrolCenter.y + Math.sin(angle) * distance
    );
  }

  /**
   * Set the current target (player position)
   */
  public setTarget(x: number, y: number): void {
    this.targetPosition = new Vector2(x, y);
  }

  /**
   * Clear the target
   */
  public clearTarget(): void {
    this.targetPosition = null;
  }

  /**
   * Check if player is in detection range
   */
  public canDetectTarget(targetX: number, targetY: number): boolean {
    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.config.detectionRange;
  }

  /**
   * Check if in attack range of target
   */
  public isInAttackRange(targetX: number, targetY: number): boolean {
    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.config.attackRange;
  }

  /**
   * Change state with timer reset
   */
  private setState(newState: PirateState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.stateTimer = 0;
    }
  }

  /**
   * Take damage
   */
  public takeDamage(amount: number): void {
    if (this.isDestroyed) return;

    this.health -= amount;
    this.damageFlashTimer = 0.15;

    if (this.health <= 0) {
      this.health = 0;
      this.isDestroyed = true;
      this.active = false;
      console.log('[Pirate] Destroyed');
    } else if (this.health / this.maxHealth < this.config.fleeHealthThreshold) {
      this.setState('flee');
    }
  }

  /**
   * Get loot value when destroyed
   */
  public getLootValue(): number {
    const { lootCreditsMin, lootCreditsMax } = this.config;
    return Math.floor(lootCreditsMin + Math.random() * (lootCreditsMax - lootCreditsMin));
  }

  /**
   * Get collision radius
   */
  public getCollisionRadius(): number {
    return this.size;
  }

  /**
   * Render the pirate ship
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active || this.isDestroyed) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);

    // Draw thruster flame when moving
    if (this.velocity.magnitude() > 50) {
      this.renderThruster(ctx);
    }

    // Draw ship body
    this.renderBody(ctx);

    ctx.restore();

    // Draw health bar
    if (this.health < this.maxHealth) {
      this.renderHealthBar(ctx);
    }

    // Draw state indicator (debug)
    // this.renderStateIndicator(ctx);
  }

  /**
   * Render the pirate ship body
   */
  private renderBody(ctx: CanvasRenderingContext2D): void {
    const s = this.size;

    // Damage flash effect
    let bodyColor = '#a33';
    let accentColor = '#f44';
    if (this.damageFlashTimer > 0) {
      bodyColor = '#fff';
      accentColor = '#fff';
    }

    // Main hull - angular aggressive shape
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.5, s * 0.7);
    ctx.lineTo(-s * 0.8, s * 0.3);
    ctx.lineTo(-s * 0.6, 0);
    ctx.lineTo(-s * 0.8, -s * 0.3);
    ctx.lineTo(-s * 0.5, -s * 0.7);
    ctx.closePath();

    ctx.fillStyle = bodyColor;
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cockpit
    ctx.beginPath();
    ctx.arc(s * 0.1, 0, s * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#311';
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Wing spikes
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, s * 0.5);
    ctx.lineTo(-s * 0.1, s * 0.9);
    ctx.lineTo(-s * 0.5, s * 0.6);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.5);
    ctx.lineTo(-s * 0.1, -s * 0.9);
    ctx.lineTo(-s * 0.5, -s * 0.6);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
  }

  /**
   * Render thruster flame
   */
  private renderThruster(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const flicker = Math.sin(this.thrusterFlicker) * 0.3 + 0.7;
    const flameLength = s * 0.6 * flicker;

    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.15);
    ctx.lineTo(-s * 0.6 - flameLength, 0);
    ctx.lineTo(-s * 0.6, s * 0.15);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(-s * 0.6, 0, -s * 0.6 - flameLength, 0);
    gradient.addColorStop(0, '#ff4400');
    gradient.addColorStop(0.5, '#ff8800');
    gradient.addColorStop(1, 'rgba(255, 136, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fill();
  }

  /**
   * Render health bar above pirate
   */
  private renderHealthBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = this.size * 2;
    const barHeight = 4;
    const barX = this.position.x - barWidth / 2;
    const barY = this.position.y - this.size - 12;

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health fill
    const healthPercent = this.health / this.maxHealth;
    const healthColor = healthPercent > 0.5 ? '#a44' : healthPercent > 0.25 ? '#a84' : '#f44';
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

    // Border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  /**
   * Helper to normalize angle to [-PI, PI]
   */
  protected normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
}
