/**
 * Enemy spawn management system
 * Handles spawning pirates based on zone danger level
 */

import { Pirate } from '../entities/Pirate';
import { Zone } from '../../data/zones';

export interface EnemySpawnerConfig {
  spawnRadius: number;
  despawnRadius: number;
  minSpawnDistance: number;
  spawnCheckInterval: number;
}

const DEFAULT_SPAWNER_CONFIG: EnemySpawnerConfig = {
  spawnRadius: 1200,
  despawnRadius: 1500,
  minSpawnDistance: 900,
  spawnCheckInterval: 3.0,
};

export class EnemySpawner {
  private config: EnemySpawnerConfig;
  private pirates: Pirate[] = [];
  private spawnTimer: number = 0;
  private spawnAccumulator: number = 0;

  constructor(config?: Partial<EnemySpawnerConfig>) {
    this.config = { ...DEFAULT_SPAWNER_CONFIG, ...config };
  }

  /**
   * Update spawner state
   */
  public update(
    playerX: number,
    playerY: number,
    zone: Zone,
    deltaTime: number
  ): void {
    // Update spawn timer
    this.spawnTimer += deltaTime;

    // Check for spawning at intervals
    if (this.spawnTimer >= this.config.spawnCheckInterval) {
      this.spawnTimer = 0;
      this.checkSpawning(playerX, playerY, zone, this.config.spawnCheckInterval);
    }

    // Update all pirates
    for (const pirate of this.pirates) {
      pirate.update(deltaTime);
    }

    // Despawn pirates too far from player
    this.despawnFarPirates(playerX, playerY);

    // Remove destroyed pirates
    this.pirates = this.pirates.filter((p) => !p.isDestroyed);
  }

  /**
   * Check if we should spawn new pirates
   */
  private checkSpawning(
    playerX: number,
    playerY: number,
    zone: Zone,
    deltaTime: number
  ): void {
    // No spawning in safe zones
    if (zone.enemySpawnRate <= 0) return;

    // Check max enemies
    const activeCount = this.pirates.filter((p) => !p.isDestroyed).length;
    if (activeCount >= zone.maxEnemies) return;

    // Accumulate spawn chance based on zone spawn rate
    this.spawnAccumulator += zone.enemySpawnRate * deltaTime;

    // Spawn if accumulated enough
    while (this.spawnAccumulator >= 1 && activeCount < zone.maxEnemies) {
      this.spawnAccumulator -= 1;
      this.spawnPirate(playerX, playerY, zone);
    }
  }

  /**
   * Spawn a new pirate at edge of screen
   */
  private spawnPirate(playerX: number, playerY: number, zone: Zone): void {
    // Find a spawn position at the edge of spawn radius
    const angle = Math.random() * Math.PI * 2;
    const distance = this.config.minSpawnDistance +
      Math.random() * (this.config.spawnRadius - this.config.minSpawnDistance);

    const x = playerX + Math.cos(angle) * distance;
    const y = playerY + Math.sin(angle) * distance;

    // Make sure spawn is within zone bounds
    if (!this.isWithinZoneBounds(x, y, zone)) {
      return;
    }

    // Scale pirate stats based on danger level
    const healthMultiplier = 1 + (zone.dangerLevel - 1) * 0.25;
    const damageMultiplier = 1 + (zone.dangerLevel - 1) * 0.2;

    const pirate = new Pirate(x, y, {
      maxHealth: Math.floor(50 * healthMultiplier),
      collisionDamage: Math.floor(15 * damageMultiplier),
      lootCreditsMin: 50 * zone.dangerLevel,
      lootCreditsMax: 150 * zone.dangerLevel,
    });

    this.pirates.push(pirate);
    console.log(`[EnemySpawner] Spawned pirate at (${x.toFixed(0)}, ${y.toFixed(0)}) in ${zone.name}`);
  }

  /**
   * Check if position is within zone bounds
   */
  private isWithinZoneBounds(x: number, y: number, zone: Zone): boolean {
    const { bounds } = zone;
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  /**
   * Despawn pirates too far from player
   */
  private despawnFarPirates(playerX: number, playerY: number): void {
    for (const pirate of this.pirates) {
      const dx = pirate.position.x - playerX;
      const dy = pirate.position.y - playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.config.despawnRadius) {
        pirate.isDestroyed = true;
        pirate.active = false;
        console.log(`[EnemySpawner] Despawned pirate (too far)`);
      }
    }
  }

  /**
   * Get all active pirates
   */
  public getPirates(): Pirate[] {
    return this.pirates.filter((p) => !p.isDestroyed && p.active);
  }

  /**
   * Get pirate count
   */
  public getPirateCount(): number {
    return this.pirates.filter((p) => !p.isDestroyed && p.active).length;
  }

  /**
   * Get pirate by ID
   */
  public getPirateById(id: string): Pirate | undefined {
    return this.pirates.find((p) => p.id === id);
  }

  /**
   * Remove a specific pirate
   */
  public removePirate(pirate: Pirate): void {
    const index = this.pirates.indexOf(pirate);
    if (index > -1) {
      this.pirates.splice(index, 1);
    }
  }

  /**
   * Clear all pirates
   */
  public clear(): void {
    this.pirates = [];
    this.spawnAccumulator = 0;
  }

  /**
   * Force spawn a pirate at specific location (for testing/events)
   */
  public forceSpawn(x: number, y: number): Pirate {
    const pirate = new Pirate(x, y);
    this.pirates.push(pirate);
    return pirate;
  }

  /**
   * Render all pirates
   */
  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    ctx.save();

    for (const pirate of this.pirates) {
      if (pirate.isDestroyed || !pirate.active) continue;

      // Frustum culling
      const screenX = pirate.position.x - cameraX;
      const screenY = pirate.position.y - cameraY;
      const padding = 50;

      if (
        screenX < -padding ||
        screenX > ctx.canvas.width + padding ||
        screenY < -padding ||
        screenY > ctx.canvas.height + padding
      ) {
        continue;
      }

      // Render pirate in world space
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      pirate.render(ctx);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Get pirates near a position
   */
  public getPiratesNear(x: number, y: number, radius: number): Pirate[] {
    return this.pirates.filter((p) => {
      if (p.isDestroyed || !p.active) return false;
      const dx = p.position.x - x;
      const dy = p.position.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  /**
   * Check if any pirates are nearby (for HUD warning)
   */
  public hasNearbyThreats(x: number, y: number, warningRadius: number = 300): boolean {
    return this.pirates.some((p) => {
      if (p.isDestroyed || !p.active) return false;
      const dx = p.position.x - x;
      const dy = p.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= warningRadius && (p.state === 'chase' || p.state === 'attack');
    });
  }

  /**
   * Make all pirates within a radius passive (for respawn protection)
   * Passive pirates will fly away and ignore the player unless attacked
   */
  public makePiratesPassiveNear(x: number, y: number, radius: number = 800): void {
    for (const pirate of this.pirates) {
      if (pirate.isDestroyed || !pirate.active) continue;

      const dx = pirate.position.x - x;
      const dy = pirate.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radius) {
        pirate.setPassive(true);
        console.log(`[EnemySpawner] Made pirate passive at distance ${distance.toFixed(0)}`);
      }
    }
  }
}
