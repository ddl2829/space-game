/**
 * Mining system - handles player mining interaction with asteroids
 */

import type { Asteroid } from '../entities/Asteroid';
import type { Inventory } from '../components/Inventory';
import type { ParticleSystem } from '../rendering/Particles';
import type { ResourceDropManager } from './ResourceDrop';

export interface MiningConfig {
  miningRange: number;
  miningRate: number; // damage per second
  baseMineDuration: number; // seconds to mine small asteroid
}

interface PlayerPosition {
  x: number;
  y: number;
}

export class MiningSystem {
  private config: MiningConfig;
  private isMining: boolean = false;
  private currentTarget: Asteroid | null = null;
  private mouseWorldX: number = 0;
  private mouseWorldY: number = 0;
  private isMouseDown: boolean = false;

  private asteroids: Asteroid[] = [];
  // Inventory stored for future sell/pickup functionality
  private _inventory: Inventory;
  private particles: ParticleSystem;
  private resourceDrops: ResourceDropManager;
  private playerPosition: PlayerPosition = { x: 0, y: 0 };

  private miningAccumulator: number = 0;
  private readonly MINING_TICK_INTERVAL: number = 0.1; // seconds between mining ticks

  constructor(
    inventory: Inventory,
    particles: ParticleSystem,
    resourceDrops: ResourceDropManager,
    config?: Partial<MiningConfig>
  ) {
    this._inventory = inventory;
    this.particles = particles;
    this.resourceDrops = resourceDrops;

    this.config = {
      miningRange: 150,
      miningRate: 50, // damage per second
      baseMineDuration: 3,
      ...config,
    };

    this.setupInputListeners();
  }

  private setupInputListeners(): void {
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
        this.stopMining();
      }
    });

    window.addEventListener('mousemove', (e) => {
      // Store screen coordinates - will be converted to world space in update
      this.mouseWorldX = e.clientX;
      this.mouseWorldY = e.clientY;
    });
  }

  public setAsteroids(asteroids: Asteroid[]): void {
    this.asteroids = asteroids;
  }

  public updatePlayerPosition(x: number, y: number): void {
    this.playerPosition.x = x;
    this.playerPosition.y = y;
  }

  public updateMouseWorldPosition(worldX: number, worldY: number): void {
    this.mouseWorldX = worldX;
    this.mouseWorldY = worldY;
  }

  public update(deltaTime: number): void {
    if (!this.isMouseDown) {
      this.stopMining();
      return;
    }

    // Find asteroid under mouse
    const targetAsteroid = this.findAsteroidAtPosition(this.mouseWorldX, this.mouseWorldY);

    if (!targetAsteroid) {
      this.stopMining();
      return;
    }

    // Check if asteroid is in range
    const distanceToAsteroid = targetAsteroid.distanceTo(this.playerPosition.x, this.playerPosition.y);
    if (distanceToAsteroid > this.config.miningRange + targetAsteroid.radius) {
      this.stopMining();
      return;
    }

    // Start or continue mining
    if (this.currentTarget !== targetAsteroid) {
      this.startMining(targetAsteroid);
    }

    this.performMining(deltaTime);
  }

  private findAsteroidAtPosition(worldX: number, worldY: number): Asteroid | null {
    for (const asteroid of this.asteroids) {
      if (!asteroid.isDestroyed && asteroid.containsPoint(worldX, worldY)) {
        return asteroid;
      }
    }
    return null;
  }

  private startMining(asteroid: Asteroid): void {
    this.currentTarget = asteroid;
    this.isMining = true;
    this.miningAccumulator = 0;
    console.log(`[Mining] Started mining ${asteroid.resource.name} asteroid`);
  }

  private stopMining(): void {
    if (this.isMining) {
      this.isMining = false;
      this.currentTarget = null;
      this.miningAccumulator = 0;
    }
  }

  private performMining(deltaTime: number): void {
    if (!this.currentTarget || this.currentTarget.isDestroyed) {
      this.stopMining();
      return;
    }

    this.miningAccumulator += deltaTime;

    // Apply mining damage at regular intervals
    while (this.miningAccumulator >= this.MINING_TICK_INTERVAL) {
      this.miningAccumulator -= this.MINING_TICK_INTERVAL;

      const damage = this.config.miningRate * this.MINING_TICK_INTERVAL;
      const resourcesDropped = this.currentTarget.mine(damage);

      // Spawn mining particles
      this.spawnMiningParticles();

      // Check if asteroid was destroyed
      if (resourcesDropped > 0) {
        this.onAsteroidDestroyed(this.currentTarget, resourcesDropped);
        this.stopMining();
        return;
      }
    }
  }

  private spawnMiningParticles(): void {
    if (!this.currentTarget) return;

    // Calculate direction from asteroid to player
    const dx = this.playerPosition.x - this.currentTarget.x;
    const dy = this.playerPosition.y - this.currentTarget.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;

    // Spawn particles at the edge of asteroid facing player
    const spawnX = this.currentTarget.x + nx * this.currentTarget.radius;
    const spawnY = this.currentTarget.y + ny * this.currentTarget.radius;

    // Mining sparks
    for (let i = 0; i < 3; i++) {
      const angle = Math.atan2(ny, nx) + (Math.random() - 0.5) * Math.PI * 0.5;
      const speed = 50 + Math.random() * 100;

      this.particles.emit({
        x: spawnX + (Math.random() - 0.5) * 10,
        y: spawnY + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        size: 2 + Math.random() * 3,
        color: this.currentTarget.resource.color,
        type: 'spark',
      });
    }
  }

  private onAsteroidDestroyed(asteroid: Asteroid, quantity: number): void {
    console.log(`[Mining] Asteroid destroyed! Dropping ${quantity} ${asteroid.resource.name}`);

    // Spawn destruction particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;

      this.particles.emit({
        x: asteroid.x + (Math.random() - 0.5) * asteroid.radius,
        y: asteroid.y + (Math.random() - 0.5) * asteroid.radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        size: 3 + Math.random() * 5,
        color: '#666',
        type: 'debris',
      });
    }

    // Spawn resource drops
    this.resourceDrops.spawnFromAsteroid(asteroid, quantity);
  }

  public isMiningActive(): boolean {
    return this.isMining && this.currentTarget !== null;
  }

  public getCurrentTarget(): Asteroid | null {
    return this.currentTarget;
  }

  public getMiningProgress(): number {
    if (!this.currentTarget) return 0;
    return this.currentTarget.getMiningProgress();
  }

  public getMiningRange(): number {
    return this.config.miningRange;
  }

  public getTargetResource(): string | null {
    return this.currentTarget?.resource.name || null;
  }

  public getInventory(): Inventory {
    return this._inventory;
  }

  public cleanup(): void {
    // Remove event listeners if needed
  }
}
