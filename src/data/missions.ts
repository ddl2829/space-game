/**
 * Mission definitions and types for the quest system
 */

import { getWorldGenerator } from '../utils/WorldGenerator';
import { getStationById } from './stations';

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
  destinationX: number;
  destinationY: number;
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

const MIN_DELIVERY_DISTANCE = 5000; // 5km minimum distance from station
const SEARCH_RADIUS = 20000; // 20km search radius for planets

/**
 * Find valid delivery destinations (planets at least 5km from the station)
 */
function findDeliveryDestinations(stationX: number, stationY: number): { name: string; x: number; y: number; distance: number }[] {
  const worldGen = getWorldGenerator();
  const objects = worldGen.getObjectsInRange(stationX, stationY, SEARCH_RADIUS);

  const validPlanets: { name: string; x: number; y: number; distance: number }[] = [];

  for (const planet of objects.planets) {
    const dx = planet.x - stationX;
    const dy = planet.y - stationY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= MIN_DELIVERY_DISTANCE) {
      validPlanets.push({
        name: planet.name,
        x: planet.x,
        y: planet.y,
        distance,
      });
    }
  }

  // Sort by distance (closer planets first for easier missions)
  validPlanets.sort((a, b) => a.distance - b.distance);

  return validPlanets;
}

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
 * Returns null if no valid destinations found
 */
export function generateDeliveryMission(sourceStationId: string): Mission | null {
  const station = getStationById(sourceStationId);
  if (!station) {
    console.warn(`[Missions] Station not found: ${sourceStationId}`);
    return null;
  }

  const destinations = findDeliveryDestinations(station.x, station.y);
  if (destinations.length === 0) {
    console.warn(`[Missions] No valid delivery destinations found for station ${sourceStationId}`);
    return null;
  }

  const template = DELIVERY_TEMPLATES[Math.floor(Math.random() * DELIVERY_TEMPLATES.length)];
  const packageName = PACKAGE_NAMES[Math.floor(Math.random() * PACKAGE_NAMES.length)];

  // Pick a random destination from available planets
  const destination = destinations[Math.floor(Math.random() * destinations.length)];

  // Reward scales with distance (100 credits per 1km)
  const distanceBonus = Math.floor(destination.distance / 100);
  const reward = template.baseReward + distanceBonus;

  return {
    id: generateMissionId(),
    title: template.titleTemplate,
    description: template.descriptionTemplate
      .replace('{package}', packageName)
      .replace('{destination}', destination.name),
    objective: {
      type: 'delivery',
      destinationPlanet: destination.name,
      destinationName: destination.name,
      packageName,
      destinationX: destination.x,
      destinationY: destination.y,
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
      const deliveryMission = generateDeliveryMission(stationId);
      if (deliveryMission) {
        missions.push(deliveryMission);
      } else {
        // Fall back to kill mission if no delivery destinations available
        missions.push(generateKillPiratesMission(stationId));
      }
    }
  }

  return missions;
}
