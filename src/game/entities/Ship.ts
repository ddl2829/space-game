import { Entity } from './Entity';
import type { ShipConfig } from '../../types';
import type { InputSystem } from '../systems/InputSystem';
import type { ShipStats } from '../components/ShipStats';

/**
 * Visual upgrade state for rendering
 */
interface UpgradeVisuals {
  engineTier: number;      // 0-3: flame size/intensity
  hullTier: number;        // 0-3: armor plating, color changes with health
  cargoTier: number;       // 0-3: large hanging cargo pods
  weaponTier: number;      // 0-3: weapon systems, multi-shot at tier 3
}

/**
 * Hull color schemes by tier (from healthy to damaged)
 */
const HULL_COLORS = {
  0: { healthy: '#4a9eff', damaged: '#ff4444', outline: '#7bb8ff' },
  1: { healthy: '#55aaff', damaged: '#ff6633', outline: '#88ccff' },
  2: { healthy: '#66bbff', damaged: '#ff8822', outline: '#99ddff' },
  3: { healthy: '#77ccff', damaged: '#ffaa11', outline: '#aaeeff' },
};

/**
 * Default ship configuration values.
 */
const DEFAULT_CONFIG: ShipConfig = {
  thrustPower: 400,      // Acceleration units per second squared
  rotationSpeed: 4,      // Radians per second
  friction: 0.985,       // Velocity multiplier per frame (at 60fps)
  maxSpeed: 500          // Maximum velocity magnitude
};

/**
 * Player-controlled spaceship entity.
 * Features thrust-based movement with momentum and drag.
 */
export class Ship extends Entity {
  /** Ship physics configuration */
  private config: ShipConfig;

  /** Input system reference */
  private input: InputSystem;

  /** Ship visual size */
  private size: number = 20;

  /** Whether thrusters are currently firing */
  isThrusting: boolean = false;

  /** Thrust direction (-1 = reverse, 0 = none, 1 = forward) */
  thrustDirection: number = 0;

  /** Optional ShipStats reference for dynamic stat updates */
  private shipStats: ShipStats | null = null;

  /** Visual upgrade tiers for rendering */
  private upgradeVisuals: UpgradeVisuals = {
    engineTier: 0,
    hullTier: 0,
    cargoTier: 0,
    weaponTier: 0,
  };

  /** Current health percentage for hull color (0-1) */
  private healthPercent: number = 1.0;

