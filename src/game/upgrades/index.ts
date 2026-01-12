/**
 * Sprint 3 - Upgrade System Exports
 *
 * This module exports all upgrade-related systems for integration
 * with the main Game class.
 */

// Data definitions
export {
  UPGRADES,
  TIER_NAMES,
  CATEGORY_INFO,
  getUpgradeById,
  getUpgradesByCategory,
  getNextTierCost,
  calculateEffectValue,
} from '../../data/upgrades';
export type { Upgrade, UpgradeEffect } from '../../data/upgrades';

// Components
export { ShipStats } from '../components/ShipStats';
export type {
  BaseStats,
  UpgradeState,
  ShipStatsEvent,
  ShipStatsEventHandler,
} from '../components/ShipStats';

// Systems
export { UpgradeSystem } from '../systems/UpgradeSystem';
export type {
  PurchaseResult,
  UpgradeSystemEvent,
  UpgradeSystemEventHandler,
} from '../systems/UpgradeSystem';

export { SaveSystem } from '../systems/SaveSystem';
export type {
  SaveData,
  SaveSystemEvent,
  SaveSystemEventHandler,
  Positionable,
} from '../systems/SaveSystem';

// UI
export { UpgradeShopUI } from '../ui/UpgradeShopUI';

/**
 * Integration example:
 *
 * import {
 *   ShipStats,
 *   UpgradeSystem,
 *   SaveSystem,
 *   UpgradeShopUI,
 * } from './upgrades';
 *
 * class Game {
 *   private shipStats: ShipStats;
 *   private upgradeSystem: UpgradeSystem;
 *   private saveSystem: SaveSystem;
 *   private upgradeShopUI: UpgradeShopUI;
 *
 *   constructor() {
 *     // ... existing setup ...
 *
 *     // Create ship stats manager
 *     this.shipStats = new ShipStats();
 *
 *     // Create upgrade system (connects inventory and stats)
 *     this.upgradeSystem = new UpgradeSystem(this.inventory, this.shipStats);
 *
 *     // Create save system
 *     this.saveSystem = new SaveSystem(this.inventory, this.shipStats);
 *     this.saveSystem.setShip(this.ship);
 *
 *     // Create upgrade shop UI
 *     this.upgradeShopUI = new UpgradeShopUI(this.upgradeSystem);
 *
 *     // Load saved game (if exists)
 *     const savedData = this.saveSystem.load();
 *     if (savedData) {
 *       // Apply saved ship position
 *       this.ship.position.x = savedData.shipPosition.x;
 *       this.ship.position.y = savedData.shipPosition.y;
 *       this.ship.rotation = savedData.shipRotation;
 *
 *       // Update ship config from stats
 *       this.updateShipFromStats();
 *     }
 *
 *     // Update ship stats when upgrades change
 *     this.shipStats.on((event) => {
 *       if (event.type === 'stats-changed') {
 *         this.updateShipFromStats();
 *       }
 *     });
 *
 *     // Auto-save when upgrades are purchased
 *     this.upgradeSystem.on((event) => {
 *       if (event.type === 'purchase-success') {
 *         this.saveSystem.save();
 *       }
 *     });
 *
 *     // Start auto-save (every 60 seconds)
 *     this.saveSystem.startAutoSave(60000);
 *
 *     // Save on tab close
 *     window.addEventListener('beforeunload', () => {
 *       this.saveSystem.save();
 *     });
 *
 *     // Open upgrade shop with 'U' key
 *     window.addEventListener('keydown', (e) => {
 *       if (e.key === 'u' || e.key === 'U') {
 *         this.upgradeShopUI.toggle();
 *       }
 *     });
 *   }
 *
 *   private updateShipFromStats(): void {
 *     this.ship.setConfig({
 *       thrustPower: this.shipStats.getStat('thrustPower'),
 *       maxSpeed: this.shipStats.getStat('maxSpeed'),
 *       rotationSpeed: this.shipStats.getStat('rotationSpeed'),
 *     });
 *
 *     // Update inventory capacity
 *     this.inventory.setMaxWeight(this.shipStats.getStat('cargoCapacity'));
 *
 *     // Update mining system speed
 *     // this.miningSystem.setSpeedMultiplier(this.shipStats.getStat('miningSpeed'));
 *   }
 *
 *   destroy(): void {
 *     // ... existing cleanup ...
 *     this.saveSystem.destroy();
 *     this.upgradeShopUI.destroy();
 *   }
 * }
 */
