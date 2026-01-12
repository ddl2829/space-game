/**
 * Simple particle system with object pooling for performance
 */

export type ParticleType = 'spark' | 'debris' | 'collect' | 'thrust' | 'ambient';

export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
  type: ParticleType;
  gravity?: number;
  fadeOut?: boolean;
  shrink?: boolean;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  initialSize: number;
  color: string;
  type: ParticleType;
  gravity: number;
  fadeOut: boolean;
  shrink: boolean;
  rotation: number;
  rotationSpeed: number;
}

export class ParticleSystem {
  private pool: Particle[] = [];
  private poolSize: number;
  private activeCount: number = 0;

  constructor(poolSize: number = 500) {
    this.poolSize = poolSize;
    this.initializePool();
  }

  private initializePool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.pool.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 0,
      initialSize: 0,
      color: '#fff',
      type: 'spark',
      gravity: 0,
      fadeOut: true,
      shrink: true,
      rotation: 0,
      rotationSpeed: 0,
    };
  }

  private getAvailableParticle(): Particle | null {
    for (const particle of this.pool) {
      if (!particle.active) {
        return particle;
      }
    }
    return null;
  }

  public emit(config: ParticleConfig): void {
    const particle = this.getAvailableParticle();
    if (!particle) return; // Pool exhausted

    particle.active = true;
    particle.x = config.x;
    particle.y = config.y;
    particle.vx = config.vx;
    particle.vy = config.vy;
    particle.life = config.life;
    particle.maxLife = config.life;
    particle.size = config.size;
    particle.initialSize = config.size;
    particle.color = config.color;
    particle.type = config.type;
    particle.gravity = config.gravity ?? 0;
    particle.fadeOut = config.fadeOut ?? true;
    particle.shrink = config.shrink ?? true;
    particle.rotation = Math.random() * Math.PI * 2;
    particle.rotationSpeed = (Math.random() - 0.5) * 5;

    this.activeCount++;
  }

  public emitBurst(config: ParticleConfig, count: number, spread: number = Math.PI * 2): void {
    const baseAngle = Math.atan2(config.vy, config.vx);
    const speed = Math.sqrt(config.vx * config.vx + config.vy * config.vy);

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const particleSpeed = speed * (0.5 + Math.random() * 0.5);

      this.emit({
        ...config,
        vx: Math.cos(angle) * particleSpeed,
        vy: Math.sin(angle) * particleSpeed,
        life: config.life * (0.7 + Math.random() * 0.6),
        size: config.size * (0.7 + Math.random() * 0.6),
      });
    }
  }

  public update(deltaTime: number): void {
    this.activeCount = 0;

    for (const particle of this.pool) {
      if (!particle.active) continue;

      particle.life -= deltaTime;

      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }

      this.activeCount++;

      // Apply gravity
      particle.vy += particle.gravity * deltaTime;

      // Update position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;

      // Update rotation
      particle.rotation += particle.rotationSpeed * deltaTime;

      // Apply drag based on type
      const drag = this.getDragForType(particle.type);
      particle.vx *= 1 - drag * deltaTime;
      particle.vy *= 1 - drag * deltaTime;

      // Shrink if enabled
      if (particle.shrink) {
        const lifeRatio = particle.life / particle.maxLife;
        particle.size = particle.initialSize * lifeRatio;
      }
    }
  }

  private getDragForType(type: ParticleType): number {
    switch (type) {
      case 'spark':
        return 2;
      case 'debris':
        return 0.5;
      case 'collect':
        return 3;
      case 'thrust':
        return 4;
      case 'ambient':
        return 0.1;
      default:
        return 1;
    }
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    for (const particle of this.pool) {
      if (!particle.active) continue;

      const screenX = particle.x - cameraX;
      const screenY = particle.y - cameraY;

      // Skip if off screen
      if (
        screenX < -particle.size ||
        screenX > ctx.canvas.width + particle.size ||
        screenY < -particle.size ||
        screenY > ctx.canvas.height + particle.size
      ) {
        continue;
      }

      ctx.save();

      // Calculate alpha
      let alpha = 1;
      if (particle.fadeOut) {
        alpha = particle.life / particle.maxLife;
      }
      ctx.globalAlpha = alpha;

      // Render based on type
      switch (particle.type) {
        case 'spark':
          this.renderSpark(ctx, screenX, screenY, particle);
          break;
        case 'debris':
          this.renderDebris(ctx, screenX, screenY, particle);
          break;
        case 'collect':
          this.renderCollect(ctx, screenX, screenY, particle);
          break;
        case 'thrust':
          this.renderThrust(ctx, screenX, screenY, particle);
          break;
        case 'ambient':
          this.renderAmbient(ctx, screenX, screenY, particle);
          break;
      }

      ctx.restore();
    }
  }

  private renderSpark(ctx: CanvasRenderingContext2D, x: number, y: number, p: Particle): void {
    // Draw elongated spark
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const angle = Math.atan2(p.vy, p.vx);
    const length = Math.min(p.size * 3, speed * 0.05);

    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(-length, 0);
    ctx.lineTo(length, 0);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glow
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.size * 2;
    ctx.stroke();
  }

  private renderDebris(ctx: CanvasRenderingContext2D, x: number, y: number, p: Particle): void {
    ctx.translate(x, y);
    ctx.rotate(p.rotation);

    // Angular debris shape
    ctx.beginPath();
    ctx.moveTo(-p.size, -p.size * 0.5);
    ctx.lineTo(p.size * 0.5, -p.size);
    ctx.lineTo(p.size, p.size * 0.3);
    ctx.lineTo(-p.size * 0.3, p.size);
    ctx.closePath();

    ctx.fillStyle = p.color;
    ctx.fill();
  }

  private renderCollect(ctx: CanvasRenderingContext2D, x: number, y: number, p: Particle): void {
    // Glowing orb
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size);
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(0.5, p.color);
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private renderThrust(ctx: CanvasRenderingContext2D, x: number, y: number, p: Particle): void {
    // Flame-like gradient
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size);
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(0.3, p.color);
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private renderAmbient(ctx: CanvasRenderingContext2D, x: number, y: number, p: Particle): void {
    // Simple dot
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public clear(): void {
    for (const particle of this.pool) {
      particle.active = false;
    }
    this.activeCount = 0;
  }
}