  constructor(input: InputSystem, x: number = 0, y: number = 0, config: Partial<ShipConfig> = {}) {
    super(x, y, 0);
    this.input = input;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to a ShipStats manager for dynamic stat updates.
   * When connected, ship will read thrust/speed from ShipStats.
   */
  connectStats(stats: ShipStats): void {
    this.shipStats = stats;
    this.syncFromStats();

    // Listen for stat changes
    stats.on((event) => {
      if (event.type === 'stats-changed') {
        this.syncFromStats();
      }
    });
  }

  /**
   * Sync ship config from ShipStats.
   */
  private syncFromStats(): void {
    if (!this.shipStats) return;

    this.config.thrustPower = this.shipStats.getStat('thrustPower');
    this.config.maxSpeed = this.shipStats.getStat('maxSpeed');
    this.config.rotationSpeed = this.shipStats.getStat('rotationSpeed');

    // Sync visual upgrade tiers
    this.upgradeVisuals.engineTier = this.shipStats.getUpgradeTier('engineBooster');
    this.upgradeVisuals.hullTier = this.shipStats.getUpgradeTier('hullPlating');
    this.upgradeVisuals.cargoTier = this.shipStats.getUpgradeTier('cargoHold');
    this.upgradeVisuals.weaponTier = this.shipStats.getUpgradeTier('weaponSystem');

    console.log('[Ship] Stats synced:', {
      thrust: this.config.thrustPower,
      maxSpeed: this.config.maxSpeed,
      rotation: this.config.rotationSpeed,
      visuals: this.upgradeVisuals,
    });
  }

  /**
   * Update health percentage for hull color rendering.
   * Should be called by CombatSystem when health changes.
   */
  public setHealthPercent(percent: number): void {
    this.healthPercent = Math.max(0, Math.min(1, percent));
  }

  /**
   * Get weapon tier for combat system (multi-shot at tier 3)
   */
  public getWeaponTier(): number {
    return this.upgradeVisuals.weaponTier;
  }

  /**
   * Get the connected ShipStats (if any).
   */
  getStats(): ShipStats | null {
    return this.shipStats;
  }

  /**
   * Updates ship state based on input and physics.
   */
  update(deltaTime: number): void {
    if (!this.active) return;

    this.handleInput(deltaTime);
    this.applyPhysics(deltaTime);

    // Call parent update for position integration
    super.update(deltaTime);
  }

  /**
   * Processes player input for movement and rotation.
   */
  private handleInput(deltaTime: number): void {
    // Check if using virtual joystick (absolute direction mode)
    const targetAngle = this.input.getTargetAngle();

    if (targetAngle !== null) {
      // Virtual joystick mode: rotate ship to face joystick direction
      // Calculate shortest angle difference (normalize to [-PI, PI])
      let angleDiff = targetAngle - this.rotation;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const maxRotation = this.config.rotationSpeed * deltaTime;

      if (Math.abs(angleDiff) > 0.05) {
        // Rotate towards target angle
        const rotationAmount = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxRotation);
        this.rotation += rotationAmount;
        this.rotationVelocity = rotationAmount / deltaTime;
      } else {
        // Close enough - snap to target
        this.rotation = targetAngle;
        this.rotationVelocity = 0;
      }

      // Get thrust magnitude from joystick
      this.thrustDirection = this.input.getThrustInput();
      this.isThrusting = this.thrustDirection > 0;

      if (this.isThrusting) {
        // Apply thrust in the joystick direction (which ship is now facing)
        const thrustVector = this.getForward().multiply(
          this.config.thrustPower * this.thrustDirection * deltaTime
        );
        this.velocity.add(thrustVector);
      }
    } else {
      // Keyboard mode: traditional rotation and thrust
      const rotationInput = this.input.getRotationInput();
      this.rotationVelocity = rotationInput * this.config.rotationSpeed;

      // Thrust input (W/S or Up/Down)
      this.thrustDirection = this.input.getThrustInput();
      this.isThrusting = this.thrustDirection !== 0;

      if (this.isThrusting) {
        // Calculate thrust vector based on ship's facing direction
        const thrustVector = this.getForward().multiply(
          this.config.thrustPower * this.thrustDirection * deltaTime
        );

        // Apply thrust as acceleration
        this.velocity.add(thrustVector);
      }
    }
  }

  /**
   * Applies friction and speed limits.
   */
  private applyPhysics(deltaTime: number): void {
    // Apply friction (frame-rate independent)
    const frictionPerFrame = Math.pow(this.config.friction, deltaTime * 60);
    this.velocity.multiply(frictionPerFrame);

    // Clamp to max speed
    this.velocity.limit(this.config.maxSpeed);

    // Stop very small velocities to prevent drift
    if (this.velocity.magnitude() < 0.1) {
      this.velocity.set(0, 0);
    }
  }

  /**
   * Renders the ship as a triangle pointing in the direction of rotation.
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.save();

    // Transform to ship position and rotation
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);

    // Draw thruster flame when thrusting forward
    if (this.isThrusting && this.thrustDirection > 0) {
      this.renderThrusterFlame(ctx);
    }

    // Draw reverse thrusters when going backward
    if (this.isThrusting && this.thrustDirection < 0) {
      this.renderReverseFlame(ctx);
    }

    // Draw ship body (triangle pointing right at rotation 0)
    this.renderBody(ctx);

    ctx.restore();
  }

  /**
   * Renders the ship body as a triangle with upgrade-based visual enhancements.
   */
  private renderBody(ctx: CanvasRenderingContext2D): void {
    const s = this.size;

    // Render cargo pods first (behind ship) - LARGE HANGING PODS
    this.renderCargoPods(ctx);

    // Render weapon systems
    this.renderWeaponSystems(ctx);

    // Calculate hull color based on health and tier
    const hullTier = this.upgradeVisuals.hullTier;
    const colors = HULL_COLORS[hullTier as keyof typeof HULL_COLORS];

    // Interpolate between healthy and damaged colors based on health
    const shipColor = this.interpolateColor(colors.healthy, colors.damaged, 1 - this.healthPercent);

    // Main ship body
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, s * 0.6);
    ctx.lineTo(-s * 0.4, 0);
    ctx.lineTo(-s * 0.7, -s * 0.6);
    ctx.closePath();

