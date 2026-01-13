/**
 * Station UI - HTML overlay for trading interface
 */

import type { Station } from '../entities/Station';
import type { Market, MarketPrices } from '../systems/Market';
import type { Inventory } from '../components/Inventory';
import type { SaveSystem } from '../systems/SaveSystem';
import type { MissionSystem } from '../systems/MissionSystem';
import type { Mission } from '../../data/missions';
import { RESOURCES, getResourceById } from '../../data/resources';
import { getMapOfferingsForStation, type MapOffering } from '../../data/mapOfferings';

export interface StationUICallbacks {
  onUndock?: () => void;
  onSell?: (resourceId: string, quantity: number, value: number) => void;
  onBuy?: (resourceId: string, quantity: number, cost: number) => void;
  onOpenUpgrades?: () => void;
  onBuyMap?: (locationId: string, price: number) => void;
  onAcceptMission?: (missionId: string) => void;
  onAbandonMission?: (missionId: string) => void;
  onCollectReward?: (missionId: string) => void;
}

export class StationUI {
  private overlay: HTMLDivElement;
  private contentPanel: HTMLDivElement;
  private inventory: Inventory;
  private market: Market | null = null;
  private station: Station | null = null;
  private allMarkets: Map<string, Market> = new Map();
  private allStations: Map<string, Station> = new Map();
  private callbacks: StationUICallbacks = {};
  private activeTab: 'trade' | 'market' | 'maps' | 'missions' | 'menu' = 'trade';
  private saveSystem: SaveSystem | null = null;
  private missionSystem: MissionSystem | null = null;

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
   * Set all markets and stations for price comparison
   */
  public setAllMarketsAndStations(
    markets: Map<string, Market>,
    stations: Map<string, Station>
  ): void {
    this.allMarkets = markets;
    this.allStations = stations;
  }

  /**
   * Set save system reference for discovery checks
   */
  public setSaveSystem(saveSystem: SaveSystem): void {
    this.saveSystem = saveSystem;
  }

  /**
   * Set mission system reference for missions tab
   */
  public setMissionSystem(missionSystem: MissionSystem): void {
    this.missionSystem = missionSystem;
  }

  /**
   * Show the station UI
   */
  public show(station: Station, market: Market): void {
    this.station = station;
    this.market = market;
    this.activeTab = 'trade';
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

    let tabContent = '';
    if (this.activeTab === 'trade') {
      tabContent = this.renderMarketSection(prices, inventoryState);
    } else if (this.activeTab === 'market') {
      tabContent = this.renderMarketIntelSection(inventoryState);
    } else if (this.activeTab === 'maps') {
      tabContent = this.renderMapsSection(inventoryState.credits);
    } else if (this.activeTab === 'missions') {
      tabContent = this.renderMissionsSection();
    } else if (this.activeTab === 'menu') {
      tabContent = this.renderMenuSection();
    }

    this.contentPanel.innerHTML = `
      ${this.renderHeader()}
      ${this.renderPlayerInfo(inventoryState.credits)}
      ${this.renderTabs()}
      ${tabContent}
      ${this.renderUndockButton()}
    `;

    this.attachEventListeners();
  }

  private renderTabs(): string {
    const activeStyle = `
      background: linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%);
      color: #e94560;
      border-bottom: 2px solid #e94560;
    `;
    const inactiveStyle = `
      background: transparent;
      color: #888;
      border-bottom: 2px solid transparent;
    `;

    return `
      <div style="
        display: flex;
        gap: 0;
        margin-bottom: 20px;
        border-bottom: 1px solid #0f3460;
      ">
        <button class="tab-btn" data-tab="trade" style="
          padding: 12px 24px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          ${this.activeTab === 'trade' ? activeStyle : inactiveStyle}
        ">TRADE</button>
        <button class="tab-btn" data-tab="market" style="
          padding: 12px 24px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          ${this.activeTab === 'market' ? activeStyle : inactiveStyle}
        ">MARKET INTEL</button>
        <button class="tab-btn" data-tab="maps" style="
          padding: 12px 24px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          ${this.activeTab === 'maps' ? activeStyle : inactiveStyle}
        ">MAPS</button>
        <button class="tab-btn" data-tab="missions" style="
          padding: 12px 24px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          ${this.activeTab === 'missions' ? activeStyle : inactiveStyle}
        ">MISSIONS</button>
        <button class="tab-btn" data-tab="menu" style="
          padding: 12px 24px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          margin-left: auto;
          ${this.activeTab === 'menu' ? activeStyle : inactiveStyle}
        ">MENU</button>
      </div>
    `;
  }

