/**
 * Market/Economy system with supply and demand price fluctuation
 */

import { RESOURCES, getResourceById } from '../../data/resources';

export interface MarketPrices {
  buyPrice: number;
  sellPrice: number;
  supply: number;
  demandModifier: number;
}

export interface MarketState {
  stationId: string;
  supply: Record<string, number>;
  demandModifiers: Record<string, number>;
}

/**
 * Price calculation constants
 */
const PRICE_BOUNDS = {
  MIN_MULTIPLIER: 0.5,
  MAX_MULTIPLIER: 2.0,
};

const SPREAD = 0.15; // 15% spread between buy and sell prices
const SUPPLY_IMPACT = 0.005; // How much each unit of supply affects price
const BASE_SUPPLY = 50; // Baseline supply level for price calculation

export class Market {
  private stationId: string;
  private supply: Map<string, number> = new Map();
  private demandModifiers: Map<string, number> = new Map();

  constructor(stationId: string, initialSupply: Record<string, number>) {
    this.stationId = stationId;

    // Initialize supply from station config
    for (const [resourceId, quantity] of Object.entries(initialSupply)) {
      this.supply.set(resourceId, quantity);
    }

    // Initialize demand modifiers (random variation per station)
    for (const resourceId of Object.keys(RESOURCES)) {
      // Random demand modifier between 0.8 and 1.2
      const demandMod = 0.8 + Math.random() * 0.4;
      this.demandModifiers.set(resourceId, demandMod);
    }
  }

  /**
   * Get the current prices for a resource
   */
  public getPrices(resourceId: string): MarketPrices | null {
    const resource = getResourceById(resourceId);
    if (!resource) return null;

    const supply = this.supply.get(resourceId) || 0;
    const demandModifier = this.demandModifiers.get(resourceId) || 1;

    // Calculate price multiplier based on supply/demand
    const supplyDelta = BASE_SUPPLY - supply;
    const priceMultiplier = 1 + supplyDelta * SUPPLY_IMPACT * demandModifier;

    // Clamp multiplier to bounds
    const clampedMultiplier = Math.max(
      PRICE_BOUNDS.MIN_MULTIPLIER,
      Math.min(PRICE_BOUNDS.MAX_MULTIPLIER, priceMultiplier)
    );

    const baseValue = resource.basePrice * clampedMultiplier;

    // Buy price is higher (station sells at premium)
    // Sell price is lower (station buys at discount)
    const buyPrice = Math.ceil(baseValue * (1 + SPREAD));
    const sellPrice = Math.floor(baseValue * (1 - SPREAD));

    return {
      buyPrice,
      sellPrice,
      supply,
      demandModifier,
    };
  }

  /**
   * Get all resource prices for display
   */
  public getAllPrices(): Map<string, MarketPrices> {
    const prices = new Map<string, MarketPrices>();

    for (const resourceId of Object.keys(RESOURCES)) {
      const resourcePrices = this.getPrices(resourceId);
      if (resourcePrices) {
        prices.set(resourceId, resourcePrices);
      }
    }

    return prices;
  }

  /**
   * Sell resources to the station (player sells, station buys)
   * Returns the total credits earned
   */
  public sell(resourceId: string, quantity: number): number {
    const prices = this.getPrices(resourceId);
    if (!prices || quantity <= 0) return 0;

    // Station buys at sell price
    const totalValue = prices.sellPrice * quantity;

    // Add to station supply (increases future supply, lowers price)
    const currentSupply = this.supply.get(resourceId) || 0;
    this.supply.set(resourceId, currentSupply + quantity);

    return totalValue;
  }

  /**
   * Buy resources from the station (player buys, station sells)
   * Returns the total cost, or -1 if not enough supply
   */
  public buy(resourceId: string, quantity: number): number {
    const prices = this.getPrices(resourceId);
    if (!prices || quantity <= 0) return -1;

    const currentSupply = this.supply.get(resourceId) || 0;
    if (currentSupply < quantity) return -1;

    // Station sells at buy price
    const totalCost = prices.buyPrice * quantity;

    // Remove from station supply (decreases supply, raises price)
    this.supply.set(resourceId, currentSupply - quantity);

    return totalCost;
  }

  /**
   * Check if station has enough supply to sell
   */
  public hasSupply(resourceId: string, quantity: number): boolean {
    const currentSupply = this.supply.get(resourceId) || 0;
    return currentSupply >= quantity;
  }

  /**
   * Get station's current supply of a resource
   */
  public getSupply(resourceId: string): number {
    return this.supply.get(resourceId) || 0;
  }

  /**
   * Get the station ID this market belongs to
   */
  public getStationId(): string {
    return this.stationId;
  }

  /**
   * Get market state for saving/loading
   */
  public getState(): MarketState {
    const supplyObj: Record<string, number> = {};
    const demandObj: Record<string, number> = {};

    this.supply.forEach((v, k) => (supplyObj[k] = v));
    this.demandModifiers.forEach((v, k) => (demandObj[k] = v));

    return {
      stationId: this.stationId,
      supply: supplyObj,
      demandModifiers: demandObj,
    };
  }

  /**
   * Load market state
   */
  public loadState(state: MarketState): void {
    this.supply.clear();
    this.demandModifiers.clear();

    for (const [k, v] of Object.entries(state.supply)) {
      this.supply.set(k, v);
    }

    for (const [k, v] of Object.entries(state.demandModifiers)) {
      this.demandModifiers.set(k, v);
    }
  }

  /**
   * Get the price trend indicator for a resource
   * Returns: 'high', 'normal', or 'low'
   */
  public getPriceTrend(resourceId: string): 'high' | 'normal' | 'low' {
    const prices = this.getPrices(resourceId);
    const resource = getResourceById(resourceId);

    if (!prices || !resource) return 'normal';

    const ratio = prices.sellPrice / resource.basePrice;

    if (ratio > 1.3) return 'high';
    if (ratio < 0.7) return 'low';
    return 'normal';
  }
}
