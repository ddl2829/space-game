/**
 * Combat system for handling damage, collisions, and combat-related mechanics
 */

import { Ship } from '../entities/Ship';
import { Pirate } from '../entities/Pirate';
import { Vector2 } from '../../utils/Vector2';
import { WeaponSystem, WeaponConfig } from './WeaponSystem';

export interface DamagePopup {
  x: number;
  y: number;
  amount: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  velocityY: number;
}

export interface HitParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  size: number;
}

export interface CombatSystemConfig {
  playerMaxHealth: number;
  invulnerabilityDuration: number;
  knockbackForce: number;
  damagePopupDuration: number;
  respawnDelay: number;
}

export interface CombatEvent {
  type: 'player_damaged' | 'player_destroyed' | 'pirate_destroyed' | 'player_respawned';
  damage?: number;
  source?: string;
  loot?: number;
  position?: { x: number; y: number };
}

const DEFAULT_COMBAT_CONFIG: CombatSystemConfig = {
  playerMaxHealth: 100,
  invulnerabilityDuration: 1.5,
  knockbackForce: 300,
  damagePopupDuration: 1.0,
  respawnDelay: 2.0,
};

export class CombatSystem {
  private config: CombatSystemConfig;
  private playerHealth: number;
  private playerMaxHealth: number;
  private invulnerabilityTimer: number = 0;
  private damagePopups: DamagePopup[] = [];
  private isPlayerDead: boolean = false;
  private respawnTimer: number = 0;
  private respawnPosition: Vector2 = new Vector2(0, 0);
  private onCombatEvent: ((event: CombatEvent) => void) | null = null;
  private cargoLostOnDeath: boolean = false;
  private weaponSystem: WeaponSystem;
  private hitParticles: HitParticle[] = [];

  constructor(config?: Partial<CombatSystemConfig>, weaponConfig?: Partial<WeaponConfig>) {
    this.config = { ...DEFAULT_COMBAT_CONFIG, ...config };
    this.playerHealth = this.config.playerMaxHealth;
    this.playerMaxHealth = this.config.playerMaxHealth;
    this.weaponSystem = new WeaponSystem(weaponConfig);
  }

  /**
   * Update combat system
   */
  public update(
    ship: Ship,
    pirates: Pirate[],
    deltaTime: number
  ): void {
    // Update invulnerability
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= deltaTime;
    }

    // Update respawn timer
    if (this.isPlayerDead) {
      this.respawnTimer -= deltaTime;
      if (this.respawnTimer <= 0) {
        this.respawnPlayer(ship);
      }
      // Still update weapon system for visual cleanup
      this.weaponSystem.update(deltaTime);
      this.updateHitParticles(deltaTime);
      return;
    }

    // Update weapon system
    this.weaponSystem.update(deltaTime);

    // Check player projectile collisions with enemies
    this.checkProjectileCollisions(pirates);

    // Check collisions with pirates
    this.checkPirateCollisions(ship, pirates, deltaTime);

    // Update damage popups
    this.updateDamagePopups(deltaTime);