  private renderMarketIntelSection(
    inventoryState: { slots: { resourceId: string; quantity: number }[]; credits: number }
  ): string {
    if (!this.station) return '';

    const currentStationId = this.station.id;
    const otherStations = Array.from(this.allStations.values()).filter(
      (s) => s.id !== currentStationId
    );

    if (otherStations.length === 0) {
      return `
        <div style="
          text-align: center;
          padding: 40px;
          color: #888;
        ">
          No other stations discovered yet.
        </div>
      `;
    }

    // Build comparison data for each resource
    const rows = Object.keys(RESOURCES)
      .map((resourceId) => {
        const resource = getResourceById(resourceId);
        if (!resource) return '';

        const owned = inventoryState.slots.find((s) => s.resourceId === resourceId)?.quantity || 0;
        const currentPrices = this.market?.getPrices(resourceId);
        const currentSellPrice = currentPrices?.sellPrice || 0;

        // Get prices at other stations
        const otherPricesHtml = otherStations
          .map((station) => {
            const otherMarket = this.allMarkets.get(station.id);
            if (!otherMarket) return '';

            const otherPrices = otherMarket.getPrices(resourceId);
            if (!otherPrices) return '';

            const sellPriceDiff = otherPrices.sellPrice - currentSellPrice;
            const potentialProfit = owned > 0 ? sellPriceDiff * owned : 0;

            const profitColor =
              sellPriceDiff > 0 ? '#4ade80' : sellPriceDiff < 0 ? '#e94560' : '#888';
            const profitIcon = sellPriceDiff > 0 ? '▲' : sellPriceDiff < 0 ? '▼' : '–';

            // Calculate distance from current station
            const dx = station.x - (this.station?.x || 0);
            const dy = station.y - (this.station?.y || 0);
            const distance = Math.sqrt(dx * dx + dy * dy);

            return `
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                margin-bottom: 4px;
              ">
                <div style="flex: 1;">
                  <div style="color: #ccc; font-size: 13px;">${station.name}</div>
                  <div style="color: #666; font-size: 11px;">${Math.round(distance)} units away</div>
                </div>
                <div style="text-align: right;">
                  <div style="color: ${profitColor}; font-size: 14px; font-weight: 600;">
                    ${profitIcon} ${otherPrices.sellPrice} CR
                  </div>
                  ${
                    owned > 0 && sellPriceDiff !== 0
                      ? `<div style="color: ${profitColor}; font-size: 11px;">
                          ${potentialProfit > 0 ? '+' : ''}${potentialProfit} CR profit
                        </div>`
                      : ''
                  }
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <div style="
            margin-bottom: 16px;
            padding: 12px;
            background: rgba(15, 52, 96, 0.3);
            border-radius: 8px;
            border-left: 3px solid ${resource.color};
          ">
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
            ">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  background: ${resource.color};
                  box-shadow: 0 0 8px ${resource.glowColor};
                "></div>
                <span style="color: #fff; font-weight: 600; font-size: 15px;">${resource.name}</span>
              </div>
              <div style="text-align: right;">
                <div style="color: #888; font-size: 11px;">YOU OWN</div>
                <div style="color: #fff; font-weight: 600;">${owned}</div>
              </div>
            </div>
            <div style="color: #888; font-size: 11px; margin-bottom: 6px;">
              SELL PRICE HERE: <span style="color: #4ade80;">${currentSellPrice} CR</span>
            </div>
            <div style="color: #888; font-size: 11px; margin-bottom: 8px;">PRICES AT OTHER STATIONS:</div>
            ${otherPricesHtml}
          </div>
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
          <span style="color: #0f3460;">&#9632;</span> Market Intel
        </h2>
        <p style="color: #888; font-size: 13px; margin-bottom: 15px;">
          Compare sell prices across stations to find the best deals for your cargo.
        </p>
        ${rows}
      </div>
    `;
  }

  private renderMapsSection(credits: number): string {
    if (!this.station || !this.saveSystem) {
      return `
        <div style="text-align: center; padding: 40px; color: #888;">
          Map data unavailable.
        </div>
      `;
    }

    const offerings = getMapOfferingsForStation(this.station.id);

    if (offerings.length === 0) {
      return `
        <div style="text-align: center; padding: 40px; color: #888;">
          No maps available at this station.
        </div>
      `;
    }

    const typeIcons: Record<string, string> = {
      station: '&#9632;', // Square
      planet: '&#9679;', // Circle
      star: '&#9733;', // Star
      blackhole: '&#8857;', // Circle with dot
      gate: '&#9674;', // Diamond
    };

    const typeColors: Record<string, string> = {
      station: '#4ade80',
      planet: '#60a5fa',
      star: '#fbbf24',
      blackhole: '#a855f7',
      gate: '#22d3ee',
    };

    const rows = offerings.map((offering: MapOffering) => {
      const isDiscovered = this.saveSystem!.isLocationDiscovered(offering.locationId);
      const canAfford = credits >= offering.price;
      const icon = typeIcons[offering.locationType] || '&#9679;';
      const color = typeColors[offering.locationType] || '#888';

      if (isDiscovered) {
        return `
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: rgba(74, 222, 128, 0.1);
            border: 1px solid rgba(74, 222, 128, 0.3);
            border-radius: 8px;
            margin-bottom: 12px;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="color: ${color}; font-size: 20px;">${icon}</span>
              <div>
                <div style="color: #4ade80; font-weight: 600; font-size: 15px;">
                  ${offering.name}
                </div>
                <div style="color: #888; font-size: 12px; margin-top: 4px;">
                  ${offering.description}
                </div>
              </div>
            </div>
            <div style="
              padding: 8px 16px;
              background: rgba(74, 222, 128, 0.2);
              border-radius: 4px;
              color: #4ade80;
              font-size: 12px;
              font-weight: 600;
            ">
              &#10003; DISCOVERED
            </div>
          </div>
        `;
      }

      return `
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: rgba(15, 52, 96, 0.3);
          border: 1px solid #0f3460;
          border-radius: 8px;
          margin-bottom: 12px;
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="color: ${color}; font-size: 20px;">${icon}</span>
            <div>
              <div style="color: #fff; font-weight: 600; font-size: 15px;">
                ${offering.name}
              </div>
              <div style="color: #888; font-size: 12px; margin-top: 4px;">
                ${offering.description}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="text-align: right;">
              <div style="color: #ffd700; font-weight: 600; font-size: 16px;">
                ${offering.price} CR
              </div>
            </div>
            <button
              class="buy-map-btn"
              data-location="${offering.locationId}"
              data-price="${offering.price}"
              ${!canAfford ? 'disabled' : ''}
              style="
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: ${canAfford ? 'pointer' : 'not-allowed'};
                font-size: 13px;
                font-weight: 600;
                background: ${canAfford ? 'linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%)' : '#1a1a2e'};
                color: ${canAfford ? '#fff' : '#444'};
                transition: all 0.2s;
              "
            >BUY MAP</button>
          </div>
        </div>
      `;
    }).join('');

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
          <span style="color: #0f3460;">&#9632;</span> Navigation Charts
        </h2>
        <p style="color: #888; font-size: 13px; margin-bottom: 15px;">
          Purchase maps to reveal locations on your navigation display. Each station offers unique charts.
        </p>
        ${rows}
      </div>
    `;
  }

  private renderMissionsSection(): string {
    if (!this.station || !this.missionSystem) {
      return `
        <div style="text-align: center; padding: 40px; color: #888;">
          Mission board unavailable.
        </div>
      `;
    }

    const stationId = this.station.id;
    const availableMissions = this.missionSystem.getAvailableMissions(stationId);
    const activeMissions = this.missionSystem.getActiveMissions();
    const canAcceptMore = this.missionSystem.canAcceptMission();

    // Render active missions section
    let activeMissionsHtml = '';
    if (activeMissions.length > 0) {
      const activeRows = activeMissions.map((mission: Mission) => {
        const isKillMission = mission.objective.type === 'kill_pirates';
        const icon = isKillMission ? '&#9876;' : '&#9992;'; // Crosshairs or plane
        const iconColor = isKillMission ? '#ef4444' : '#60a5fa';

        let progressText = '';
        let progressPercent = 0;
        if (mission.objective.type === 'kill_pirates') {
          const obj = mission.objective;
          progressText = `${obj.currentCount} / ${obj.targetCount} pirates eliminated`;
          progressPercent = (obj.currentCount / obj.targetCount) * 100;
        } else if (mission.objective.type === 'delivery') {
          const obj = mission.objective;
          progressText = mission.isComplete
            ? 'Package delivered!'
            : `Deliver ${obj.packageName} to ${obj.destinationName}`;
          progressPercent = mission.isComplete ? 100 : 0;
        }

        const actionButton = mission.isComplete
          ? `<button
              class="collect-reward-btn"
              data-mission="${mission.id}"
              style="
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
                color: #000;
                transition: all 0.2s;
              "
            >COLLECT ${mission.reward.credits} CR</button>`
          : `<button
              class="abandon-mission-btn"
              data-mission="${mission.id}"
              style="
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
                transition: all 0.2s;
              "
            >ABANDON</button>`;

        return `
          <div style="
            padding: 16px;
            background: ${mission.isComplete ? 'rgba(74, 222, 128, 0.1)' : 'rgba(15, 52, 96, 0.3)'};
            border: 1px solid ${mission.isComplete ? 'rgba(74, 222, 128, 0.3)' : '#0f3460'};
            border-radius: 8px;
            margin-bottom: 12px;
          ">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: ${iconColor}; font-size: 20px;">${icon}</span>
                <div>
                  <div style="color: ${mission.isComplete ? '#4ade80' : '#fff'}; font-weight: 600; font-size: 15px;">
                    ${mission.title}
                  </div>
                  <div style="color: #888; font-size: 12px; margin-top: 4px;">
                    ${mission.description}
                  </div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="color: #ffd700; font-weight: 600; font-size: 14px;">
                  ${mission.reward.credits} CR
                </div>
              </div>
            </div>
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #888; font-size: 11px;">PROGRESS</span>
                <span style="color: ${mission.isComplete ? '#4ade80' : '#ccc'}; font-size: 11px;">${progressText}</span>
              </div>
              <div style="
                height: 6px;
                background: #333;
                border-radius: 3px;
                overflow: hidden;
              ">
                <div style="
                  width: ${progressPercent}%;
                  height: 100%;
                  background: ${mission.isComplete ? '#4ade80' : '#e94560'};
                  transition: width 0.3s;
                "></div>
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end;">
              ${actionButton}
            </div>
          </div>
        `;
      }).join('');

      activeMissionsHtml = `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #fff; font-size: 16px; margin: 0 0 15px 0;">
            Active Missions (${activeMissions.length}/3)
          </h3>
          ${activeRows}
        </div>
      `;
    }

    // Render available missions section
    let availableMissionsHtml = '';
    if (availableMissions.length > 0) {
      const availableRows = availableMissions.map((mission: Mission) => {
        const isKillMission = mission.objective.type === 'kill_pirates';
        const icon = isKillMission ? '&#9876;' : '&#9992;';
        const iconColor = isKillMission ? '#ef4444' : '#60a5fa';

        let objectiveText = '';
        if (mission.objective.type === 'kill_pirates') {
          objectiveText = `Eliminate ${mission.objective.targetCount} pirates`;
        } else if (mission.objective.type === 'delivery') {
          objectiveText = `Deliver to ${mission.objective.destinationName}`;
        }

        return `
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: rgba(15, 52, 96, 0.3);
            border: 1px solid #0f3460;
            border-radius: 8px;
            margin-bottom: 12px;
          ">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
              <span style="color: ${iconColor}; font-size: 20px;">${icon}</span>
              <div>
                <div style="color: #fff; font-weight: 600; font-size: 15px;">
                  ${mission.title}
                </div>
                <div style="color: #888; font-size: 12px; margin-top: 4px;">
                  ${mission.description}
                </div>
                <div style="color: #aaa; font-size: 11px; margin-top: 6px;">
                  <span style="color: ${iconColor};">${objectiveText}</span>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="text-align: right;">
                <div style="color: #ffd700; font-weight: 600; font-size: 16px;">
                  ${mission.reward.credits} CR
                </div>
              </div>
              <button
                class="accept-mission-btn"
                data-mission="${mission.id}"
                ${!canAcceptMore ? 'disabled' : ''}
                style="
                  padding: 10px 20px;
                  border: none;
                  border-radius: 4px;
                  cursor: ${canAcceptMore ? 'pointer' : 'not-allowed'};
                  font-size: 13px;
                  font-weight: 600;
                  background: ${canAcceptMore ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' : '#1a1a2e'};
                  color: ${canAcceptMore ? '#000' : '#444'};
                  transition: all 0.2s;
                "
              >ACCEPT</button>
            </div>
          </div>
        `;
      }).join('');

      availableMissionsHtml = `
        <div>
          <h3 style="color: #fff; font-size: 16px; margin: 0 0 15px 0;">
            Available Missions
          </h3>
          ${!canAcceptMore ? `
            <div style="
              padding: 12px;
              background: rgba(239, 68, 68, 0.1);
              border: 1px solid rgba(239, 68, 68, 0.3);
              border-radius: 6px;
              color: #ef4444;
              font-size: 13px;
              margin-bottom: 15px;
            ">
              Maximum active missions reached (3/3). Complete or abandon a mission to accept new ones.
            </div>
          ` : ''}
          ${availableRows}
        </div>
      `;
    } else {
      availableMissionsHtml = `
        <div style="text-align: center; padding: 30px; color: #888;">
          No missions available at this station. Check back later.
        </div>
      `;
    }

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
          <span style="color: #0f3460;">&#9632;</span> Mission Board
        </h2>
        <p style="color: #888; font-size: 13px; margin-bottom: 15px;">
          Accept contracts to earn credits. Kill pirates in the Frontier or deliver packages to planets.
        </p>
        ${activeMissionsHtml}
        ${availableMissionsHtml}
      </div>
    `;
  }

  private renderMenuSection(): string {
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
          <span style="color: #0f3460;">&#9632;</span> Menu
        </h2>
        <p style="color: #888; font-size: 13px; margin-bottom: 25px;">
          Game options and settings.
        </p>

        <div style="
          padding: 20px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
        ">
          <h3 style="color: #ef4444; font-size: 16px; margin: 0 0 10px 0;">
            Danger Zone
          </h3>
          <p style="color: #888; font-size: 13px; margin-bottom: 15px;">
            This will permanently delete all your progress including credits, inventory, upgrades, and discovered locations.
          </p>
          <button id="reset-progress-btn" style="
            padding: 12px 24px;
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            border: none;
            border-radius: 6px;
            color: #fff;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">
            Reset Progress
          </button>
        </div>
      </div>
    `;
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
                <button
                  class="sell-all-btn"
                  data-resource="${resourceId}"
                  ${!canSell ? 'disabled' : ''}
                  style="
                    padding: 6px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: ${canSell ? 'pointer' : 'not-allowed'};
                    font-size: 11px;
                    font-weight: 600;
                    background: ${canSell ? '#2d4a3e' : '#1a1a2e'};
                    color: ${canSell ? '#4ade80' : '#444'};
                    transition: all 0.2s;
                  "
                >ALL</button>
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
        gap: 20px;
        padding-top: 20px;
        border-top: 1px solid #0f3460;
      ">
        <button id="upgrades-btn" style="
          padding: 14px 40px;
          background: linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%);
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(74, 158, 255, 0.3);
        ">
          UPGRADES
        </button>
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
    // Tab buttons
    const tabBtns = this.contentPanel.querySelectorAll('.tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = (e.target as HTMLElement).dataset.tab as 'trade' | 'market' | 'maps' | 'missions' | 'menu';
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          this.render();
        }
      });
    });

    // Reset progress button
    const resetBtn = this.contentPanel.querySelector('#reset-progress-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.handleResetProgress();
      });

      resetBtn.addEventListener('mouseenter', (e) => {
        (e.target as HTMLElement).style.transform = 'scale(1.05)';
        (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.5)';
      });

      resetBtn.addEventListener('mouseleave', (e) => {
        (e.target as HTMLElement).style.transform = 'scale(1)';
        (e.target as HTMLElement).style.boxShadow = 'none';
      });
    }

    // Upgrades button
    const upgradesBtn = this.contentPanel.querySelector('#upgrades-btn');
    if (upgradesBtn) {
      upgradesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('[StationUI] Upgrades button clicked');
        if (this.callbacks.onOpenUpgrades) {
          this.callbacks.onOpenUpgrades();
        } else {
          console.warn('[StationUI] onOpenUpgrades callback not set!');
        }
      });

      upgradesBtn.addEventListener('mouseenter', (e) => {
        (e.target as HTMLElement).style.transform = 'scale(1.05)';
        (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(74, 158, 255, 0.5)';
      });

      upgradesBtn.addEventListener('mouseleave', (e) => {
        (e.target as HTMLElement).style.transform = 'scale(1)';
        (e.target as HTMLElement).style.boxShadow = '0 4px 15px rgba(74, 158, 255, 0.3)';
      });
    }

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

    // Sell All buttons
    const sellAllBtns = this.contentPanel.querySelectorAll('.sell-all-btn');
    sellAllBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const resourceId = (e.target as HTMLElement).dataset.resource;
        if (resourceId) this.handleSellAll(resourceId);
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
          target.style.background = '#2d4a3e';
          target.style.color = '#4ade80';
        }
      });
    });

    // Buy Map buttons
    const buyMapBtns = this.contentPanel.querySelectorAll('.buy-map-btn');
    buyMapBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const locationId = target.dataset.location;
        const price = parseInt(target.dataset.price || '0', 10);
        if (locationId && price > 0) {
          this.handleBuyMap(locationId, price);
        }
      });

      btn.addEventListener('mouseenter', (e) => {
        const target = e.target as HTMLElement;
        if (!target.hasAttribute('disabled')) {
          target.style.transform = 'scale(1.05)';
          target.style.boxShadow = '0 6px 20px rgba(74, 158, 255, 0.5)';
        }
      });

      btn.addEventListener('mouseleave', (e) => {
        const target = e.target as HTMLElement;
        if (!target.hasAttribute('disabled')) {
          target.style.transform = 'scale(1)';
          target.style.boxShadow = 'none';
        }
      });
    });

    // Accept Mission buttons
    const acceptMissionBtns = this.contentPanel.querySelectorAll('.accept-mission-btn');
    acceptMissionBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const missionId = target.dataset.mission;
        if (missionId && this.station) {
          this.handleAcceptMission(missionId);
        }
      });

      btn.addEventListener('mouseenter', (e) => {
        const target = e.target as HTMLElement;
        if (!target.hasAttribute('disabled')) {
          target.style.transform = 'scale(1.05)';
        }
      });

      btn.addEventListener('mouseleave', (e) => {
        const target = e.target as HTMLElement;
        if (!target.hasAttribute('disabled')) {
          target.style.transform = 'scale(1)';
        }
      });
    });

    // Abandon Mission buttons
    const abandonMissionBtns = this.contentPanel.querySelectorAll('.abandon-mission-btn');
    abandonMissionBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const missionId = target.dataset.mission;
        if (missionId) {
          this.handleAbandonMission(missionId);
        }
      });

      btn.addEventListener('mouseenter', (e) => {
        const target = e.target as HTMLElement;
        target.style.background = 'rgba(239, 68, 68, 0.4)';
      });

      btn.addEventListener('mouseleave', (e) => {
        const target = e.target as HTMLElement;
        target.style.background = 'rgba(239, 68, 68, 0.2)';
      });
    });

    // Collect Reward buttons
    const collectRewardBtns = this.contentPanel.querySelectorAll('.collect-reward-btn');
    collectRewardBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const missionId = target.dataset.mission;
        if (missionId) {
          this.handleCollectReward(missionId);
        }
      });

      btn.addEventListener('mouseenter', (e) => {
        const target = e.target as HTMLElement;
        target.style.transform = 'scale(1.05)';
        target.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.5)';
      });

      btn.addEventListener('mouseleave', (e) => {
        const target = e.target as HTMLElement;
        target.style.transform = 'scale(1)';
        target.style.boxShadow = 'none';
      });
    });
  }

  private handleAcceptMission(missionId: string): void {
    if (!this.missionSystem || !this.station) return;

    const success = this.missionSystem.acceptMission(this.station.id, missionId);
    if (success) {
      this.showFeedback('Mission accepted!', 'buy');
      this.callbacks.onAcceptMission?.(missionId);
      this.refresh();
    } else {
      this.showFeedback('Cannot accept mission', 'error');
    }
  }

  private handleAbandonMission(missionId: string): void {
    if (!this.missionSystem) return;

    const success = this.missionSystem.abandonMission(missionId);
    if (success) {
      this.showFeedback('Mission abandoned', 'error');
      this.callbacks.onAbandonMission?.(missionId);
      this.refresh();
    }
  }

  private handleCollectReward(missionId: string): void {
    if (!this.missionSystem) return;

    const reward = this.missionSystem.collectReward(missionId);
    if (reward > 0) {
      this.inventory.addCredits(reward);
      this.showFeedback(`Collected ${reward} CR!`, 'sell');
      this.flashCredits();
      this.callbacks.onCollectReward?.(missionId);
      this.refresh();
    }
  }

  private handleResetProgress(): void {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to reset all progress?\n\n' +
      'This will delete:\n' +
      '- All credits\n' +
      '- All inventory items\n' +
      '- All upgrades\n' +
      '- All discovered locations\n' +
      '- All mission progress\n\n' +
      'This action cannot be undone!'
    );

    if (confirmed) {
      // Delete save data from localStorage
      localStorage.removeItem('space-game-save');

      // Refresh the page to restart the game
      window.location.reload();
    }
  }

  private handleBuyMap(locationId: string, price: number): void {
    if (!this.saveSystem) return;

    // Check if player has enough credits
    if (this.inventory.getCredits() < price) {
      this.showFeedback('Not enough credits!', 'error');
      return;
    }

    // Check if already discovered
    if (this.saveSystem.isLocationDiscovered(locationId)) {
      this.showFeedback('Already discovered!', 'error');
      return;
    }

    // Execute purchase
    this.inventory.removeCredits(price);
    this.saveSystem.purchaseMap(locationId);

    this.showFeedback(`Map purchased for ${price} CR`, 'buy');
    this.callbacks.onBuyMap?.(locationId, price);
    this.refresh();
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

  private handleSellAll(resourceId: string): void {
    if (!this.market) return;

    const owned = this.inventory.getQuantity(resourceId);
    if (owned <= 0) {
      this.showFeedback('None to sell!', 'error');
      return;
    }

    // Sell all owned resources of this type
    let totalValue = 0;
    let soldCount = 0;

    for (let i = 0; i < owned; i++) {
      const value = this.market.sell(resourceId, 1);
      if (value > 0) {
        this.inventory.removeResource(resourceId, 1);
        this.inventory.addCredits(value);
        totalValue += value;
        soldCount++;
      } else {
        break;
      }
    }

    if (soldCount > 0) {
      const resource = getResourceById(resourceId);
      this.showFeedback(`Sold ${soldCount} ${resource?.name || resourceId} for ${totalValue} CR`, 'sell');
      this.flashCredits();
      this.callbacks.onSell?.(resourceId, soldCount, totalValue);
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
