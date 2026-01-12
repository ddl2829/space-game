/**
 * Asteroid field management - spawning and respawning asteroids
 */

import { Asteroid, AsteroidSize } from '../entities/Asteroid';
import { getRandomResource } from '../../data/resources';

interface SpawnerConfig {
  minAsteroids: number;
  maxAsteroids: number;
  spawnRadius: number; // distance from player where asteroids can spawn
  despawnRadius: number; // distance at which asteroids are removed
  respawnDelay: number; // seconds before respawning depleted asteroids
  minSpacing: number; // minimum distance between asteroids
}

interface RespawnEntry {
  x: number;
  y: number;
  size: AsteroidSize;
  timer: number;
}

interface PlayerPosition {
  x: number;
  y: number;
}

export class AsteroidSpawner {
  private asteroids: Asteroid[] = [];
  private respawnQueue: RespawnEntry[] = [];
  private config: SpawnerConfig;
  private playerPosition: PlayerPosition = { x: 0, y: 0 };
  private initialized: boolean = false;

  constructor(config?: Partial<SpawnerConfig>) {
    this.config = {
      minAsteroids: 15,
      maxAsteroids: 30,
      spawnRadius: 800,
      despawnRadius: 1200,
      respawnDelay: 10,
      minSpacing: 80,
      ...config,
    };
  }

  public initialize(playerX: number, playerY: number): void {
    this.playerPosition.x = playerX;
    this.playerPosition.y = playerY;

    // Initial asteroid field generation
    this.generateInitialField();
    this.initialized = true;
  }

  private generateInitialField(): void {
    const targetCount = Math.floor((this.config.minAsteroids + this.config.maxAsteroids) / 2);

    let attempts = 0;
    const maxAttempts = targetCount * 10;

    while (this.asteroids.length < targetCount && attempts < maxAttempts) {
      attempts++;

      // Generate position in a ring around player
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * (this.config.spawnRadius - 100);

      const x = this.playerPosition.x + Math.cos(angle) * distance;
      const y = this.playerPosition.y + Math.sin(angle) * distance;

      if (this.isValidSpawnPosition(x, y)) {
        this.spawnAsteroid(x, y);
      }
    }

    console.log(`[AsteroidSpawner] Generated ${this.asteroids.length} asteroids`);
  }

  private isValidSpawnPosition(x: number, y: number, ignorePlayer: boolean = false): boolean {
    // Check distance from player
    if (!ignorePlayer) {
      const playerDist = Math.sqrt(
        Math.pow(x - this.playerPosition.x, 2) + Math.pow(y - this.playerPosition.y, 2)
      );
      if (playerDist < 100) return false; // Don't spawn too close to player
    }

    // Check distance from other asteroids
    for (const asteroid of this.asteroids) {
      const dx = x - asteroid.x;
      const dy = y - asteroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.config.minSpacing + asteroid.radius) {
        return false;
      }
    }

    return true;
  }

  private spawnAsteroid(x: number, y: number, size?: AsteroidSize): Asteroid {
    const asteroid = new Asteroid({
      x,
      y,
      size,
      resource: getRandomResource(),
    });

    this.asteroids.push(asteroid);
    return asteroid;
  }

  public updatePlayerPosition(x: number, y: number): void {
    this.playerPosition.x = x;
    this.playerPosition.y = y;
  }

  public update(deltaTime: number): void {
    if (!this.initialized) return;

    // Update all asteroids
    for (const asteroid of this.asteroids) {
      asteroid.update(deltaTime);
    }

    // Process destroyed asteroids
    this.processDestroyedAsteroids();

    // Process respawn queue
    this.processRespawnQueue(deltaTime);

    // Remove far away asteroids and spawn new ones
    this.manageDensity();

    // Spawn new asteroids if needed
    this.maintainAsteroidCount();
  }

  private processDestroyedAsteroids(): void {
    const destroyed = this.asteroids.filter((a) => a.isDestroyed);

    for (const asteroid of destroyed) {
      // Add to respawn queue
      this.respawnQueue.push({
        x: asteroid.x,
        y: asteroid.y,
        size: asteroid.size,
        timer: this.config.respawnDelay,
      });
    }

    // Remove destroyed asteroids
    this.asteroids = this.asteroids.filter((a) => !a.isDestroyed);
  }

  private processRespawnQueue(deltaTime: number): void {
    const readyToSpawn: RespawnEntry[] = [];

    for (const entry of this.respawnQueue) {
      entry.timer -= deltaTime;

      if (entry.timer <= 0) {
        readyToSpawn.push(entry);
      }
    }

    // Spawn ready entries
    for (const entry of readyToSpawn) {
      // Check if position is still valid and in range
      const distToPlayer = Math.sqrt(
        Math.pow(entry.x - this.playerPosition.x, 2) + Math.pow(entry.y - this.playerPosition.y, 2)
      );

      if (distToPlayer < this.config.spawnRadius && this.isValidSpawnPosition(entry.x, entry.y, true)) {
        this.spawnAsteroid(entry.x, entry.y, entry.size);
      }
    }

    // Remove spawned entries
    this.respawnQueue = this.respawnQueue.filter((e) => e.timer > 0);
  }

  private manageDensity(): void {
    // Remove asteroids that are too far from player
    this.asteroids = this.asteroids.filter((asteroid) => {
      const dist = Math.sqrt(
        Math.pow(asteroid.x - this.playerPosition.x, 2) + Math.pow(asteroid.y - this.playerPosition.y, 2)
      );
      return dist < this.config.despawnRadius;
    });
  }

  private maintainAsteroidCount(): void {
    // Spawn new asteroids at the edge of the spawn radius if count is low
    if (this.asteroids.length < this.config.minAsteroids) {
      const toSpawn = this.config.minAsteroids - this.asteroids.length;

      for (let i = 0; i < toSpawn; i++) {
        this.spawnAtEdge();
      }
    }
  }

  private spawnAtEdge(): void {
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      attempts++;

      // Spawn at the edge of the spawn radius
      const angle = Math.random() * Math.PI * 2;
      const distance = this.config.spawnRadius * (0.7 + Math.random() * 0.3);

      const x = this.playerPosition.x + Math.cos(angle) * distance;
      const y = this.playerPosition.y + Math.sin(angle) * distance;

      if (this.isValidSpawnPosition(x, y)) {
        this.spawnAsteroid(x, y);
        return;
      }
    }
  }

  public getAsteroids(): Asteroid[] {
    return this.asteroids;
  }

  public getAsteroidCount(): number {
    return this.asteroids.length;
  }

  public getAsteroidAt(worldX: number, worldY: number): Asteroid | null {
    for (const asteroid of this.asteroids) {
      if (!asteroid.isDestroyed && asteroid.containsPoint(worldX, worldY)) {
        return asteroid;
      }
    }
    return null;
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    // Render all asteroids
    for (const asteroid of this.asteroids) {
      // Frustum culling - only render if on screen (with padding)
      const screenX = asteroid.x - cameraX;
      const screenY = asteroid.y - cameraY;
      const padding = asteroid.radius + 50;

      if (
        screenX > -padding &&
        screenX < ctx.canvas.width + padding &&
        screenY > -padding &&
        screenY < ctx.canvas.height + padding
      ) {
        asteroid.render(ctx, cameraX, cameraY);
      }
    }
  }

  public clear(): void {
    this.asteroids = [];
    this.respawnQueue = [];
    this.initialized = false;
  }
}
