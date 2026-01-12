/**
 * Mining System Integration Example
 *
 * This file demonstrates how to integrate Sprint 1's mining systems
 * with Sprint 0's Game class. Copy relevant sections into Game.ts.
 */

import { Inventory } from './components/Inventory';
import { ParticleSystem } from './rendering/Particles';
import { ResourceDropManager } from './systems/ResourceDrop';
import { MiningSystem } from './systems/MiningSystem';
import { AsteroidSpawner } from './systems/AsteroidSpawner';
import { HUD } from './ui/HUD';

/**
 * Example integration with Game class:
 *
 * class Game {
 *   // Add these properties
 *   private inventory: Inventory;
 *   private particles: ParticleSystem;
 *   private resourceDrops: ResourceDropManager;
 *   private miningSystem: MiningSystem;
 *   private asteroidSpawner: AsteroidSpawner;
 *   private hud: HUD;
 *
 *   constructor() {
 *     // ... existing setup ...
 *     this.initializeMiningSystem();
 *   }
 *
 *   private initializeMiningSystem(): void {
 *     // Create inventory with 100kg capacity and 0 starting credits
 *     this.inventory = new Inventory(100, 0);
 *
 *     // Create particle system with 500 particle pool
 *     this.particles = new ParticleSystem(500);
 *
 *     // Create resource drop manager
 *     this.resourceDrops = new ResourceDropManager(this.inventory, this.particles);
 *
 *     // Create mining system
 *     this.miningSystem = new MiningSystem(
 *       this.inventory,
 *       this.particles,
 *       this.resourceDrops,
 *       {
 *         miningRange: 150,
 *         miningRate: 50,
 *         baseMineDuration: 3
 *       }
 *     );
 *
 *     // Create asteroid spawner
 *     this.asteroidSpawner = new AsteroidSpawner({
 *       minAsteroids: 15,
 *       maxAsteroids: 30,
 *       spawnRadius: 800,
 *       despawnRadius: 1200,
 *       respawnDelay: 10
 *     });
 *
 *     // Initialize asteroid field at player position
 *     this.asteroidSpawner.initialize(this.player.x, this.player.y);
 *
 *     // Create HUD
 *     this.hud = new HUD(this.inventory);
 *     this.hud.setMiningSystem(this.miningSystem);
 *
 *     // Connect mining system to asteroids
 *     this.miningSystem.setAsteroids(this.asteroidSpawner.getAsteroids());
 *   }
 *
 *   update(deltaTime: number): void {
 *     // ... existing player/camera update ...
 *
 *     // Update mining systems
 *     this.updateMiningSystems(deltaTime);
 *   }
 *
 *   private updateMiningSystems(deltaTime: number): void {
 *     // Update player position for all systems
 *     const playerX = this.player.x;
 *     const playerY = this.player.y;
 *
 *     this.asteroidSpawner.updatePlayerPosition(playerX, playerY);
 *     this.resourceDrops.updatePlayerPosition(playerX, playerY);
 *     this.miningSystem.updatePlayerPosition(playerX, playerY);
 *
 *     // Convert mouse screen position to world position
 *     const worldMouseX = this.mouseX + this.camera.x;
 *     const worldMouseY = this.mouseY + this.camera.y;
 *     this.miningSystem.updateMouseWorldPosition(worldMouseX, worldMouseY);
 *
 *     // Update all systems
 *     this.asteroidSpawner.update(deltaTime);
 *     this.miningSystem.setAsteroids(this.asteroidSpawner.getAsteroids());
 *     this.miningSystem.update(deltaTime);
 *     this.resourceDrops.update(deltaTime);
 *     this.particles.update(deltaTime);
 *     this.hud.update(deltaTime);
 *   }
 *
 *   render(): void {
 *     // ... existing background render ...
 *
 *     // Render game objects (in world space)
 *     this.asteroidSpawner.render(this.ctx, this.camera.x, this.camera.y);
 *     this.resourceDrops.render(this.ctx, this.camera.x, this.camera.y);
 *     this.particles.render(this.ctx, this.camera.x, this.camera.y);
 *
 *     // ... existing player render ...
 *
 *     // Render HUD (screen space - no camera offset)
 *     this.hud.render(this.ctx);
 *   }
 * }
 */

// Standalone initialization function for testing
export function createMiningSystem(playerX: number, playerY: number) {
  const inventory = new Inventory(100, 0);
  const particles = new ParticleSystem(500);
  const resourceDrops = new ResourceDropManager(inventory, particles);
  const miningSystem = new MiningSystem(inventory, particles, resourceDrops);
  const asteroidSpawner = new AsteroidSpawner();
  const hud = new HUD(inventory);

  asteroidSpawner.initialize(playerX, playerY);
  hud.setMiningSystem(miningSystem);
  miningSystem.setAsteroids(asteroidSpawner.getAsteroids());

  return {
    inventory,
    particles,
    resourceDrops,
    miningSystem,
    asteroidSpawner,
    hud,

    updateAll(deltaTime: number, playerX: number, playerY: number, worldMouseX: number, worldMouseY: number) {
      asteroidSpawner.updatePlayerPosition(playerX, playerY);
      resourceDrops.updatePlayerPosition(playerX, playerY);
      miningSystem.updatePlayerPosition(playerX, playerY);
      miningSystem.updateMouseWorldPosition(worldMouseX, worldMouseY);

      asteroidSpawner.update(deltaTime);
      miningSystem.setAsteroids(asteroidSpawner.getAsteroids());
      miningSystem.update(deltaTime);
      resourceDrops.update(deltaTime);
      particles.update(deltaTime);
      hud.update(deltaTime);
    },

    renderAll(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
      asteroidSpawner.render(ctx, cameraX, cameraY);
      resourceDrops.render(ctx, cameraX, cameraY);
      particles.render(ctx, cameraX, cameraY);
      hud.render(ctx);
    },
  };
}
