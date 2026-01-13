/**
 * Black Hole entity - gravitational anomaly with teleportation mechanics
 */

export interface BlackHoleConfig {
  x: number;
  y: number;
  radius: number; // event horizon
  pullRadius: number; // gravitational effect radius
  pullStrength: number; // force multiplier
  exitX: number; // where you get spit out
  exitY: number;
  exitAngle: number; // direction you're launched (radians)
  name?: string;
}

interface AccretionParticle {
  angle: number;
  distance: number;
  speed: number;
  size: number;
  brightness: number;
}

export class BlackHole {
  public readonly id: string;
  public readonly name: string;
  public readonly x: number;
  public readonly y: number;
  public readonly radius: number;
  public readonly pullRadius: number;
  public readonly pullStrength: number;
  public readonly exitX: number;
  public readonly exitY: number;
  public readonly exitAngle: number;

  private swirlAngle: number = 0;
  private accretionParticles: AccretionParticle[] = [];
  private pulsePhase: number = 0;
  private lensingPhase: number = 0;

  constructor(config: BlackHoleConfig) {
    this.id = `blackhole_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = config.name ?? 'Singularity';
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius;
    this.pullRadius = config.pullRadius;
    this.pullStrength = config.pullStrength;
    this.exitX = config.exitX;
    this.exitY = config.exitY;
    this.exitAngle = config.exitAngle;

    this.generateAccretionParticles();
  }

  private generateAccretionParticles(): void {
    const particleCount = 60;

    for (let i = 0; i < particleCount; i++) {
      const distance = this.radius * (1.2 + Math.random() * 2);
      this.accretionParticles.push({
        angle: Math.random() * Math.PI * 2,
        distance: distance,
        speed: 0.5 + (1 / (distance / this.radius)) * 2, // faster closer to center
        size: 1 + Math.random() * 3,
        brightness: 0.3 + Math.random() * 0.7,
      });
    }
  }

  /**
   * Update black hole animations
   */
  public update(deltaTime: number): void {
    // Update swirl rotation
    this.swirlAngle += deltaTime * 0.5;

    // Update pulse phase
    this.pulsePhase += deltaTime * 1.5;

    // Update lensing animation
    this.lensingPhase += deltaTime * 0.3;

    // Update accretion disk particles
    for (const particle of this.accretionParticles) {
      particle.angle += particle.speed * deltaTime;

      // Slowly spiral inward
      particle.distance -= deltaTime * 2;

      // Reset particles that reach the center
      if (particle.distance < this.radius * 1.1) {
        particle.distance = this.radius * (2.5 + Math.random() * 0.5);
        particle.angle = Math.random() * Math.PI * 2;
      }
    }
  }

  /**
   * Render the black hole with accretion disk and effects
   */
  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();

    // Render gravitational lensing effect
    this.renderLensing(ctx, screenX, screenY);

    // Render pull range indicator
    this.renderPullRange(ctx, screenX, screenY);

    // Render accretion disk (behind event horizon)
    this.renderAccretionDisk(ctx, screenX, screenY);

    // Render event horizon
    this.renderEventHorizon(ctx, screenX, screenY);

    // Render central singularity
    this.renderSingularity(ctx, screenX, screenY);

    // Render name
    this.renderName(ctx, screenX, screenY);

    ctx.restore();
  }

  private renderLensing(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    // Subtle warping effect using concentric distorted circles
    ctx.save();

    const ringCount = 5;
    const baseAlpha = 0.08;

    for (let i = 0; i < ringCount; i++) {
      const ringRadius = this.radius * (2 + i * 0.8);
      const wave = Math.sin(this.lensingPhase + i * 0.5) * 3;

      ctx.beginPath();
      ctx.strokeStyle = `rgba(150, 100, 255, ${baseAlpha - i * 0.01})`;
      ctx.lineWidth = 1;

      // Draw slightly warped circle
      for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
        const warp = Math.sin(angle * 4 + this.lensingPhase) * wave;
        const px = screenX + Math.cos(angle) * (ringRadius + warp);
        const py = screenY + Math.sin(angle) * (ringRadius + warp);

        if (angle === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }

      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderPullRange(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    // Faint gravitational influence zone
    const gradient = ctx.createRadialGradient(
      screenX,
      screenY,
      this.radius * 2,
      screenX,
      screenY,
      this.pullRadius
    );

    gradient.addColorStop(0, 'rgba(100, 50, 150, 0.1)');
    gradient.addColorStop(0.7, 'rgba(50, 20, 100, 0.03)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(screenX, screenY, this.pullRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Pull range border
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.pullRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 50, 200, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([20, 15]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private renderAccretionDisk(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    // Outer glow of the disk
    const diskGradient = ctx.createRadialGradient(
      screenX,
      screenY,
      this.radius,
      screenX,
      screenY,
      this.radius * 3
    );

    diskGradient.addColorStop(0, 'rgba(200, 100, 255, 0.4)');
    diskGradient.addColorStop(0.3, 'rgba(100, 50, 200, 0.3)');
    diskGradient.addColorStop(0.6, 'rgba(50, 20, 150, 0.15)');
    diskGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius * 3, 0, Math.PI * 2);
    ctx.fillStyle = diskGradient;
    ctx.fill();

    // Swirling bands in the disk
    this.renderSwirlBands(ctx, screenX, screenY);

    // Individual particles
    this.renderAccretionParticles(ctx, screenX, screenY);
  }

  private renderSwirlBands(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    ctx.save();

    const bandCount = 4;
    for (let i = 0; i < bandCount; i++) {
      const startAngle = this.swirlAngle + (i / bandCount) * Math.PI * 2;
      const endAngle = startAngle + Math.PI * 0.8;
      const innerRadius = this.radius * (1.3 + i * 0.3);
      const outerRadius = innerRadius + this.radius * 0.4;

      const gradient = ctx.createRadialGradient(
        screenX,
        screenY,
        innerRadius,
        screenX,
        screenY,
        outerRadius
      );

      const alpha = 0.3 - i * 0.05;
      gradient.addColorStop(0, `rgba(180, 100, 255, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(100, 50, 200, ${alpha * 0.7})`);
      gradient.addColorStop(1, 'rgba(50, 20, 150, 0)');

      ctx.beginPath();
      ctx.arc(screenX, screenY, innerRadius, startAngle, endAngle);
      ctx.arc(screenX, screenY, outerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.restore();
  }

  private renderAccretionParticles(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    for (const particle of this.accretionParticles) {
      const px = screenX + Math.cos(particle.angle) * particle.distance;
      const py = screenY + Math.sin(particle.angle) * particle.distance;

      // Color based on distance (hotter closer to center)
      const heatFactor = 1 - (particle.distance - this.radius) / (this.radius * 2);
      const r = Math.floor(150 + heatFactor * 105);
      const g = Math.floor(50 + heatFactor * 50);
      const b = 255;

      ctx.beginPath();
      ctx.arc(px, py, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.brightness * 0.6})`;
      ctx.fill();

      // Particle trail
      const trailLength = particle.speed * 15;
      const trailAngle = particle.angle - (particle.speed > 0 ? 0.1 : -0.1);

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(
        screenX + Math.cos(trailAngle) * (particle.distance + trailLength),
        screenY + Math.sin(trailAngle) * (particle.distance + trailLength)
      );
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${particle.brightness * 0.2})`;
      ctx.lineWidth = particle.size * 0.5;
      ctx.stroke();
    }
  }

  private renderEventHorizon(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    const pulse = Math.sin(this.pulsePhase) * 0.1 + 1;
    const horizonRadius = this.radius * pulse;

    // Event horizon edge glow
    const edgeGlow = ctx.createRadialGradient(
      screenX,
      screenY,
      horizonRadius * 0.8,
      screenX,
      screenY,
      horizonRadius * 1.3
    );

    edgeGlow.addColorStop(0, 'rgba(0, 0, 0, 1)');
    edgeGlow.addColorStop(0.5, 'rgba(50, 20, 100, 0.8)');
    edgeGlow.addColorStop(0.8, 'rgba(100, 50, 200, 0.3)');
    edgeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(screenX, screenY, horizonRadius * 1.3, 0, Math.PI * 2);
    ctx.fillStyle = edgeGlow;
    ctx.fill();

    // The actual black event horizon
    ctx.beginPath();
    ctx.arc(screenX, screenY, horizonRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Subtle purple edge
    ctx.strokeStyle = 'rgba(150, 100, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private renderSingularity(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    // Central point with occasional bright flashes
    const flash = Math.sin(this.pulsePhase * 3) > 0.9 ? 0.5 : 0;

    if (flash > 0) {
      const flashGradient = ctx.createRadialGradient(
        screenX,
        screenY,
        0,
        screenX,
        screenY,
        this.radius * 0.5
      );

      flashGradient.addColorStop(0, `rgba(255, 255, 255, ${flash})`);
      flashGradient.addColorStop(0.3, `rgba(200, 150, 255, ${flash * 0.5})`);
      flashGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(screenX, screenY, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = flashGradient;
      ctx.fill();
    }
  }

  private renderName(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    ctx.fillStyle = 'rgba(180, 150, 255, 0.8)';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, screenX, screenY + this.radius * 3.5);

    // Warning text
    ctx.fillStyle = 'rgba(150, 100, 200, 0.6)';
    ctx.font = '11px monospace';
    ctx.fillText('GRAVITATIONAL ANOMALY', screenX, screenY + this.radius * 3.5 + 16);
  }

  /**
   * Check if a point is within gravitational pull range
   */
  public isInPullRange(x: number, y: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const distSq = dx * dx + dy * dy;
    return distSq <= this.pullRadius * this.pullRadius;
  }

  /**
   * Get the gravitational pull force vector at a position
   */
  public getPullForce(x: number, y: number): { fx: number; fy: number } {
    const dx = this.x - x;
    const dy = this.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.pullRadius || distance < this.radius) {
      return { fx: 0, fy: 0 };
    }

    // Normalize direction
    const nx = dx / distance;
    const ny = dy / distance;

    // Force increases as you get closer (inverse square-ish)
    const normalizedDist = distance / this.pullRadius;
    const forceMagnitude = this.pullStrength * (1 / (normalizedDist * normalizedDist + 0.1));

    return {
      fx: nx * forceMagnitude,
      fy: ny * forceMagnitude,
    };
  }

  /**
   * Check if a point is within the event horizon (triggers teleport)
   */
  public isInEventHorizon(x: number, y: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const distSq = dx * dx + dy * dy;
    return distSq <= this.radius * this.radius;
  }

  /**
   * Get the exit point after being captured by the black hole
   */
  public getExitPoint(): { x: number; y: number; angle: number } {
    return {
      x: this.exitX,
      y: this.exitY,
      angle: this.exitAngle,
    };
  }

  /**
   * Check if a point is within the black hole body
   */
  public containsPoint(worldX: number, worldY: number): boolean {
    return this.isInEventHorizon(worldX, worldY);
  }

  /**
   * Get distance from a point to the black hole center
   */
  public distanceTo(x: number, y: number): number {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
