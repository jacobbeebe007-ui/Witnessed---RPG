import Phaser from "phaser";
import { COLORS, FONT } from "../config";

export function textStyle(size: number, color = COLORS.text, extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color: "#" + color.toString(16).padStart(6, "0"),
    ...extra,
  };
}

export function drawPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, opts: { fill?: number; border?: number; alpha?: number } = {}): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const fill = opts.fill ?? COLORS.panel;
  const border = opts.border ?? COLORS.border;
  g.fillStyle(fill, opts.alpha ?? 0.96);
  g.fillRoundedRect(x, y, w, h, 8);
  g.lineStyle(2, border, 1);
  g.strokeRoundedRect(x, y, w, h, 8);
  g.lineStyle(1, 0xffffff, 0.06);
  g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 6);
  return g;
}

export interface ButtonOpts {
  width?: number;
  height?: number;
  size?: number;
  fill?: number;
  hover?: number;
  textColor?: number;
  disabled?: boolean;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private hit: Phaser.GameObjects.Rectangle;
  private bw: number;
  private bh: number;
  private fillColor: number;
  private hoverColor: number;
  private _disabled: boolean;
  public onClick: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: ButtonOpts = {}) {
    super(scene, x, y);
    this.bw = opts.width ?? 220;
    this.bh = opts.height ?? 52;
    this.fillColor = opts.fill ?? COLORS.panelLight;
    this.hoverColor = opts.hover ?? COLORS.border;
    this._disabled = opts.disabled ?? false;
    this.onClick = onClick;

    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.label = scene.add.text(0, 0, text, textStyle(opts.size ?? 22, opts.textColor ?? COLORS.text, { fontStyle: "bold" })).setOrigin(0.5);
    this.add(this.label);
    this.redraw(false);

    this.setSize(this.bw, this.bh);
    // Use an explicit interactive Rectangle as the hit target. Rectangles have
    // reliable world-space input hit-testing even when nested in a container.
    this.hit = scene.add.rectangle(0, 0, this.bw, this.bh, 0x000000, 0).setInteractive({ useHandCursor: true });
    this.add(this.hit);
    this.hit.on("pointerover", () => !this._disabled && this.redraw(true));
    this.hit.on("pointerout", () => this.redraw(false));
    this.hit.on("pointerdown", () => {
      if (this._disabled) return;
      this.setScale(0.96);
    });
    this.hit.on("pointerup", () => {
      if (this._disabled) return;
      this.setScale(1);
      this.onClick();
    });
    scene.add.existing(this);
  }

  setDisabled(v: boolean): this {
    this._disabled = v;
    this.redraw(false);
    return this;
  }

  setText(t: string): this {
    this.label.setText(t);
    return this;
  }

  private redraw(hovered: boolean): void {
    const g = this.bg;
    g.clear();
    const fill = this._disabled ? 0x1a1622 : hovered ? this.hoverColor : this.fillColor;
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, 8);
    g.lineStyle(2, this._disabled ? 0x2a2436 : hovered ? COLORS.accent : COLORS.border, 1);
    g.strokeRoundedRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, 8);
    this.label.setAlpha(this._disabled ? 0.4 : 1);
  }
}