    // Update hit particles
    this.updateHitParticles(deltaTime);
  }

  /**
   * Player shoots a projectile
   */
  public playerShoot(x: number, y: number, angle: number): boolean {
    return this.weaponSystem.fire(x, y, angle, 'player');
  }

  /**
   * Check if player can fire
   */
  public canPlayerFire(): boolean {
    return this.weaponSystem.canPlayerFire();
  }

  /**
   * Get player weapon cooldown progress (0-1)
   */
  public getWeaponCooldownProgress(): number {
    return this.weaponSystem.getPlayerCooldownProgress();
  }

  /**
   * Check projectile collisions with enemies
   */
  private checkProjectileCollisions(pirates: Pirate[]): void {
    // Filter to active pirates that can be hit
    const targets = pirates.filter(p => !p.isDestroyed && p.active);

    // Check player projectiles against enemies
    const hits = this.weaponSystem.checkCollisions(targets, 'player');

    for (const hit of hits) {
      const pirate = hit.target as Pirate;

      // Deal damage to the pirate
      pirate.takeDamage(hit.damage);

      // Create damage popup
      this.createDamagePopup(
        pirate.position.x,
        pirate.position.y - 20,
        hit.damage,
        '#4af'
      );

      // Create hit particles
      this.createHitParticles(
        hit.projectile.position.x,
        hit.projectile.position.y,
        '#4af'
      );

      // Check if pirate was destroyed
      if (pirate.isDestroyed) {
        this.handlePirateDestroyed(pirate);
      }
    }
  }

  /**
   * Create hit particle effects
   */
  private createHitParticles(x: number, y: number, color: string): void {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 100 + Math.random() * 150;
      this.hitParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        lifetime: 0.3 + Math.random() * 0.2,
        maxLifetime: 0.5,
        size: 2 + Math.random() * 3,
      });
    }
  }

  /**
   * Update hit particles
   */
  private updateHitParticles(deltaTime: number): void {
    for (const particle of this.hitParticles) {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vx *= 0.95;
      particle.vy *= 0.95;
      particle.lifetime -= deltaTime;
    }

    // Remove expired particles
    this.hitParticles = this.hitParticles.filter(p => p.lifetime > 0);
  }

  /**
   * Check collisions between player and pirates
   */
  private checkPirateCollisions(
    ship: Ship,
    pirates: Pirate[],
    _deltaTime: number
  ): void {
    const shipRadius = 20; // Approximate ship collision radius

    for (const pirate of pirates) {
      if (pirate.isDestroyed || !pirate.active) continue;

      const dx = pirate.position.x - ship.position.x;
      const dy = pirate.position.y - ship.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const collisionDistance = shipRadius + pirate.getCollisionRadius();

      if (distance < collisionDistance) {
        this.handleCollision(ship, pirate, dx, dy, distance);
      }
    }
  }

  /**
   * Handle collision between player and pirate
   */
  private handleCollision(
    ship: Ship,
    pirate: Pirate,
    dx: number,
    dy: number,
    distance: number
  ): void {
    // Calculate collision normal
    const nx = dx / distance;
    const ny = dy / distance;

    // Apply knockback to both
    const knockback = this.config.knockbackForce;

    // Knockback pirate away
    pirate.velocity.x += nx * knockback * 0.5;
    pirate.velocity.y += ny * knockback * 0.5;

    // Knockback player away
    ship.velocity.x -= nx * knockback * 0.3;
    ship.velocity.y -= ny * knockback * 0.3;

    // Damage player if not invulnerable
    if (this.invulnerabilityTimer <= 0) {
      const damage = pirate.config.collisionDamage;
      this.damagePlayer(damage, pirate.position.x, pirate.position.y, ship);
    }

    // Damage pirate from collision
    const pirateDamage = 5;
    pirate.takeDamage(pirateDamage);
    this.createDamagePopup(pirate.position.x, pirate.position.y, pirateDamage, '#ff8844');

    // Check if pirate was destroyed
    if (pirate.isDestroyed) {
      this.handlePirateDestroyed(pirate);
    }
  }

  /**
   * Damage the player
   */
  public damagePlayer(
    amount: number,
    _sourceX: number,
    _sourceY: number,
    ship: Ship
  ): void {
    if (this.isPlayerDead || this.invulnerabilityTimer > 0) return;

    this.playerHealth -= amount;
    this.invulnerabilityTimer = this.config.invulnerabilityDuration;

    // Sync health percentage to ship for visual effects
    this.syncHealthToShip(ship);

    // Create damage popup
    this.createDamagePopup(ship.position.x, ship.position.y - 30, amount, '#ff4444');

    // Fire event
    this.fireCombatEvent({
      type: 'player_damaged',
      damage: amount,
    });

    console.log(`[Combat] Player took ${amount} damage. Health: ${this.playerHealth}/${this.playerMaxHealth}`);

    // Check for death
    if (this.playerHealth <= 0) {
      this.playerHealth = 0;
      this.handlePlayerDeath(ship);
    }
  }

  /**
   * Sync health percentage to ship for visual hull damage effects
   */
  private syncHealthToShip(ship: Ship): void {
    const healthPercent = this.playerHealth / this.playerMaxHealth;
    ship.setHealthPercent(healthPercent);
  }

  /**
   * Handle player death
   */
  private handlePlayerDeath(_ship: Ship): void {
    this.isPlayerDead = true;
    this.respawnTimer = this.config.respawnDelay;
    this.cargoLostOnDeath = true;

    // Store respawn position (will be set by game to nearest station or origin)
    this.respawnPosition.set(0, 0);

    // Fire event
    this.fireCombatEvent({
      type: 'player_destroyed',
    });

    console.log('[Combat] Player destroyed! Respawning in ' + this.config.respawnDelay + ' seconds...');
  }

  /**
   * Respawn the player
   */
  private respawnPlayer(ship: Ship): void {
    this.isPlayerDead = false;
    this.playerHealth = this.playerMaxHealth;
    this.invulnerabilityTimer = this.config.invulnerabilityDuration * 2;

    // Move ship to respawn position
    ship.position.x = this.respawnPosition.x;
    ship.position.y = this.respawnPosition.y;
    ship.velocity.set(0, 0);

    // Sync full health to ship
    this.syncHealthToShip(ship);

    // Fire event
    this.fireCombatEvent({
      type: 'player_respawned',
    });

    console.log('[Combat] Player respawned!');
  }

  /**
   * Handle pirate destruction
   */
  private handlePirateDestroyed(pirate: Pirate): void {
    const loot = pirate.getLootValue();

    // Fire event with position so Game can spawn loot drops
    this.fireCombatEvent({
      type: 'pirate_destroyed',
      loot: loot,
      position: { x: pirate.position.x, y: pirate.position.y },
    });

    console.log(`[Combat] Pirate destroyed! Loot: ${loot} credits`);
  }

  /**
   * Create a damage popup
   */
  private createDamagePopup(x: number, y: number, amount: number, color: string): void {
    this.damagePopups.push({
      x,
      y,
      amount,
      color,
      lifetime: this.config.damagePopupDuration,
      maxLifetime: this.config.damagePopupDuration,
      velocityY: -50,
    });
  }

  /**
   * Update damage popups
   */
  private updateDamagePopups(deltaTime: number): void {
    for (const popup of this.damagePopups) {
      popup.lifetime -= deltaTime;
      popup.y += popup.velocityY * deltaTime;
      popup.velocityY *= 0.95; // Slow down
    }

    // Remove expired popups
    this.damagePopups = this.damagePopups.filter((p) => p.lifetime > 0);
  }

  /**
   * Set combat event callback
   */
  public setOnCombatEvent(callback: (event: CombatEvent) => void): void {
    this.onCombatEvent = callback;
  }

  /**
   * Fire a combat event
   */
  private fireCombatEvent(event: CombatEvent): void {
    if (this.onCombatEvent) {
      this.onCombatEvent(event);
    }
  }

  /**
   * Set respawn position
   */
  public setRespawnPosition(x: number, y: number): void {
    this.respawnPosition.set(x, y);
  }

  /**
   * Get player health
   */
  public getPlayerHealth(): number {
    return this.playerHealth;
  }

  /**
   * Get player max health
   */
  public getPlayerMaxHealth(): number {
    return this.playerMaxHealth;
  }

  /**
   * Heal player by specified amount
   */
  public healPlayer(amount: number): void {
    this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + amount);
  }

  /**
   * Set player max health (for upgrades)
   */
  public setPlayerMaxHealth(maxHealth: number): void {
    const healthPercent = this.playerHealth / this.playerMaxHealth;
    this.playerMaxHealth = maxHealth;
    this.playerHealth = Math.floor(maxHealth * healthPercent);
  }

  /**
   * Check if player is invulnerable
   */
  public isInvulnerable(): boolean {
    return this.invulnerabilityTimer > 0;
  }

  /**
   * Get invulnerability progress (0-1)
   */
  public getInvulnerabilityProgress(): number {
    if (this.invulnerabilityTimer <= 0) return 0;
    return this.invulnerabilityTimer / this.config.invulnerabilityDuration;
  }

  /**
   * Check if player is dead
   */
  public isPlayerDeadState(): boolean {
    return this.isPlayerDead;
  }

  /**
   * Get respawn progress (0-1)
   */
  public getRespawnProgress(): number {
    if (!this.isPlayerDead) return 0;
    return 1 - this.respawnTimer / this.config.respawnDelay;
  }

  /**
   * Check if cargo was lost on death (for HUD notification)
   */
  public wasCargoLost(): boolean {
    const lost = this.cargoLostOnDeath;
    this.cargoLostOnDeath = false;
    return lost;
  }

  /**
   * Render combat effects (projectiles, damage popups, hit particles)
   */
  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    // Render projectiles
    this.weaponSystem.render(ctx, cameraX, cameraY);

    // Render hit particles
    for (const particle of this.hitParticles) {
      const screenX = particle.x - cameraX;
      const screenY = particle.y - cameraY;
      const alpha = particle.lifetime / particle.maxLifetime;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = particle.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Render damage popups
    for (const popup of this.damagePopups) {
      const screenX = popup.x - cameraX;
      const screenY = popup.y - cameraY;
      const alpha = popup.lifetime / popup.maxLifetime;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = popup.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(`-${popup.amount}`, screenX, screenY);
      ctx.fillText(`-${popup.amount}`, screenX, screenY);
      ctx.restore();
    }
  }

  /**
   * Render player health bar on HUD
   */
  public renderHealthBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number = 150,
    height: number = 12
  ): void {
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.5)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x - 5, y - 5, width + 10, height + 25, 5);
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle = '#8ac';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('HULL', x, y - 8 + 15);

    // Health bar background
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 35, y, width - 35, height);

    // Health bar fill
    const healthPercent = this.playerHealth / this.playerMaxHealth;
    let healthColor = '#4a8';
    if (healthPercent <= 0.25) {
      healthColor = '#a44';
    } else if (healthPercent <= 0.5) {
      healthColor = '#a84';
    }

    // Flash when invulnerable
    if (this.invulnerabilityTimer > 0 && Math.floor(this.invulnerabilityTimer * 10) % 2 === 0) {
      healthColor = '#fff';
    }

    ctx.fillStyle = healthColor;
    ctx.fillRect(x + 35, y, (width - 35) * healthPercent, height);

    // Health bar border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 35, y, width - 35, height);

    // Health text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.ceil(this.playerHealth)}/${this.playerMaxHealth}`,
      x + 35 + (width - 35) / 2,
      y + height - 2
    );
    ctx.textAlign = 'left';
  }

  /**
   * Render death screen overlay
   */
  public renderDeathScreen(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!this.isPlayerDead) return;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Death message
    ctx.fillStyle = '#f44';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SHIP DESTROYED', canvasWidth / 2, canvasHeight / 2 - 40);

    // Cargo lost message
    ctx.fillStyle = '#a84';
    ctx.font = '18px monospace';
    ctx.fillText('Cargo lost', canvasWidth / 2, canvasHeight / 2);

    // Respawn progress
    const progress = this.getRespawnProgress();
    const barWidth = 200;
    const barHeight = 8;
    const barX = canvasWidth / 2 - barWidth / 2;
    const barY = canvasHeight / 2 + 40;

    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = '#4a8';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    ctx.strokeStyle = '#666';
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.fillText('Respawning...', canvasWidth / 2, barY + 25);

    ctx.textAlign = 'left';
  }

  /**
   * Get weapon system (for external access/upgrades)
   */
  public getWeaponSystem(): WeaponSystem {
    return this.weaponSystem;
  }

  /**
   * Update player weapon configuration (for upgrades)
   */
  public setPlayerWeaponConfig(config: Partial<WeaponConfig>): void {
    this.weaponSystem.setPlayerWeaponConfig(config);
  }

  /**
   * Clear all projectiles (e.g., on zone change)
   */
  public clearProjectiles(): void {
    this.weaponSystem.clear();
    this.hitParticles = [];
  }

  /**
   * Helper to draw rounded rectangles
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
