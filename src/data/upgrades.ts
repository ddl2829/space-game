/**
 * Upgrade definitions for the ship upgrade system
 */

export interface UpgradeEffect {
  /** The stat this effect modifies (e.g., 'cargoCapacity', 'thrustPower') */
  stat: string;
  /** Value added per upgrade tier */
  valuePerTier: number;
  /** Whether this is a percentage modifier (multiplied by base) */
  isPercentage?: boolean;
}

export interface Upgrade {
  /** Unique identifier for this upgrade */
  id: string;
  /** Display name */
  name: string;
  /** Description shown in the shop */
  description: string;
  /** Category for UI grouping */
  category: 'cargo' | 'engine' | 'combat';
  /** Maximum tier this upgrade can reach */
  maxTier: number;
  /** Cost in credits for each tier (index 0 = tier 1 cost) */
  costs: number[];
  /** Effects applied per tier */
  effects: UpgradeEffect[];
  /** Icon character or emoji for display */
  icon: string;
}

/**
 * All available ship upgrades
 */
export const UPGRADES: Record<string, Upgrade> = {
  cargoHold: {
    id: 'cargoHold',
    name: 'Cargo Hold',
    description: 'Expand cargo capacity for more resource storage',
    category: 'cargo',
    maxTier: 3,
    costs: [500, 1500, 4000],
    effects: [
      { stat: 'cargoCapacity', valuePerTier: 50, isPercentage: false },
    ],
    icon: '[]',
  },

  engineBooster: {
    id: 'engineBooster',
    name: 'Engine Booster',
    description: 'Increase thrust power for faster acceleration',
    category: 'engine',
    maxTier: 3,
    costs: [750, 2000, 5000],
    effects: [
      { stat: 'thrustPower', valuePerTier: 0.20, isPercentage: true },
    ],
    icon: '>>',
  },

  weaponSystem: {
    id: 'weaponSystem',
    name: 'Weapon System',
    description: 'Enhanced weapons: faster fire rate, more damage, multi-shot at max tier',
    category: 'combat',
    maxTier: 3,
    costs: [1000, 2500, 6000],
    effects: [
      { stat: 'weaponFireRate', valuePerTier: 1.5, isPercentage: false },  // +1.5 shots/sec per tier
      { stat: 'weaponDamage', valuePerTier: 10, isPercentage: false },     // +10 damage per tier
    ],
    icon: '><',
  },

  hullPlating: {
    id: 'hullPlating',
    name: 'Hull Plating',
    description: 'Reinforce hull for increased durability',
    category: 'combat',
    maxTier: 3,
    costs: [800, 2200, 5500],
    effects: [
      { stat: 'maxHealth', valuePerTier: 25, isPercentage: false },
    ],
    icon: '##',
  },
};

/**
 * Get an upgrade by its ID
 */
export function getUpgradeById(id: string): Upgrade | undefined {
  return UPGRADES[id];
}

/**
 * Get all upgrades in a specific category
 */
export function getUpgradesByCategory(category: Upgrade['category']): Upgrade[] {
  return Object.values(UPGRADES).filter((u) => u.category === category);
}

/**
 * Get the cost for the next tier of an upgrade
 * Returns undefined if already at max tier
 */
export function getNextTierCost(upgradeId: string, currentTier: number): number | undefined {
  const upgrade = UPGRADES[upgradeId];
  if (!upgrade || currentTier >= upgrade.maxTier) {
    return undefined;
  }
  return upgrade.costs[currentTier];
}

/**
 * Calculate the total effect value for an upgrade at a given tier
 */
export function calculateEffectValue(
  effect: UpgradeEffect,
  tier: number,
  baseValue: number
): number {
  if (effect.isPercentage) {
    return baseValue * effect.valuePerTier * tier;
  }
  return effect.valuePerTier * tier;
}

/**
 * Tier display names for UI
 */
export const TIER_NAMES = ['I', 'II', 'III', 'IV', 'V'];

/**
 * Category display info
 */
export const CATEGORY_INFO: Record<Upgrade['category'], { name: string; color: string }> = {
  cargo: { name: 'Storage', color: '#6ca' },
  engine: { name: 'Propulsion', color: '#fa6' },
  combat: { name: 'Defense', color: '#a6f' },
};
