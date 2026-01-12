/**
 * Asteroid entity - mineable space rocks containing resources
 */

import { Resource, getRandomResource } from '../../data/resources';

export type AsteroidSize = 'small' | 'medium' | 'large';

interface AsteroidConfig {
  x: number;
  y: number;
  size?: AsteroidSize;
  resource?: Resource;
}

interface Vector2 {
  x: number;
  y: number;
}

const SIZE_CONFIG: Record<AsteroidSize, { radius: number; health: number; resourceMultiplier: number }> = {
  small: { radius: 20, health: 100, resourceMultiplier: 1 },
  medium: { radius: 35, health: 200, resourceMultiplier: 2 },
  large: { radius: 55, health: 350, resourceMultiplier: 4 },
};

export class Asteroid {
  public id: string;
  public x: number;
  public y: number;
  public size: AsteroidSize;
  public radius: number;
  public resource: Resource;
  public resourceQuantity: number;

  public maxHealth: number;
  public health: number;
  public isDestroyed: boolean = false;
  public isBeingMined: boolean = false;

  private vertices: Vector2[] = [];
  private rotation: number = 0;
  private rotationSpeed: number;
  private miningFlashTimer: number = 0;
  private baseColor: string;

  constructor(config: AsteroidConfig) {
    this.id = `asteroid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.x = config.x;
    this.y = config.y;
    this.size = config.size || this.getRandomSize();
    this.resource = config.resource || getRandomResource();

    const sizeConfig = SIZE_CONFIG[this.size];
    this.radius = sizeConfig.radius;
    this.maxHealth = sizeConfig.health;
    this.health = this.maxHealth;
    this.resourceQuantity = sizeConfig.resourceMultiplier * (3 + Math.floor(Math.random() * 3));

    this.rotationSpeed = (Math.random() - 0.5) * 0.01;
    this.baseColor = this.getBaseColor();
    this.generateVertices();
  }

  private getRandomSize(): AsteroidSize {
    const roll = Math.random();
    if (roll < 0.5) return 'small';
    if (roll < 0.85) return 'medium';
    return 'large';
  }

  private getBaseColor(): string {
    // Tint asteroid color based on resource type
    const resourceColors: Record<string, string> = {
      iron: '#5a5a5a',
      titanium: '#4a6070',
      platinum: '#707068',
    };
    return resourceColors[this.resource.id] || '#555555';
  }

  private generateVertices(): void {
    const vertexCount = 8 + Math.floor(Math.random() * 5);
    this.vertices = [];

    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      const variance = 0.7 + Math.random() * 0.5;
      const distance = this.radius * variance;

      this.vertices.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      });
    }
  }

  public update(deltaTime: number): void {
    if (this.isDestroyed) return;

    this.rotation += this.rotationSpeed * deltaTime * 60;

    if (this.isBeingMined) {
      this.miningFlashTimer += deltaTime;
    } else {
      this.miningFlashTimer = 0;
    }

    this.isBeingMined = false;
  }

  public mine(damage: number): number {
    if (this.isDestroyed) return 0;

    this.isBeingMined = true;
    this.health -= damage;

    // Audio placeholder
    if (Math.random() < 0.1) {
      console.log('[Audio] Mining hit sound');
    }

    if (this.health <= 0) {
      this.health = 0;
      this.isDestroyed = true;
      console.log('[Audio] Asteroid destroyed sound');
      return this.resourceQuantity;
    }

    return 0;
  }

  public getMiningProgress(): number {
    return 1 - this.health / this.maxHealth;
  }

  public containsPoint(worldX: number, worldY: number): boolean {
    const dx = worldX - this.x;
    const dy = worldY - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  public distanceTo(x: number, y: number): number {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    if (this.isDestroyed) return;

    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.rotation);

    // Calculate mining effect color
    let fillColor = this.baseColor;
    if (this.isBeingMined) {
      const flash = Math.sin(this.miningFlashTimer * 20) * 0.5 + 0.5;
      fillColor = this.lerpColor(this.baseColor, this.resource.color, flash * 0.6);
    }

    // Draw asteroid body
    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();

    // Fill with gradient for depth
    const gradient = ctx.createRadialGradient(
      -this.radius * 0.3,
      -this.radius * 0.3,
      0,
      0,
      0,
      this.radius
    );
    gradient.addColorStop(0, this.lightenColor(fillColor, 30));
    gradient.addColorStop(1, this.darkenColor(fillColor, 30));

    ctx.fillStyle = gradient;
    ctx.fill();

    // Outline
    ctx.strokeStyle = this.darkenColor(fillColor, 50);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Resource veins
    this.renderResourceVeins(ctx);

    // Mining damage cracks
    if (this.getMiningProgress() > 0.2) {
      this.renderCracks(ctx);
    }

    ctx.restore();

    // Health bar when damaged
    if (this.health < this.maxHealth) {
      this.renderHealthBar(ctx, screenX, screenY);
    }
  }

  private renderResourceVeins(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = this.resource.color;
    ctx.lineWidth = 2;

    // Draw a few random veins
    const veinCount = this.size === 'large' ? 4 : this.size === 'medium' ? 3 : 2;
    const seed = this.id.charCodeAt(0);

    for (let i = 0; i < veinCount; i++) {
      const angle = ((seed + i * 73) % 360) * (Math.PI / 180);
      const length = this.radius * (0.3 + (((seed + i * 37) % 50) / 100));

      ctx.beginPath();
      ctx.moveTo(0, 0);

      const midX = Math.cos(angle) * length * 0.5 + (((seed + i) % 10) - 5);
      const midY = Math.sin(angle) * length * 0.5 + (((seed + i * 2) % 10) - 5);

      ctx.quadraticCurveTo(midX, midY, Math.cos(angle) * length, Math.sin(angle) * length);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderCracks(ctx: CanvasRenderingContext2D): void {
    const progress = this.getMiningProgress();
    const crackCount = Math.floor(progress * 5);

    ctx.save();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.globalAlpha = progress;

    for (let i = 0; i < crackCount; i++) {
      const angle = (i / crackCount) * Math.PI * 2 + this.rotation;
      const length = this.radius * (0.4 + progress * 0.4);

      ctx.beginPath();
      ctx.moveTo(0, 0);

      let x = 0,
        y = 0;
      const segments = 3;
      for (let j = 0; j < segments; j++) {
        const segAngle = angle + ((Math.random() - 0.5) * Math.PI) / 4;
        const segLength = length / segments;
        x += Math.cos(segAngle) * segLength;
        y += Math.sin(segAngle) * segLength;
        ctx.lineTo(x, y);
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  private renderHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    const barWidth = this.radius * 1.5;
    const barHeight = 4;
    const barY = screenY - this.radius - 10;

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

    // Health fill
    const healthPercent = this.health / this.maxHealth;
    const healthColor = healthPercent > 0.5 ? '#4a4' : healthPercent > 0.25 ? '#aa4' : '#a44';
    ctx.fillStyle = healthColor;
    ctx.fillRect(screenX - barWidth / 2, barY, barWidth * healthPercent, barHeight);

    // Border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX - barWidth / 2, barY, barWidth, barHeight);
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private lightenColor(color: string, amount: number): string {
    const rgb = this.hexToRgb(color);
    return `rgb(${Math.min(255, rgb.r + amount)}, ${Math.min(255, rgb.g + amount)}, ${Math.min(255, rgb.b + amount)})`;
  }

  private darkenColor(color: string, amount: number): string {
    const rgb = this.hexToRgb(color);
    return `rgb(${Math.max(0, rgb.r - amount)}, ${Math.max(0, rgb.g - amount)}, ${Math.max(0, rgb.b - amount)})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    return { r: 128, g: 128, b: 128 };
  }
}
