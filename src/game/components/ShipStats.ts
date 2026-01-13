/**
 * Ship statistics manager
 * Handles base stats, upgrades, and calculated final values
 */

import { getUpgradeById, calculateEffectValue } from '../../data/upgrades';

/**
 * Base ship statistics (before upgrades)
 */
export interface BaseStats {
  cargoCapacity: number;
  thrustPower: number;
  maxSpeed: number;
  rotationSpeed: number;
  maxHealth: number;
  weaponFireRate: number;
  weaponDamage: number;
}

/**
 * Current upgrade state for the ship
 */
export interface UpgradeState {
  [upgradeId: string]: number; // tier level (0 = not purchased)
}

/**
 * Events emitted by the ShipStats system
 */
export type ShipStatsEvent =
  | { type: 'upgrade-applied'; upgradeId: string; newTier: number }
  | { type: 'stats-changed'; stats: BaseStats };

export type ShipStatsEventHandler = (event: ShipStatsEvent) => void;

/**
 * Default base stats for a new ship
 */
const DEFAULT_BASE_STATS: BaseStats = {
  cargoCapacity: 100,
  thrustPower: 400,
  maxSpeed: 500,
  rotationSpeed: 4,
  maxHealth: 100,
  weaponFireRate: 3,    // shots per second
  weaponDamage: 25,     // damage per hit
};

/**
 * Manages ship statistics and upgrade calculations
 */
export class ShipStats {
  private baseStats: BaseStats;
  private upgrades: UpgradeState;
  private eventHandlers: ShipStatsEventHandler[] = [];

  constructor(baseStats?: Partial<BaseStats>, initialUpgrades?: UpgradeState) {
    this.baseStats = { ...DEFAULT_BASE_STATS, ...baseStats };
    this.upgrades = initialUpgrades ?? {};
  }

  /**
   * Get the current tier of a specific upgrade (0 if not purchased)
   */
  public getUpgradeTier(upgradeId: string): number {
    return this.upgrades[upgradeId] ?? 0;
  }

  /**
   * Check if an upgrade can be purchased (not at max tier)
   */
  public canUpgrade(upgradeId: string): boolean {
    const upgrade = getUpgradeById(upgradeId);
    if (!upgrade) return false;

    const currentTier = this.getUpgradeTier(upgradeId);
    return currentTier < upgrade.maxTier;
  }

  /**
   * Apply an upgrade (increment tier by 1)
   * Returns true if successful, false if already at max tier
   */
  public applyUpgrade(upgradeId: string): boolean {
    const upgrade = getUpgradeById(upgradeId);
    if (!upgrade) {
      console.warn(`[ShipStats] Unknown upgrade: ${upgradeId}`);
      return false;
    }

    const currentTier = this.getUpgradeTier(upgradeId);
    if (currentTier >= upgrade.maxTier) {
      console.warn(`[ShipStats] Upgrade ${upgradeId} already at max tier`);
      return false;
    }

    const newTier = currentTier + 1;
    this.upgrades[upgradeId] = newTier;

    console.log(`[ShipStats] Applied upgrade ${upgrade.name} to tier ${newTier}`);

    // Emit events
    this.emit({ type: 'upgrade-applied', upgradeId, newTier });
    this.emit({ type: 'stats-changed', stats: this.getAllStats() });

    return true;
  }

  /**
   * Get a specific stat value (base + upgrades)
   */
  public getStat(statName: keyof BaseStats): number {
    const baseValue = this.baseStats[statName];
    let finalValue = baseValue;

    // Calculate all upgrade effects for this stat
    for (const upgradeId of Object.keys(this.upgrades)) {
      const tier = this.upgrades[upgradeId];
      if (tier <= 0) continue;

      const upgrade = getUpgradeById(upgradeId);
      if (!upgrade) continue;

      for (const effect of upgrade.effects) {
        if (effect.stat === statName) {
          finalValue += calculateEffectValue(effect, tier, baseValue);
        }
      }
    }

    return finalValue;
  }

