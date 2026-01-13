/**
 * Sprint 1 - Mining System Exports
 *
 * This module exports all mining-related systems for integration
 * with the main Game class from Sprint 0.
 *
 * Note: Mining is done by shooting asteroids with weapons.
 * Asteroids drop resources when destroyed.
 */

// Entities
export { Asteroid } from '../entities/Asteroid';
export type { AsteroidSize } from '../entities/Asteroid';

// Components
export { Inventory } from '../components/Inventory';
export type { CargoSlot, InventoryState } from '../components/Inventory';

// Systems
export { ResourceDropManager } from '../systems/ResourceDrop';
export { AsteroidSpawner } from '../systems/AsteroidSpawner';

// Rendering
export { ParticleSystem } from '../rendering/Particles';
export type { ParticleConfig, ParticleType } from '../rendering/Particles';

// UI
export { HUD } from '../ui/HUD';

// Data
export { getResourceById, getResourcesByTier, getRandomResource, RESOURCES } from '../../data/resources';
export type { Resource } from '../../data/resources';
