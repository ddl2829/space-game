/**
 * Upgrade system - handles purchase logic and event coordination
 */

import type { Inventory } from '../components/Inventory';
import type { ShipStats } from '../components/ShipStats';
import { getUpgradeById, getNextTierCost, UPGRADES } from '../../data/upgrades';
import type { Upgrade } from '../../data/upgrades';

/**
 * Result of an upgrade purchase attempt
 */
export interface PurchaseResult {
  success: boolean;
  reason?: 'insufficient-funds' | 'max-tier' | 'invalid-upgrade';
  upgradeId?: string;
  newTier?: number;
  cost?: number;
}

/**
 * Events emitted by the upgrade system
 */
export type UpgradeSystemEvent =
  | { type: 'purchase-success'; upgradeId: string; tier: number; cost: number }
  | { type: 'purchase-failed'; upgradeId: string; reason: string }
  | { type: 'upgrade-preview'; upgradeId: string };

export type UpgradeSystemEventHandler = (event: UpgradeSystemEvent) => void;

/**
 * Manages upgrade purchases and applies them to ship stats
 */
export class UpgradeSystem {
  private inventory: Inventory;
  private shipStats: ShipStats;
  private eventHandlers: UpgradeSystemEventHandler[] = [];

  constructor(inventory: Inventory, shipStats: ShipStats) {
    this.inventory = inventory;
    this.shipStats = shipStats;
  }

  /**
   * Check if the player can afford a specific upgrade
   */
  public canAfford(upgradeId: string): boolean {
    const currentTier = this.shipStats.getUpgradeTier(upgradeId);
    const cost = getNextTierCost(upgradeId, currentTier);

    if (cost === undefined) return false;
    return this.inventory.getCredits() >= cost;
  }

  /**
   * Check if an upgrade is available for purchase
   */
  public isAvailable(upgradeId: string): boolean {
    return this.shipStats.canUpgrade(upgradeId);
  }

  /**
   * Get the cost for the next tier of an upgrade
   */
  public getNextCost(upgradeId: string): number | undefined {
    const currentTier = this.shipStats.getUpgradeTier(upgradeId);
    return getNextTierCost(upgradeId, currentTier);
  }

  /**
   * Attempt to purchase an upgrade
   */
  public purchase(upgradeId: string): PurchaseResult {
    const upgrade = getUpgradeById(upgradeId);

    // Validate upgrade exists
    if (!upgrade) {
      this.emit({ type: 'purchase-failed', upgradeId, reason: 'Invalid upgrade' });
      return { success: false, reason: 'invalid-upgrade' };
    }

    // Check if already at max tier
    if (!this.shipStats.canUpgrade(upgradeId)) {
      this.emit({ type: 'purchase-failed', upgradeId, reason: 'Max tier reached' });
      return { success: false, reason: 'max-tier' };
    }

    // Get cost for next tier
    const currentTier = this.shipStats.getUpgradeTier(upgradeId);
    const cost = getNextTierCost(upgradeId, currentTier);

    if (cost === undefined) {
      this.emit({ type: 'purchase-failed', upgradeId, reason: 'No cost defined' });
      return { success: false, reason: 'invalid-upgrade' };
    }

    // Check if player can afford
    if (!this.canAfford(upgradeId)) {
      this.emit({
        type: 'purchase-failed',
        upgradeId,
        reason: `Need ${cost} credits (have ${this.inventory.getCredits()})`
      });
      return { success: false, reason: 'insufficient-funds' };
    }

    // Deduct credits
    const removed = this.inventory.removeCredits(cost);
    if (!removed) {
      this.emit({ type: 'purchase-failed', upgradeId, reason: 'Credit removal failed' });
      return { success: false, reason: 'insufficient-funds' };
    }

    // Apply upgrade
    const applied = this.shipStats.applyUpgrade(upgradeId);
    if (!applied) {
      // Refund if upgrade application failed
      this.inventory.addCredits(cost);
      this.emit({ type: 'purchase-failed', upgradeId, reason: 'Upgrade application failed' });
      return { success: false, reason: 'invalid-upgrade' };
    }

    const newTier = this.shipStats.getUpgradeTier(upgradeId);

    console.log(`[UpgradeSystem] Purchased ${upgrade.name} tier ${newTier} for ${cost} credits`);

    this.emit({ type: 'purchase-success', upgradeId, tier: newTier, cost });

    return {
      success: true,
      upgradeId,
      newTier,
      cost,
    };
  }

  /**
   * Get all available upgrades with their current state
   */
  public getAllUpgradeStates(): Array<{
    upgrade: Upgrade;
    currentTier: number;
    nextCost: number | undefined;
    canAfford: boolean;
    isMaxed: boolean;
  }> {
    return Object.values(UPGRADES).map((upgrade) => ({
      upgrade,
      currentTier: this.shipStats.getUpgradeTier(upgrade.id),
      nextCost: this.getNextCost(upgrade.id),
      canAfford: this.canAfford(upgrade.id),
      isMaxed: !this.shipStats.canUpgrade(upgrade.id),
    }));
  }

  /**
   * Get upgrade state for a specific upgrade
   */
  public getUpgradeState(upgradeId: string) {
    const upgrade = getUpgradeById(upgradeId);
    if (!upgrade) return null;

    return {
      upgrade,
      currentTier: this.shipStats.getUpgradeTier(upgradeId),
      nextCost: this.getNextCost(upgradeId),
      canAfford: this.canAfford(upgradeId),
      isMaxed: !this.shipStats.canUpgrade(upgradeId),
      preview: this.shipStats.previewUpgrade(upgradeId),
    };
  }

  /**
   * Subscribe to upgrade events
   */
  public on(handler: UpgradeSystemEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Unsubscribe from events
   */
  public off(handler: UpgradeSystemEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index !== -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Emit an event to all handlers
   */
  private emit(event: UpgradeSystemEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  /**
   * Get references to managed components
   */
  public getInventory(): Inventory {
    return this.inventory;
  }

  public getShipStats(): ShipStats {
    return this.shipStats;
  }
}