  /**
   * Get the base value of a stat (without upgrades)
   */
  public getBaseStat(statName: keyof BaseStats): number {
    return this.baseStats[statName];
  }

  /**
   * Get all calculated stats
   */
  public getAllStats(): BaseStats {
    return {
      cargoCapacity: this.getStat('cargoCapacity'),
      thrustPower: this.getStat('thrustPower'),
      maxSpeed: this.getStat('maxSpeed'),
      rotationSpeed: this.getStat('rotationSpeed'),
      maxHealth: this.getStat('maxHealth'),
      weaponFireRate: this.getStat('weaponFireRate'),
      weaponDamage: this.getStat('weaponDamage'),
    };
  }

  /**
   * Get the bonus value an upgrade provides at a specific tier
   */
  public getUpgradeBonus(upgradeId: string, tier?: number): Record<string, number> {
    const upgrade = getUpgradeById(upgradeId);
    if (!upgrade) return {};

    const actualTier = tier ?? this.getUpgradeTier(upgradeId);
    const bonus: Record<string, number> = {};

    for (const effect of upgrade.effects) {
      const statName = effect.stat as keyof BaseStats;
      const baseValue = this.baseStats[statName] ?? 0;
      bonus[effect.stat] = calculateEffectValue(effect, actualTier, baseValue);
    }

    return bonus;
  }

  /**
   * Get what the stat would be at a specific upgrade tier
   */
  public getStatAtTier(statName: keyof BaseStats, upgradeId: string, tier: number): number {
    const baseValue = this.baseStats[statName];
    let value = baseValue;

    // Add effects from other upgrades
    for (const otherId of Object.keys(this.upgrades)) {
      if (otherId === upgradeId) continue;

      const otherTier = this.upgrades[otherId];
      if (otherTier <= 0) continue;

      const upgrade = getUpgradeById(otherId);
      if (!upgrade) continue;

      for (const effect of upgrade.effects) {
        if (effect.stat === statName) {
          value += calculateEffectValue(effect, otherTier, baseValue);
        }
      }
    }

    // Add effect from the specified upgrade at the specified tier
    const upgrade = getUpgradeById(upgradeId);
    if (upgrade) {
      for (const effect of upgrade.effects) {
        if (effect.stat === statName) {
          value += calculateEffectValue(effect, tier, baseValue);
        }
      }
    }

    return value;
  }

  /**
   * Get the current upgrade state (for serialization)
   */
  public getUpgradeState(): UpgradeState {
    return { ...this.upgrades };
  }

  /**
   * Set the upgrade state (for loading saves)
   */
  public setUpgradeState(state: UpgradeState): void {
    this.upgrades = { ...state };
    this.emit({ type: 'stats-changed', stats: this.getAllStats() });
  }

  /**
   * Subscribe to stat change events
   */
  public on(handler: ShipStatsEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Unsubscribe from events
   */
  public off(handler: ShipStatsEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index !== -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Emit an event to all handlers
   */
  private emit(event: ShipStatsEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  /**
   * Get a preview of what stats would look like after purchasing an upgrade
   */
  public previewUpgrade(upgradeId: string): { current: BaseStats; after: BaseStats } | null {
    const upgrade = getUpgradeById(upgradeId);
    if (!upgrade || !this.canUpgrade(upgradeId)) {
      return null;
    }

    const current = this.getAllStats();
    const nextTier = this.getUpgradeTier(upgradeId) + 1;

    // Calculate stats at next tier
    const after: BaseStats = { ...current };
    for (const effect of upgrade.effects) {
      const statName = effect.stat as keyof BaseStats;
      if (statName in after) {
        const baseValue = this.baseStats[statName];
        const currentBonus = calculateEffectValue(effect, this.getUpgradeTier(upgradeId), baseValue);
        const newBonus = calculateEffectValue(effect, nextTier, baseValue);
        after[statName] = current[statName] - currentBonus + newBonus;
      }
    }

    return { current, after };
  }

  /**
   * Reset all upgrades (for testing or new game)
   */
  public reset(): void {
    this.upgrades = {};
    this.emit({ type: 'stats-changed', stats: this.getAllStats() });
  }
}
