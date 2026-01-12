/**
 * Resource definitions for the mining system
 */

export interface Resource {
  id: string;
  name: string;
  tier: 'common' | 'uncommon' | 'rare';
  basePrice: number;
  color: string;
  glowColor: string;
  weight: number;
}

export const RESOURCES: Record<string, Resource> = {
  iron: {
    id: 'iron',
    name: 'Iron',
    tier: 'common',
    basePrice: 10,
    color: '#8b8b8b',
    glowColor: '#a0a0a0',
    weight: 1,
  },
  titanium: {
    id: 'titanium',
    name: 'Titanium',
    tier: 'uncommon',
    basePrice: 35,
    color: '#6b8fa3',
    glowColor: '#8eb8d4',
    weight: 1.5,
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    tier: 'rare',
    basePrice: 100,
    color: '#e5e4e2',
    glowColor: '#ffffff',
    weight: 2.5,
  },
};

export function getResourceById(id: string): Resource | undefined {
  return RESOURCES[id];
}

export function getResourcesByTier(tier: Resource['tier']): Resource[] {
  return Object.values(RESOURCES).filter((r) => r.tier === tier);
}

/**
 * Get a random resource based on tier weights
 * Common: 60%, Uncommon: 30%, Rare: 10%
 */
export function getRandomResource(): Resource {
  const roll = Math.random();
  if (roll < 0.1) {
    return RESOURCES.platinum;
  } else if (roll < 0.4) {
    return RESOURCES.titanium;
  }
  return RESOURCES.iron;
}
