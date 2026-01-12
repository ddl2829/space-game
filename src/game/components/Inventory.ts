/**
 * Player inventory system with weight-based cargo management
 */

import { getResourceById } from '../../data/resources';

export interface CargoSlot {
  resourceId: string;
  quantity: number;
}

export interface InventoryState {
  slots: CargoSlot[];
  currentWeight: number;
  maxWeight: number;
  credits: number;
}

export class Inventory {
  private slots: Map<string, number> = new Map();
  private maxWeight: number;
  private credits: number;

  constructor(maxWeight: number = 100, startingCredits: number = 0) {
    this.maxWeight = maxWeight;
    this.credits = startingCredits;
  }

  public getCurrentWeight(): number {
    let weight = 0;
    this.slots.forEach((quantity, resourceId) => {
      const resource = getResourceById(resourceId);
      if (resource) {
        weight += resource.weight * quantity;
      }
    });
    return weight;
  }

  public getAvailableWeight(): number {
    return this.maxWeight - this.getCurrentWeight();
  }

  public getMaxWeight(): number {
    return this.maxWeight;
  }

  public setMaxWeight(weight: number): void {
    this.maxWeight = weight;
  }

  public canAdd(resourceId: string, quantity: number): boolean {
    const resource = getResourceById(resourceId);
    if (!resource) return false;

    const additionalWeight = resource.weight * quantity;
    return this.getCurrentWeight() + additionalWeight <= this.maxWeight;
  }

  public getMaxAddable(resourceId: string): number {
    const resource = getResourceById(resourceId);
    if (!resource) return 0;

    const availableWeight = this.getAvailableWeight();
    return Math.floor(availableWeight / resource.weight);
  }

  public addResource(resourceId: string, quantity: number): number {
    const resource = getResourceById(resourceId);
    if (!resource || quantity <= 0) return 0;

    const maxAddable = this.getMaxAddable(resourceId);
    const actualQuantity = Math.min(quantity, maxAddable);

    if (actualQuantity > 0) {
      const current = this.slots.get(resourceId) || 0;
      this.slots.set(resourceId, current + actualQuantity);
      console.log(`[Inventory] Added ${actualQuantity} ${resource.name}`);
    }

    return actualQuantity;
  }

  public removeResource(resourceId: string, quantity: number): number {
    const current = this.slots.get(resourceId) || 0;
    const actualQuantity = Math.min(quantity, current);

    if (actualQuantity > 0) {
      const remaining = current - actualQuantity;
      if (remaining <= 0) {
        this.slots.delete(resourceId);
      } else {
        this.slots.set(resourceId, remaining);
      }
    }

    return actualQuantity;
  }

  public getQuantity(resourceId: string): number {
    return this.slots.get(resourceId) || 0;
  }

  public getSlots(): CargoSlot[] {
    const result: CargoSlot[] = [];
    this.slots.forEach((quantity, resourceId) => {
      result.push({ resourceId, quantity });
    });
    return result;
  }

  public isEmpty(): boolean {
    return this.slots.size === 0;
  }

  public clear(): void {
    this.slots.clear();
  }

  public getCredits(): number {
    return this.credits;
  }

  public addCredits(amount: number): void {
    if (amount > 0) {
      this.credits += amount;
      console.log(`[Inventory] Added ${amount} credits. Total: ${this.credits}`);
    }
  }

  public removeCredits(amount: number): boolean {
    if (amount > 0 && this.credits >= amount) {
      this.credits -= amount;
      return true;
    }
    return false;
  }

  public getState(): InventoryState {
    return {
      slots: this.getSlots(),
      currentWeight: this.getCurrentWeight(),
      maxWeight: this.maxWeight,
      credits: this.credits,
    };
  }

  public getTotalValue(): number {
    let total = 0;
    this.slots.forEach((quantity, resourceId) => {
      const resource = getResourceById(resourceId);
      if (resource) {
        total += resource.basePrice * quantity;
      }
    });
    return total;
  }

  public sellAll(): number {
    const totalValue = this.getTotalValue();
    if (totalValue > 0) {
      this.addCredits(totalValue);
      this.clear();
      console.log(`[Inventory] Sold all cargo for ${totalValue} credits`);
    }
    return totalValue;
  }

  public sellResource(resourceId: string, quantity?: number): number {
    const resource = getResourceById(resourceId);
    if (!resource) return 0;

    const available = this.getQuantity(resourceId);
    const toSell = quantity ? Math.min(quantity, available) : available;

    if (toSell > 0) {
      const value = resource.basePrice * toSell;
      this.removeResource(resourceId, toSell);
      this.addCredits(value);
      return value;
    }

    return 0;
  }
}