    ctx.fillStyle = shipColor;
    ctx.fill();

    // Outline gets more intense when damaged
    const outlineIntensity = this.healthPercent < 0.5 ? 0.8 : 1.0;
    ctx.strokeStyle = this.adjustBrightness(colors.outline, outlineIntensity);
    ctx.lineWidth = 2 + hullTier * 0.5;
    ctx.stroke();

    // Hull plating overlay (renders on top of base hull)
    this.renderHullPlating(ctx);

    // Cockpit
    ctx.beginPath();
    ctx.arc(s * 0.2, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = this.healthPercent < 0.3 ? '#3a1a1a' : '#1a3a5c';
    ctx.fill();
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Damage effects when health is low
    if (this.healthPercent < 0.5) {
      this.renderDamageEffects(ctx);
    }
  }

  /**
   * Interpolate between two hex colors
   */
  private interpolateColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Adjust brightness of a hex color
   */
  private adjustBrightness(color: string, factor: number): string {
    const r = Math.min(255, Math.round(parseInt(color.slice(1, 3), 16) * factor));
    const g = Math.min(255, Math.round(parseInt(color.slice(3, 5), 16) * factor));
    const b = Math.min(255, Math.round(parseInt(color.slice(5, 7), 16) * factor));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Render damage effects (sparks, smoke) when health is low
   */
  private renderDamageEffects(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const intensity = 1 - this.healthPercent * 2; // 0 at 50%, 1 at 0%

    // Flickering damage sparks
    if (Math.random() < intensity * 0.3) {
      const sparkX = (Math.random() - 0.5) * s;
      const sparkY = (Math.random() - 0.5) * s * 0.8;

      ctx.beginPath();
      ctx.arc(sparkX, sparkY, s * 0.08 * Math.random(), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.5 + Math.random() * 0.5})`;
      ctx.fill();
    }

    // Critical damage glow
    if (this.healthPercent < 0.25) {
      ctx.save();
      ctx.globalAlpha = 0.2 + Math.sin(Date.now() * 0.01) * 0.1;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0000';
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Renders hull plating based on upgrade tier.
   * Adds armor plates that make the ship look more fortified.
   */
  private renderHullPlating(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const tier = this.upgradeVisuals.hullTier;

    if (tier === 0) return;

    // Armor plate colors get more metallic with tier
    const plateColor = tier === 1 ? '#556677' :
                       tier === 2 ? '#667788' :
                       '#778899';
    const plateHighlight = tier === 1 ? '#778899' :
                           tier === 2 ? '#88aacc' :
                           '#aaccee';

    // Tier 1: Front nose armor
    if (tier >= 1) {
      ctx.beginPath();
      ctx.moveTo(s * 1.05, 0);
      ctx.lineTo(s * 0.7, -s * 0.15);
      ctx.lineTo(s * 0.7, s * 0.15);
      ctx.closePath();
      ctx.fillStyle = plateColor;
      ctx.fill();
      ctx.strokeStyle = plateHighlight;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Tier 2: Wing armor plates
    if (tier >= 2) {
      // Top wing plate
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.35);
      ctx.lineTo(-s * 0.65, -s * 0.55);
      ctx.lineTo(-s * 0.55, -s * 0.25);
      ctx.closePath();
      ctx.fillStyle = plateColor;
      ctx.fill();
      ctx.strokeStyle = plateHighlight;
      ctx.stroke();

      // Bottom wing plate
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, s * 0.35);
      ctx.lineTo(-s * 0.65, s * 0.55);
      ctx.lineTo(-s * 0.55, s * 0.25);
      ctx.closePath();
      ctx.fillStyle = plateColor;
      ctx.fill();
      ctx.strokeStyle = plateHighlight;
      ctx.stroke();
    }

    // Tier 3: Full armor coverage with shield generator look
    if (tier >= 3) {
      // Side armor panels
      ctx.beginPath();
      ctx.moveTo(s * 0.4, -s * 0.25);
      ctx.lineTo(s * 0.1, -s * 0.35);
      ctx.lineTo(-s * 0.2, -s * 0.3);
      ctx.lineTo(s * 0.1, -s * 0.2);
      ctx.closePath();
      ctx.fillStyle = plateColor;
      ctx.fill();
      ctx.strokeStyle = plateHighlight;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(s * 0.4, s * 0.25);
      ctx.lineTo(s * 0.1, s * 0.35);
      ctx.lineTo(-s * 0.2, s * 0.3);
      ctx.lineTo(s * 0.1, s * 0.2);
      ctx.closePath();
      ctx.fillStyle = plateColor;
      ctx.fill();
      ctx.strokeStyle = plateHighlight;
      ctx.stroke();

      // Shield generator glow
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(150, 200, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  /**
   * Renders LARGE hanging cargo pods based on upgrade tier.
   * These are striking, visible containers hanging off the sides of the ship.
   */
  private renderCargoPods(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const tier = this.upgradeVisuals.cargoTier;

    if (tier === 0) return;

    const podColor = '#3a5a4a';
    const podHighlight = '#5a8a6a';
    const strutColor = '#666666';

    // Tier 1: Two medium pods hanging below wings
    if (tier >= 1) {
      // Support struts
      ctx.strokeStyle = strutColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.3);
      ctx.lineTo(-s * 0.3, -s * 0.7);
      ctx.moveTo(-s * 0.2, s * 0.3);
      ctx.lineTo(-s * 0.3, s * 0.7);
      ctx.stroke();

      // Top hanging pod
      ctx.beginPath();
      ctx.ellipse(-s * 0.3, -s * 0.85, s * 0.25, s * 0.15, 0, 0, Math.PI * 2);
      ctx.fillStyle = podColor;
      ctx.fill();
      ctx.strokeStyle = podHighlight;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bottom hanging pod
      ctx.beginPath();
      ctx.ellipse(-s * 0.3, s * 0.85, s * 0.25, s * 0.15, 0, 0, Math.PI * 2);
      ctx.fillStyle = podColor;
      ctx.fill();
      ctx.strokeStyle = podHighlight;
      ctx.stroke();

      // Pod lights
      ctx.fillStyle = '#44ff88';
      ctx.beginPath();
      ctx.arc(-s * 0.15, -s * 0.85, s * 0.05, 0, Math.PI * 2);
      ctx.arc(-s * 0.15, s * 0.85, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tier 2: Larger pods + front pods
    if (tier >= 2) {
      // Front hanging pods (near cockpit)
      ctx.strokeStyle = strutColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.3, -s * 0.15);
      ctx.lineTo(s * 0.4, -s * 0.5);
      ctx.moveTo(s * 0.3, s * 0.15);
      ctx.lineTo(s * 0.4, s * 0.5);
      ctx.stroke();

      // Front pods (smaller, aerodynamic)
      ctx.beginPath();
      ctx.ellipse(s * 0.45, -s * 0.6, s * 0.18, s * 0.1, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = podColor;
      ctx.fill();
      ctx.strokeStyle = podHighlight;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(s * 0.45, s * 0.6, s * 0.18, s * 0.1, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = podColor;
      ctx.fill();
      ctx.strokeStyle = podHighlight;
      ctx.stroke();

      // Make rear pods bigger
      ctx.beginPath();
      ctx.ellipse(-s * 0.3, -s * 0.95, s * 0.3, s * 0.18, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#2a4a3a';
      ctx.fill();
      ctx.strokeStyle = podHighlight;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-s * 0.3, s * 0.95, s * 0.3, s * 0.18, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#2a4a3a';
      ctx.fill();
      ctx.strokeStyle = podHighlight;
      ctx.stroke();
    }

    // Tier 3: Massive cargo rig with central bay
    if (tier >= 3) {
      // Central cargo bay (massive, extends behind ship)
      ctx.beginPath();
      ctx.roundRect(-s * 1.2, -s * 0.35, s * 0.6, s * 0.7, s * 0.1);
      ctx.fillStyle = '#1a3a2a';
      ctx.fill();
      ctx.strokeStyle = podHighlight;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Bay door lines
      ctx.strokeStyle = '#4a6a5a';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-s * 1.15, -s * 0.2 + i * s * 0.2);
        ctx.lineTo(-s * 0.65, -s * 0.2 + i * s * 0.2);
        ctx.stroke();
      }

      // Cargo bay status lights
      ctx.fillStyle = '#00ff66';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00ff66';
      ctx.beginPath();
      ctx.arc(-s * 0.7, -s * 0.25, s * 0.04, 0, Math.PI * 2);
      ctx.arc(-s * 0.7, 0, s * 0.04, 0, Math.PI * 2);
      ctx.arc(-s * 0.7, s * 0.25, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  /**
   * Renders weapon systems based on upgrade tier.
   * Higher tiers show more weapon hardpoints.
   */
  private renderWeaponSystems(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const tier = this.upgradeVisuals.weaponTier;

    if (tier === 0) return;

    const weaponColor = '#555566';
    const weaponHighlight = '#8888aa';
    const glowColor = tier === 1 ? '#44aaff' :
                      tier === 2 ? '#44ffaa' :
                      '#ffaa44';

    // Tier 1: Single front cannon
    if (tier >= 1) {
      // Main cannon barrel
      ctx.fillStyle = weaponColor;
      ctx.beginPath();
      ctx.roundRect(s * 0.8, -s * 0.06, s * 0.35, s * 0.12, s * 0.02);
      ctx.fill();
      ctx.strokeStyle = weaponHighlight;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Cannon tip glow
      ctx.fillStyle = glowColor;
      ctx.shadowBlur = 6;
      ctx.shadowColor = glowColor;
      ctx.beginPath();
      ctx.arc(s * 1.15, 0, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Tier 2: Wing-mounted guns
    if (tier >= 2) {
      // Top wing gun
      ctx.fillStyle = weaponColor;
      ctx.beginPath();
      ctx.roundRect(-s * 0.5, -s * 0.55, s * 0.4, s * 0.08, s * 0.02);
      ctx.fill();
      ctx.strokeStyle = weaponHighlight;
      ctx.stroke();

      // Bottom wing gun
      ctx.beginPath();
      ctx.roundRect(-s * 0.5, s * 0.47, s * 0.4, s * 0.08, s * 0.02);
      ctx.fill();
      ctx.strokeStyle = weaponHighlight;
      ctx.stroke();

      // Wing gun glows
      ctx.fillStyle = glowColor;
      ctx.shadowBlur = 5;
      ctx.shadowColor = glowColor;
      ctx.beginPath();
      ctx.arc(-s * 0.12, -s * 0.51, s * 0.04, 0, Math.PI * 2);
      ctx.arc(-s * 0.12, s * 0.51, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Tier 3: Heavy triple-barrel system (for multi-shot)
    if (tier >= 3) {
      // Central heavy cannon housing
      ctx.fillStyle = '#444455';
      ctx.beginPath();
      ctx.roundRect(s * 0.6, -s * 0.15, s * 0.25, s * 0.3, s * 0.05);
      ctx.fill();
      ctx.strokeStyle = '#aaaacc';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Triple barrel array
      const barrelOffsets = [-s * 0.08, 0, s * 0.08];
      for (const offset of barrelOffsets) {
        ctx.fillStyle = weaponColor;
        ctx.beginPath();
        ctx.roundRect(s * 0.85, offset - s * 0.03, s * 0.3, s * 0.06, s * 0.01);
        ctx.fill();
      }

      // Triple glow (indicates multi-shot capability)
      ctx.fillStyle = '#ffcc00';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffcc00';
      for (const offset of barrelOffsets) {
        ctx.beginPath();
        ctx.arc(s * 1.15, offset, s * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // "ARMED" indicator
      ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(s * 0.72, 0, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Renders the thruster flame effect.
   * Engine tier affects flame size, color intensity, and adds secondary flames.
   */
  private renderThrusterFlame(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const tier = this.upgradeVisuals.engineTier;

    // Base flame length increases with tier
    const baseLengthMultiplier = 0.6 + tier * 0.25;
    const flickerRange = 0.4 + tier * 0.15;
    const flameLength = s * (baseLengthMultiplier + Math.random() * flickerRange);

    // Flame width increases slightly with tier
    const flameWidth = s * (0.2 + tier * 0.05);

    // Main flame
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -flameWidth);
    ctx.lineTo(-s * 0.4 - flameLength, 0);
    ctx.lineTo(-s * 0.4, flameWidth);
    ctx.closePath();

    // Color progression: orange → yellow → white-blue at higher tiers
    const gradient = ctx.createLinearGradient(-s * 0.4, 0, -s * 0.4 - flameLength, 0);
    if (tier === 0) {
      gradient.addColorStop(0, '#ff6600');
      gradient.addColorStop(0.5, '#ffaa00');
      gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
    } else if (tier === 1) {
      gradient.addColorStop(0, '#ff8800');
      gradient.addColorStop(0.4, '#ffcc00');
      gradient.addColorStop(0.7, '#ffff66');
      gradient.addColorStop(1, 'rgba(255, 255, 100, 0)');
    } else if (tier === 2) {
      gradient.addColorStop(0, '#ffaa00');
      gradient.addColorStop(0.3, '#ffee44');
      gradient.addColorStop(0.6, '#aaffff');
      gradient.addColorStop(1, 'rgba(150, 255, 255, 0)');
    } else {
      // Tier 3: White-hot with blue core
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.2, '#aaffff');
      gradient.addColorStop(0.5, '#66ddff');
      gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
    }

    ctx.fillStyle = gradient;
    ctx.fill();

    // Add secondary outer flames at tier 2+
    if (tier >= 2) {
      const outerFlameLength = flameLength * 0.7;

      // Top outer flame
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, -flameWidth * 1.3);
      ctx.lineTo(-s * 0.35 - outerFlameLength, -flameWidth * 0.5);
      ctx.lineTo(-s * 0.4, -flameWidth);
      ctx.closePath();
      ctx.fillStyle = tier === 3 ? 'rgba(100, 200, 255, 0.6)' : 'rgba(255, 150, 0, 0.6)';
      ctx.fill();

      // Bottom outer flame
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, flameWidth * 1.3);
      ctx.lineTo(-s * 0.35 - outerFlameLength, flameWidth * 0.5);
      ctx.lineTo(-s * 0.4, flameWidth);
      ctx.closePath();
      ctx.fill();
    }

    // Add engine glow at tier 1+
    if (tier >= 1) {
      ctx.beginPath();
      ctx.arc(-s * 0.4, 0, s * (0.15 + tier * 0.05), 0, Math.PI * 2);
      const glowColor = tier === 3 ? 'rgba(150, 220, 255, 0.4)' :
                        tier === 2 ? 'rgba(255, 220, 100, 0.4)' :
                        'rgba(255, 180, 50, 0.3)';
      ctx.fillStyle = glowColor;
      ctx.fill();
    }
  }

  /**
   * Renders reverse thruster flames at the front.
   */
  private renderReverseFlame(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const flameLength = s * (0.3 + Math.random() * 0.2);

    // Top reverse thruster
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -s * 0.3);
    ctx.lineTo(s * 0.5 + flameLength, -s * 0.2);
    ctx.lineTo(s * 0.5, -s * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#ff4400';
    ctx.fill();

    // Bottom reverse thruster
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.3);
    ctx.lineTo(s * 0.5 + flameLength, s * 0.2);
    ctx.lineTo(s * 0.5, s * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#ff4400';
    ctx.fill();
  }

  /**
   * Gets the current speed (velocity magnitude).
   */
  getSpeed(): number {
    return this.velocity.magnitude();
  }

  /**
   * Sets the ship size.
   */
  setSize(size: number): void {
    this.size = size;
  }

  /**
   * Updates ship configuration.
   */
  setConfig(config: Partial<ShipConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
