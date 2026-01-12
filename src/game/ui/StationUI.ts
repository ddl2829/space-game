/**
 * Station UI - HTML overlay for trading interface
 */

import type { Station } from '../entities/Station';
import type { Market, MarketPrices } from '../systems/Market';
import type { Inventory } from '../components/Inventory';
import { RESOURCES, getResourceById } from '../../data/resources';

export interface StationUICallbacks {
  onUndock?: () => void;
  onSell?: (resourceId: string, quantity: number, value: number) => void;
  onBuy?: (resourceId: string, quantity: number, cost: number) => void;
}

export class StationUI {
  private overlay: HTMLDivElement;
  private contentPanel: HTMLDivElement;
  private inventory: Inventory;
  private market: Market | null = null;
  private station: Station | null = null;
  private callbacks: StationUICallbacks = {};


  constructor(inventory: Inventory) {
    this.inventory = inventory;
    this.overlay = this.createOverlay();
    this.contentPanel = this.createContentPanel();
    this.overlay.appendChild(this.contentPanel);
    document.body.appendChild(this.overlay);
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'station-ui';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.92);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    return overlay;
  }

  private createContentPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #0f3460;
      border-radius: 12px;
      padding: 30px;
      min-width: 700px;
      max-width: 900px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 0 40px rgba(15, 52, 96, 0.5), inset 0 0 60px rgba(0, 0, 0, 0.3);
    `;
    return panel;
  }

  /**
   * Set callbacks for UI events
   */
  public setCallbacks(callbacks: StationUICallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Show the station UI
   */
  public show(station: Station, market: Market): void {
    this.station = station;
    this.market = market;
    this.render();
    this.overlay.style.display = 'flex';
  }

  /**
   * Hide the station UI
   */
  public hide(): void {
    this.overlay.style.display = 'none';
    this.station = null;
    this.market = null;
  }

  /**
   * Check if UI is visible
   */
  public isVisible(): boolean {
    return this.overlay.style.display !== 'none';
  }

  /**
   * Re-render the UI (after transactions)
   */
  public refresh(): void {
    if (this.isVisible() && this.station && this.market) {
      this.render();
    }
  }

  private render(): void {
    if (!this.station || !this.market) return;

    const prices = this.market.getAllPrices();
    const inventoryState = this.inventory.getState();

    this.contentPanel.innerHTML = `
      ${this.renderHeader()}
      ${this.renderPlayerInfo(inventoryState.credits)}
      ${this.renderMarketSection(prices, inventoryState)}
      ${this.renderUndockButton()}
    `;

    this.attachEventListeners();
  }

  private renderHeader(): string {
    return `
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 1px solid #0f3460;
      ">
        <h1 style="
          margin: 0;
          color: #e94560;
          font-size: 28px;
          text-shadow: 0 0 20px rgba(233, 69, 96, 0.5);
        ">${this.station?.name || 'Station'}</h1>
        <div style="color: #888; font-size: 14px;">
          Trading Terminal
        </div>
      </div>
    `;
  }

  private renderPlayerInfo(credits: number): string {
    const cargoWeight = this.inventory.getCurrentWeight();
    const maxWeight = this.inventory.getMaxWeight();
    const cargoPercent = (cargoWeight / maxWeight) * 100;

    return `
      <div style="
        display: flex;
        gap: 30px;
        margin-bottom: 25px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
      ">
        <div style="flex: 1;">
          <div style="color: #888; font-size: 12px; margin-bottom: 5px;">CREDITS</div>
          <div id="credits-display" style="
            color: #ffd700;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
          ">${credits.toLocaleString()} CR</div>
        </div>
        <div style="flex: 1;">
          <div style="color: #888; font-size: 12px; margin-bottom: 5px;">CARGO</div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="
              flex: 1;
              height: 20px;
              background: #333;
              border-radius: 4px;
              overflow: hidden;
            ">
              <div style="
                width: ${cargoPercent}%;
                height: 100%;
                background: ${cargoPercent > 90 ? '#e94560' : cargoPercent > 70 ? '#ffc107' : '#4ade80'};
                transition: width 0.3s;
              "></div>
            </div>
            <span style="color: #ccc; font-size: 14px; white-space: nowrap;">
              ${cargoWeight.toFixed(1)} / ${maxWeight} kg
            </span>
          </div>
        </div>
      </div>
    `;
  }

  private renderMarketSection(
    prices: Map<string, MarketPrices>,
    inventoryState: { slots: { resourceId: string; quantity: number }[]; credits: number }
  ): string {
    const rows = Object.keys(RESOURCES)
      .map((resourceId) => {
        const resource = getResourceById(resourceId);
        const marketPrices = prices.get(resourceId);
        const owned = inventoryState.slots.find((s) => s.resourceId === resourceId)?.quantity || 0;

        if (!resource || !marketPrices) return '';

        const trend = this.market?.getPriceTrend(resourceId) || 'normal';
        const trendIcon =
          trend === 'high' ? '&#9650;' : trend === 'low' ? '&#9660;' : '&#9679;';
        const trendColor = trend === 'high' ? '#4ade80' : trend === 'low' ? '#e94560' : '#888';

        const canBuy = marketPrices.supply > 0 && inventoryState.credits >= marketPrices.buyPrice;
        const canSell = owned > 0;

        return `
          <tr style="border-bottom: 1px solid #1a1a2e;">
            <td style="padding: 12px 8px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  background: ${resource.color};
                  box-shadow: 0 0 8px ${resource.glowColor};
                "></div>
                <span style="color: #fff; font-weight: 500;">${resource.name}</span>
                <span style="
                  color: ${trendColor};
                  font-size: 10px;
                ">${trendIcon}</span>
              </div>
            </td>
            <td style="padding: 12px 8px; color: #888; text-align: center;">
              ${marketPrices.supply}
            </td>
            <td style="padding: 12px 8px; text-align: center;">
              <span style="color: #e94560;">${marketPrices.buyPrice} CR</span>
            </td>
            <td style="padding: 12px 8px; text-align: center;">
              <span style="color: #4ade80;">${marketPrices.sellPrice} CR</span>
            </td>
            <td style="padding: 12px 8px; color: #fff; text-align: center; font-weight: 500;">
              ${owned}
            </td>
            <td style="padding: 12px 8px; text-align: right;">
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button
                  class="buy-btn"
                  data-resource="${resourceId}"
                  ${!canBuy ? 'disabled' : ''}
                  style="
                    padding: 6px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: ${canBuy ? 'pointer' : 'not-allowed'};
                    font-size: 12px;
                    font-weight: 600;
                    background: ${canBuy ? '#1e3a5f' : '#1a1a2e'};
                    color: ${canBuy ? '#60a5fa' : '#444'};
                    transition: all 0.2s;
                  "
                >BUY</button>
                <button
                  class="sell-btn"
                  data-resource="${resourceId}"
                  ${!canSell ? 'disabled' : ''}
                  style="
                    padding: 6px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: ${canSell ? 'pointer' : 'not-allowed'};
                    font-size: 12px;
                    font-weight: 600;
                    background: ${canSell ? '#1e3a2e' : '#1a1a2e'};
                    color: ${canSell ? '#4ade80' : '#444'};
                    transition: all 0.2s;
                  "
                >SELL</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <div style="margin-bottom: 25px;">
        <h2 style="
          color: #fff;
          font-size: 18px;
          margin: 0 0 15px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        ">
          <span style="color: #0f3460;">&#9632;</span> Market
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #0f3460;">
              <th style="padding: 10px 8px; text-align: left; color: #888; font-size: 12px; font-weight: 500;">RESOURCE</th>
              <th style="padding: 10px 8px; text-align: center; color: #888; font-size: 12px; font-weight: 500;">SUPPLY</th>
              <th style="padding: 10px 8px; text-align: center; color: #888; font-size: 12px; font-weight: 500;">BUY PRICE</th>
              <th style="padding: 10px 8px; text-align: center; color: #888; font-size: 12px; font-weight: 500;">SELL PRICE</th>
              <th style="padding: 10px 8px; text-align: center; color: #888; font-size: 12px; font-weight: 500;">OWNED</th>
              <th style="padding: 10px 8px; text-align: right; color: #888; font-size: 12px; font-weight: 500;">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderUndockButton(): string {
    return `
      <div style="
        display: flex;
        justify-content: center;
        padding-top: 20px;
        border-top: 1px solid #0f3460;
      ">
        <button id="undock-btn" style="
          padding: 14px 40px;
          background: linear-gradient(135deg, #e94560 0%, #c73e54 100%);
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(233, 69, 96, 0.3);
        ">
          UNDOCK
        </button>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Undock button
    const undockBtn = this.contentPanel.querySelector('#undock-btn');
    if (undockBtn) {
      undockBtn.addEventListener('click', () => {
        this.callbacks.onUndock?.();
      });

      undockBtn.addEventListener('mouseenter', (e) => {
        (e.target as HTMLElement).style.transform = 'scale(1.05)';
        (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(233, 69, 96, 0.5)';
      });

      undockBtn.addEventListener('mouseleave', (e) => {
        (e.target as HTMLElement).style.transform = 'scale(1)';
        (e.target as HTMLElement).style.boxShadow = '0 4px 15px rgba(233, 69, 96, 0.3)';
      });
    }

    // Buy buttons
    const buyBtns = this.contentPanel.querySelectorAll('.buy-btn');
    buyBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const resourceId = (e.target as HTMLElement).dataset.resource;
        if (resourceId) this.handleBuy(resourceId);
      });

      btn.addEventListener('mouseenter', (e) => {
        const target = e.target as HTMLElement;
        if (!target.hasAttribute('disabled')) {
          target.style.background = '#2563eb';
          target.style.color = '#fff';
        }
      });

      btn.addEventListener('mouseleave', (e) => {
        const target = e.target as HTMLElement;
        if (!target.hasAttribute('disabled')) {
          target.style.background = '#1e3a5f';
          target.style.color = '#60a5fa';
        }
      });
    });

    // Sell buttons
    const sellBtns = this.contentPanel.querySelectorAll('.sell-btn');
    sellBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const resourceId = (e.target as HTMLElement).dataset.resource;
        if (resourceId) this.handleSell(resourceId);
      });

      btn.addEventListener('mouseenter', (e) => {
        const target = e.target as HTMLElement;
        if (!target.hasAttribute('disabled')) {
          target.style.background = '#22c55e';
          target.style.color = '#fff';
        }
      });

      btn.addEventListener('mouseleave', (e) => {
        const target = e.target as HTMLElement;
        if (!target.hasAttribute('disabled')) {
          target.style.background = '#1e3a2e';
          target.style.color = '#4ade80';
        }
      });
    });
  }

  private handleBuy(resourceId: string): void {
    if (!this.market) return;

    const prices = this.market.getPrices(resourceId);
    if (!prices) return;

    // Check if player has enough credits
    if (this.inventory.getCredits() < prices.buyPrice) {
      this.showFeedback('Not enough credits!', 'error');
      return;
    }

    // Check if station has supply
    if (prices.supply <= 0) {
      this.showFeedback('Out of stock!', 'error');
      return;
    }

    // Check cargo space
    if (!this.inventory.canAdd(resourceId, 1)) {
      this.showFeedback('Cargo full!', 'error');
      return;
    }

    // Execute transaction
    const cost = this.market.buy(resourceId, 1);
    if (cost > 0) {
      this.inventory.removeCredits(cost);
      this.inventory.addResource(resourceId, 1);

      const resource = getResourceById(resourceId);
      this.showFeedback(`Bought 1 ${resource?.name || resourceId} for ${cost} CR`, 'buy');
      this.callbacks.onBuy?.(resourceId, 1, cost);
      this.refresh();
    }
  }

  private handleSell(resourceId: string): void {
    if (!this.market) return;

    const owned = this.inventory.getQuantity(resourceId);
    if (owned <= 0) {
      this.showFeedback('None to sell!', 'error');
      return;
    }

    const prices = this.market.getPrices(resourceId);
    if (!prices) return;

    // Execute transaction
    const value = this.market.sell(resourceId, 1);
    if (value > 0) {
      this.inventory.removeResource(resourceId, 1);
      this.inventory.addCredits(value);

      const resource = getResourceById(resourceId);
      this.showFeedback(`Sold 1 ${resource?.name || resourceId} for ${value} CR`, 'sell');
      this.flashCredits();
      this.callbacks.onSell?.(resourceId, 1, value);
      this.refresh();
    }
  }

  private showFeedback(message: string, type: 'sell' | 'buy' | 'error'): void {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 15px 30px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      z-index: 1001;
      animation: feedbackPop 0.8s ease-out forwards;
      pointer-events: none;
    `;

    if (type === 'sell') {
      feedback.style.background = 'rgba(74, 222, 128, 0.9)';
      feedback.style.color = '#000';
      feedback.style.boxShadow = '0 0 30px rgba(74, 222, 128, 0.5)';
    } else if (type === 'buy') {
      feedback.style.background = 'rgba(96, 165, 250, 0.9)';
      feedback.style.color = '#000';
      feedback.style.boxShadow = '0 0 30px rgba(96, 165, 250, 0.5)';
    } else {
      feedback.style.background = 'rgba(233, 69, 96, 0.9)';
      feedback.style.color = '#fff';
      feedback.style.boxShadow = '0 0 30px rgba(233, 69, 96, 0.5)';
    }

    feedback.textContent = message;

    // Add animation keyframes if not already present
    if (!document.getElementById('station-ui-animations')) {
      const style = document.createElement('style');
      style.id = 'station-ui-animations';
      style.textContent = `
        @keyframes feedbackPop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          40% { transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -70%) scale(1); }
        }
        @keyframes creditFlash {
          0%, 100% { text-shadow: 0 0 10px rgba(255, 215, 0, 0.4); }
          50% { text-shadow: 0 0 30px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 215, 0, 0.5); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 800);
  }

  private flashCredits(): void {
    const creditsDisplay = this.contentPanel.querySelector('#credits-display') as HTMLElement;
    if (creditsDisplay) {
      creditsDisplay.style.animation = 'creditFlash 0.5s ease-out';
      setTimeout(() => {
        creditsDisplay.style.animation = '';
      }, 500);
    }
  }

  /**
   * Clean up DOM elements
   */
  public destroy(): void {
    this.overlay.remove();
  }
}
