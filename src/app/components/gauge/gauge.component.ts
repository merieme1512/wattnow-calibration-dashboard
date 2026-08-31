import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gauge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: flex; flex-direction: column; align-items: center; }
    .g-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
    .g-label {
      font-size: 9px; font-weight: 700; text-align: center;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.02em; line-height: 1.1;
      color: #64748b; margin-top: 1px;
    }
    .g-value {
      position: absolute; bottom: 8px; width: 100%;
      text-align: center; font-family: 'JetBrains Mono', monospace;
      font-weight: 800; font-size: 10.5px; line-height: 1;
    }
  `],
  template: `
    <div class="g-wrap" [style.width.px]="sz" [style.height.px]="sz * 0.66">
      <svg [attr.width]="sz" [attr.height]="sz * 0.66"
           [attr.viewBox]="'0 0 ' + sz + ' ' + (sz * 0.66)" overflow="visible">
        <!-- Shadow glow for valid gauges -->
        <defs>
          <filter [id]="filterId">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>
        <!-- Background arc track -->
        <path [attr.d]="arcD" fill="none" stroke="#1a2535" [attr.stroke-width]="sw"
              stroke-linecap="round"/>
        <!-- Value arc -->
        <path [attr.d]="arcD" fill="none" [attr.stroke]="color" [attr.stroke-width]="sw"
              stroke-linecap="round"
              [attr.stroke-dasharray]="arcLen"
              [attr.stroke-dashoffset]="offset"
              style="transition: stroke-dashoffset 0.6s ease-out, stroke 0.3s ease"/>
        <!-- Center value -->
        <text [attr.x]="sz/2" [attr.y]="sz * 0.575"
              text-anchor="middle" dominant-baseline="middle"
              [attr.font-size]="sz * 0.165"
              font-family="'JetBrains Mono', monospace"
              font-weight="800"
              [attr.fill]="color">{{ display }}</text>
      </svg>
      <div class="g-label" [style.color]="labelColor">{{ label }}<br *ngIf="unit"/><span style="font-size:8px;opacity:0.6">{{ unit }}</span></div>
    </div>
  `
})
export class GaugeComponent {
  @Input() label: string = '';
  @Input() value: number | string = 0;
  @Input() unit: string = '';
  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() valid: boolean = true;
  @Input() sz: number = 74;   // size

  get sw(): number { return this.sz * 0.12; }
  get r(): number { return (this.sz - this.sw) / 2; }
  get cx(): number { return this.sz / 2; }
  get cy(): number { return this.sz * 0.62; }

  /** 270-degree horseshoe arc from -225° to +45° */
  get arcD(): string {
    return this.arc(this.cx, this.cy, this.r, -225, 45);
  }

  get arcLen(): number {
    return (270 / 360) * 2 * Math.PI * this.r;
  }

  get offset(): number {
    const n = this.num;
    const pct = Math.min(1, Math.max(0, (n - this.min) / (this.max - this.min || 1)));
    return this.arcLen * (1 - pct);
  }

  get color(): string {
    if (!this.valid) return '#f43f5e';
    const pct = (this.num - this.min) / (this.max - this.min || 1);
    if (pct < 0.3) return '#eab308';
    if (pct < 0.85) return '#22c55e';
    return '#10b981';
  }

  get labelColor(): string { return this.valid ? '#94a3b8' : '#f87171'; }

  get display(): string {
    const n = this.num;
    if (isNaN(n)) return '–';
    if (Math.abs(n) >= 10000) return (n / 1000).toFixed(1) + 'k';
    if (Math.abs(n) >= 1000) return n.toFixed(0);
    if (Math.abs(n) >= 100) return n.toFixed(1);
    if (Math.abs(n) >= 10) return n.toFixed(2);
    return n.toFixed(3);
  }

  get num(): number {
    const v = typeof this.value === 'string' ? parseFloat(this.value) : this.value;
    return isNaN(v) ? 0 : v;
  }

  get filterId(): string { return 'glow_' + this.label.replace(/[^a-z0-9]/gi, ''); }

  private arc(cx: number, cy: number, r: number, start: number, end: number): string {
    const p1 = this.pt(cx, cy, r, start);
    const p2 = this.pt(cx, cy, r, end);
    const large = Math.abs(end - start) > 180 ? 1 : 0;
    return `M${p1.x} ${p1.y} A${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`;
  }

  private pt(cx: number, cy: number, r: number, deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
}
