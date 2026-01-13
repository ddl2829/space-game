/**
 * Mission definitions and types for the quest system
 */

export type MissionType = 'kill_pirates' | 'delivery';

export interface MissionReward {
  credits: number;
  reputation?: number;
}

export interface KillPiratesMission {
  type: 'kill_pirates';
  targetCount: number;
  currentCount: number;
}

export interface DeliveryMission {
  type: 'delivery';
  destinationPlanet: string;
  destinationName: string;
  packageName: string;
}

export type MissionObjective = KillPiratesMission | DeliveryMission;

export interface Mission {
  id: string;
  title: string;
  description: string;
  objective: MissionObjective;
  reward: MissionReward;
  sourceStationId: string;
  isComplete: boolean;
  expiresAt?: number; // Optional expiration timestamp
}

/**
 * Mission templates for generating random missions
 */
export interface MissionTemplate {
  type: MissionType;
  titleTemplate: string;
  descriptionTemplate: string;
  minTargetCount?: number;
  maxTargetCount?: number;
  baseReward: number;
  rewardPerTarget?: number;
}

export const KILL_PIRATE_TEMPLATES: MissionTemplate[] = [
  {
    type: 'kill_pirates',
    titleTemplate: 'Pirate Bounty',
    descriptionTemplate: 'Eliminate {count} pirates in the Frontier. These criminals have been disrupting trade routes.',
    minTargetCount: 3,
    maxTargetCount: 8,
    baseReward: 100,
    rewardPerTarget: 75,
  },
  {
    type: 'kill_pirates',
    titleTemplate: 'Security Contract',
    descriptionTemplate: 'A merchant guild needs {count} pirates cleared from the area. Payment upon completion.',
    minTargetCount: 2,
    maxTargetCount: 5,
    baseReward: 150,
    rewardPerTarget: 100,
  },
  {
    type: 'kill_pirates',
    titleTemplate: 'Vengeance Mission',
    descriptionTemplate: 'A grieving family seeks justice. Destroy {count} pirates to avenge their lost cargo ship.',
    minTargetCount: 4,
    maxTargetCount: 10,
    baseReward: 50,
    rewardPerTarget: 60,
  },
];

export const DELIVERY_TEMPLATES: MissionTemplate[] = [
  {
    type: 'delivery',
    titleTemplate: 'Priority Delivery',
    descriptionTemplate: 'Deliver {package} to {destination}. Handle with care.',
    baseReward: 200,
  },
  {
    type: 'delivery',
    titleTemplate: 'Research Materials',
    descriptionTemplate: 'Transport {package} to the research station on {destination}.',
    baseReward: 300,
  },
  {
    type: 'delivery',
    titleTemplate: 'Medical Supplies',
    descriptionTemplate: 'Urgent: Deliver {package} to the colony on {destination}. Lives depend on it.',
    baseReward: 400,
  },
  {
    type: 'delivery',
    titleTemplate: 'Mysterious Cargo',
    descriptionTemplate: 'No questions asked. Take {package} to {destination}. Bonus for discretion.',
    baseReward: 500,
  },
];

export const PACKAGE_NAMES = [
  'Sealed Container',
  'Medical Crate',
  'Research Samples',
  'Encrypted Data Core',
  'Rare Specimens',
  'Prototype Components',
  'Emergency Supplies',
  'Confidential Documents',
  'Biological Samples',
  'Ancient Artifacts',
];

/**
 * Planet destinations for delivery missions (must match celestials.ts planet names)
 */
export const DELIVERY_DESTINATIONS = [
  { planetName: 'Haven Prime', displayName: 'Haven Prime' },
  { planetName: 'Aurelia', displayName: 'Aurelia' },
  { planetName: 'Magnus', displayName: 'Magnus' },
  { planetName: 'Glacius', displayName: 'Glacius' },
];

/**
 * Generate a unique mission ID
 */
export function generateMissionId(): string {
  return `mission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a random kill pirates mission
 */
export function generateKillPiratesMission(sourceStationId: string): Mission {
  const template = KILL_PIRATE_TEMPLATES[Math.floor(Math.random() * KILL_PIRATE_TEMPLATES.length)];
  const targetCount = Math.floor(
    Math.random() * ((template.maxTargetCount || 5) - (template.minTargetCount || 2) + 1) +
    (template.minTargetCount || 2)
  );
  const reward = template.baseReward + targetCount * (template.rewardPerTarget || 50);

  return {
    id: generateMissionId(),
    title: template.titleTemplate,
    description: template.descriptionTemplate.replace('{count}', targetCount.toString()),
    objective: {
      type: 'kill_pirates',
      targetCount,
      currentCount: 0,
    },
    reward: { credits: reward },
    sourceStationId,
    isComplete: false,
  };
}

/**
 * Generate a random delivery mission
 */
export function generateDeliveryMission(sourceStationId: string): Mission {
  const template = DELIVERY_TEMPLATES[Math.floor(Math.random() * DELIVERY_TEMPLATES.length)];
  const packageName = PACKAGE_NAMES[Math.floor(Math.random() * PACKAGE_NAMES.length)];

  // Pick a random destination
  const destination = DELIVERY_DESTINATIONS[Math.floor(Math.random() * DELIVERY_DESTINATIONS.length)];

  // Vary reward based on destination distance (further = more reward)
  const distanceBonus = Math.floor(Math.random() * 200);
  const reward = template.baseReward + distanceBonus;

  return {
    id: generateMissionId(),
    title: template.titleTemplate,
    description: template.descriptionTemplate
      .replace('{package}', packageName)
      .replace('{destination}', destination.displayName),
    objective: {
      type: 'delivery',
      destinationPlanet: destination.planetName,
      destinationName: destination.displayName,
      packageName,
    },
    reward: { credits: reward },
    sourceStationId,
    isComplete: false,
  };
}

/**
 * Generate a set of available missions for a station
 */
export function generateStationMissions(stationId: string, count: number = 3): Mission[] {
  const missions: Mission[] = [];

  for (let i = 0; i < count; i++) {
    // 50/50 chance of kill vs delivery mission
    if (Math.random() < 0.5) {
      missions.push(generateKillPiratesMission(stationId));
    } else {
      missions.push(generateDeliveryMission(stationId));
    }
  }

  return missions;
}
