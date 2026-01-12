/**
 * Upgrade shop UI - HTML overlay panel for purchasing ship upgrades
 */

import type { UpgradeSystem } from '../systems/UpgradeSystem';
import { TIER_NAMES, CATEGORY_INFO } from '../../data/upgrades';

/**
 * HTML-based upgrade shop panel
 */
export class UpgradeShopUI {
  private upgradeSystem: UpgradeSystem;
  private container: HTMLElement | null = null;
  private isVisible: boolean = false;

  constructor(upgradeSystem: UpgradeSystem) {
    this.upgradeSystem = upgradeSystem;
    this.createUI();
    this.setupEventListeners();
  }

  /**
   * Create the HTML structure for the shop
   */
  private createUI(): void {
    // Check if container already exists
    let existing = document.getElementById('upgrade-shop-container');
    if (existing) {
      existing.remove();
    }

    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'upgrade-shop-container';
    this.container.innerHTML = `
      <div class="upgrade-shop-panel">
        <div class="upgrade-shop-header">
          <h2>Ship Upgrades</h2>
          <button class="upgrade-shop-close" aria-label="Close shop">&times;</button>
        </div>
        <div class="upgrade-shop-credits">
          <span class="credits-label">Credits:</span>
          <span class="credits-value">0</span>
        </div>
        <div class="upgrade-shop-list"></div>
      </div>
    `;

    // Apply styles
    this.injectStyles();

    // Add to document
    document.body.appendChild(this.container);

    // Hide initially
    this.container.style.display = 'none';

    // Setup close button
    const closeBtn = this.container.querySelector('.upgrade-shop-close');
    closeBtn?.addEventListener('click', () => this.hide());

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * Inject CSS styles for the shop
   */
  private injectStyles(): void {
    if (document.getElementById('upgrade-shop-styles')) return;

    const style = document.createElement('style');
    style.id = 'upgrade-shop-styles';
    style.textContent = `
      #upgrade-shop-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: 'Segoe UI', system-ui, sans-serif;
      }

      .upgrade-shop-panel {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #4a9eff;
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 0 30px rgba(74, 158, 255, 0.3);
      }

      .upgrade-shop-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(74, 158, 255, 0.3);
      }

      .upgrade-shop-header h2 {
        margin: 0;
        color: #4a9eff;
        font-size: 1.4rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      .upgrade-shop-close {
        background: none;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0 8px;
        line-height: 1;
        transition: color 0.2s;
      }

      .upgrade-shop-close:hover {
        color: #ff4444;
      }

      .upgrade-shop-credits {
        padding: 12px 20px;
        background: rgba(0, 0, 0, 0.2);
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
        border-bottom: 1px solid rgba(74, 158, 255, 0.2);
      }

      .credits-label {
        color: #888;
        font-size: 0.9rem;
      }

      .credits-value {
        color: #ffd700;
        font-size: 1.2rem;
        font-weight: bold;
        font-family: monospace;
      }

      .upgrade-shop-list {
        padding: 16px;
        overflow-y: auto;
        max-height: calc(80vh - 140px);
      }

      .upgrade-category {
        margin-bottom: 16px;
      }

      .upgrade-category-title {
        color: #888;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 8px;
        padding-left: 4px;
      }

      .upgrade-item {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 12px;
        align-items: center;
        transition: all 0.2s;
      }

      .upgrade-item:hover:not(.upgrade-maxed) {
        border-color: rgba(74, 158, 255, 0.5);
        background: rgba(74, 158, 255, 0.1);
      }

      .upgrade-item.upgrade-maxed {
        opacity: 0.6;
      }

      .upgrade-item.purchase-success {
        animation: successFlash 0.5s ease-out;
      }

      .upgrade-item.purchase-failure {
        animation: failureShake 0.4s ease-out;
      }

      @keyframes successFlash {
        0% { background: rgba(100, 255, 100, 0.4); }
        100% { background: rgba(0, 0, 0, 0.3); }
      }

      @keyframes failureShake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-5px); background: rgba(255, 100, 100, 0.2); }
        40%, 80% { transform: translateX(5px); background: rgba(255, 100, 100, 0.2); }
      }

      .upgrade-icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        font-family: monospace;
        font-size: 14px;
        font-weight: bold;
      }

      .upgrade-info {
        min-width: 0;
      }

      .upgrade-name {
        color: #fff;
        font-weight: 600;
        font-size: 0.95rem;
        margin-bottom: 2px;
      }

      .upgrade-desc {
        color: #888;
        font-size: 0.8rem;
        margin-bottom: 4px;
      }

      .upgrade-tiers {
        display: flex;
        gap: 4px;
      }

      .tier-pip {
        width: 20px;
        height: 6px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
      }

      .tier-pip.filled {
        background: #4a9eff;
      }

      .upgrade-stats {
        font-size: 0.75rem;
        color: #6ca;
        margin-top: 4px;
      }

      .upgrade-preview {
        color: #fa6;
      }

      .upgrade-action {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }

      .upgrade-btn {
        background: linear-gradient(135deg, #4a9eff 0%, #3a7ecc 100%);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.85rem;
        min-width: 80px;
      }

      .upgrade-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #5ab0ff 0%, #4a8edd 100%);
        transform: translateY(-1px);
      }

      .upgrade-btn:disabled {
        background: #333;
        color: #666;
        cursor: not-allowed;
      }

      .upgrade-btn.cannot-afford {
        background: linear-gradient(135deg, #663333 0%, #442222 100%);
      }

      .upgrade-cost {
        font-size: 0.8rem;
        color: #ffd700;
        font-family: monospace;
      }

      .upgrade-cost.cannot-afford {
        color: #ff6666;
      }

      .upgrade-maxed-label {
        color: #6ca;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup event listeners for the upgrade system
   */
  private setupEventListeners(): void {
    this.upgradeSystem.on((event) => {
      if (event.type === 'purchase-success') {
        this.animatePurchase(event.upgradeId, 'success');
        this.refresh();
      } else if (event.type === 'purchase-failed') {
        this.animatePurchase(event.upgradeId, 'failure');
      }
    });
  }

  /**
   * Animate a purchase result
   */
  private animatePurchase(upgradeId: string, type: 'success' | 'failure'): void {
    const element = this.container?.querySelector(`[data-upgrade-id="${upgradeId}"]`);
    if (!element) return;

    // Remove existing animation classes
    element.classList.remove('purchase-success', 'purchase-failure');

    // Force reflow
    void (element as HTMLElement).offsetWidth;

    // Add animation class
    element.classList.add(`purchase-${type}`);

    // Remove class after animation
    setTimeout(() => {
      element.classList.remove(`purchase-${type}`);
    }, 500);

    // Play sound placeholder (can be replaced with actual audio)
    if (type === 'success') {
      this.playPurchaseSound();
    }
  }

  /**
   * Play purchase sound (placeholder)
   */
  private playPurchaseSound(): void {
    // Create a simple beep using Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch {
      // Audio not available, ignore
    }
  }

  /**
   * Render the upgrade list
   */
  private renderUpgradeList(): void {
    const listEl = this.container?.querySelector('.upgrade-shop-list');
    if (!listEl) return;

    const states = this.upgradeSystem.getAllUpgradeStates();

    // Group by category
    const byCategory: Record<string, typeof states> = {
      cargo: [],
      engine: [],
      mining: [],
      combat: [],
    };

    for (const state of states) {
      byCategory[state.upgrade.category].push(state);
    }

    let html = '';

    for (const [category, upgrades] of Object.entries(byCategory)) {
      if (upgrades.length === 0) continue;

      const categoryInfo = CATEGORY_INFO[category as keyof typeof CATEGORY_INFO];

      html += `<div class="upgrade-category">`;
      html += `<div class="upgrade-category-title" style="color: ${categoryInfo.color}">${categoryInfo.name}</div>`;

      for (const state of upgrades) {
        html += this.renderUpgradeItem(state);
      }

      html += `</div>`;
    }

    listEl.innerHTML = html;

    // Attach buy button listeners
    const buttons = listEl.querySelectorAll('.upgrade-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const upgradeId = (e.target as HTMLElement).dataset.upgradeId;
        if (upgradeId) {
          this.upgradeSystem.purchase(upgradeId);
        }
      });
    });
  }

  /**
   * Render a single upgrade item
   */
  private renderUpgradeItem(state: ReturnType<UpgradeSystem['getAllUpgradeStates']>[0]): string {
    const { upgrade, currentTier, nextCost, canAfford, isMaxed } = state;
    const categoryColor = CATEGORY_INFO[upgrade.category].color;

    // Build tier pips
    let tierPips = '';
    for (let i = 0; i < upgrade.maxTier; i++) {
      tierPips += `<div class="tier-pip ${i < currentTier ? 'filled' : ''}"></div>`;
    }

    // Build stat preview
    let statsHtml = '';
    const preview = this.upgradeSystem.getShipStats().previewUpgrade(upgrade.id);
    if (preview) {
      for (const effect of upgrade.effects) {
        const current = preview.current[effect.stat as keyof typeof preview.current];
        const after = preview.after[effect.stat as keyof typeof preview.after];
        if (current !== undefined && after !== undefined) {
          const diff = after - current;
          const diffStr = effect.isPercentage
            ? `+${Math.round(diff)}`
            : `+${diff.toFixed(effect.stat === 'miningSpeed' ? 2 : 0)}`;
          statsHtml += `<span class="upgrade-preview">${effect.stat}: ${diffStr}</span> `;
        }
      }
    }

    // Build action area
    let actionHtml = '';
    if (isMaxed) {
      actionHtml = `<span class="upgrade-maxed-label">Maxed</span>`;
    } else {
      const costClass = canAfford ? '' : 'cannot-afford';
      actionHtml = `
        <button class="upgrade-btn ${costClass}"
                data-upgrade-id="${upgrade.id}"
                ${canAfford ? '' : 'disabled'}>
          Buy
        </button>
        <span class="upgrade-cost ${costClass}">${nextCost?.toLocaleString()} CR</span>
      `;
    }

    const tierLabel = currentTier > 0 ? ` ${TIER_NAMES[currentTier - 1]}` : '';

    return `
      <div class="upgrade-item ${isMaxed ? 'upgrade-maxed' : ''}" data-upgrade-id="${upgrade.id}">
        <div class="upgrade-icon" style="color: ${categoryColor}">${upgrade.icon}</div>
        <div class="upgrade-info">
          <div class="upgrade-name">${upgrade.name}${tierLabel}</div>
          <div class="upgrade-desc">${upgrade.description}</div>
          <div class="upgrade-tiers">${tierPips}</div>
          ${statsHtml ? `<div class="upgrade-stats">${statsHtml}</div>` : ''}
        </div>
        <div class="upgrade-action">
          ${actionHtml}
        </div>
      </div>
    `;
  }

  /**
   * Update credits display
   */
  private updateCredits(): void {
    const creditsEl = this.container?.querySelector('.credits-value');
    if (creditsEl) {
      creditsEl.textContent = this.upgradeSystem.getInventory().getCredits().toLocaleString();
    }
  }

  /**
   * Refresh the entire UI
   */
  public refresh(): void {
    this.updateCredits();
    this.renderUpgradeList();
  }

  /**
   * Show the upgrade shop
   */
  public show(): void {
    if (!this.container) return;

    this.refresh();
    this.container.style.display = 'flex';
    this.isVisible = true;
  }

  /**
   * Hide the upgrade shop
   */
  public hide(): void {
    if (!this.container) return;

    this.container.style.display = 'none';
    this.isVisible = false;
  }

  /**
   * Toggle visibility
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if shop is currently visible
   */
  public isOpen(): boolean {
    return this.isVisible;
  }

  /**
   * Destroy the UI and clean up
   */
  public destroy(): void {
    this.container?.remove();
    this.container = null;

    const styles = document.getElementById('upgrade-shop-styles');
    styles?.remove();
  }
}
