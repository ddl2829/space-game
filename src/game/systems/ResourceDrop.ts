/**
 * Resource drop system - floating collectibles from destroyed asteroids
 */

import { Resource } from '../../data/resources';
import { Asteroid } from '../entities/Asteroid';
import { Inventory } from '../components/Inventory';
import { ParticleSystem } from '../rendering/Particles';

interface ResourceDrop {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  resource: Resource;
  quantity: number;
  lifetime: number;
  maxLifetime: number;
  collected: boolean;
  magnetized: boolean;
  pulsePhase: number;
}

interface PlayerPosition {
  x: number;
  y: number;
}

export class ResourceDropManager {
  private drops: ResourceDrop[] = [];
  private inventory: Inventory;
  private particles: ParticleSystem;
  private playerPosition: PlayerPosition = { x: 0, y: 0 };

  private readonly COLLECTION_RADIUS: number = 30;
  private readonly MAGNET_RADIUS: number = 150;
  private readonly MAGNET_FORCE: number = 300;
  private readonly MAX_LIFETIME: number = 30; // seconds before despawn
  private readonly DROP_SIZE: number = 8;

  constructor(inventory: Inventory, particles: ParticleSystem) {
    this.inventory = inventory;
    this.particles = particles;
  }

  public updatePlayerPosition(x: number, y: number): void {
    this.playerPosition.x = x;
    this.playerPosition.y = y;
  }

  public spawnFromAsteroid(asteroid: Asteroid, totalQuantity: number): void {
    // Split into multiple drops for visual effect
    const dropCount = Math.min(totalQuantity, 5);
    const quantityPerDrop = Math.ceil(totalQuantity / dropCount);

    for (let i = 0; i < dropCount; i++) {
      const angle = (i / dropCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 30 + Math.random() * 50;
      const quantity = i === dropCount - 1 ? totalQuantity - quantityPerDrop * (dropCount - 1) : quantityPerDrop;

      if (quantity <= 0) continue;

      this.spawn({
        x: asteroid.x + Math.cos(angle) * asteroid.radius * 0.5,
        y: asteroid.y + Math.sin(angle) * asteroid.radius * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        resource: asteroid.resource,
        quantity,
      });
    }
  }

  public spawn(config: {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    resource: Resource;
    quantity: number;
  }): void {
    const drop: ResourceDrop = {
      id: `drop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: config.x,
      y: config.y,
      vx: config.vx || 0,
      vy: config.vy || 0,
      resource: config.resource,
      quantity: config.quantity,
      lifetime: 0,
      maxLifetime: this.MAX_LIFETIME,
      collected: false,
      magnetized: false,
      pulsePhase: Math.random() * Math.PI * 2,
    };

    this.drops.push(drop);
  }

  public update(deltaTime: number): void {
    for (const drop of this.drops) {
      if (drop.collected) continue;

      drop.lifetime += deltaTime;
      drop.pulsePhase += deltaTime * 3;

      // Check for despawn
      if (drop.lifetime >= drop.maxLifetime) {
        drop.collected = true;
        continue;
      }

      // Calculate distance to player
      const dx = this.playerPosition.x - drop.x;
      const dy = this.playerPosition.y - drop.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Magnetic attraction
      if (distance < this.MAGNET_RADIUS && distance > 0) {
        drop.magnetized = true;
        const force = this.MAGNET_FORCE * (1 - distance / this.MAGNET_RADIUS);
        const nx = dx / distance;
        const ny = dy / distance;

        drop.vx += nx * force * deltaTime;
        drop.vy += ny * force * deltaTime;
      } else {
        drop.magnetized = false;
      }

      // Apply friction when not magnetized
      if (!drop.magnetized) {
        const friction = 0.98;
        drop.vx *= friction;
        drop.vy *= friction;
      }

      // Update position
      drop.x += drop.vx * deltaTime;
      drop.y += drop.vy * deltaTime;

      // Check for collection
      if (distance < this.COLLECTION_RADIUS) {
        this.collectDrop(drop);
      }
    }

    // Remove collected/despawned drops
    this.drops = this.drops.filter((d) => !d.collected);
  }

  private collectDrop(drop: ResourceDrop): void {
    const added = this.inventory.addResource(drop.resource.id, drop.quantity);

    if (added > 0) {
      drop.collected = true;
      console.log(`[Audio] Resource collected sound`);

      // Spawn collection particles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 40 + Math.random() * 30;

        this.particles.emit({
          x: drop.x,
          y: drop.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.3 + Math.random() * 0.2,
          size: 3 + Math.random() * 2,
          color: drop.resource.glowColor,
          type: 'collect',
        });
      }
    } else if (added < drop.quantity) {
      // Partial collection - cargo is full
      drop.quantity -= added;
      console.log('[Inventory] Cargo full!');
    }
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    for (const drop of this.drops) {
      if (drop.collected) continue;

      const screenX = drop.x - cameraX;
      const screenY = drop.y - cameraY;

      // Pulse effect
      const pulse = Math.sin(drop.pulsePhase) * 0.2 + 1;
      const size = this.DROP_SIZE * pulse;

      // Glow effect
      const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, size * 2);
      gradient.addColorStop(0, drop.resource.glowColor);
      gradient.addColorStop(0.5, drop.resource.color);
      gradient.addColorStop(1, 'transparent');

      ctx.save();
      ctx.globalAlpha = this.getOpacity(drop);

      // Outer glow
      ctx.beginPath();
      ctx.arc(screenX, screenY, size * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Inner core
      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      ctx.fillStyle = drop.resource.color;
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(screenX - size * 0.3, screenY - size * 0.3, size * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();

      // Magnetized indicator
      if (drop.magnetized) {
        ctx.strokeStyle = drop.resource.glowColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(screenX, screenY, size * 2.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    }
  }

  private getOpacity(drop: ResourceDrop): number {
    // Fade out in last 3 seconds
    const fadeStart = drop.maxLifetime - 3;
    if (drop.lifetime > fadeStart) {
      return 1 - (drop.lifetime - fadeStart) / 3;
    }
    return 1;
  }

  public getDropCount(): number {
    return this.drops.filter((d) => !d.collected).length;
  }

  public clear(): void {
    this.drops = [];
  }
}
