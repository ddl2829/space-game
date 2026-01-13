/**
 * Enemy AI behavior system
 * Manages pirate decision-making, target acquisition, and state transitions
 */

import { Pirate, PirateState } from '../entities/Pirate';
import { Vector2 } from '../../utils/Vector2';

export interface AITarget {
  x: number;
  y: number;
  velocity?: { x: number; y: number };
}

export interface EnemyAIConfig {
  updateInterval: number;
  predictionFactor: number;
  flockingEnabled: boolean;
  separationDistance: number;
}

const DEFAULT_AI_CONFIG: EnemyAIConfig = {
  updateInterval: 0.1,
  predictionFactor: 0.5,
  flockingEnabled: true,
  separationDistance: 60,
};

export class EnemyAI {
  private config: EnemyAIConfig;
  private updateTimer: number = 0;

  constructor(config?: Partial<EnemyAIConfig>) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
  }

  /**
   * Update AI for all pirates
   */
  public update(
    pirates: Pirate[],
    target: AITarget | null,
    deltaTime: number
  ): void {
    this.updateTimer += deltaTime;

    // Only run AI logic at intervals for performance
    if (this.updateTimer < this.config.updateInterval) {
      return;
    }
    this.updateTimer = 0;

    const activePirates = pirates.filter((p) => !p.isDestroyed && p.active);

    for (const pirate of activePirates) {
      this.updatePirateAI(pirate, target, activePirates);
    }
  }

  /**
   * Update AI for a single pirate
   */
  private updatePirateAI(
    pirate: Pirate,
    target: AITarget | null,
    allPirates: Pirate[]
  ): void {
    // Passive pirates don't engage - they just fly away
    if (pirate.getIsPassive()) {
      return;
    }

    // Handle target detection and state transitions
    if (target) {
      const canDetect = pirate.canDetectTarget(target.x, target.y);
      const currentState = pirate.state;

      if (canDetect) {
        // Calculate predicted position for better interception
        const predictedTarget = this.predictTargetPosition(target);
        pirate.setTarget(predictedTarget.x, predictedTarget.y);

        // State transition based on distance
        const distance = this.getDistance(pirate.position, target);

        if (currentState === 'patrol') {
          pirate.state = 'chase' as PirateState;
          console.log(`[AI] Pirate ${pirate.id} detected target, engaging`);
        }

        if (currentState === 'chase' && distance < pirate.config.attackRange) {
          pirate.state = 'attack' as PirateState;
        }
      } else if (currentState === 'chase' || currentState === 'attack') {
        // Lost visual, return to patrol
        pirate.clearTarget();
        pirate.state = 'patrol' as PirateState;
        console.log(`[AI] Pirate ${pirate.id} lost interest`);
      }
    }

    // Apply flocking behavior for multiple pirates
    if (this.config.flockingEnabled && allPirates.length > 1) {
      this.applyFlockingBehavior(pirate, allPirates);
    }
  }

  /**
   * Predict target position based on velocity
   */
  private predictTargetPosition(target: AITarget): Vector2 {
    if (!target.velocity) {
      return new Vector2(target.x, target.y);
    }

    return new Vector2(
      target.x + target.velocity.x * this.config.predictionFactor,
      target.y + target.velocity.y * this.config.predictionFactor
    );
  }

  /**
   * Apply separation behavior to prevent pirates from stacking
   */
  private applyFlockingBehavior(pirate: Pirate, allPirates: Pirate[]): void {
    const separation = new Vector2(0, 0);
    let neighborCount = 0;

    for (const other of allPirates) {
      if (other.id === pirate.id) continue;

      const distance = pirate.position.distance(other.position);
      if (distance < this.config.separationDistance && distance > 0) {
        // Push away from nearby pirates
        const diff = pirate.position.subtracted(other.position);
        diff.normalize();
        diff.divide(distance); // Weight by distance
        separation.add(diff);
        neighborCount++;
      }
    }

    if (neighborCount > 0) {
      separation.divide(neighborCount);
      separation.normalize();
      separation.multiply(50); // Separation force

      // Apply as velocity adjustment
      pirate.velocity.add(separation);
    }
  }

  /**
   * Get distance between a position and target
   */
  private getDistance(
    pos: Vector2,
    target: { x: number; y: number }
  ): number {
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get the best attack angle for a pirate
   */
  public getOptimalAttackAngle(
    pirate: Pirate,
    target: AITarget,
    _allPirates: Pirate[]
  ): number {
    // Basic implementation - approach from behind target's velocity
    if (target.velocity) {
      const targetHeading = Math.atan2(target.velocity.y, target.velocity.x);
      return targetHeading + Math.PI; // Approach from behind
    }

    // Default - direct approach
    return Math.atan2(
      target.y - pirate.position.y,
      target.x - pirate.position.x
    );
  }

  /**
   * Check if a pirate should flee
   */
  public shouldFlee(pirate: Pirate): boolean {
    return pirate.health / pirate.maxHealth < pirate.config.fleeHealthThreshold;
  }

  /**
   * Get flee direction (away from target)
   */
  public getFleeDirection(pirate: Pirate, target: AITarget): Vector2 {
    const toTarget = new Vector2(
      target.x - pirate.position.x,
      target.y - pirate.position.y
    );
    return toTarget.normalized().multiply(-1);
  }

  /**
   * Find the nearest pirate to a position
   */
  public findNearestPirate(
    x: number,
    y: number,
    pirates: Pirate[]
  ): Pirate | null {
    let nearest: Pirate | null = null;
    let nearestDistance = Infinity;

    for (const pirate of pirates) {
      if (pirate.isDestroyed || !pirate.active) continue;

      const dx = pirate.position.x - x;
      const dy = pirate.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = pirate;
      }
    }

    return nearest;
  }

  /**
   * Get pirates within a radius
   */
  public getPiratesInRadius(
    x: number,
    y: number,
    radius: number,
    pirates: Pirate[]
  ): Pirate[] {
    return pirates.filter((pirate) => {
      if (pirate.isDestroyed || !pirate.active) return false;

      const dx = pirate.position.x - x;
      const dy = pirate.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= radius;
    });
  }

  /**
   * Check if any pirates are currently hostile (chasing/attacking)
   */
  public hasHostilePirates(pirates: Pirate[]): boolean {
    return pirates.some(
      (p) =>
        !p.isDestroyed &&
        p.active &&
        (p.state === 'chase' || p.state === 'attack')
    );
  }

  /**
   * Get the threat level based on nearby hostile pirates
   */
  public getThreatLevel(
    x: number,
    y: number,
    pirates: Pirate[],
    maxRange: number = 500
  ): number {
    const nearbyPirates = this.getPiratesInRadius(x, y, maxRange, pirates);
    const hostilePirates = nearbyPirates.filter(
      (p) => p.state === 'chase' || p.state === 'attack'
    );

    if (hostilePirates.length === 0) return 0;

    // Calculate threat based on number and proximity
    let threat = 0;
    for (const pirate of hostilePirates) {
      const dx = pirate.position.x - x;
      const dy = pirate.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const proximity = 1 - distance / maxRange;
      threat += proximity;
    }

    return Math.min(threat / 3, 1); // Normalize to 0-1
  }
}
