/**
 * Weapon system for managing projectiles and firing mechanics
 */

import { Projectile, ProjectileConfig } from '../entities/Projectile';

export interface WeaponConfig {
  fireRate: number;           // shots per second
  projectileSpeed: number;    // units per second
  projectileDamage: number;   // damage per hit
  projectileLifetime: number; // seconds before expiring
  projectileColor: string;    // color of the projectile
  projectileCount: number;    // number of projectiles per shot (for multi-shot)
  spreadAngle: number;        // angle spread for multi-shot (radians)
}

export interface CollisionTarget {
  position: { x: number; y: number };
  getCollisionRadius: () => number;
  takeDamage: (amount: number) => void;
  isDestroyed?: boolean;
  active?: boolean;
}

export interface HitResult {
  target: CollisionTarget;
  projectile: Projectile;
  damage: number;
}

const DEFAULT_PLAYER_WEAPON: WeaponConfig = {
  fireRate: 3,              // 3 shots per second
  projectileSpeed: 800,     // fast projectiles
  projectileDamage: 25,     // damage per hit
  projectileLifetime: 2.0,  // 2 seconds before expiring
  projectileColor: '#4af',  // cyan/blue color
  projectileCount: 1,       // single shot
  spreadAngle: 0,           // no spread
};

const DEFAULT_ENEMY_WEAPON: WeaponConfig = {
  fireRate: 1,
  projectileSpeed: 500,
  projectileDamage: 10,
  projectileLifetime: 1.5,
  projectileColor: '#f44',  // red color
  projectileCount: 1,
  spreadAngle: 0,
};

export class WeaponSystem {
  private projectiles: Projectile[] = [];
  private playerCooldown: number = 0;
  private enemyCooldowns: Map<string, number> = new Map();
  private playerWeapon: WeaponConfig;
  private enemyWeapon: WeaponConfig;

  constructor(
    playerWeaponConfig?: Partial<WeaponConfig>,
    enemyWeaponConfig?: Partial<WeaponConfig>
  ) {
    this.playerWeapon = { ...DEFAULT_PLAYER_WEAPON, ...playerWeaponConfig };
    this.enemyWeapon = { ...DEFAULT_ENEMY_WEAPON, ...enemyWeaponConfig };
  }

  /**
   * Fire projectile(s) from the player or enemy
   * Supports multi-shot with spread angle
   * @returns true if projectile(s) were fired
   */
  public fire(x: number, y: number, angle: number, owner: 'player' | 'enemy', enemyId?: string): boolean {
    const weapon = owner === 'player' ? this.playerWeapon : this.enemyWeapon;
    const cooldownTime = 1 / weapon.fireRate;

    // Check cooldown
    if (owner === 'player') {
      if (this.playerCooldown > 0) {
        return false;
      }
      this.playerCooldown = cooldownTime;
    } else if (enemyId) {
      const enemyCooldown = this.enemyCooldowns.get(enemyId) || 0;
      if (enemyCooldown > 0) {
        return false;
      }
      this.enemyCooldowns.set(enemyId, cooldownTime);
    }

    // Calculate angles for multi-shot
    const count = weapon.projectileCount;
    const spread = weapon.spreadAngle;

    for (let i = 0; i < count; i++) {
      // Calculate angle offset for this projectile
      let projectileAngle = angle;
      if (count > 1) {
        // Spread projectiles evenly across the spread angle
        const offset = spread * (i / (count - 1) - 0.5);
        projectileAngle = angle + offset;
      }

      // Create projectile config
      const config: ProjectileConfig = {
        x,
        y,
        angle: projectileAngle,
        speed: weapon.projectileSpeed,
        damage: weapon.projectileDamage,
        owner,
        color: weapon.projectileColor,
        lifetime: weapon.projectileLifetime,
      };

      // Create and add projectile
      const projectile = new Projectile(config);
      this.projectiles.push(projectile);
    }

    return true;
  }

  /**
   * Update all projectiles and cooldowns
   */
  public update(deltaTime: number): void {
    // Update player cooldown
    if (this.playerCooldown > 0) {
      this.playerCooldown -= deltaTime;
    }

    // Update enemy cooldowns
    for (const [id, cooldown] of this.enemyCooldowns) {
      if (cooldown > 0) {
        this.enemyCooldowns.set(id, cooldown - deltaTime);
      }
    }

    // Update all projectiles
    for (const projectile of this.projectiles) {
      projectile.update(deltaTime);
    }

    // Remove expired projectiles
    this.projectiles = this.projectiles.filter(p => !p.isExpired());
  }

  /**
   * Render all projectiles
   */
  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    for (const projectile of this.projectiles) {
      projectile.render(ctx, cameraX, cameraY);
    }
  }

  /**
   * Get all active projectiles (for external collision detection)
   */
  public getProjectiles(): Projectile[] {
    return this.projectiles.filter(p => p.active);
  }

  /**
   * Get player projectiles only
   */
  public getPlayerProjectiles(): Projectile[] {
    return this.projectiles.filter(p => p.active && p.owner === 'player');
  }

  /**
   * Get enemy projectiles only
   */
  public getEnemyProjectiles(): Projectile[] {
    return this.projectiles.filter(p => p.active && p.owner === 'enemy');
  }

  /**
   * Check collisions between projectiles and targets
   * @returns array of hit results
   */
  public checkCollisions(targets: CollisionTarget[], projectileOwner: 'player' | 'enemy'): HitResult[] {
    const hits: HitResult[] = [];
    const projectiles = projectileOwner === 'player'
      ? this.getPlayerProjectiles()
      : this.getEnemyProjectiles();

    for (const projectile of projectiles) {
      for (const target of targets) {
        // Skip destroyed or inactive targets
        if (target.isDestroyed || target.active === false) continue;

        // Calculate distance between projectile and target
        const dx = target.position.x - projectile.position.x;
        const dy = target.position.y - projectile.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const collisionDistance = projectile.getCollisionRadius() + target.getCollisionRadius();

        // Check for collision
        if (distance < collisionDistance) {
          hits.push({
            target,
            projectile,
            damage: projectile.damage,
          });

          // Destroy the projectile on hit
          projectile.destroy();
          break; // Projectile can only hit one target
        }
      }
    }

    return hits;
  }

  /**
   * Clear all projectiles (e.g., on scene change)
   */
  public clear(): void {
    this.projectiles = [];
    this.playerCooldown = 0;
    this.enemyCooldowns.clear();
  }

  /**
   * Get current player weapon cooldown progress (0-1, 0 = ready to fire)
   */
  public getPlayerCooldownProgress(): number {
    if (this.playerCooldown <= 0) return 0;
    const cooldownTime = 1 / this.playerWeapon.fireRate;
    return this.playerCooldown / cooldownTime;
  }

  /**
   * Check if player can fire
   */
  public canPlayerFire(): boolean {
    return this.playerCooldown <= 0;
  }

  /**
   * Update player weapon config (for upgrades)
   */
  public setPlayerWeaponConfig(config: Partial<WeaponConfig>): void {
    this.playerWeapon = { ...this.playerWeapon, ...config };
  }

  /**
   * Get player weapon config
   */
  public getPlayerWeaponConfig(): WeaponConfig {
    return { ...this.playerWeapon };
  }

  /**
   * Get projectile count (for debugging/HUD)
   */
  public getProjectileCount(): number {
    return this.projectiles.length;
  }
}
