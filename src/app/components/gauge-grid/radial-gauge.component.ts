import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-radial-gauge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; width: 100%; }
    .gauge-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 10px 6px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
    }
    .gauge-title {
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
      color: #94a3b8;
    }
    .gauge-value-text {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      line-height: 1;
      margin-top: -10px;
    }
    .gauge-unit-text {
      font-size: 9px;
      font-family: 'JetBrains Mono', monospace;
      margin-top: 4px;
      color: #64748b;
    }
  `],
  template: `
    <div class="gauge-card">
      <!-- Title at Top -->
      <div class="gauge-title" [style.color]="isValid ? '#94a3b8' : '#f43f5e'">
        {{ label }}
      </div>

      <!-- 180-Degree Semi-Circle SVG Arc -->
      <svg [attr.width]="size" [attr.height]="size * 0.55" [attr.viewBox]="'0 0 ' + size + ' ' + (size * 0.55)">
        
        <!-- Background Semi-Circle Track -->
        <path
          [attr.d]="semiCirclePath"
          fill="none"
          stroke="#1e293b"
          [attr.stroke-width]="strokeW"
          stroke-linecap="round"/>

        <!-- Active Value Semi-Circle Arc (Flat Color) -->
        <path
          [attr.d]="semiCirclePath"
          fill="none"
          [attr.stroke]="isValid ? '#0ea5e9' : '#f43f5e'"
          [attr.stroke-width]="strokeW"
          stroke-linecap="round"
          [attr.stroke-dasharray]="arcLength"
          [attr.stroke-dashoffset]="dashOffset"
          style="transition: stroke-dashoffset 0.3s ease-out"/>

        <!-- Numerical Value in Center -->
        <text
          [attr.x]="size / 2"
          [attr.y]="size * 0.45"
          text-anchor="middle"
          dominant-baseline="middle"
          [attr.font-size]="size * 0.2"
          font-family="'JetBrains Mono', monospace"
          font-weight="700"
          [attr.fill]="isValid ? '#38bdf8' : '#f43f5e'">
          {{ displayValue }}
        </text>
      </svg>

      <!-- Unit at Bottom -->
      <div class="gauge-unit-text" [style.color]="isValid ? '#64748b' : '#f43f5e'">
        {{ unit || ' ' }}
      </div>
    </div>
  `
})
export class RadialGaugeComponent {
  @Input() label: string = '';
  @Input() value: number | string = 0;
  @Input() unit: string = '';
  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() isValid: boolean = true;
  @Input() size: number = 72;

  get strokeW(): number { return this.size * 0.12; }
  get radius(): number { return (this.size - this.strokeW) / 2; }
  get cx(): number { return this.size / 2; }
  get cy(): number { return this.size * 0.48; }

  get semiCirclePath(): string {
    const r = this.radius;
    return `M ${this.cx - r} ${this.cy} A ${r} ${r} 0 0 1 ${this.cx + r} ${this.cy}`;
  }

  get arcLength(): number {
    return Math.PI * this.radius;
  }

  get dashOffset(): number {
    const num = this.numericValue;
    const clamped = Math.min(this.max, Math.max(this.min, num));
    const pct = (clamped - this.min) / (this.max - this.min || 1);
    return this.arcLength * (1 - pct);
  }

  get displayValue(): string {
    const n = this.numericValue;
    if (isNaN(n)) return '—';
    if (Math.abs(n) >= 10000) return (n / 1000).toFixed(1) + 'k';
    if (Math.abs(n) >= 1000) return n.toFixed(0);
    if (Math.abs(n) >= 100) return n.toFixed(1);
    if (Math.abs(n) >= 10) return n.toFixed(2);
    return n.toFixed(3);
  }

  get numericValue(): number {
    const v = typeof this.value === 'string' ? parseFloat(this.value) : this.value;
    return isNaN(v) ? 0 : v;
  }
}
