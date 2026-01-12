/**
 * Heads-up display - Canvas-based UI overlay
 */

import type { Inventory } from '../components/Inventory';
import { getResourceById } from '../../data/resources';
import { MiningSystem } from '../systems/MiningSystem';

interface HUDConfig {
  padding: number;
  fontSize: number;
  fontFamily: string;
}

export class HUD {
  private inventory: Inventory;
  private miningSystem: MiningSystem | null = null;
  private config: HUDConfig;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  // Animation states
  private cargoFlashTimer: number = 0;
  private lastCargoWeight: number = 0;

  constructor(inventory: Inventory, config?: Partial<HUDConfig>) {
    this.inventory = inventory;
    this.config = {
      padding: 20,
      fontSize: 14,
      fontFamily: 'monospace',
      ...config,
    };
  }

  public setMiningSystem(miningSystem: MiningSystem): void {
    this.miningSystem = miningSystem;
  }

  public update(deltaTime: number): void {
    // Update flash animation
    if (this.cargoFlashTimer > 0) {
      this.cargoFlashTimer -= deltaTime;
    }

    // Detect cargo changes
    const currentWeight = this.inventory.getCurrentWeight();
    if (currentWeight !== this.lastCargoWeight) {
      this.cargoFlashTimer = 0.3;
      this.lastCargoWeight = currentWeight;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.canvasWidth = ctx.canvas.width;
    this.canvasHeight = ctx.canvas.height;

    ctx.save();

    // Render cargo panel (top-left)
    this.renderCargoPanel(ctx);

    // Render credits (top-right)
    this.renderCredits(ctx);

    // Render mining progress (center-bottom when mining)
    if (this.miningSystem?.isMiningActive()) {
      this.renderMiningProgress(ctx);
    }

    // Render mining range indicator hint
    this.renderMiningHint(ctx);

    ctx.restore();
  }

  private renderCargoPanel(ctx: CanvasRenderingContext2D): void {
    const x = this.config.padding;
    const y = this.config.padding;
    const panelWidth = 180;
    const panelHeight = 120;

    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.5)';
    ctx.lineWidth = 1;

    this.roundRect(ctx, x, y, panelWidth, panelHeight, 5);
    ctx.fill();
    ctx.stroke();

    // Panel title
    ctx.fillStyle = '#8ac';
    ctx.font = `bold ${this.config.fontSize}px ${this.config.fontFamily}`;
    ctx.fillText('CARGO', x + 10, y + 20);

    // Weight bar
    const currentWeight = this.inventory.getCurrentWeight();
    const maxWeight = this.inventory.getMaxWeight();
    const weightPercent = currentWeight / maxWeight;

    const barX = x + 10;
    const barY = y + 30;
    const barWidth = panelWidth - 20;
    const barHeight = 8;

    // Bar background
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Bar fill
    let barColor = '#4a8';
    if (weightPercent > 0.9) {
      barColor = '#a44';
    } else if (weightPercent > 0.7) {
      barColor = '#aa4';
    }

    // Flash effect on change
    if (this.cargoFlashTimer > 0) {
      barColor = '#fff';
    }

    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barWidth * weightPercent, barHeight);

    // Bar border
    ctx.strokeStyle = '#666';
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Weight text
    ctx.fillStyle = '#ccc';
    ctx.font = `${this.config.fontSize - 2}px ${this.config.fontFamily}`;
    ctx.fillText(
      `${currentWeight.toFixed(1)} / ${maxWeight} kg`,
      barX,
      barY + barHeight + 14
    );

    // Resource list
    const slots = this.inventory.getSlots();
    let slotY = barY + 35;

    if (slots.length === 0) {
      ctx.fillStyle = '#666';
      ctx.fillText('Empty', barX, slotY);
    } else {
      for (const slot of slots) {
        const resource = getResourceById(slot.resourceId);
        if (!resource) continue;

        // Resource icon (colored dot)
        ctx.beginPath();
        ctx.arc(barX + 5, slotY - 4, 4, 0, Math.PI * 2);
        ctx.fillStyle = resource.color;
        ctx.fill();

        // Resource name and quantity
        ctx.fillStyle = '#ddd';
        ctx.fillText(`${resource.name}: ${slot.quantity}`, barX + 15, slotY);

        slotY += 16;
      }
    }
  }

  private renderCredits(ctx: CanvasRenderingContext2D): void {
    const credits = this.inventory.getCredits();
    const text = `${credits.toLocaleString()} CR`;

    ctx.font = `bold ${this.config.fontSize + 2}px ${this.config.fontFamily}`;
    const textWidth = ctx.measureText(text).width;

    const x = this.canvasWidth - this.config.padding - textWidth - 20;
    const y = this.config.padding;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.5)';
    this.roundRect(ctx, x - 10, y, textWidth + 30, 30, 5);
    ctx.fill();
    ctx.stroke();

    // Credit symbol
    ctx.fillStyle = '#fc4';
    ctx.fillText('$', x, y + 20);

    // Credit amount
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x + 15, y + 20);
  }

  private renderMiningProgress(ctx: CanvasRenderingContext2D): void {
    if (!this.miningSystem) return;

    const progress = this.miningSystem.getMiningProgress();
    const resourceName = this.miningSystem.getTargetResource() || 'Unknown';

    const barWidth = 200;
    const barHeight = 20;
    const x = (this.canvasWidth - barWidth) / 2;
    const y = this.canvasHeight - 100;

    // Background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.5)';
    this.roundRect(ctx, x - 20, y - 25, barWidth + 40, 65, 8);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#8ac';
    ctx.font = `bold ${this.config.fontSize}px ${this.config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText(`Mining ${resourceName}`, this.canvasWidth / 2, y - 5);

    // Progress bar background
    ctx.fillStyle = '#333';
    this.roundRect(ctx, x, y, barWidth, barHeight, 3);
    ctx.fill();

    // Progress bar fill
    const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
    gradient.addColorStop(0, '#fa0');
    gradient.addColorStop(1, '#f50');
    ctx.fillStyle = gradient;
    this.roundRect(ctx, x, y, barWidth * progress, barHeight, 3);
    ctx.fill();

    // Progress bar border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, barWidth, barHeight, 3);
    ctx.stroke();

    // Progress percentage
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${this.config.fontSize - 1}px ${this.config.fontFamily}`;
    ctx.fillText(`${Math.floor(progress * 100)}%`, this.canvasWidth / 2, y + 14);

    ctx.textAlign = 'left';
  }

  private renderMiningHint(ctx: CanvasRenderingContext2D): void {
    // Only show hint if not actively mining
    if (this.miningSystem?.isMiningActive()) return;

    const text = 'Hold LMB on asteroid to mine';
    ctx.font = `${this.config.fontSize - 2}px ${this.config.fontFamily}`;
    const textWidth = ctx.measureText(text).width;

    const x = (this.canvasWidth - textWidth) / 2;
    const y = this.canvasHeight - 30;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(text, x, y);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  public renderMiningRangeIndicator(
    ctx: CanvasRenderingContext2D,
    playerScreenX: number,
    playerScreenY: number,
    range: number,
    isInRange: boolean
  ): void {
    ctx.save();

    ctx.strokeStyle = isInRange ? 'rgba(100, 200, 100, 0.3)' : 'rgba(200, 100, 100, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, range, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
