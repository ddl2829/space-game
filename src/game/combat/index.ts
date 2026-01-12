/**
 * Combat system exports
 * Sprint 4: Zones and Enemy Pirates
 */

// Zone definitions and utilities
export {
  type Zone,
  ZONES,
  SAFE_ZONE,
  FRONTIER_ZONE,
  getZoneById,
  getZoneAtPosition,
  isPointInZone,
  getDistanceToZoneBoundary,
  getAdjacentZones,
} from '../../data/zones';

// Zone management system
export {
  ZoneSystem,
  type ZoneTransitionEvent,
  type ZoneSystemConfig,
} from '../systems/ZoneSystem';

// Enemy pirate entity
export {
  Pirate,
  type PirateState,
  type PirateConfig,
} from '../entities/Pirate';

// Enemy AI behavior system
export {
  EnemyAI,
  type AITarget,
  type EnemyAIConfig,
} from '../systems/EnemyAI';

// Combat mechanics system
export {
  CombatSystem,
  type DamagePopup,
  type CombatSystemConfig,
  type CombatEvent,
} from '../systems/CombatSystem';

// Enemy spawning system
export {
  EnemySpawner,
  type EnemySpawnerConfig,
} from '../systems/EnemySpawner';

// Jump gate entity for zone transitions
export {
  JumpGate,
  type JumpGateConfig,
  createGatePair,
} from '../entities/JumpGate';
